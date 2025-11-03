const Razorpay = require('razorpay');
const crypto = require('crypto');

// Validate environment variables at startup
console.log('=== RAZORPAY CONFIGURATION ===');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'SET (length: ' + process.env.RAZORPAY_KEY_ID.length + ')' : '❌ MISSING');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET (length: ' + process.env.RAZORPAY_KEY_SECRET.length + ')' : '❌ MISSING');

// Validate credentials exist
if (!process.env.RAZORPAY_KEY_ID) {
  console.error('❌ CRITICAL: RAZORPAY_KEY_ID is not set in environment variables!');
}

if (!process.env.RAZORPAY_KEY_SECRET) {
  console.error('❌ CRITICAL: RAZORPAY_KEY_SECRET is not set in environment variables!');
}

// Single Razorpay instance for both Payments and Route
// Route uses the same Payment Gateway credentials
let razorpayInstance = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay instance created successfully');
  } else {
    console.error('❌ Cannot create Razorpay instance - missing credentials');
  }
} catch (error) {
  console.error('❌ Error creating Razorpay instance:', error.message);
  console.error('Full error:', error);
}

// Keep legacy name for backward compatibility
const razorpayPayment = razorpayInstance;

// Helper function to verify webhook signature
const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

// Helper function to verify payment signature (after Checkout success)
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('❌ RAZORPAY_KEY_SECRET not found for signature verification');
      return false;
    }
    
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');
    
    console.log('🔐 Signature verification:', {
      orderId,
      paymentId,
      providedSignature: signature.substring(0, 10) + '...',
      expectedSignature: expectedSignature.substring(0, 10) + '...',
      match: expectedSignature === signature
    });
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

// Log final status
console.log('Razorpay instance status:', razorpayInstance ? '✅ Ready' : '❌ Not initialized');
console.log('==============================\n');

module.exports = {
  razorpayInstance,
  razorpayPayment, // For backward compatibility with existing code
  verifyWebhookSignature,
  verifyPaymentSignature
};