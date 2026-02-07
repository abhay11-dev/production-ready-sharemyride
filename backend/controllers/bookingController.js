const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');

// ========================================
// CREATE BOOKING (PASSENGER BOOKS A RIDE)
// ========================================
// controllers/bookingController.js

exports.createBooking = async (req, res) => {
  try {
    let {
      rideId,
      seatsBooked,
      pickupLocation,
      dropLocation,
      passengerNotes,
      specialRequirements,
      paymentMethod,
      
      // 🎯 SEGMENT BOOKING DATA
      matchType,
      userSearchDistance,
      segmentFare,
      matchQuality
    } = req.body;

    const userId = req.user._id;

    console.log('📝 Creating booking:', {
      rideId,
      userId,
      seatsBooked,
      pickupLocation,
      dropLocation,
      matchType,
      userSearchDistance,
      segmentFare
    });

    // ========================================
    // 1️⃣ VALIDATE INPUT
    // ========================================
    if (!rideId || !seatsBooked || !pickupLocation || !dropLocation) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Ride ID, seats, pickup and drop locations are required'
      });
    }

    if (seatsBooked < 1 || seatsBooked > 8) {
      console.log('❌ Validation failed - invalid seats:', seatsBooked);
      return res.status(400).json({
        success: false,
        message: 'Seats must be between 1 and 8'
      });
    }

    // ========================================
    // 2️⃣ FIND RIDE
    // ========================================
    const ride = await Ride.findById(rideId).populate('driverId', 'name email phone');

    if (!ride) {
      console.log('❌ Ride not found:', rideId);
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    console.log('✅ Ride found:', {
      id: ride._id,
      driver: ride.driverId?._id,
      fareMode: ride.fareMode,
      perKmRate: ride.perKmRate,
      matchType: matchType
    });

    // ========================================
    // 3️⃣ CHECK RIDE AVAILABILITY
    // ========================================
    let canBookResult = { canBook: true, reason: '' };

    if (typeof ride.canBook === 'function') {
      try {
        canBookResult = ride.canBook(userId, seatsBooked);
        console.log('🔍 canBook result:', canBookResult);
      } catch (canBookError) {
        console.log('⚠️ canBook method failed:', canBookError.message);
        canBookResult = { canBook: true, reason: '' };
      }
    }

    if (!canBookResult || canBookResult.canBook === undefined) {
      console.log('⚠️ canBook returned invalid result, doing manual check');
      
      const currentAvailable = ride.availableSeats !== undefined ? ride.availableSeats : ride.seats;
      const totalSeats = ride.seats || 0;
      
      console.log('💺 Manual seat check:', {
        requested: seatsBooked,
        available: currentAvailable,
        total: totalSeats
      });
      
      if (currentAvailable < seatsBooked) {
        canBookResult = {
          canBook: false,
          reason: `Only ${currentAvailable} seat(s) available`
        };
      } else if (seatsBooked > totalSeats) {
        canBookResult = {
          canBook: false,
          reason: `This ride only has ${totalSeats} total seats`
        };
      } else {
        canBookResult = {
          canBook: true,
          reason: 'Seats available'
        };
      }
    }

    if (!canBookResult.canBook) {
      console.log('❌ Cannot book:', canBookResult.reason);
      return res.status(400).json({
        success: false,
        message: canBookResult.reason || 'This ride is not available for booking'
      });
    }

    console.log('✅ Ride available for booking');

    // ========================================
    // 4️⃣ CHECK FOR EXISTING BOOKING
    // ========================================
    const existingBooking = await Booking.findOne({
      passenger: userId,
      ride: rideId,
      status: { $in: ['pending', 'confirmed', 'accepted'] }
    });
    
    if (existingBooking) {
      console.log('❌ User already has booking for this ride');
      return res.status(400).json({
        success: false,
        message: 'You already have an active booking for this ride'
      });
    }

    console.log('✅ No existing booking found');

    // ========================================
    // 5️⃣ EXTRACT LOCATION DATA
    // ========================================
    const pickupAddr = typeof pickupLocation === 'string' 
      ? pickupLocation 
      : pickupLocation?.address || '';
    
    const dropAddr = typeof dropLocation === 'string'
      ? dropLocation
      : dropLocation?.address || '';

    const pickupCoords = typeof pickupLocation === 'object' && pickupLocation.coordinates
      ? pickupLocation.coordinates
      : { lat: 0, lng: 0 };

    const dropCoords = typeof dropLocation === 'object' && dropLocation.coordinates
      ? dropLocation.coordinates
      : { lat: 0, lng: 0 };

    console.log('📍 Location data:', {
      pickupAddr,
      dropAddr,
      pickupCoords,
      dropCoords
    });

  // ========================================
// 6️⃣ CALCULATE FARE (FIXED FOR SEGMENTS)
// ========================================
let baseFare = 0;
let serviceFee = 0;
let gst = 0;
let totalFare = 0;
let calculatedSegmentFare = null;

// 🎯 CRITICAL: Check if this is a SEGMENT booking first
const isSegmentBooking = matchType === 'on_route' && userSearchDistance && userSearchDistance > 0;

if (isSegmentBooking && ride.perKmRate) {
  console.log('🎯 SEGMENT BOOKING DETECTED - Calculating segment fare...');
  console.log('📊 Segment data:', {
    matchType,
    userSearchDistance,
    perKmRate: ride.perKmRate,
    seatsBooked,
    segmentFare: segmentFare // from frontend
  });
  
  // ✅ USE USER'S SEGMENT DISTANCE, NOT TOTAL DISTANCE
  baseFare = ride.perKmRate * userSearchDistance * seatsBooked;
  
  // Platform fee (8% of base fare)
  serviceFee = baseFare * 0.15;
  
  // GST (18% of platform fee)
  gst = serviceFee * 0.18;
  
  // Total passenger pays
  totalFare = baseFare + serviceFee + gst;
  
  // Store the segment fare per seat (for reference)
  calculatedSegmentFare = segmentFare || (ride.perKmRate * userSearchDistance * 1.0944); // 1.0944 = 1 + 0.08 + (0.08 * 0.18)
  
  console.log('✅ Segment fare calculated:', {
    userSearchDistance,
    perKmRate: ride.perKmRate,
    seatsBooked,
    baseFare: baseFare.toFixed(2),
    serviceFee: serviceFee.toFixed(2),
    gst: gst.toFixed(2),
    totalFare: totalFare.toFixed(2),
    segmentFarePerSeat: calculatedSegmentFare.toFixed(2)
  });
}
// 📏 PER KM PRICING (Full Route)
else if (ride.fareMode === 'per_km' && ride.perKmRate && ride.totalDistance) {
  console.log('📏 FULL ROUTE PER KM - Calculating full route fare...');
  
  baseFare = ride.perKmRate * ride.totalDistance * seatsBooked;
  serviceFee = baseFare * 0.08;
  gst = serviceFee * 0.18;
  totalFare = baseFare + serviceFee + gst;
  
  console.log('✅ Full route fare calculated:', {
    totalDistance: ride.totalDistance,
    perKmRate: ride.perKmRate,
    baseFare: baseFare.toFixed(2),
    totalFare: totalFare.toFixed(2)
  });
}
// 💵 FIXED FARE
else {
  console.log('💵 FIXED FARE - Using ride.fare...');
  
  baseFare = (ride.fare || 0) * seatsBooked;
  serviceFee = baseFare * 0.08;
  gst = serviceFee * 0.18;
  totalFare = baseFare + serviceFee + gst;
  
  console.log('✅ Fixed fare calculated:', {
    fare: ride.fare,
    baseFare: baseFare.toFixed(2),
    totalFare: totalFare.toFixed(2)
  });
}

console.log('\n💰 FINAL FARE CALCULATION:', {
  isSegmentBooking,
  baseFare: baseFare.toFixed(2),
  serviceFee: serviceFee.toFixed(2),
  gst: gst.toFixed(2),
  totalFare: totalFare.toFixed(2),
  userSearchDistance,
  matchType,
  segmentFare: calculatedSegmentFare?.toFixed(2) || 'N/A'
});

// ========================================
// 7️⃣ CREATE BOOKING WITH SEGMENT DATA
// ========================================
const bookingData = {
  ride: rideId,
  passenger: userId,
  driver: ride.driverId?._id || ride.driver,
  seatsBooked,
  
  // Location data
  pickupLocation: pickupAddr,
  dropLocation: dropAddr,
  pickupCoordinates: pickupCoords,
  dropCoordinates: dropCoords,
  
  // Notes
  passengerNotes: passengerNotes || '',
  
  // 🎯 SEGMENT BOOKING DATA (CRITICAL!)
  matchType: matchType || null,
  userSearchDistance: userSearchDistance || null,
  perKmRate: ride.perKmRate || null,
  segmentFare: calculatedSegmentFare || segmentFare || null,
  matchQuality: matchQuality || null,
  
  // Fare breakdown - THIS IS THE KEY!
  // For segment bookings, baseFare should be for the SEGMENT only
  baseFare: baseFare, // ✅ This is now calculated from userSearchDistance
  passengerServiceFee: serviceFee,
  passengerServiceFeeGST: gst,
  totalFare: totalFare,
  finalAmount: totalFare,
  platformFee: serviceFee,
  gst: gst,
  
  // Status
  status: 'pending',
  paymentStatus: 'pending',
  paymentMethod: paymentMethod || 'cash',
  
  // Special requests
  specialRequests: specialRequirements ? 
    (Array.isArray(specialRequirements) ? specialRequirements : []) : [],
  
  // Metadata
  bookingSource: req.headers['user-agent']?.includes('Mobile') ? 'mobile_app' : 'web',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
};

console.log('\n📦 BOOKING DATA TO SAVE:', {
  ride: bookingData.ride,
  passenger: bookingData.passenger,
  seatsBooked: bookingData.seatsBooked,
  matchType: bookingData.matchType,
  userSearchDistance: bookingData.userSearchDistance,
  segmentFare: bookingData.segmentFare,
  baseFare: bookingData.baseFare,
  totalFare: bookingData.totalFare,
  pickupLocation: bookingData.pickupLocation,
  dropLocation: bookingData.dropLocation
});

const booking = new Booking(bookingData);
await booking.save();

console.log('✅ Booking created with ID:', booking._id);
console.log('✅ Booking stored segment data:', {
  matchType: booking.matchType,
  userSearchDistance: booking.userSearchDistance,
  segmentFare: booking.segmentFare,
  baseFare: booking.baseFare
});
    // ========================================
    // 8️⃣ ADD BOOKING TO RIDE
    // ========================================
    try {
      if (!ride.bookings) {
        ride.bookings = [];
      }
      
      ride.bookings.push(booking._id);
      ride.bookingAttempts = (ride.bookingAttempts || 0) + 1;
      
      if (ride.availableSeats !== undefined) {
        ride.availableSeats = Math.max(0, ride.availableSeats - seatsBooked);
      }
      
      await ride.save();
      console.log('✅ Booking reference added to ride');
      
    } catch (rideUpdateError) {
      console.error('⚠️ Could not update ride:', rideUpdateError.message);
    }

    // ========================================
    // 9️⃣ UPDATE USER STATS
    // ========================================
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalBookings': 1 }
      });
      console.log('✅ User stats updated');
    } catch (statsError) {
      console.log('⚠️ Could not update user stats:', statsError.message);
    }

    // ========================================
    // 🔟 POPULATE AND RETURN
    // ========================================
    const populatedBooking = await Booking.findById(booking._id)
      .populate('ride', 'start end date time vehicle preferences fareMode perKmRate totalDistance matchType')
      .populate('passenger', 'name email phone avatar')
      .populate('driver', 'name email phone avatar')
      .lean();

    console.log('✅ Booking completed successfully');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: populatedBooking,
      booking: populatedBooking
    });

  } catch (error) {
    console.error('❌ Create booking error:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// ========================================
// GET USER'S BOOKINGS (PASSENGER VIEW)
// ========================================
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 20, page = 1 } = req.query;

    console.log('📋 Fetching bookings for user:', userId);

    const query = { passenger: userId };
    
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      // ✅ CHANGED: Populate 'ride' with more fields including phoneNumber, vehicleNumber, and driverId
      .populate({
        path: 'ride',
        select: 'start end date time vehicle preferences rideStatus phoneNumber vehicleNumber driverId fare fareMode perKmRate totalDistance',
        populate: {
          path: 'driverId',
          select: 'name email phone avatar'
        }
      })
      .populate('driver', 'name email phone avatar ratings')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalBookings = await Booking.countDocuments(query);

    console.log(`✅ Found ${bookings.length} bookings`);
    
    // ✅ Add debug log to check population
    bookings.forEach(booking => {
      console.log('Booking:', booking._id, 'has ride:', !!booking.ride);
    });

    res.json({
      success: true,
      data: bookings,
      bookings: bookings,
      count: bookings.length,
      pagination: {
        total: totalBookings,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalBookings / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

exports.getUserBookings = exports.getMyBookings;

// ========================================
// GET BOOKINGS FOR DRIVER
// ========================================
// controllers/bookingController.js

exports.getDriverBookings = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { status, limit = 20, page = 1 } = req.query;

    console.log('🚗 Fetching bookings for driver:', driverId);

    const query = { driver: driverId };
    
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      // ✅ CHANGED: Populate 'ride' with all necessary fields
      .populate({
        path: 'ride',
        select: 'start end date time vehicle fareMode perKmRate totalDistance matchType userSearchDistance phoneNumber vehicleNumber'
      })
      .populate('passenger', 'name email phone avatar ratings')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalBookings = await Booking.countDocuments(query);

    console.log(`✅ Found ${bookings.length} bookings for driver`);

    res.json({
      success: true,
      data: bookings,
      bookings: bookings,
      count: bookings.length,
      pagination: {
        total: totalBookings,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalBookings / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get driver bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// ========================================
// GET SINGLE BOOKING BY ID
// ========================================
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findById(id)
      .populate('ride')
      .populate('passenger', 'name email phone avatar ratings emergencyContacts')
      .populate('driver', 'name email phone avatar ratings vehicle')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const passengerId = booking.passenger?._id?.toString() || booking.passenger?.toString();
    const driverId = booking.driver?._id?.toString() || booking.driver?.toString();
    
    if (passengerId !== userId.toString() && driverId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: booking,
      booking: booking
    });

  } catch (error) {
    console.error('❌ Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// ========================================
// UPDATE BOOKING STATUS (DRIVER/PASSENGER ACTION)
// ========================================
exports.updateBookingStatus = async (req, res) => {
  console.log('\n🔵 ============ UPDATE BOOKING STATUS CALLED ============');
  console.log('📍 Request params:', req.params);
  console.log('📍 Request body:', req.body);
  console.log('📍 Request user:', req.user ? 'EXISTS' : 'MISSING');
  
  try {
    // STEP 1: Extract parameters
    const { id } = req.params;
    const { status, reason, message } = req.body;
    
    console.log('✅ Step 1: Parameters extracted');

    // STEP 2: Validate user authentication
    if (!req.user) {
      console.error('❌ CRITICAL ERROR: req.user is undefined!');
      return res.status(401).json({
        success: false,
        message: 'Authentication failed - no user in request'
      });
    }

    if (!req.user._id) {
      console.error('❌ CRITICAL ERROR: req.user._id is undefined!');
      return res.status(401).json({
        success: false,
        message: 'Authentication failed - no user ID'
      });
    }

    const userId = req.user._id;
    console.log('✅ Step 2: User authenticated:', userId.toString());

    // STEP 3: Validate status
    const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    console.log('✅ Step 3: Status validated:', status);

    // STEP 4: Validate booking ID
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ Invalid booking ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }
    console.log('✅ Step 4: Booking ID validated:', id);

    // STEP 5: Find booking with population
    console.log('🔍 Step 5: Querying database for booking...');
    const booking = await Booking.findById(id)
      .populate('ride')
      .populate('passenger')
      .populate('driver');

    if (!booking) {
      console.log('❌ Booking not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    console.log('✅ Step 5: Booking found:', {
      id: booking._id.toString(),
      status: booking.status,
      hasRide: !!booking.ride,
      hasPassenger: !!booking.passenger,
      hasDriver: !!booking.driver
    });

    // STEP 6: Authorization check with EXTREME safety
    console.log('🔍 Step 6: Checking authorization...');
    
    let isDriver = false;
    let isPassenger = false;

    // Check if user is the driver
    if (booking.driver) {
      try {
        let driverId;
        if (typeof booking.driver === 'object' && booking.driver._id) {
          driverId = booking.driver._id.toString();
        } else if (typeof booking.driver.toString === 'function') {
          driverId = booking.driver.toString();
        }
        
        if (driverId) {
          isDriver = driverId === userId.toString();
          console.log('✅ Driver check:', { driverId, userId: userId.toString(), isDriver });
        }
      } catch (err) {
        console.error('❌ Error checking driver:', err.message);
      }
    }

    // Check if user is the passenger
    if (booking.passenger) {
      try {
        let passengerId;
        if (typeof booking.passenger === 'object' && booking.passenger._id) {
          passengerId = booking.passenger._id.toString();
        } else if (typeof booking.passenger.toString === 'function') {
          passengerId = booking.passenger.toString();
        }
        
        if (passengerId) {
          isPassenger = passengerId === userId.toString();
          console.log('✅ Passenger check:', { passengerId, userId: userId.toString(), isPassenger });
        }
      } catch (err) {
        console.error('❌ Error checking passenger:', err.message);
      }
    }

    if (!isDriver && !isPassenger) {
      console.log('❌ User not authorized');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    console.log('✅ Step 6: User authorized');

    // STEP 7: Validate action permissions
    if (isDriver && !['accepted', 'rejected', 'completed', 'no_show'].includes(status)) {
      return res.status(403).json({
        success: false,
        message: 'Drivers can only accept, reject, complete or mark as no-show'
      });
    }

    if (isPassenger && status !== 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'Passengers can only cancel bookings'
      });
    }

    console.log('✅ Step 7: Action permissions validated');

    // STEP 8: Update booking status
    const oldStatus = booking.status;
    booking.status = status;
    console.log(`✅ Step 8: Status changed from ${oldStatus} to ${status}`);

    // STEP 9: Handle status-specific logic
    if (status === 'accepted' && isDriver) {
      booking.confirmedAt = new Date();
      if (message) booking.confirmationNotes = message;
      console.log('✅ Booking accepted by driver');
    }

    if (status === 'rejected') {
      booking.rejectedAt = new Date();
      booking.rejectionReason = reason || 'No reason provided';
      booking.rejectedBy = isDriver ? 'driver' : 'admin';
      console.log('✅ Booking rejected');
      
      // Return seats to ride
      if (booking.ride) {
        try {
          let rideId = booking.ride._id || booking.ride;
          const ride = await Ride.findById(rideId);
          if (ride) {
            ride.availableSeats = (ride.availableSeats || 0) + (booking.seatsBooked || 0);
            await ride.save();
            console.log('✅ Seats returned to ride');
          }
        } catch (rideErr) {
          console.log('⚠️ Could not update ride:', rideErr.message);
        }
      }
    }

    if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason || 'No reason provided';
      booking.cancelledBy = isDriver ? 'driver' : 'passenger';
      
      if (booking.paymentStatus === 'completed') {
        booking.refundAmount = booking.totalFare;
        booking.refundStatus = 'initiated';
        booking.refundInitiatedAt = new Date();
      }

      // Return seats to ride
      if (booking.ride) {
        try {
          let rideId = booking.ride._id || booking.ride;
          const ride = await Ride.findById(rideId);
          if (ride) {
            ride.availableSeats = (ride.availableSeats || 0) + (booking.seatsBooked || 0);
            await ride.save();
            console.log('✅ Seats returned to ride');
          }
        } catch (rideErr) {
          console.log('⚠️ Could not update ride:', rideErr.message);
        }
      }
    }

    if (status === 'completed') {
      booking.completedAt = new Date();
      
      // Update user stats
      try {
        if (booking.passenger) {
          let passengerId = booking.passenger._id || booking.passenger;
          await User.findByIdAndUpdate(passengerId, {
            $inc: { 'stats.completedBookings': 1 }
          });
        }
        
        if (booking.driver) {
          let driverId = booking.driver._id || booking.driver;
          await User.findByIdAndUpdate(driverId, {
            $inc: { 
              'stats.completedBookings': 1,
              'driverProfile.completedRides': 1
            }
          });
        }
        console.log('✅ User stats updated');
      } catch (statsErr) {
        console.log('⚠️ Could not update stats:', statsErr.message);
      }
    }

    console.log('✅ Step 9: Status-specific logic completed');

    // STEP 10: Save booking
    console.log('💾 Step 10: Saving booking...');
    await booking.save();
    console.log('✅ Booking saved successfully');

    // STEP 11: Fetch updated booking
    console.log('🔍 Step 11: Fetching updated booking...');
    const updatedBooking = await Booking.findById(booking._id)
      .populate('ride', 'start end date time vehicle availableSeats')
      .populate('passenger', 'name email phone avatar')
      .populate('driver', 'name email phone avatar')
      .lean();

    console.log('✅ Step 11: Updated booking fetched');
    console.log('🔵 ============ UPDATE COMPLETED SUCCESSFULLY ============\n');

    return res.json({
      success: true,
      message: `Booking ${status} successfully`,
      data: updatedBooking,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('\n❌ ============ CRITICAL ERROR ============');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Booking ID:', req.params?.id);
    console.error('User ID:', req.user?._id?.toString());
    console.error('Has req.user:', !!req.user);
    console.error('============================================\n');
    
    return res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// ========================================
// CANCEL BOOKING (PASSENGER)
// ========================================
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    console.log('❌ Cancelling booking:', { id, userId, reason });

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the passenger
    if (!booking.passenger || booking.passenger.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the passenger can cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'This booking cannot be cancelled'
      });
    }

    // Calculate refund
    const refundAmount = booking.paymentStatus === 'completed' ? booking.totalFare : 0;

    // Update booking
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || '';
    booking.cancelledBy = 'passenger';
    
    if (booking.paymentStatus === 'completed') {
      booking.refundAmount = refundAmount;
      booking.refundStatus = 'initiated';
      booking.refundInitiatedAt = new Date();
    }

    await booking.save();

    // Update ride - return seats
    try {
      const ride = await Ride.findById(booking.ride);
      if (ride && ride.availableSeats !== undefined) {
        ride.availableSeats += booking.seatsBooked;
        await ride.save();
      }
    } catch (rideError) {
      console.log('⚠️ Could not update ride:', rideError.message);
    }

    // Update user stats
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.cancelledBookings': 1 }
      });
    } catch (statsError) {
      console.log('⚠️ Could not update user stats:', statsError.message);
    }

    console.log('✅ Booking cancelled. Refund amount:', refundAmount);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: booking._id,
        refundAmount,
        refundStatus: booking.refundStatus || 'not_applicable'
      }
    });

  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// ========================================
// COMPLETE PAYMENT
// ========================================
exports.completePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId, orderId, paymentGateway } = req.body;
    const userId = req.user._id;

    console.log('💳 Completing payment for booking:', id);

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.passenger.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check if already paid
    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed'
      });
    }

    // Update payment details
    booking.paymentStatus = 'completed';
    booking.paymentDetails = {
      transactionId,
      orderId,
      paymentGateway: paymentGateway || 'razorpay',
      paidAt: new Date()
    };
    await booking.save();

    // Update user stats
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalSpent': booking.totalFare }
      });

      await User.findByIdAndUpdate(booking.driver, {
        $inc: { 'stats.totalEarned': booking.baseFare }
      });
    } catch (statsError) {
      console.log('⚠️ Could not update user stats:', statsError.message);
    }

    console.log('✅ Payment completed');

    const updatedBooking = await Booking.findById(id)
      .populate('ride', 'start end date time')
      .lean();

    res.json({
      success: true,
      message: 'Payment completed successfully',
      data: updatedBooking,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('❌ Complete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// ========================================
// ADD RATING (AFTER RIDE COMPLETION)
// ========================================
exports.addRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review, categories } = req.body;
    const userId = req.user._id;

    console.log('⭐ Adding rating for booking:', id);

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed bookings'
      });
    }

    const isDriver = booking.driver && booking.driver.toString() === userId.toString();
    const isPassenger = booking.passenger && booking.passenger.toString() === userId.toString();

    if (!isDriver && !isPassenger) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Initialize rating object if it doesn't exist
    if (!booking.rating) {
      booking.rating = {};
    }

    // Update booking rating
    if (isPassenger) {
      booking.rating.driverRating = {
        score: rating,
        review: review || '',
        categories: categories || {},
        ratedAt: new Date()
      };

      // Update driver's rating
      try {
        const driver = await User.findById(booking.driver);
        if (driver) {
          const currentRating = driver.ratings?.average || 0;
          const totalRatings = driver.ratings?.total || 0;
          const newAverage = ((currentRating * totalRatings) + rating) / (totalRatings + 1);
          
          await User.findByIdAndUpdate(booking.driver, {
            'ratings.average': newAverage,
            'ratings.total': totalRatings + 1
          });
        }
      } catch (driverError) {
        console.log('⚠️ Could not update driver rating:', driverError.message);
      }
    } else {
      booking.rating.passengerRating = {
        score: rating,
        review: review || '',
        ratedAt: new Date()
      };

      // Update passenger's rating
      try {
        const passenger = await User.findById(booking.passenger);
        if (passenger) {
          const currentRating = passenger.ratings?.average || 0;
          const totalRatings = passenger.ratings?.total || 0;
          const newAverage = ((currentRating * totalRatings) + rating) / (totalRatings + 1);
          
          await User.findByIdAndUpdate(booking.passenger, {
            'ratings.average': newAverage,
            'ratings.total': totalRatings + 1
          });
        }
      } catch (passengerError) {
        console.log('⚠️ Could not update passenger rating:', passengerError.message);
      }
    }

    await booking.save();

    console.log('✅ Rating added successfully');

    res.json({
      success: true,
      message: 'Rating added successfully',
      data: booking.rating
    });

  } catch (error) {
    console.error('❌ Add rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add rating',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

module.exports = exports;