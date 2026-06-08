const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  adminLogin,
  getVerifications,
  updateVerification
} = require('../controllers/adminController');

// @route   POST /api/admin/login
// @desc    Admin login
router.post('/login', adminLogin);

// @route   GET /api/admin/verifications
// @desc    Get all driver verifications
router.get('/verifications', protectAdmin, getVerifications);

// @route   PUT /api/admin/verifications/:id
// @desc    Update a verification request status
router.put('/verifications/:id', protectAdmin, updateVerification);

module.exports = router;
