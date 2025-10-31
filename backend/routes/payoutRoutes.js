// backend/routes/payoutRoutes.js (Final Complete Corrected Code)
const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
// FIX: This destructuring now correctly pulls 'protect' and 'authorize' (functions)
const { protect, authorize } = require('../middleware/auth'); 

// Setup driver for payouts
router.post('/setup-driver', protect, payoutController.setupDriver); 

// Get driver payout history
router.get('/driver/history', protect, payoutController.getDriverPayoutHistory);

// Get payout details
router.get('/:payoutId', protect, payoutController.getPayoutDetails);

// Admin routes
router.post('/trigger/:transactionId', protect, authorize('admin'), payoutController.triggerPayout);

// Assuming you need the other routes based on your controller (add them back in if removed):
// router.post('/retry/:payoutId', protect, authorize('admin'), payoutController.retryPayout);
// router.get('/status/:razorpayxPayoutId', protect, authorize('admin'), payoutController.checkPayoutStatus);

module.exports = router;