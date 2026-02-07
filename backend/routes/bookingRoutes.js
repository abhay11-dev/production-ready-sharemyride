const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import booking controller
const {
  createBooking,
  getMyBookings,
  getDriverBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  completePayment,
  addRating
} = require('../controllers/bookingController');

// ========================================
// PROTECTED ROUTES (Authentication required)
// ========================================

// CREATE BOOKING
// POST /api/bookings
// Body: { rideId, seatsBooked, pickupLocation, dropLocation, passengerNotes, specialRequirements }
router.post('/', protect, createBooking);

// GET USER'S BOOKINGS (PASSENGER VIEW)
// GET /api/bookings/my?status=pending&limit=20&page=1
router.get('/my', protect, getMyBookings);

// GET DRIVER'S BOOKINGS
// GET /api/bookings/driver?status=accepted&limit=20&page=1
router.get('/driver', protect, getDriverBookings);

// GET SINGLE BOOKING BY ID
// GET /api/bookings/:id
router.get('/:id', protect, getBookingById);

// UPDATE BOOKING STATUS (DRIVER/PASSENGER ACTION)
// PATCH /api/bookings/:id/status
// Body: { status: 'accepted' | 'rejected' | 'cancelled' | 'completed', reason?, message? }
router.patch('/:id/status', protect, updateBookingStatus);

// CANCEL BOOKING (PASSENGER)
// POST /api/bookings/:id/cancel
// Body: { reason }
router.post('/:id/cancel', protect, cancelBooking);

// COMPLETE PAYMENT
// POST /api/bookings/:id/payment
// Body: { transactionId, orderId, paymentGateway }
router.post('/:id/payment', protect, completePayment);

// ADD RATING (AFTER RIDE COMPLETION)
// POST /api/bookings/:id/rating
// Body: { rating: 1-5, review?, categories?: { punctuality, driving, behavior, vehicle } }
router.post('/:id/rating', protect, addRating);

module.exports = router;