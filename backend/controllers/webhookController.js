// controllers/webhookController.js
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const Booking = require('../models/Booking');
const { createDriverPayout } = require('../services/payoutService');

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return expectedSignature === signature;
};

/**
 * @route   POST /api/webhooks/razorpay/payment
 * @desc    Handle Razorpay payment webhooks
 * @access  Public (but verified)
 */
exports.handlePaymentWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = req.body;
    
    // Verify signature
    const isValid = verifyWebhookSignature(
      payload,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }
    
    const event = payload.event;
    const paymentEntity = payload.payload.payment.entity;
    
    console.log(`Webhook received: ${event}`);
    
    // Handle different events
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
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Error handling payment webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

/**
 * Handle payment captured event
 */
const handlePaymentCaptured = async (payment) => {
  try {
    const transaction = await Transaction.findOne({
      razorpayOrderId: payment.order_id
    });
    
    if (!transaction) {
      console.error('Transaction not found for order:', payment.order_id);
      return;
    }
    
    // Update transaction if not already captured
    if (transaction.paymentStatus !== 'captured') {
      transaction.razorpayPaymentId = payment.id;
      transaction.paymentStatus = 'captured';
      transaction.paymentCapturedAt = new Date();
      transaction.paymentMethod = payment.method;
      await transaction.save();
      
      // Update booking
      const booking = await Booking.findById(transaction.bookingId);
      if (booking) {
        booking.paymentStatus = 'completed';
        booking.status = 'paid';
        await booking.save();
      }
      
      // Automatically trigger payout if booking is completed
      // Uncomment if you want immediate payout
      // if (booking.status === 'completed') {
      //   await createDriverPayout(transaction._id);
      // }
    }
    
    console.log(`Payment captured: ${payment.id}`);
    
  } catch (error) {
    console.error('Error handling payment captured:', error);
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
      console.error('Transaction not found for order:', payment.order_id);
      return;
    }
    
    transaction.razorpayPaymentId = payment.id;
    transaction.paymentStatus = 'failed';
    transaction.errorCode = payment.error_code;
    transaction.errorDescription = payment.error_description;
    await transaction.save();
    
    // Update booking
    const booking = await Booking.findById(transaction.bookingId);
    if (booking) {
      booking.paymentStatus = 'failed';
      await booking.save();
    }
    
    console.log(`Payment failed: ${payment.id}`);
    
  } catch (error) {
    console.error('Error handling payment failed:', error);
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
    transaction.paymentStatus = 'pending';
    await transaction.save();
    
    console.log(`Payment authorized: ${payment.id}`);
    
  } catch (error) {
    console.error('Error handling payment authorized:', error);
  }
};

/**
 * @route   POST /api/webhooks/razorpayx/payout
 * @desc    Handle RazorpayX payout webhooks
 * @access  Public (but verified)
 */
exports.handlePayoutWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = req.body;
    
    // Verify signature
    const isValid = verifyWebhookSignature(
      payload,
      signature,
      process.env.RAZORPAYX_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }
    
    const event = payload.event;
    const payoutEntity = payload.payload.payout.entity;
    
    console.log(`Payout webhook received: ${event}`);
    
    // Handle different events
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
    console.error('Error handling payout webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

/**
 * Handle payout processed event
 */
const handlePayoutProcessed = async (payoutEntity) => {
  try {
    const payout = await Payout.findOne({
      razorpayxPayoutId: payoutEntity.id
    });
    
    if (!payout) {
      console.error('Payout not found:', payoutEntity.id);
      return;
    }
    
    payout.status = 'processed';
    payout.processedAt = new Date();
    payout.utr = payoutEntity.utr;
    await payout.save();
    
    // Update transaction
    const transaction = await Transaction.findById(payout.transactionId);
    if (transaction) {
      transaction.payoutStatus = 'completed';
      transaction.payoutCompletedAt = new Date();
      await transaction.save();
    }
    
    // Update driver bank account stats
    const DriverBankAccount = require('../models/DriverBankAccount');
    await DriverBankAccount.findOneAndUpdate(
      { driverId: payout.driverId },
      {
        $inc: {
          totalPayoutsReceived: 1,
          totalAmountReceived: payout.amount
        }
      }
    );
    
    console.log(`Payout processed: ${payoutEntity.id}`);
    
  } catch (error) {
    console.error('Error handling payout processed:', error);
  }
};

/**
 * Handle payout failed event
 */
const handlePayoutFailed = async (payoutEntity) => {
  try {
    const payout = await Payout.findOne({
      razorpayxPayoutId: payoutEntity.id
    });
    
    if (!payout) {
      return;
    }
    
    payout.status = 'failed';
    payout.failedAt = new Date();
    payout.failureReason = payoutEntity.status_details?.description;
    payout.errorCode = payoutEntity.status_details?.reason;
    
    // Schedule retry if under max retries
    if (payout.retryCount < payout.maxRetries) {
      payout.nextRetryAt = new Date(Date.now() + 3600000); // 1 hour later
    }
    
    await payout.save();
    
    // Update transaction
    const transaction = await Transaction.findById(payout.transactionId);
    if (transaction) {
      transaction.payoutStatus = 'failed';
      await transaction.save();
    }
    
    console.log(`Payout failed: ${payoutEntity.id}`);
    
  } catch (error) {
    console.error('Error handling payout failed:', error);
  }
};

/**
 * Handle payout reversed event
 */
const handlePayoutReversed = async (payoutEntity) => {
  try {
    const payout = await Payout.findOne({
      razorpayxPayoutId: payoutEntity.id
    });
    
    if (!payout) {
      return;
    }
    
    payout.status = 'reversed';
    payout.failureReason = 'Payout reversed by bank';
    await payout.save();
    
    // Update transaction
    const transaction = await Transaction.findById(payout.transactionId);
    if (transaction) {
      transaction.payoutStatus = 'failed';
      await transaction.save();
    }
    
    console.log(`Payout reversed: ${payoutEntity.id}`);
    
  } catch (error) {
    console.error('Error handling payout reversed:', error);
  }
};

module.exports = exports;