// backend/routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Razorpay payment webhooks
router.post('/razorpay/payment', webhookController.handlePaymentWebhook);

// RazorpayX payout webhooks
router.post('/razorpayx/payout', webhookController.handlePayoutWebhook);

module.exports = router;