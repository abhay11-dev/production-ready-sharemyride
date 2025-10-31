const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Create payment order
router.post('/create-order', protect, paymentController.createPaymentOrder);

// Verify payment
router.post('/verify-payment', protect, paymentController.verifyPayment);

// Get transaction details
router.get('/transaction/:id', protect, paymentController.getTransaction);

// Get passenger transactions
router.get('/passenger/transactions', protect, paymentController.getPassengerTransactions);

// Get driver earnings
router.get('/driver/earnings', protect, paymentController.getDriverEarnings);

module.exports = router;