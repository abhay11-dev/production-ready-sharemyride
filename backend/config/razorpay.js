// config/razorpay.js
const Razorpay = require('razorpay');

// Payment Gateway Instance
const razorpayPayment = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// RazorpayX Payout Instance (separate credentials)
const razorpayPayout = new Razorpay({
  key_id: process.env.RAZORPAYX_KEY_ID,
  key_secret: process.env.RAZORPAYX_KEY_SECRET
});

// Helper function to verify webhook signature
const verifyWebhookSignature = (payload, signature, secret) => {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return expectedSignature === signature;
};

module.exports = {
  razorpayPayment,
  razorpayPayout,
  verifyWebhookSignature
};