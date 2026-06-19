const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  adminLogin,
  getVerifications,
  updateVerification,
  streamVerificationDocument,
  getAnalyticsSummary,
  getUsersList,
  getRidesList,
  getEnquiriesList,
  updateEnquiry,
  getReportsList,
  updateReport,
  getBlogsList,
  updateBlog,
} = require('../controllers/adminController');

// @route   POST /api/admin/login
// @desc    Admin login
router.post('/login', adminLogin);

// @route   GET /api/admin/verifications
// @desc    Get all driver verifications
router.get('/verifications', protectAdmin, getVerifications);

// @route   GET /api/admin/verifications/:id/document/:documentType
// @desc    Stream a private verification document for admin preview
router.get('/verifications/:id/document/:documentType', protectAdmin, streamVerificationDocument);

// @route   PUT /api/admin/verifications/:id
// @desc    Update a verification request status
router.put('/verifications/:id', protectAdmin, updateVerification);

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD ANALYTICS ROUTES
   ════════════════════════════════════════════════════════════════════ */

// @route   GET /api/admin/analytics/summary
// @desc    Get dashboard analytics summary
router.get('/analytics/summary', protectAdmin, getAnalyticsSummary);

// @route   GET /api/admin/users
// @desc    Get users list
router.get('/users', protectAdmin, getUsersList);

// @route   GET /api/admin/rides
// @desc    Get rides list
router.get('/rides', protectAdmin, getRidesList);

// @route   GET /api/admin/enquiries
// @desc    Get enquiries list
router.get('/enquiries', protectAdmin, getEnquiriesList);

// @route   PUT /api/admin/enquiries/:id
// @desc    Update enquiry status
router.put('/enquiries/:id', protectAdmin, updateEnquiry);

// @route   GET /api/admin/reports
// @desc    Get reports list
router.get('/reports', protectAdmin, getReportsList);

// @route   PUT /api/admin/reports/:id
// @desc    Update report status
router.put('/reports/:id', protectAdmin, updateReport);

// @route   GET /api/admin/blogs
// @desc    Get blogs list
router.get('/blogs', protectAdmin, getBlogsList);

// @route   PUT /api/admin/blogs/:id
// @desc    Update blog status
router.put('/blogs/:id', protectAdmin, updateBlog);

module.exports = router;
