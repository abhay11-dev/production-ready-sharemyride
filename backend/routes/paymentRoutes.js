const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth'); // Your existing auth middleware

// Payment routes (authenticated)
router.post('/create-order', protect, paymentController.createPaymentOrder);
router.post('/verify', protect, paymentController.verifyPayment);
router.get('/transaction/:id', protect, paymentController.getTransaction);

// Passenger routes
router.get('/passenger/transactions', protect, paymentController.getPassengerTransactions);

// Driver routes
router.get('/driver/earnings', protect, paymentController.getDriverEarnings);

// Webhook route (must be publicly accessible - NO AUTH)
// IMPORTANT: This route should NOT have protect middleware
// router.post('/webhooks/razorpay', webhookController.handleWebhook);
// Note: Webhook controller will be added separately when you implement Route transfers

// Add to your routes file (e.g., payment.routes.js or server.js)
router.get('/test-razorpay', async (req, res) => {
  try {
    const { razorpayInstance } = require('../config/razorpay.config');
    
    console.log('🧪 Testing Razorpay with credentials...');
    console.log('Key ID:', process.env.RAZORPAY_KEY_ID);
    
    const testOrder = await razorpayInstance.orders.create({
      amount: 100,
      currency: 'INR',
      receipt: 'test_' + Date.now()
    });
    
    res.json({
      success: true,
      message: '✅ Razorpay working!',
      orderId: testOrder.id
    });
    
  } catch (error) {
    console.error('❌ Razorpay test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      errorCode: error.error?.code,
      description: error.error?.description
    });
  }
});

module.exports = router;