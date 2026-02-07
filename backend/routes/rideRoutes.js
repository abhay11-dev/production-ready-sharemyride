const express = require('express');
const router = express.Router();
const { 
  postRide, 
  searchRides, 
  getMyRides, 
  deleteRide, 
  getRideById, 
  updateRide,
  updateRideStatus,
  getRideBookings,
  incrementViewCount,
  getFeaturedRides,
} = require('../controllers/rideController');

const { protect } = require('../middleware/auth');

// ========================================
// PUBLIC ROUTES (No authentication required)
// ========================================

// ⚠️ CRITICAL: Specific routes MUST come BEFORE /:id

// Search routes

router.get('/search', searchRides);

// Featured rides
router.get('/featured', getFeaturedRides);

// ========================================
// PROTECTED ROUTES (Authentication required)
// ========================================

// POST /api/rides - Create a new ride
router.post('/', protect, postRide);

// ⚠️ CRITICAL: /my MUST come BEFORE /:id
router.get('/my', protect, getMyRides);

// ========================================
// DYNAMIC ROUTES (Keep these AFTER specific routes)
// ========================================

// GET /api/rides/:id - Get ride by ID
router.get('/:id', getRideById);

// POST /api/rides/:id/view - Increment view count
router.post('/:id/view', incrementViewCount);

// PUT /api/rides/:id - Update a ride
router.put('/:id', protect, updateRide);

// PATCH /api/rides/:id/status - Update ride status
router.patch('/:id/status', protect, updateRideStatus);

// DELETE /api/rides/:id - Delete/Cancel a ride
router.delete('/:id', protect, deleteRide);

// GET /api/rides/:id/bookings - Get all bookings for a ride
router.get('/:id/bookings', protect, getRideBookings);

// GET /api/rides/:id/availability - Check segment availability


module.exports = router;