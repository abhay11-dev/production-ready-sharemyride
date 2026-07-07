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
  updateUser,
  getUserRides,
  getUserBookings,
  getRidesList,
  getBookingsList,
  getPaymentsList,
  getEnquiriesList,
  updateEnquiry,
  getReportsList,
  updateReport,
  getBlogsList,
  updateBlog,
  getUpcomingRides,
  runReminderCheck,
} = require('../controllers/adminController');

// ── Auth ────────────────────────────────────────────────────────────────────
router.post('/login', adminLogin);

// ── Analytics ───────────────────────────────────────────────────────────────
router.get('/analytics/summary', protectAdmin, getAnalyticsSummary);

// ── Users ────────────────────────────────────────────────────────────────────
router.get('/users', protectAdmin, getUsersList);
router.put('/users/:id', protectAdmin, updateUser);
router.get('/users/:id/rides', protectAdmin, getUserRides);
router.get('/users/:id/bookings', protectAdmin, getUserBookings);

// ── Rides ────────────────────────────────────────────────────────────────────
router.get('/rides', protectAdmin, getRidesList);

// ── Bookings ─────────────────────────────────────────────────────────────────
router.get('/bookings', protectAdmin, getBookingsList);

// ── Payments ─────────────────────────────────────────────────────────────────
router.get('/payments', protectAdmin, getPaymentsList);

// ── Driver Verification ───────────────────────────────────────────────────────
router.get('/verifications', protectAdmin, getVerifications);
router.put('/verifications/:id', protectAdmin, updateVerification);
router.get('/verifications/:id/document/:documentType', protectAdmin, streamVerificationDocument);

// ── Enquiries ─────────────────────────────────────────────────────────────────
router.get('/enquiries', protectAdmin, getEnquiriesList);
router.put('/enquiries/:id', protectAdmin, updateEnquiry);

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports', protectAdmin, getReportsList);
router.put('/reports/:id', protectAdmin, updateReport);

// ── Blogs ─────────────────────────────────────────────────────────────────────
router.get('/blogs', protectAdmin, getBlogsList);
router.put('/blogs/:id', protectAdmin, updateBlog);

// ── Upcoming Rides & Reminder Scheduler ──────────────────────────────────────
router.get('/upcoming-rides', protectAdmin, getUpcomingRides);
router.post('/run-reminder-check', protectAdmin, runReminderCheck);

module.exports = router;