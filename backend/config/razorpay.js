// config/razorpay.js
//
// NOTE TO YOU (integration gap, please resolve): payment.controller.js and
// webhookController.js both do:
//     require('../config/razorpay.config')  ->  { razorpayInstance, verifyPaymentSignature }
// ...but the file you pasted for this module was named/shaped as
// config/razorpay.js exporting { razorpayPayment, razorpayPayout, verifyWebhookSignature }.
//
// Rather than guess which filename is authoritative in your actual repo,
// this file exports BOTH naming conventions as aliases of the same
// instances, and implements BOTH verification functions correctly (they are
// NOT interchangeable — see comments below). Do one of:
//   (a) save this file as config/razorpay.config.js (matches existing requires), or
//   (b) save as config/razorpay.js AND update the two requires in
//       payment.controller.js / webhookController.js to './razorpay'.
// Either way the exports below satisfy both call sites unmodified.

const Razorpay = require('razorpay');
const crypto = require('crypto');

// ===========================
// PAYMENT GATEWAY INSTANCE (order creation, payment fetch/verify)
// ===========================
const razorpayPayment = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ===========================
// PAYOUT (RazorpayX) INSTANCE — optional, test-mode credentials
// Not used in Phase 1. Reserved for Phase 3 settlement/payout work.
// ===========================
let razorpayPayout = null;
const payoutKeyId = process.env.RAZORPAYX_KEY_ID;
const payoutKeySecret = process.env.RAZORPAYX_KEY_SECRET;

if (payoutKeyId && payoutKeySecret) {
  razorpayPayout = new Razorpay({
    key_id: payoutKeyId,
    key_secret: payoutKeySecret
  });
} else {
  console.warn('⚠️  RazorpayX payout credentials not configured — payout services disabled (expected until Phase 3).');
}

// ===========================
// SIGNATURE VERIFICATION — checkout callback (frontend -> backend)
// HMAC-SHA256 of "order_id|payment_id" using the KEY SECRET.
// This is what paymentController.verifyPayment() must use.
// ===========================
function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpaySignature, 'hex')
    );
  } catch {
    // Buffer length mismatch / malformed signature -> definitely invalid
    return false;
  }
}

// ===========================
// SIGNATURE VERIFICATION — server-to-server webhook
// HMAC-SHA256 of the RAW request body using the WEBHOOK SECRET (different
// secret than the key secret above — set in Razorpay Dashboard -> Webhooks).
//
// IMPORTANT: this must be computed over the raw request body bytes, not
// JSON.stringify(req.body) — stringifying a parsed object can reorder keys
// or alter whitespace/number formatting and silently break every
// signature check. Requires the route to be mounted with
// express.raw({ type: 'application/json' }) (or an equivalent raw-body
// capture) BEFORE any json() body parser touches it. See webhookRoutes.js.
// ===========================
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret || !rawBody) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody) // must be the raw Buffer/string, not a re-serialized object
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

module.exports = {
  // razorpay.config.js-style names (used by payment.controller.js today)
  razorpayInstance: razorpayPayment,
  verifyPaymentSignature,

  // razorpay.js-style names (used by webhookController.js today)
  razorpayPayment,
  razorpayPayout,
  verifyWebhookSignature
};