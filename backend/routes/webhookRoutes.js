// routes/webhookRoutes.js
//
// Your pasted version used `express.json({ type: '*/*' })` and manually
// re-signed with JSON.stringify(req.body). That inline handler is now
// superseded by webhookController.handlePaymentWebhook, which does real
// HMAC verification against the RAW body — this file just needs to give it
// raw bytes instead of a parsed object. Mount BEFORE any global
// express.json() in server.js, or scope it with this router so the global
// parser never touches these two paths first.

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Stash the raw body on req.rawBody, then hand a parsed copy to req.body
// for any downstream logging/convenience — the controller uses rawBody for
// signature verification and the parsed copy for reading event data.
const captureRawBody = express.raw({ type: 'application/json' });
const attachRawBody = (req, res, next) => {
  req.rawBody = req.body; // Buffer at this point
  next();
};

router.post(
  '/razorpay/payment',
  captureRawBody,
  attachRawBody,
  webhookController.handlePaymentWebhook
);

router.post(
  '/razorpayx/payout',
  captureRawBody,
  attachRawBody,
  webhookController.handlePayoutWebhook
);

module.exports = router;