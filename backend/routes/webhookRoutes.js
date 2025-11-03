const express = require('express');
const router = express.Router();
const crypto = require('crypto');

router.post('/razorpay', express.json({ type: '*/*' }), (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // 👇 Local test mode (no signature header)
  if (!signature) {
    console.log('⚙️ Local test webhook received:', req.body);
    return res.status(200).json({ status: 'ok', test: true, data: req.body });
  }

  const body = JSON.stringify(req.body);

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature === expectedSignature) {
      console.log('✅ Webhook verified successfully!');
      console.log('📩 Event type:', req.body.event);

      if (req.body.event === 'payment.captured') {
        const payment = req.body.payload.payment.entity;
        console.log('💰 Payment captured:', payment.id, payment.amount);
      }

      return res.status(200).json({ status: 'success' });
    } else {
      console.log('❌ Invalid webhook signature');
      return res.status(400).json({ status: 'invalid signature' });
    }
  } catch (err) {
    console.error('⚠️ Webhook error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
