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

module.exports = router;