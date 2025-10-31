const express = require('express');
const router = express.Router();
const { 
  postRide, 
  searchRides, 
  getMyRides, 
  deleteRide, 
  getRideById, 
  updateRide 
} = require('../controllers/rideController');

// ✅ Import the 'protect' function specifically
const { protect } = require('../middleware/auth');

// POST /api/rides - Create a new ride
router.post('/', protect, postRide);

// GET /api/rides/search?start=A&end=B - Search rides
router.get('/search', searchRides);

// GET /api/rides/my - Get my rides (MUST come before /:id)
router.get('/my', protect, getMyRides);

// GET /api/rides/:id - Get ride by ID
router.get('/:id', getRideById);

// PUT /api/rides/:id - Update a ride
router.put('/:id', protect, updateRide);

// DELETE /api/rides/:id - Delete a ride
router.delete('/:id', protect, deleteRide);

module.exports = router;