const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { getRouteDetails } = require('../services/utils/routeMatching.js');
const { checkRouteMatch, calculateSegmentFare } =require('../services/utils/routeMatching.js');

// ========================================
// GOOGLE MAPS HELPER FUNCTIONS
// ========================================

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Check if a point lies on or near a route
 * Uses perpendicular distance from line segments
 */
const isPointOnRoute = (point, routeCoordinates, maxDetour = 5) => {
  if (!routeCoordinates || routeCoordinates.length < 2) return false;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const start = routeCoordinates[i];
    const end = routeCoordinates[i + 1];
    
    const distance = perpendicularDistance(point, start, end);
    
    if (distance <= maxDetour) {
      return true;
    }
  }
  
  return false;
};

/**
 * Calculate perpendicular distance from point to line segment
 */
const perpendicularDistance = (point, lineStart, lineEnd) => {
  const A = point.lat - lineStart.lat;
  const B = point.lng - lineStart.lng;
  const C = lineEnd.lat - lineStart.lat;
  const D = lineEnd.lng - lineStart.lng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.lat;
    yy = lineStart.lng;
  } else if (param > 1) {
    xx = lineEnd.lat;
    yy = lineEnd.lng;
  } else {
    xx = lineStart.lat + param * C;
    yy = lineStart.lng + param * D;
  }

  const dx = point.lat - xx;
  const dy = point.lng - yy;

  return Math.sqrt(dx * dx + dy * dy) * 111; // Convert to km
};

/**
 * Find matching waypoint for a location
 */
const findMatchingWaypoint = (location, waypoints, routeStart, routeEnd) => {
  const locationLower = location.toLowerCase().trim();
  
  // Check start
  if (routeStart.toLowerCase().includes(locationLower) || 
      locationLower.includes(routeStart.toLowerCase())) {
    return { location: routeStart, distanceFromStart: 0, matched: true };
  }
  
  // Check end
  if (routeEnd.toLowerCase().includes(locationLower) || 
      locationLower.includes(routeEnd.toLowerCase())) {
    return { location: routeEnd, matched: true };
  }
  
  // Check waypoints
  if (waypoints && waypoints.length > 0) {
    for (const wp of waypoints) {
      const wpLocation = wp.location.toLowerCase();
      if (wpLocation.includes(locationLower) || locationLower.includes(wpLocation)) {
        return { ...wp, matched: true };
      }
    }
  }
  
  return null;
};

// ========================================
// POST A NEW RIDE (DRIVER)
// ========================================

exports.postRide = async (req, res) => {
  const { 
    start, 
    end, 
    date, 
    time, 
    seats, 
    fare, 
    phoneNumber, 
    address, 
    vehicleNumber,
    fareMode,
    perKmRate,
    totalDistance,
    estimatedDuration,
    waypoints,
    routeCoordinates,
    routeMapURL,
    vehicle,
    driverInfo,
    preferences,
    notes,
    pickupInstructions,
    dropInstructions,
    tollIncluded,
    negotiableFare,
    recurringRide,
    recurringDays,
    allowPartialRoute,
    maxDetourAllowed,
    liveLocationSharing
  } = req.body;

  // Validate required fields
  if (!start || !end || !date || !time || !seats || fare === undefined || !phoneNumber || !address || !vehicleNumber) {
    return res.status(400).json({ 
      success: false,
      message: 'All required fields must be provided' 
    });
  }

  try {
    // ✅ NEW: Fetch route data if not provided
    let routeData = null;
    let finalRouteCoordinates = routeCoordinates || [];
    let finalTotalDistance = parseFloat(totalDistance) || 0;
    let finalEstimatedDuration = parseInt(estimatedDuration) || 0;
    
    // Only fetch route if coordinates not provided
    if (!routeCoordinates || routeCoordinates.length === 0) {
      console.log(`\n🗺️ Fetching route: ${start} → ${end}`);
      try {
        routeData = await getRouteDetails(start, end);
        finalRouteCoordinates = routeData.coordinates;
        finalTotalDistance = routeData.distance / 1000; // Convert meters to km
        finalEstimatedDuration = Math.round(routeData.duration / 60); // Convert seconds to minutes
        console.log(`✅ Route fetched: ${routeData.distanceText}, ${routeData.durationText}`);
      } catch (routeError) {
        console.warn('⚠️ Route fetch failed:', routeError.message);
        console.warn('   Ride will be created without route data');
      }
    } else {
      console.log('✅ Using provided route coordinates');
    }

    const rideData = {
      // ✅ SET ALL THREE DRIVER FIELDS
      driver: req.user._id,
      driverId: req.user._id,
      postedBy: req.user._id,
      
      start: start.trim(),
      end: end.trim(),
      date,
      time,
      seats: parseInt(seats),
      fare: parseFloat(fare),
      phoneNumber,
      address,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      
      // Pricing fields
      fareMode: fareMode || 'fixed',
      perKmRate: parseFloat(perKmRate) || 0,
      totalDistance: finalTotalDistance,
      estimatedDuration: finalEstimatedDuration,
      
      // ✅ Route fields - Use fetched or provided data
      routeCoordinates: finalRouteCoordinates,
      routePolyline: routeData?.polyline || null,
      waypoints: waypoints || [],
      routeMapURL: routeMapURL || '',
      allowPartialRoute: allowPartialRoute !== false,
      maxDetourAllowed: parseFloat(maxDetourAllowed) || 5,
      
      // Vehicle details
      vehicle: {
        number: vehicleNumber.toUpperCase().trim(),
        type: vehicle?.type || 'Sedan',
        model: vehicle?.model || '',
        color: vehicle?.color || '',
        acAvailable: vehicle?.acAvailable !== false,
        luggageSpace: vehicle?.luggageSpace || 'Medium'
      },
      
      // Driver details (embedded object)
      driverInfo: driverInfo || {
        name: req.user.name || '',
        phone: phoneNumber,
        photoURL: req.user.avatar || '',
        gender: '',
        age: null,
        drivingLicenseNumber: '',
        emergencyContact: '',
        emergencyContactName: '',
        verified: false
      },
      
      // Preferences
      preferences: preferences || {
        smokingAllowed: false,
        musicAllowed: true,
        petFriendly: false,
        talkative: true,
        pickupFlexibility: true,
        luggageAllowed: true,
        childSeatAvailable: false,
        womenOnly: false
      },
      
      // Additional info
      notes: notes || '',
      pickupInstructions: pickupInstructions || '',
      dropInstructions: dropInstructions || '',
      tollIncluded: tollIncluded || false,
      negotiableFare: negotiableFare || false,
      
      // Recurring rides
      recurringRide: recurringRide || false,
      recurringDays: Array.isArray(recurringDays) 
        ? recurringDays.map(day => day.toLowerCase()) 
        : [],
      
      // Safety
      liveLocationSharing: liveLocationSharing || false,
      
      // Status
      rideStatus: 'active',
      isActive: true
    };

    const ride = new Ride(rideData);
    await ride.save();
    
    const populatedRide = await Ride.findById(ride._id)
      .populate('driver', 'name email phone avatar ratings')
      .populate('driverId', 'name email phone avatar')
      .populate('postedBy', 'name email phone avatar');
    
    console.log('✅ Ride created:', ride._id);
    if (finalRouteCoordinates.length > 0) {
      console.log(`   With route: ${finalTotalDistance.toFixed(2)}km, ${finalEstimatedDuration}min`);
    }
    
    res.status(201).json({
      success: true,
      message: 'Ride posted successfully',
      data: populatedRide
    });
  } catch (error) {
    console.error('❌ Ride creation error:', error.message);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ========================================
// GET MY RIDES (DRIVER) - FIXED VERSION
// ========================================
exports.getMyRides = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('📋 GET MY RIDES REQUEST');
    console.log('========================================');
    
    const userId = req.user._id || req.user.id;
    console.log('User ID:', userId);

    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(401).json({ 
        success: false,
        message: 'User ID not found' 
      });
    }

    const { status, limit = 50, page = 1, includeInactive = 'false' } = req.query;
    console.log('Query params:', { status, limit, page, includeInactive });

    // ✅ BUILD QUERY WITH PROPER STRUCTURE
    const query = { 
      $or: [
        { driverId: userId },
        { postedBy: userId },
        { driver: userId }
      ]
    };
    
    console.log('\n📝 Base query:', JSON.stringify(query, null, 2));
    
    // ✅ CRITICAL FIX: Filter out cancelled rides by default
    // Apply these filters OUTSIDE the $or clause
    if (includeInactive !== 'true') {
      // Only show active rides
      query.rideStatus = 'active';  // ✅ Changed from { $ne: 'cancelled' } to explicit 'active'
      query.isActive = true;
      console.log('✅ Filtering: Only showing ACTIVE rides');
    } else {
      console.log('⚠️ Including inactive rides');
    }
    
    // If specific status requested, override
    if (status && status !== 'active') {
      query.rideStatus = status;
      console.log('✅ Overriding with specific status:', status);
    }

    console.log('\n📝 Final query:', JSON.stringify(query, null, 2));

    // Execute query
    console.log('\n🔍 Executing database query...');
    const rides = await Ride.find(query)
      .populate('driverId', 'name email phone avatar ratings')
      .populate('postedBy', 'name email phone avatar ratings')
      .populate({
        path: 'bookings',
        populate: { path: 'passengerId', select: 'name email phone avatar ratings' }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    console.log('\n✅ Query executed successfully');
    console.log('Results:');
    console.log('- Total rides found:', rides.length);
    
    if (rides.length > 0) {
      console.log('- Ride IDs:', rides.map(r => r._id));
      console.log('- Ride statuses:', rides.map(r => `${r._id.toString().slice(-6)}: ${r.rideStatus}`));
      console.log('- Active flags:', rides.map(r => `${r._id.toString().slice(-6)}: ${r.isActive}`));
      
      // ✅ DOUBLE CHECK: Filter out any cancelled rides that slipped through
      const cancelledInResults = rides.filter(r => r.rideStatus === 'cancelled' || r.isActive === false);
      if (cancelledInResults.length > 0) {
        console.log('\n⚠️⚠️⚠️ WARNING: Found cancelled/inactive rides in results!');
        console.log('IDs:', cancelledInResults.map(r => r._id));
        console.log('These will be filtered out in the response');
        
        // Filter them out before sending to client
        const activeRides = rides.filter(r => r.rideStatus === 'active' && r.isActive === true);
        console.log('After filtering:', activeRides.length, 'active rides');
        
        res.json({
          success: true,
          count: activeRides.length,
          total: activeRides.length,
          data: activeRides,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(activeRides.length / parseInt(limit))
          }
        });
        return;
      } else {
        console.log('\n✅ No cancelled rides in results (correct!)');
      }
    } else {
      console.log('- No rides found for this user');
    }

    const total = await Ride.countDocuments(query);

    console.log('========================================');
    console.log('📤 Sending response to client');
    console.log('========================================\n');

    res.json({
      success: true,
      count: rides.length,
      total,
      data: rides,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ GET MY RIDES ERROR');
    console.error('========================================');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching rides',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ========================================
// DELETE/CANCEL RIDE - FIXED VERSION
// ========================================
exports.deleteRide = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🗑️ DELETE RIDE REQUEST');
    console.log('========================================');
    console.log('Ride ID:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      console.log('❌ Ride not found in database');
      return res.status(404).json({ 
        success: false,
        message: 'Ride not found' 
      });
    }

    console.log('\n📋 BEFORE DELETE - Ride details:');
    console.log('- ID:', ride._id);
    console.log('- Status:', ride.rideStatus);
    console.log('- Is Active:', ride.isActive);

    // Check authorization
    const userId = req.user._id.toString();
    const driverId = ride.driverId?.toString() || '';
    const postedById = ride.postedBy?.toString() || '';
    const rideDriverId = ride.driver?.toString() || '';
    
    const isAuthorized = (
      driverId === userId || 
      postedById === userId || 
      rideDriverId === userId
    );
    
    if (!isAuthorized) {
      console.log('❌ User not authorized');
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this ride' 
      });
    }

    console.log('✅ User is authorized');

    // SOFT DELETE
    const { cancellationReason } = req.body;
    
    console.log('\n📝 Updating ride status...');
    ride.rideStatus = 'cancelled';
    ride.isActive = false;
    ride.cancelledAt = new Date();
    if (cancellationReason) {
      ride.cancellationReason = cancellationReason;
    }

    // Save the ride
    await ride.save();
    console.log('✅ Ride saved to database');

    // Verify the update IMMEDIATELY
    const verifyRide = await Ride.findById(ride._id).lean();
    console.log('\n🔍 VERIFICATION:');
    console.log('- Status in DB:', verifyRide.rideStatus);
    console.log('- Is Active in DB:', verifyRide.isActive);
    console.log('- Cancelled At:', verifyRide.cancelledAt);

    if (verifyRide.rideStatus !== 'cancelled' || verifyRide.isActive !== false) {
      console.log('⚠️⚠️⚠️ ERROR: Ride status NOT updated correctly!');
      return res.status(500).json({
        success: false,
        message: 'Failed to update ride status in database'
      });
    }

    console.log('✅ Ride status verified in database');

    // Cancel related bookings
    console.log('\n📋 Cancelling related bookings...');
    await Booking.updateMany(
      { rideId: ride._id, status: { $in: ['pending', 'accepted', 'confirmed'] } },
      { 
        status: 'cancelled',
        'cancellation.cancelledBy': 'driver',
        'cancellation.reason': cancellationReason || 'Ride cancelled by driver',
        'cancellation.cancelledAt': new Date()
      }
    );

    console.log('\n========================================');
    console.log('✅ DELETE COMPLETED SUCCESSFULLY');
    console.log('========================================\n');

    res.json({ 
      success: true,
      message: 'Ride cancelled successfully', 
      data: {
        _id: ride._id,
        rideStatus: 'cancelled',
        isActive: false,
        cancelledAt: ride.cancelledAt
      }
    });
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ DELETE RIDE ERROR');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// ADVANCED SEARCH RIDES WITH PARTIAL ROUTE MATCHING
// ========================================
// ========================================
// SMART SEARCH WITH ROUTE MATCHING
// ========================================

exports.searchRides = async (req, res) => {
  console.log('\n========================================');
  console.log('🔍 SMART SEARCH WITH ROUTE MATCHING');  // ← NEW LOG
  console.log('========================================');
  
  try {
    const { 
      start,
      end, 
      date, 
      minSeats,
      maxFare, 
      vehicleType,
      acAvailable,
      petFriendly,
      womenOnly,
      musicAllowed,
      smokingAllowed,
      includePartialRoutes
    } = req.query;

    console.log('📥 Search:', start, '→', end);

    if (!start || !end) {
      return res.status(400).json({ 
        success: false,
        message: 'Start and end locations are required' 
      });
    }

    // Build base query
    const query = {
      isActive: true,
      rideStatus: 'active'
    };

    // Date filter
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { 
        $gte: searchDate, 
        $lt: nextDay 
      };
    } else {
      query.date = { $gte: new Date() };
    }

    // Filters
    if (minSeats) query.seats = { $gte: parseInt(minSeats) };
    if (maxFare) query.fare = { $lte: parseFloat(maxFare) };
    if (vehicleType) query['vehicle.type'] = vehicleType;
    if (acAvailable === 'true') query['vehicle.acAvailable'] = true;
    if (petFriendly === 'true') query['preferences.petFriendly'] = true;
    if (womenOnly === 'true') query['preferences.womenOnly'] = true;
    if (musicAllowed === 'true') query['preferences.musicAllowed'] = true;
    if (smokingAllowed === 'true') query['preferences.smokingAllowed'] = true;

    // Find all potential rides
    const allRides = await Ride.find(query)
      .populate('driverId', 'name email phone avatar ratings')
      .populate('postedBy', 'name email phone avatar ratings')
      .sort({ date: 1, time: 1 })
      .lean();

    console.log(`📊 Found ${allRides.length} potential rides`);

    // ✅ STEP 1: Text-based matching (fast)
    const textMatched = [];
    const startLower = start.toLowerCase().trim();
    const endLower = end.toLowerCase().trim();

    for (const ride of allRides) {
      const rideStartLower = ride.start.toLowerCase();
      const rideEndLower = ride.end.toLowerCase();
      
      // Exact text match
      if ((rideStartLower.includes(startLower) || startLower.includes(rideStartLower)) &&
          (rideEndLower.includes(endLower) || endLower.includes(rideEndLower))) {
        textMatched.push({
          ...ride,
          matchType: 'exact',
          matchQuality: 100,
          matchedPickup: ride.start,
          matchedDrop: ride.end,
        });
      }
      // Partial text match
      else if (ride.allowPartialRoute && includePartialRoutes !== 'false') {
        const pickupWp = findMatchingWaypoint(start, ride.waypoints, ride.start, ride.end);
        const dropWp = findMatchingWaypoint(end, ride.waypoints, ride.start, ride.end);
        
        if (pickupWp && dropWp) {
          const pickupDist = pickupWp.distanceFromStart || 0;
          const dropDist = dropWp.distanceFromStart || (ride.totalDistance || 0);
          
          if (pickupDist < dropDist) {
            textMatched.push({
              ...ride,
              matchType: 'partial',
              matchQuality: 80,
              matchedPickup: pickupWp.location,
              matchedDrop: dropWp.location,
            });
          }
        }
      }
    }

    console.log(`✅ Text matched: ${textMatched.length} rides`);

    // ✅ STEP 2: Route matching for rides with coordinates
    const routeMatched = [];
    const tolerance = 15000; // 15km tolerance (flexible for straight-line approximation)

    for (const ride of allRides) {
      // Skip if already text-matched
      if (textMatched.find(r => r._id.toString() === ride._id.toString())) {
        continue;
      }

      // Only check rides with route data
      if (!ride.routeCoordinates || ride.routeCoordinates.length === 0) {
        console.log(`⚠️ Ride ${ride._id} has no route coordinates, skipping`);
        continue;
      }

      console.log(`\n🔍 Checking ride ${ride._id}: ${ride.start} → ${ride.end}`);
      console.log(`   Route has ${ride.routeCoordinates.length} coordinates`);

      try {
        const driverRoute = {
          start: ride.start,
          end: ride.end,
          coordinates: ride.routeCoordinates,
          polyline: ride.routePolyline,
        };

        const match = await checkRouteMatch(driverRoute, start, end, tolerance);

        if (match.isMatch) {
          console.log(`✅ MATCH! Quality: ${match.matchQuality}%`);
          
          // Calculate segment fare
          const fareDetails = calculateSegmentFare(ride, match.segmentDistance);

          routeMatched.push({
            ...ride,
            matchType: 'on_route',
            matchQuality: match.matchQuality,
            matchedPickup: start,
            matchedDrop: end,
            pickupDistanceFromRoute: match.pickupDistance,
            dropDistanceFromRoute: match.dropDistance,
            segmentDistance: match.segmentDistanceKm,
            userSearchDistance: parseFloat(match.segmentDistanceKm),
            segmentFare: fareDetails.totalFare,
            fareBreakdown: fareDetails,
            userSearchDistance: parseFloat(match.segmentDistanceKm), // ✅ Frontend needs this
userRouteCoordinates: match.segmentCoordinates, // ✅ For map display
pickupCoordinates: match.pickupCoordinates,
dropCoordinates: match.dropCoordinates,
userPickup: start, // ✅ Show what user searched
userDrop: end,
          });
        } else {
          console.log(`❌ No match: ${match.reason}`);
        }
      } catch (error) {
        console.error(`⚠️ Route match error for ride ${ride._id}:`, error.message);
      }
    }

    console.log(`✅ Route matched: ${routeMatched.length} rides`);

    // ✅ STEP 3: Combine and sort results
    const allMatched = [...routeMatched, ...textMatched];

    // Add segment info to text-matched rides
    allMatched.forEach(ride => {
      if (!ride.segmentDistance) {
        ride.segmentDistance = ride.totalDistance || 0;
      }
      if (!ride.segmentFare) {
        ride.segmentFare = ride.fare;
      }
      ride.availableSeats = ride.availableSeats || ride.seats;
      ride.isFull = ride.availableSeats === 0;
    });

    // Sort: route-matched first, then by quality, then by date
    allMatched.sort((a, b) => {
      if (a.matchType === 'on_route' && b.matchType !== 'on_route') return -1;
      if (b.matchType === 'on_route' && a.matchType !== 'on_route') return 1;
      if (b.matchQuality !== a.matchQuality) return b.matchQuality - a.matchQuality;
      if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
      return (a.segmentFare || a.fare) - (b.segmentFare || b.fare);
    });

    console.log(`\n📦 Returning ${allMatched.length} total rides`);
    console.log('   - On-route matches:', routeMatched.length);
    console.log('   - Text matches:', textMatched.length);
    console.log('========================================\n');

    res.json({
      success: true,
      count: allMatched.length,
      data: allMatched,
      meta: {
        onRouteMatches: routeMatched.length,
        textMatches: textMatched.length,
        tolerance: `${tolerance / 1000}km`,
      }
    });

  } catch (error) {
    console.error('❌ SEARCH ERROR:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// GET RIDE BY ID
// ========================================
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driverId', 'name email phone avatar ratings')
      .populate('postedBy', 'name email phone avatar ratings')
      .populate('bookings')
      .lean();

    if (!ride) {
      return res.status(404).json({ 
        success: false,
        message: 'Ride not found' 
      });
    }

    res.json({
      success: true,
      data: ride
    });
  } catch (error) {
    console.error('❌ Get ride error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
};

// ========================================
// UPDATE RIDE
// ========================================
exports.updateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ 
        success: false,
        message: 'Ride not found' 
      });
    }

    // Check authorization
    if (ride.driverId.toString() !== req.user._id.toString() && 
        ride.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'start', 'end', 'date', 'time', 'seats', 'fare', 'phoneNumber', 'address', 
      'vehicleNumber', 'isActive', 'fareMode', 'perKmRate', 'totalDistance',
      'estimatedDuration', 'waypoints', 'routeCoordinates', 'vehicle', 'driverInfo',
      'preferences', 'notes', 'pickupInstructions', 'dropInstructions', 
      'tollIncluded', 'negotiableFare', 'recurringRide', 'recurringDays', 
      'allowPartialRoute', 'maxDetourAllowed', 'liveLocationSharing'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'vehicleNumber') {
          ride[field] = req.body[field].toUpperCase().trim();
        } else {
          ride[field] = req.body[field];
        }
      }
    });

    await ride.save();

    const updatedRide = await Ride.findById(ride._id)
      .populate('driverId', 'name email phone avatar')
      .populate('postedBy', 'name email phone avatar')
      .lean();

    res.json({
      success: true,
      message: 'Ride updated successfully',
      data: updatedRide
    });
  } catch (error) {
    console.error('❌ Update ride error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
};

// ========================================
// UPDATE RIDE STATUS
// ========================================
exports.updateRideStatus = async (req, res) => {
  try {
    const { rideStatus, cancellationReason } = req.body;
    
    const validStatuses = ['active', 'in_progress', 'completed', 'cancelled', 'expired'];
    if (!rideStatus || !validStatuses.includes(rideStatus)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid ride status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ 
        success: false,
        message: 'Ride not found' 
      });
    }

    // Check authorization
    if (ride.driverId.toString() !== req.user._id.toString() && 
        ride.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    ride.rideStatus = rideStatus;
    
    if (rideStatus === 'completed') {
      ride.isActive = false;
      await Booking.updateMany(
        { rideId: ride._id, status: 'accepted' },
        { status: 'completed', 'tracking.completedAt': new Date() }
      );
    } else if (rideStatus === 'cancelled') {
      ride.isActive = false;
      ride.cancelledAt = new Date();
      if (cancellationReason) {
        ride.cancellationReason = cancellationReason;
      }
    }

    await ride.save();

    res.json({
      success: true,
      message: `Ride status updated to ${rideStatus}`,
      data: ride
    });
  } catch (error) {
    console.error('❌ Update ride status error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
};

// ========================================
// GET RIDE BOOKINGS (DRIVER VIEW)
// ========================================
exports.getRideBookings = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('bookings')
      .lean();

    if (!ride) {
      return res.status(404).json({ 
        success: false,
        message: 'Ride not found' 
      });
    }

    // Check authorization
    if (ride.driverId.toString() !== req.user._id.toString() && 
        ride.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    res.json({
      success: true,
      count: ride.bookings?.length || 0,
      data: ride.bookings || []
    });
  } catch (error) {
    console.error('❌ Get ride bookings error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
};

// ========================================
// TEST CANCELLED RIDES - DEBUG ENDPOINT
// ========================================
exports.testCancelledRides = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('\n========================================');
    console.log('🧪 TEST: Checking for cancelled rides');
    console.log('========================================');
    
    // Find ALL rides for this user
    const allRides = await Ride.find({
      $or: [
        { driverId: userId },
        { postedBy: userId },
        { driver: userId }
      ]
    }).lean();
    
    console.log('Total rides for user:', allRides.length);
    
    const cancelled = allRides.filter(r => r.rideStatus === 'cancelled');
    const active = allRides.filter(r => r.rideStatus === 'active' && r.isActive === true);
    const other = allRides.filter(r => r.rideStatus !== 'cancelled' && r.rideStatus !== 'active');
    
    console.log('- Cancelled:', cancelled.length);
    console.log('- Active:', active.length);
    console.log('- Other statuses:', other.length);
    
    if (cancelled.length > 0) {
      console.log('\nCancelled ride IDs:', cancelled.map(r => r._id));
      console.log('Cancelled ride statuses:', cancelled.map(r => ({
        id: r._id,
        status: r.rideStatus,
        isActive: r.isActive
      })));
    }
    
    res.json({
      success: true,
      summary: {
        total: allRides.length,
        cancelled: cancelled.length,
        active: active.length,
        other: other.length
      },
      cancelledRides: cancelled.map(r => ({
        id: r._id,
        status: r.rideStatus,
        isActive: r.isActive,
        cancelledAt: r.cancelledAt
      })),
      activeRides: active.map(r => ({
        id: r._id,
        status: r.rideStatus,
        isActive: r.isActive
      }))
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// INCREMENT VIEW COUNT
// ========================================
exports.incrementViewCount = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ 
        success: false,
        message: 'Ride not found' 
      });
    }

    ride.viewCount = (ride.viewCount || 0) + 1;
    await ride.save();

    res.json({ 
      success: true,
      message: 'View count updated',
      viewCount: ride.viewCount
    });
  } catch (error) {
    console.error('❌ Increment view count error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
};

// ========================================
// GET FEATURED RIDES
// ========================================
exports.getFeaturedRides = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const rides = await Ride.find({
      isActive: true,
      rideStatus: 'active',
      date: { $gte: new Date() },
      $or: [
        { featured: true },
        { verified: true }
      ]
    })
      .populate('driverId', 'name email phone avatar ratings')
      .populate('postedBy', 'name email phone avatar ratings')
      .sort({ featured: -1, verified: -1, ratingSummary: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      count: rides.length,
      data: rides
    });
  } catch (error) {
    console.error('❌ Get featured rides error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
};

module.exports = exports;