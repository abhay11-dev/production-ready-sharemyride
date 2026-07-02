// routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  deleteAccount,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  resendSignupOtp,
  verifySignupOtp,
  verifyResetOtp,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// ── Public routes (no auth required) ─────────────────────────────────────────
router.post('/signup',                    signup);
router.post('/login',                     login);
router.post('/logout',                    logout);            // Clears HttpOnly cookie
router.post('/refresh-token',             refreshToken);      // Uses HttpOnly cookie
router.post('/forgot-password',           forgotPassword);
router.post('/verify-reset-code',         verifyResetCode);
router.post('/verify-reset-otp',          verifyResetOtp);
router.post('/reset-password',            resetPassword);
router.post('/verify-email',              verifyEmail);
router.post('/verify-otp',                verifySignupOtp);
router.post('/resend-otp',                resendSignupOtp);
router.post('/resend-verification-email', resendVerificationEmail);

// ── Protected routes (valid access token required) ────────────────────────────
router.get ('/profile',  protect, getProfile);
router.put ('/profile',  protect, updateProfile);
router.delete('/account', protect, deleteAccount);

module.exports = router;