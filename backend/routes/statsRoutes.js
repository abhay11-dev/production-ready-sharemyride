// routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getHomeStatistics,
  getDetailedStatistics,
  getStatsByPeriod,
  getFounderAnalytics
} = require('../controllers/statsController');

const { protect, protectAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/stats/home
 * @desc    Get statistics for home page (public)
 * @access  Public
 */
router.get('/home', getHomeStatistics);

/**
 * @route   GET /api/stats/detailed
 * @desc    Get detailed statistics (admin only)
 * @access  Private/Admin
 */
router.get('/detailed', protect, getDetailedStatistics);

/**
 * @route   GET /api/stats/period
 * @desc    Get statistics by time period
 * @access  Private
 */
router.get('/period', protect, getStatsByPeriod);

/**
 * @route   GET /api/stats/founder
 * @desc    Get founder-level business intelligence analytics
 * @access  Private/Admin
 */
router.get('/founder', protectAdmin, getFounderAnalytics);

module.exports = router;