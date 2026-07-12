// ...existing code...
const Razorpay = require('razorpay');

// Payment Gateway Instance using environment variables
const razorpayPayment = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

let razorpayPayout = null;
const payoutKeyId = process.env.RAZORPAYX_KEY_ID;
const payoutKeySecret = process.env.RAZORPAYX_KEY_SECRET;

if (payoutKeyId && payoutKeySecret) {
  razorpayPayout = new Razorpay({
    key_id: payoutKeyId,
    key_secret: payoutKeySecret
  });
} else {
  console.warn('RazorpayX payout credentials not configured. Payout services will be disabled.');
}

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
// ...existing code...