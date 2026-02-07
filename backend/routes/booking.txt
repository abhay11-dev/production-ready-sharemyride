const express = require('express');
const router = express.Router();
// ✅ Import 'protect' instead of 'auth'
const { protect } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');

// CREATE a new booking request
router.post('/', protect, async (req, res) => {
  try {
    console.log('=== BOOKING REQUEST RECEIVED ===');
    console.log('User ID:', req.user._id || req.user.id);
    console.log('Request Body:', req.body);

    const {
      rideId,
      seatsBooked,
      pickupLocation,
      dropLocation,
      passengerNotes,
      totalFare,
      platformFee,
      gst,
      baseFare
    } = req.body;

    // Validate required fields
    if (!rideId || !seatsBooked) {
      return res.status(400).json({ message: 'Ride ID and seats are required' });
    }

    // Check if ride exists
    const ride = await Ride.findById(rideId).populate('driverId');
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    console.log('Ride found:', ride._id);

    // Check if enough seats available
    if (ride.seats < seatsBooked) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    // Check if user is trying to book their own ride
    const userId = req.user._id || req.user.id;
    if (ride.driverId._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You cannot book your own ride' });
    }

    // Create new booking
    const booking = new Booking({
      rideId,
      passengerId: userId,
      seatsBooked,
      pickupLocation: pickupLocation || ride.start,
      dropLocation: dropLocation || ride.end,
      passengerNotes: passengerNotes || '',
      totalFare: totalFare || 0,
      platformFee: platformFee || 0,
      gst: gst || 0,
      baseFare: baseFare || 0,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await booking.save();
    console.log('Booking created:', booking._id);

    // Populate booking details
    const populatedBooking = await Booking.findById(booking._id)
      .populate('passengerId', 'name email')
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name email' }
      });

    console.log('=== BOOKING SUCCESSFUL ===');

    res.status(201).json({
      message: 'Booking request sent successfully',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('=== BOOKING ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET all bookings for current user (passenger)
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const bookings = await Booking.find({ passengerId: userId })
      .populate('passengerId', 'name email')
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name email' }
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET all booking requests for rides posted by current user (driver)
router.get('/driver-bookings', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    // Find all rides posted by the current user
    const rides = await Ride.find({ driverId: userId });
    const rideIds = rides.map(ride => ride._id);

    // Find all bookings for these rides
    const bookings = await Booking.find({ rideId: { $in: rideIds } })
      .populate('passengerId', 'name email phone')
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name email' }
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching driver bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// UPDATE booking status (accept/reject) - Driver only
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const bookingId = req.params.id;
    const userId = req.user._id || req.user.id;

    console.log('=== UPDATE BOOKING STATUS ===');
    console.log('Booking ID:', bookingId);
    console.log('New Status:', status);
    console.log('User ID:', userId);

    // Validate status
    if (!['accepted', 'rejected', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be: accepted, rejected, cancelled, or completed' 
      });
    }

    // Find booking and populate ride details
    const booking = await Booking.findById(bookingId).populate('rideId');
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    console.log('Booking found:', booking._id);
    console.log('Current status:', booking.status);
    console.log('Ride driver ID:', booking.rideId?.driverId);

    // Check if current user is the driver of this ride
    if (!booking.rideId || !booking.rideId.driverId) {
      return res.status(400).json({ 
        success: false,
        message: 'Ride information not found' 
      });
    }

    if (booking.rideId.driverId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this booking' 
      });
    }

    // Check if booking is still pending (for accept/reject)
    if (['accepted', 'rejected'].includes(status) && booking.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot ${status} a booking that is already ${booking.status}` 
      });
    }

    // If accepting, check if enough seats still available
    if (status === 'accepted') {
      const ride = await Ride.findById(booking.rideId._id);
      if (ride.seats < booking.seatsBooked) {
        return res.status(400).json({ 
          success: false,
          message: 'Not enough seats available' 
        });
      }

      // Reduce available seats
      ride.seats -= booking.seatsBooked;
      await ride.save();
      console.log('Seats reduced. Remaining:', ride.seats);
    }

    // Update booking status
    booking.status = status;
    booking.updatedAt = new Date();
    await booking.save();

    console.log('Booking status updated to:', status);

    // Populate updated booking
    const updatedBooking = await Booking.findById(booking._id)
      .populate('passengerId', 'name email')
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name email' }
      });

    console.log('=== UPDATE SUCCESSFUL ===');

    res.json({
      success: true,
      message: `Booking ${status} successfully`,
      booking: updatedBooking
    });
  } catch (error) {
    console.error('=== UPDATE ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// DELETE (cancel) booking - Passenger only
router.delete('/:id', protect, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user._id || req.user.id;

    const booking = await Booking.findById(bookingId).populate('rideId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if current user is the passenger who made this booking
    if (booking.passengerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    // If booking was accepted, restore seats to the ride
    if (booking.status === 'accepted') {
      const ride = await Ride.findById(booking.rideId._id);
      if (ride) {
        ride.seats += booking.seatsBooked;
        await ride.save();
      }
    }

    // Update status to cancelled instead of deleting
    booking.status = 'cancelled';
    await booking.save();

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET booking by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const booking = await Booking.findById(req.params.id)
      .populate('passengerId', 'name email')
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name email' }
      });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is either the passenger or the driver
    const isPassenger = booking.passengerId._id.toString() === userId.toString();
    const isDriver = booking.rideId.driverId._id.toString() === userId.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;