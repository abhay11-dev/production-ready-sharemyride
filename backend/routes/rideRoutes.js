const express = require('express');
const router = express.Router();
const { protect, requireVerifiedDriver } = require('../middleware/auth');
const {
  postRide,
  getMyRides,
  searchRides,
  getFeaturedRides,
  getRideById,
  updateRide,
  deleteRide,
  updateRideStatus,
  incrementViewCount,
  getRideBookings,
  getUserStats,
  checkRideAvailability
} = require('../controllers/rideController');

// Search / discovery
router.get('/search', searchRides);
router.get('/search/partial', (req, res, next) => {
  req.query.includePartialRoutes = req.query.includePartialRoutes || 'true';
  next();
}, searchRides);
router.get('/featured', getFeaturedRides);

// User-specific ride endpoints
router.get('/my', protect, getMyRides);
router.get('/user/stats', protect, getUserStats);
router.post('/', protect, requireVerifiedDriver, postRide);

// Ride detail / actions
router.get('/:id/bookings', protect, getRideBookings);
router.get('/:id/availability', checkRideAvailability);
router.patch('/:id/status', protect, updateRideStatus);
router.post('/:id/view', incrementViewCount);
router.get('/:id', getRideById);
router.put('/:id', protect, updateRide);
router.delete('/:id', protect, deleteRide);

module.exports = router;
