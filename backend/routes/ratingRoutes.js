const express = require('express');
const router = express.Router();
const {
  submitRating,
  getMyRating,
  getAllRatings,
  getRatingStats,
  deleteRating
} = require('../controllers/ratingController');

const { protect } = require('../middleware/auth');

// Public routes
router.get('/stats', getRatingStats);

// Protected routes (require authentication)
router.post('/submit', protect, submitRating);
router.get('/user/my-rating', protect, getMyRating);
router.get('/all', protect, getAllRatings); // Admin only (checked in controller)
router.delete('/:id', protect, deleteRating);

module.exports = router;