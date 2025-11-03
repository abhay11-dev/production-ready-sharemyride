const express = require('express');
const router = express.Router();

// Import all controller functions
const authController = require('../controllers/authController');

// Import middleware
const { protect } = require('../middleware/auth');

// Authentication routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.delete('/account', protect, authController.deleteAccount);

// Password reset routes (public)
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

module.exports = router;