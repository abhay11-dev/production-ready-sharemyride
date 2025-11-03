const Razorpay = require('razorpay');
const crypto = require('crypto');

// Single Razorpay instance for both Payments and Route
// Route uses the same Payment Gateway credentials
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Keep legacy name for backward compatibility
const razorpayPayment = razorpayInstance;

// Helper function to verify webhook signature
const verifyWebhookSignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return expectedSignature === signature;
};

// Helper function to verify payment signature (after Checkout success)
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const text = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');
  
  return expectedSignature === signature;
};

module.exports = {
  razorpayInstance,
  razorpayPayment, // For backward compatibility with existing code
  verifyWebhookSignature,
  verifyPaymentSignature
};