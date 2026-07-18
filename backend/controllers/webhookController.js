// controllers/webhookController.js
//
// CHANGES FROM YOUR VERSION (Phase 1):
//   1. BUG FIX: handlePaymentCaptured set `booking.status = 'paid'`, which is
//      not in Booking.status's enum (pending/accepted/rejected/cancelled/
//      completed/no_show). That line threw a ValidationError on every save,
//      caught silently by the outer try/catch — so paymentStatus WAS getting
//      set to 'completed' in memory but the whole `booking.save()` was
//      rejected, meaning NEITHER field actually persisted. Removed the
//      invalid line; booking.status is left untouched by payment capture
//      (status transitions belong to the accept/reject/cancel/complete flow
//      in bookingController, not to payment webhooks).
//   2. Uses the reconciled config/razorpay(.config).js's verifyWebhookSignature,
//      which now correctly hashes the RAW body instead of
//      JSON.stringify(req.body) (see config file comments — stringifying a
//      parsed object is not guaranteed to match what Razorpay signed).
//      This requires the route to preserve the raw body — see the
//      webhookRoutes.js note at the bottom of this file.
//   3. Added: OTP generation + socket emit after a payment is newly
//      captured, idempotency-guarded so Razorpay's automatic webhook
//      retries (documented behavior — they retry on any non-2xx and even
//      sometimes redeliver 2xx'd events) never generate a second OTP for
//      the same booking.
//
// Transaction.js confirmed (2026-07-17) — field names below match it exactly.
//
// NOTIFICATION (2026-07-17 decision): real email/SMS delivery isn't wired
// yet. Instead of a backend mailer, the OTP is cached as plaintext for a
// single authenticated in-app reveal (see models/RideOTP.js's
// otpPlaintextTemp + controllers/otpController.js + routes/otpRoutes.js).
// No notification call happens here — the passenger/driver pull the OTP via
// GET /api/otp/booking/:bookingId/reveal instead of it being pushed to them.
// Socket events below still fire so the frontend knows *when* to prompt the
// user to go reveal it.

const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const Booking = require('../models/Booking');
const RideOTP = require('../models/RideOTP');
const { generateRideOtp } = require('../services/otpService');
const { verifyWebhookSignature } = require('../config/razorpay'); // see file-naming note above
const { createDriverPayout } = require('../services/payoutService');

// Socket.IO — reuse the existing emitter rather than requiring the whole
// service module blind. Adjust the import to match your actual
// services/socket.js export shape if it differs (e.g. `getIO()` vs a
// singleton `io` export) — I have not seen that file's exports.
let socketService = null;
try {
  socketService = require('../services/socket');
} catch (e) {
  console.warn('⚠️  services/socket.js not loadable from webhookController — real-time events will be skipped:', e.message);
}

function emitSocketEvent(room, event, payload) {
  try {
    if (socketService?.io) {
      socketService.io.to(room).emit(event, payload);
    } else if (typeof socketService?.emitToUser === 'function') {
      socketService.emitToUser(room, event, payload);
    } else if (typeof socketService?.getIO === 'function') {
      socketService.getIO().to(room).emit(event, payload);
    }
  } catch (err) {
    // Never let a socket problem fail webhook processing.
    console.error('⚠️  Socket emit failed (non-fatal):', err.message);
  }
}

/**
 * @route   POST /api/webhooks/razorpay/payment
 * @desc    Handle Razorpay payment webhooks
 * @access  Public (but verified)
 *
 * IMPORTANT: req.body must be the RAW body (Buffer/string), not
 * pre-parsed JSON, for verifyWebhookSignature to work — see
 * webhookRoutes.js note at the bottom of this file. If your route currently
 * does `express.json({ type: '*/*' })` before this handler, the signature
 * check will always fail against a real Razorpay-signed payload (it
 * happened to "work" in your local-test snippet only because that snippet
 * skips verification entirely when no signature header is present).
 */
exports.handlePaymentWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || req.body; // req.rawBody set by raw-body middleware; see route note
    const parsedBody = typeof rawBody === 'string' || Buffer.isBuffer(rawBody)
      ? JSON.parse(rawBody.toString('utf8'))
      : rawBody;

    const isValid = verifyWebhookSignature(
      rawBody,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = parsedBody.event;
    const paymentEntity = parsedBody.payload.payment.entity;

    console.log(`📩 Webhook received: ${event}`);

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(paymentEntity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(paymentEntity);
        break;

      case 'payment.authorized':
        await handlePaymentAuthorized(paymentEntity);
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    // Always 200 once we've successfully processed (or intentionally
    // ignored) the event, so Razorpay stops retrying. Only signature
    // failures and unexpected exceptions should return non-2xx.
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Error handling payment webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

/**
 * Handle payment captured event.
 *
 * Idempotency: Razorpay may redeliver this event (retries on non-2xx, and
 * per their docs, redelivery is possible even after a 2xx in edge cases).
 * We guard OTP generation + notifications with an explicit check on
 * transaction.paymentStatus BEFORE flipping it, all under one flow, so a
 * duplicate delivery is a no-op past that check.
 */
const handlePaymentCaptured = async (payment) => {
  try {
    const transaction = await Transaction.findOne({
      razorpayOrderId: payment.order_id
    });

    if (!transaction) {
      console.error('❌ Transaction not found for order:', payment.order_id);
      return;
    }

    // Idempotency guard — if we've already processed this capture, do
    // nothing further (no duplicate OTP, no duplicate notification).
    if (transaction.paymentStatus === 'captured') {
      console.log(`ℹ️  Payment ${payment.id} already processed for transaction ${transaction._id} — skipping (idempotent webhook retry).`);
      return;
    }

    // FIXED: field is `capturedAt`, not `paymentCapturedAt` (which doesn't
    // exist on the schema — same silent-no-op class of bug as
    // handlePaymentFailed above). Reusing Transaction's own
    // capturePayment(paymentId, signature) method instead of hand-rolling
    // field writes, since it already sets razorpayPaymentId,
    // paymentStatus='captured', and capturedAt together in one save().
    transaction.paymentMethod = payment.method;
    await transaction.capturePayment(payment.id, transaction.razorpaySignature || null);

    // FIXED: removed the invalid `booking.status = 'paid'` assignment
    // (not a valid enum value — see file header). paymentStatus is the
    // correct, existing field for this.
    const booking = await Booking.findById(transaction.bookingId)
      .populate('passenger', 'name email phone')
      .populate('driver', 'name email phone');

    if (!booking) {
      console.error('❌ Booking not found for transaction:', transaction._id);
      return;
    }

    if (booking.paymentStatus !== 'completed') {
      booking.paymentStatus = 'completed';
      booking.paymentMethod = payment.method;
      booking.paymentId = payment.id;
      booking.paymentDate = new Date();
      booking.paymentCompletedAt = new Date();
      // rideStage: additive field — apply models/BOOKING_PATCH_INSTRUCTIONS.txt
      // to Booking.js before this line has any effect (Mongoose silently
      // drops unknown top-level fields on save rather than erroring).
      booking.rideStage = 'PAYMENT_SUCCESS';
      await booking.save();
    }

    console.log(`✅ Payment captured: ${payment.id}`);

    // ===========================
    // GENERATE + PERSIST + SEND RIDE OTP
    // ===========================
    // Idempotency: only generate if no unused OTP already exists for this
    // booking (covers the case where paymentStatus flipped in this same
    // call above, so the transaction-level guard above wouldn't have
    // caught a mid-flight retry).
    const existingLiveOtp = await RideOTP.findOne({
      booking: booking._id,
      used: false
    });

    if (!existingLiveOtp) {
      const { otp } = await generateRideOtp({
        bookingId: booking._id,
        passengerId: booking.passenger._id,
        driverId: booking.driver._id
      });

      // `otp` (plaintext) is intentionally not logged, emailed, or otherwise
      // transmitted here — it's already persisted as
      // RideOTP.otpPlaintextTemp for the one-time in-app reveal.
      console.log(`🔐 Ride OTP generated for booking ${booking._id} (delivery: in-app reveal, not pushed)`);

      // Real-time: notify both parties a payment succeeded and an OTP is
      // ready to be revealed in-app.
      // Room naming (`user:<id>`) follows the convention documented in
      // FOLDER_STRUCTURE_GUIDE.md's Socket.IO section.
      emitSocketEvent(`user:${booking.passenger._id}`, 'payment:success', {
        bookingId: booking._id.toString()
      });
      emitSocketEvent(`user:${booking.driver._id}`, 'payment:success', {
        bookingId: booking._id.toString()
      });
      emitSocketEvent(`user:${booking.passenger._id}`, 'otp:generated', {
        bookingId: booking._id.toString()
      });
      emitSocketEvent(`user:${booking.driver._id}`, 'otp:generated', {
        bookingId: booking._id.toString()
      });
    } else {
      console.log(`ℹ️  Live OTP already exists for booking ${booking._id} — not regenerating (idempotent).`);
    }

    if (booking.rideStage !== 'OTP_GENERATED') {
      booking.rideStage = 'OTP_GENERATED';
      await booking.save();
    }

    // Automatically trigger payout if booking is completed
    // Left as-is/commented, matching your original — payouts are Phase 3.
    // if (booking.status === 'completed') {
    //   await createDriverPayout(transaction._id);
    // }

  } catch (error) {
    console.error('❌ Error handling payment captured:', error);
  }
};

/**
 * Handle payment failed event
 */
const handlePaymentFailed = async (payment) => {
  try {
    const transaction = await Transaction.findOne({
      razorpayOrderId: payment.order_id
    });

    if (!transaction) {
      console.error('❌ Transaction not found for order:', payment.order_id);
      return;
    }

    // FIXED: Transaction has no top-level errorCode/errorDescription fields
    // (schema only has `metadata` + a `failPayment(reason)` instance method
    // that stores the reason inside metadata.failureReason). The original
    // code's direct assignment to those two fields was a silent no-op —
    // Mongoose drops unknown top-level fields on save rather than erroring.
    transaction.razorpayPaymentId = payment.id;
    await transaction.failPayment(
      payment.error_description || payment.error_code || 'Payment failed'
    );

    const booking = await Booking.findById(transaction.bookingId);
    if (booking) {
      booking.paymentStatus = 'failed';
      booking.paymentFailedAt = new Date();
      await booking.save();

      emitSocketEvent(`user:${booking.passenger}`, 'payment:failed', {
        bookingId: booking._id.toString(),
        reason: payment.error_description
      });
    }

    console.log(`❌ Payment failed: ${payment.id}`);

  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
  }
};

/**
 * Handle payment authorized event
 */
const handlePaymentAuthorized = async (payment) => {
  try {
    const transaction = await Transaction.findOne({
      razorpayOrderId: payment.order_id
    });

    if (!transaction) {
      return;
    }

    transaction.razorpayPaymentId = payment.id;
    // Unchanged from your original — note this leaves paymentStatus as
    // 'pending' on authorization, only 'captured' event moves it forward.
    transaction.paymentStatus = 'pending';
    await transaction.save();

    console.log(`ℹ️  Payment authorized: ${payment.id}`);

  } catch (error) {
    console.error('❌ Error handling payment authorized:', error);
  }
};

// ===========================
// PAYOUT WEBHOOKS — unchanged from your original, out of scope for Phase 1.
// Left intact below so this file remains a drop-in replacement rather than
// a partial one.
// ===========================

/**
 * @route   POST /api/webhooks/razorpayx/payout
 * @desc    Handle RazorpayX payout webhooks
 * @access  Public (but verified)
 */
exports.handlePayoutWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || req.body;
    const parsedBody = typeof rawBody === 'string' || Buffer.isBuffer(rawBody)
      ? JSON.parse(rawBody.toString('utf8'))
      : rawBody;

    const isValid = verifyWebhookSignature(
      rawBody,
      signature,
      process.env.RAZORPAYX_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = parsedBody.event;
    const payoutEntity = parsedBody.payload.payout.entity;

    console.log(`📩 Payout webhook received: ${event}`);

    switch (event) {
      case 'payout.processed':
        await handlePayoutProcessed(payoutEntity);
        break;
      case 'payout.failed':
        await handlePayoutFailed(payoutEntity);
        break;
      case 'payout.reversed':
        await handlePayoutReversed(payoutEntity);
        break;
      default:
        console.log(`Unhandled payout event: ${event}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Error handling payout webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

const handlePayoutProcessed = async (payoutEntity) => {
  try {
    const payout = await Payout.findOne({ razorpayxPayoutId: payoutEntity.id });
    if (!payout) {
      console.error('❌ Payout not found:', payoutEntity.id);
      return;
    }

    payout.status = 'processed';
    payout.processedAt = new Date();
    payout.utr = payoutEntity.utr;
    await payout.save();

    const transaction = await Transaction.findById(payout.transactionId);
    if (transaction) {
      transaction.payoutStatus = 'completed';
      transaction.payoutCompletedAt = new Date();
      await transaction.save();
    }

    const DriverBankAccount = require('../models/DriverBankAccount');
    await DriverBankAccount.findOneAndUpdate(
      { driverId: payout.driverId },
      { $inc: { totalPayoutsReceived: 1, totalAmountReceived: payout.amount } }
    );

    console.log(`✅ Payout processed: ${payoutEntity.id}`);
  } catch (error) {
    console.error('❌ Error handling payout processed:', error);
  }
};

const handlePayoutFailed = async (payoutEntity) => {
  try {
    const payout = await Payout.findOne({ razorpayxPayoutId: payoutEntity.id });
    if (!payout) return;

    payout.status = 'failed';
    payout.failedAt = new Date();
    payout.failureReason = payoutEntity.status_details?.description;
    payout.errorCode = payoutEntity.status_details?.reason;

    if (payout.retryCount < payout.maxRetries) {
      payout.nextRetryAt = new Date(Date.now() + 3600000);
    }

    await payout.save();

    const transaction = await Transaction.findById(payout.transactionId);
    if (transaction) {
      transaction.payoutStatus = 'failed';
      await transaction.save();
    }

    console.log(`❌ Payout failed: ${payoutEntity.id}`);
  } catch (error) {
    console.error('❌ Error handling payout failed:', error);
  }
};

const handlePayoutReversed = async (payoutEntity) => {
  try {
    const payout = await Payout.findOne({ razorpayxPayoutId: payoutEntity.id });
    if (!payout) return;

    payout.status = 'reversed';
    payout.failureReason = 'Payout reversed by bank';
    await payout.save();

    const transaction = await Transaction.findById(payout.transactionId);
    if (transaction) {
      transaction.payoutStatus = 'failed';
      await transaction.save();
    }

    console.log(`🔁 Payout reversed: ${payoutEntity.id}`);
  } catch (error) {
    console.error('❌ Error handling payout reversed:', error);
  }
};

module.exports = exports;

// ===========================
// ROUTE-LEVEL REQUIREMENT (action needed in webhookRoutes.js)
// ===========================
// For verifyWebhookSignature to ever succeed against a REAL Razorpay
// webhook, this controller needs the raw request body. Your pasted
// webhookRoutes.js snippet uses `express.json({ type: '*/*' })`, which
// parses-then-discards the raw bytes — req.body is already an object by
// the time this controller runs, and JSON.stringify(req.body) is not
// guaranteed byte-identical to what Razorpay actually signed (key order,
// spacing, number formatting can all differ).
//
// Fix: mount the payment webhook route with a raw body parser and stash the
// raw bytes for the signature check, e.g.:
//
//   router.post(
//     '/razorpay/payment',
//     express.raw({ type: 'application/json' }),
//     (req, res, next) => { req.rawBody = req.body; next(); },
//     webhookController.handlePaymentWebhook
//   );
//
// This is a routing change, not something this controller file can fix on
// its own — flagging it explicitly rather than silently assuming it's
// already done, since the snippet you sent does the opposite.