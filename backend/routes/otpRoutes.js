// routes/otpRoutes.js
// Mount in server.js as: app.use('/api/otp', require('./routes/otpRoutes'));
// (matches the prefix convention in FOLDER_STRUCTURE_GUIDE.md's routes table)

const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');
const { protect } = require('../middleware/authMiddleware'); // adjust export name if yours differs (paymentRoutes.js you pasted imports `protect` from '../middleware/auth' — confirm actual path/export)

router.get('/booking/:bookingId/reveal', protect, otpController.revealOtp);
router.get('/booking/:bookingId/status', protect, otpController.getOtpStatus);

module.exports = router;