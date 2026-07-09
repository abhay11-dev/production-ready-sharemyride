// controllers/rideController.js
// Updated: postRide now accepts pickup{}/destination{} Geoapify objects
//          and stores coordinates on the ride.
//          searchRides now accepts pickupLat/pickupLng/destLat/destLng
//          and ranks results by Haversine distance when coordinates are present.
//          NEW: postRide now actually creates a linked, fully independent
//          return-leg Ride when isRoundTrip is true (previously a silent no-op).
//          All other functions (getMyRides, deleteRide, updateRide, etc.) unchanged.

const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const { getRouteDetails } = require('../services/utils/routeMatching.js');
const { checkRouteMatch, calculateSegmentFare } = require('../services/utils/routeMatching.js');

// ─── Validators / helpers ─────────────────────────────────────────────────────

const isValidISODateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const normalizeIndiaLocation = (value) => {
  const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return /\bindia\b/i.test(cleaned) ? cleaned : `${cleaned}, India`;
};

// ─── Haversine distance (km) ──────────────────────────────────────────────────
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const perpendicularDistance = (point, lineStart, lineEnd) => {
  const A = point.lat - lineStart.lat;
  const B = point.lng - lineStart.lng;
  const C = lineEnd.lat - lineStart.lat;
  const D = lineEnd.lng - lineStart.lng;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;
  const xx = param < 0 ? lineStart.lat : param > 1 ? lineEnd.lat : lineStart.lat + param * C;
  const yy = param < 0 ? lineStart.lng : param > 1 ? lineEnd.lng : lineStart.lng + param * D;
  return Math.sqrt((point.lat - xx) ** 2 + (point.lng - yy) ** 2) * 111;
};

const findMatchingWaypoint = (location, waypoints, routeStart, routeEnd) => {
  const loc = location.toLowerCase().trim();
  if (routeStart.toLowerCase().includes(loc) || loc.includes(routeStart.toLowerCase()))
    return { location: routeStart, distanceFromStart: 0, matched: true };
  if (routeEnd.toLowerCase().includes(loc) || loc.includes(routeEnd.toLowerCase()))
    return { location: routeEnd, matched: true };
  if (waypoints?.length) {
    for (const wp of waypoints) {
      const wpLoc = wp.location.toLowerCase();
      if (wpLoc.includes(loc) || loc.includes(wpLoc)) return { ...wp, matched: true };
    }
  }
  return null;
};

// ─── Build a Geoapify location object from the request body ──────────────────
const buildLocationObject = (locInput, fallbackText) => {
  if (locInput && typeof locInput === 'object' && locInput.address) {
    return {
      address: String(locInput.address).trim(),
      latitude: typeof locInput.latitude === 'number' ? locInput.latitude : null,
      longitude: typeof locInput.longitude === 'number' ? locInput.longitude : null,
      placeId: locInput.placeId || '',
      city: locInput.city || '',
      state: locInput.state || '',
      country: locInput.country || 'India',
      formatted: locInput.formatted || String(locInput.address).trim(),
    };
  }
  const text = String(fallbackText || '').trim();
  return {
    address: text,
    latitude: null,
    longitude: null,
    placeId: '',
    city: '',
    state: '',
    country: 'India',
    formatted: text,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// POST A NEW RIDE
// Accepts optional pickup{} / destination{} Geoapify objects alongside the
// existing start / end plain-text fields.
// NEW: when isRoundTrip is true, also creates a fully independent, linked
// return-leg Ride (swapped pickup/destination, returnDate/returnTime), and
// cross-links both legs via roundTripGroupId / linkedRideId / tripLeg.
// requireVerifiedDriver middleware must be applied on the route.
// ═══════════════════════════════════════════════════════════════════════════
exports.postRide = async (req, res) => {
  const {
    start, end,
    pickup, destination,
    date, time, seats, fare, phoneNumber, address, vehicleNumber,
    fareMode, perKmRate, totalDistance, estimatedDuration,
    waypoints, routeCoordinates, routeMapURL,
    vehicle, preferences, notes, pickupInstructions,
    tollIncluded, negotiableFare,
    isRoundTrip, returnDate, returnTime, reusePreviousTripOptions,
    recurringRide, recurringDays,
    allowPartialRoute, maxDetourAllowed,
    liveLocationSharing
  } = req.body;

  const resolvedStart = (pickup?.address || start || '').trim();
  const resolvedEnd = (destination?.address || end || '').trim();

  if (!resolvedStart || !resolvedEnd || !date || !time || !seats ||
    fare === undefined || !phoneNumber || !address || !vehicleNumber) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: start/pickup, end/destination, date, time, seats, fare, phoneNumber, address, vehicleNumber'
    });
  }

  if (!isValidISODateOnly(date)) {
    return res.status(400).json({ success: false, message: 'Date must be a valid YYYY-MM-DD value' });
  }

  // ─── Round trip validation ───────────────────────────────────────────────
  if (isRoundTrip && !returnDate) {
    return res.status(400).json({ success: false, message: 'Return date is required for a round trip' });
  }
  if (isRoundTrip && !isValidISODateOnly(returnDate)) {
    return res.status(400).json({ success: false, message: 'Return date must be a valid YYYY-MM-DD value' });
  }

  try {
    const normalizedStart = normalizeIndiaLocation(resolvedStart);
    const normalizedEnd = normalizeIndiaLocation(resolvedEnd);

    if (normalizedStart.length < 6 || normalizedEnd.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Enter a more specific Indian pickup and destination'
      });
    }

    const pickupLocation = buildLocationObject(pickup, normalizedStart);
    const destinationLocation = buildLocationObject(destination, normalizedEnd);

    if (!pickupLocation.address) pickupLocation.address = normalizedStart;
    if (!destinationLocation.address) destinationLocation.address = normalizedEnd;

    let finalRouteCoordinates = routeCoordinates || [];
    let finalTotalDistance = parseFloat(totalDistance) || 0;
    let finalEstimatedDuration = parseInt(estimatedDuration) || 0;
    let routePolyline = null;

    if (!routeCoordinates?.length) {
      try {
        const routeData = await getRouteDetails(normalizedStart, normalizedEnd);
        finalRouteCoordinates = routeData.coordinates;
        finalTotalDistance = routeData.distance / 1000;
        finalEstimatedDuration = Math.round(routeData.duration / 60);
        routePolyline = routeData.polyline || null;
        console.log(`✅ Route fetched: ${routeData.distanceText}, ${routeData.durationText}`);
      } catch (routeError) {
        console.warn('⚠️ Route fetch failed:', routeError.message);
      }
    }

    const driverInfoFromUser = {
      name: req.user.name || '',
      phone: req.user.phone || phoneNumber,
      photoURL: req.user.driverVerification?.profilePhoto?.url || req.user.avatar || '',
      gender: req.user.gender || '',
      drivingLicenseNumber: req.user.driverVerification?.drivingLicense?.number || '',
      emergencyContact: req.user.emergencyContact || '',
      emergencyContactName: req.user.emergencyContactName || '',
      verified: true
    };

    const rideData = {
      driver: req.user._id,
      driverId: req.user._id,
      postedBy: req.user._id,

      start: normalizedStart,
      end: normalizedEnd,

      pickup: pickupLocation,
      destination: destinationLocation,

      date,
      time,
      seats: parseInt(seats),
      availableSeats: parseInt(seats),
      fare: parseFloat(fare),

      fareMode: fareMode || 'fixed',
      perKmRate: parseFloat(perKmRate) || 0,
      totalDistance: finalTotalDistance,
      estimatedDuration: finalEstimatedDuration,
      tollIncluded: !!tollIncluded,
      negotiableFare: !!negotiableFare,

      vehicle: {
        number: vehicleNumber.toUpperCase().trim(),
        type: vehicle?.type || 'Sedan',
        model: vehicle?.model || '',
        color: vehicle?.color || '',
        acAvailable: vehicle?.acAvailable !== false,
        luggageSpace: vehicle?.luggageSpace || 'Medium'
      },
      vehicleNumber: vehicleNumber.toUpperCase().trim(),

      driverInfo: driverInfoFromUser,

      routeCoordinates: finalRouteCoordinates,
      routePolyline,
      waypoints: Array.isArray(waypoints)
        ? waypoints.map((w, i) => ({
          ...w,
          location: normalizeIndiaLocation(w.location),
          order: w.order || i + 1
        })).filter(w => w.location)
        : [],
      routeMapURL: routeMapURL || '',
      allowPartialRoute: allowPartialRoute !== false,
      maxDetourAllowed: parseFloat(maxDetourAllowed) || 5,

      preferences: {
        smokingAllowed: preferences?.smokingAllowed || false,
        musicAllowed: preferences?.musicAllowed !== false,
        petFriendly: preferences?.petFriendly || false,
        luggageAllowed: preferences?.luggageAllowed !== false,
        womenOnly: preferences?.womenOnly || false,
        talkative: preferences?.talkative !== false,
        childSeatAvailable: preferences?.childSeatAvailable || false,
        pickupFlexibility: preferences?.pickupFlexibility !== false
      },

      notes: notes?.trim() || '',
      pickupInstructions: pickupInstructions?.trim() || '',
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),

      recurringRide: !!recurringRide,
      recurringDays: Array.isArray(recurringDays)
        ? recurringDays.map(d => d.toLowerCase())
        : [],

      // NEW: round trip fields on the outbound leg
      isRoundTrip: !!isRoundTrip,
      returnDate: isRoundTrip ? new Date(returnDate) : null,
      returnTime: isRoundTrip ? (returnTime || time) : null,

      liveLocationSharing: !!liveLocationSharing,
      rideStatus: 'active',
      isActive: true
    };

    const ride = new Ride(rideData);
    await ride.save();

    // ─── NEW: create the linked, fully independent return leg ──────────────
    let returnRidePopulated = null;

    if (isRoundTrip && returnDate) {
      const reuse = reusePreviousTripOptions !== false; // default true

      const returnRideData = {
        driver: req.user._id,
        driverId: req.user._id,
        postedBy: req.user._id,

        // Swapped route — the return leg's own reference, never mutated
        // by or tied back to the outbound ride's route data.
        start: normalizedEnd,
        end: normalizedStart,
        pickup: destinationLocation,
        destination: pickupLocation,

        date: returnDate,
        time: returnTime || time,
        seats: parseInt(seats),
        availableSeats: parseInt(seats),
        fare: parseFloat(fare),

        fareMode: reuse ? (fareMode || 'fixed') : 'fixed',
        perKmRate: reuse ? (parseFloat(perKmRate) || 0) : 0,
        totalDistance: finalTotalDistance,
        estimatedDuration: finalEstimatedDuration,
        tollIncluded: reuse ? !!tollIncluded : false,
        negotiableFare: reuse ? !!negotiableFare : false,

        vehicle: rideData.vehicle,
        vehicleNumber: rideData.vehicleNumber,
        driverInfo: driverInfoFromUser,

        routeCoordinates: [],
        routePolyline: null,
        waypoints: [],
        routeMapURL: '',
        allowPartialRoute: reuse ? (allowPartialRoute !== false) : true,
        maxDetourAllowed: reuse ? (parseFloat(maxDetourAllowed) || 5) : 5,

        preferences: reuse ? rideData.preferences : {
          smokingAllowed: false,
          musicAllowed: true,
          petFriendly: false,
          luggageAllowed: true,
          womenOnly: false,
          talkative: true,
          childSeatAvailable: false,
          pickupFlexibility: true
        },

        notes: reuse ? (notes?.trim() || '') : '',
        pickupInstructions: reuse ? (pickupInstructions?.trim() || '') : '',
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),

        recurringRide: false,
        recurringDays: [],

        isRoundTrip: true,
        returnDate: new Date(returnDate),
        returnTime: returnTime || time,
        tripLeg: 'return',

        liveLocationSharing: !!liveLocationSharing,
        rideStatus: 'active',
        isActive: true
      };

      const returnRide = new Ride(returnRideData);
      await returnRide.save();

      // Cross-link both legs under a single shared group id.
      // Neither leg mutates the other's route/fare/booking data — only
      // these three linking fields are set, after both docs already exist.
      const groupId = new mongoose.Types.ObjectId();

      ride.roundTripGroupId = groupId;
      ride.linkedRideId = returnRide._id;
      ride.tripLeg = 'outbound';
      await ride.save();

      returnRide.roundTripGroupId = groupId;
      returnRide.linkedRideId = ride._id;
      await returnRide.save();

      returnRidePopulated = await Ride.findById(returnRide._id)
        .populate('driver', 'name email phone avatar ratingSummary')
        .populate('driverId', 'name email phone avatar')
        .lean();
    }

    const populated = await Ride.findById(ride._id)
      .populate('driver', 'name email phone avatar ratingSummary')
      .populate('driverId', 'name email phone avatar')
      .lean();

    console.log('✅ Ride posted:', ride._id,
      '| pickup coords:', pickupLocation.latitude, pickupLocation.longitude,
      '| dest coords:', destinationLocation.latitude, destinationLocation.longitude,
      isRoundTrip ? `| round trip → return leg ${returnRidePopulated?._id}` : '');

    res.status(201).json({
      success: true,
      message: isRoundTrip ? 'Round trip posted successfully — both legs created' : 'Ride posted successfully',
      data: populated,
      returnRide: returnRidePopulated // null when isRoundTrip is false
    });
  } catch (error) {
    console.error('❌ postRide error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET MY RIDES (DRIVER) — UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════
exports.getMyRides = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 50, page = 1 } = req.query;

    const VALID_STATUSES = ['active', 'in_progress', 'completed', 'cancelled', 'expired'];

    const query = {
      $or: [{ driverId: userId }, { postedBy: userId }, { driver: userId }],
    };

    if (status && VALID_STATUSES.includes(status)) {
      query.rideStatus = status;
      if (status === 'active') query.isActive = true;
    }

    const [rides, total] = await Promise.all([
      Ride.find(query)
        .populate('driverId', 'name email phone avatar ratingSummary')
        .populate({
          path: 'bookings',
          populate: { path: 'passenger', select: 'name email phone avatar' }
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Ride.countDocuments(query)
    ]);

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
    console.error('getMyRides error:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching rides' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DELETE / CANCEL RIDE — UNCHANGED (Bug #2 still present, not in scope this pass)
// ═══════════════════════════════════════════════════════════════════════════
exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const userId = req.user._id.toString();
    const isOwner = [ride.driverId, ride.postedBy, ride.driver]
      .some(id => id?.toString() === userId);

    if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });

    if (ride.rideStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Ride is already cancelled' });
    }

    ride.rideStatus = 'cancelled';
    ride.isActive = false;
    ride.cancelledAt = new Date();
    if (req.body.cancellationReason) ride.cancellationReason = req.body.cancellationReason;

    await ride.save();

    await Booking.updateMany(
      { ride: ride._id, status: { $in: ['pending', 'accepted'] } },
      {
        status: 'cancelled',
        cancelledBy: 'driver',
        cancellationReason: req.body.cancellationReason || 'Ride cancelled by driver',
        cancelledAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Ride cancelled successfully',
      data: {
        _id: ride._id, rideStatus: 'cancelled',
        isActive: false, cancelledAt: ride.cancelledAt
      }
    });
  } catch (error) {
    console.error('❌ deleteRide error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH RIDES — UNCHANGED FROM PRIOR SESSION
// ═══════════════════════════════════════════════════════════════════════════
const TIER_META = {
  1: { matchType: 'exact', label: 'Exact match — same pickup and drop' },
  2: { matchType: 'exact', label: 'Same destination, different pickup point' },
  3: { matchType: 'nearby', label: 'Same state as your pickup location' },
  4: { matchType: 'nearby', label: 'Nearby pickup point' },
  5: { matchType: 'nearby', label: 'Nearby drop point' },
  6: { matchType: 'partial', label: 'On the driver\'s route — partial ride possible' },
  7: { matchType: 'negotiation', label: 'Fare is negotiable — discuss pickup, drop or timing with the driver' },
};

exports.searchRides = async (req, res) => {
  try {
    const {
      start, end, date, minSeats, maxFare,
      vehicleType, acAvailable, petFriendly, womenOnly,
      musicAllowed, smokingAllowed, includePartialRoutes,
      pickupLat, pickupLng, destLat, destLng,
      originState, destState,
      radiusKm = 30,
      page = 1,
      limit = 20,
    } = req.query;

    if (!start && !end && !pickupLat && !destLat) {
      return res.status(400).json({
        success: false,
        message: 'Start and end locations are required'
      });
    }

    if (date && !isValidISODateOnly(date)) {
      return res.status(400).json({ success: false, message: 'Date must be a valid YYYY-MM-DD value' });
    }

    const hasPickupCoords = pickupLat && pickupLng &&
      !isNaN(parseFloat(pickupLat)) && !isNaN(parseFloat(pickupLng));
    const hasDestCoords = destLat && destLng &&
      !isNaN(parseFloat(destLat)) && !isNaN(parseFloat(destLng));
    const hasCoords = hasPickupCoords && hasDestCoords;

    const pLat = hasPickupCoords ? parseFloat(pickupLat) : null;
    const pLng = hasPickupCoords ? parseFloat(pickupLng) : null;
    const dLat = hasDestCoords ? parseFloat(destLat) : null;
    const dLng = hasDestCoords ? parseFloat(destLng) : null;
    const radius = parseFloat(radiusKm) || 30;
    const negotiationRadius = radius * 3;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const query = { isActive: true, rideStatus: 'active' };

    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: searchDate, $lt: nextDay };
    } else {
      query.date = { $gte: new Date() };
    }

    if (minSeats) query.availableSeats = { $gte: parseInt(minSeats) };
    if (maxFare) query.fare = { $lte: parseFloat(maxFare) };
    if (vehicleType) query['vehicle.type'] = vehicleType;
    if (acAvailable === 'true') query['vehicle.acAvailable'] = true;
    if (petFriendly === 'true') query['preferences.petFriendly'] = true;
    if (womenOnly === 'true') query['preferences.womenOnly'] = true;
    if (musicAllowed === 'true') query['preferences.musicAllowed'] = true;
    if (smokingAllowed === 'true') query['preferences.smokingAllowed'] = true;

    const fetchLimit = hasCoords ? 300 : 100;

    const allRides = await Ride.find(query)
      .populate('driverId', 'name email phone avatar ratingSummary totalRidesAsDriver isDriverVerified')
      .populate('postedBy', 'name email phone avatar ratingSummary')
      .sort({ date: 1, time: 1 })
      .limit(fetchLimit)
      .lean();

    const normalizedStart = start ? normalizeIndiaLocation(start) : '';
    const normalizedEnd = end ? normalizeIndiaLocation(end) : '';
    const startLower = normalizedStart.toLowerCase().trim();
    const endLower = normalizedEnd.toLowerCase().trim();
    const originStateLower = originState ? String(originState).toLowerCase().trim() : '';
    const destStateLower = destState ? String(destState).toLowerCase().trim() : '';

    const classified = [];

    for (const ride of allRides) {
      const rideStartLower = ride.start.toLowerCase();
      const rideEndLower = ride.end.toLowerCase();

      const ridePickupLat = ride.pickup?.latitude;
      const ridePickupLng = ride.pickup?.longitude;
      const rideDestLat = ride.destination?.latitude;
      const rideDestLng = ride.destination?.longitude;
      const rideHasPickupCoords = !!(ridePickupLat && ridePickupLng);
      const rideHasDestCoords = !!(rideDestLat && rideDestLng);

      const pickupDist = (hasPickupCoords && rideHasPickupCoords)
        ? calculateDistance(pLat, pLng, ridePickupLat, ridePickupLng)
        : null;
      const destDist = (hasDestCoords && rideHasDestCoords)
        ? calculateDistance(dLat, dLng, rideDestLat, rideDestLng)
        : null;

      const textPickupMatch = !!(startLower && (rideStartLower.includes(startLower) || startLower.includes(rideStartLower)));
      const textDropMatch = !!(endLower && (rideEndLower.includes(endLower) || endLower.includes(rideEndLower)));
      const coordPickupExact = pickupDist !== null && pickupDist <= 5;
      const coordDropExact = destDist !== null && destDist <= 5;
      const coordPickupNearby = pickupDist !== null && pickupDist <= radius;
      const coordDropNearby = destDist !== null && destDist <= radius;

      const pickupMatches = textPickupMatch || coordPickupExact;
      const dropMatches = textDropMatch || coordDropExact;

      let tier = null;
      let extra = {};

      if (pickupMatches && dropMatches) {
        tier = 1;
        extra.matchQuality = 100;
      }
      else if (dropMatches && !pickupMatches) {
        tier = 2;
        extra.matchQuality = 90;
      }
      else if (
        originStateLower &&
        ride.pickup?.state &&
        ride.pickup.state.toLowerCase().trim() === originStateLower
      ) {
        tier = 3;
        extra.matchQuality = 75;
      }
      else if (coordPickupNearby) {
        tier = 4;
        extra.matchQuality = Math.max(0, 70 - Math.round(pickupDist));
      }
      else if (coordDropNearby) {
        tier = 5;
        extra.matchQuality = Math.max(0, 65 - Math.round(destDist));
      }

      if (tier !== null) {
        classified.push({
          ...ride,
          matchTier: tier,
          matchType: TIER_META[tier].matchType,
          matchReason: TIER_META[tier].label,
          matchQuality: extra.matchQuality,
          _pickupDistKm: pickupDist !== null ? Math.round(pickupDist * 10) / 10 : null,
          _destDistKm: destDist !== null ? Math.round(destDist * 10) / 10 : null,
        });
        continue;
      }

      if (startLower && endLower && ride.allowPartialRoute && includePartialRoutes !== 'false') {
        const pickupWp = findMatchingWaypoint(normalizedStart, ride.waypoints, ride.start, ride.end);
        const dropWp = findMatchingWaypoint(normalizedEnd, ride.waypoints, ride.start, ride.end);
        if (pickupWp && dropWp) {
          const pDist = pickupWp.distanceFromStart || 0;
          const dDist = dropWp.distanceFromStart || ride.totalDistance || 0;
          if (pDist < dDist) {
            classified.push({
              ...ride,
              matchTier: 6,
              matchType: TIER_META[6].matchType,
              matchReason: TIER_META[6].label,
              matchQuality: 55,
            });
            continue;
          }
        }
      }

      if (ride.routeCoordinates?.length && (normalizedStart || hasCoords) && (normalizedEnd || hasCoords)) {
        try {
          const passengerPickup = hasCoords ? { lat: pLat, lng: pLng } : normalizedStart;
          const passengerDrop = hasCoords ? { lat: dLat, lng: dLng } : normalizedEnd;
          const match = await checkRouteMatch(
            {
              start: ride.start,
              end: ride.end,
              coordinates: ride.routeCoordinates,
              polyline: ride.routePolyline
            },
            passengerPickup,
            passengerDrop,
            15000
          );
          if (match.isMatch) {
            const fareDetails = calculateSegmentFare(ride, match.segmentDistance);
            classified.push({
              ...ride,
              matchTier: 6,
              matchType: TIER_META[6].matchType,
              matchReason: TIER_META[6].label,
              matchQuality: Math.max(56, match.matchQuality),
              matchedPickup: normalizedStart,
              matchedDrop: normalizedEnd,
              segmentDistance: match.segmentDistanceKm,
              segmentFare: fareDetails.totalFare,
              fareBreakdown: fareDetails,
              pickupCoordinates: match.pickupCoordinates,
              dropCoordinates: match.dropCoordinates,
              userSearchDistance: parseFloat(match.segmentDistanceKm),
              userRouteCoordinates: match.segmentCoordinates
            });
            continue;
          }
        } catch (err) {
          console.warn(`⚠️ Route match failed for ride ${ride._id}:`, err.message);
        }
      }

      if (ride.negotiableFare) {
        const widerPickupOk = pickupDist !== null && pickupDist <= negotiationRadius;
        const widerDropOk = destDist !== null && destDist <= negotiationRadius;
        const stateOk =
          (originStateLower && ride.pickup?.state?.toLowerCase().trim() === originStateLower) ||
          (destStateLower && ride.destination?.state?.toLowerCase().trim() === destStateLower);

        if (widerPickupOk || widerDropOk || stateOk || (!hasCoords && !originStateLower)) {
          classified.push({
            ...ride,
            matchTier: 7,
            matchType: TIER_META[7].matchType,
            matchReason: TIER_META[7].label,
            matchQuality: 20,
          });
        }
      }
    }

    let allMatched = classified.map(ride => ({
      ...ride,
      segmentDistance: ride.segmentDistance || ride.totalDistance || 0,
      segmentFare: ride.segmentFare || ride.fare,
      availableSeats: ride.availableSeats ?? ride.seats,
      isFull: (ride.availableSeats ?? ride.seats) === 0
    }));

    const seen = new Map();
    for (const r of allMatched) {
      const key = r._id.toString();
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, r);
      } else if (r.matchTier < existing.matchTier ||
        (r.matchTier === existing.matchTier && r.matchQuality > existing.matchQuality)) {
        seen.set(key, r);
      }
    }
    allMatched = Array.from(seen.values());

    allMatched.sort((a, b) => {
      if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
      if (b.matchQuality !== a.matchQuality) return b.matchQuality - a.matchQuality;
      if (hasCoords) {
        const aDist = (a._pickupDistKm || 0) + (a._destDistKm || 0);
        const bDist = (b._pickupDistKm || 0) + (b._destDistKm || 0);
        if (aDist !== bDist) return aDist - bDist;
      }
      return new Date(a.date) - new Date(b.date);
    });

    const total = allMatched.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (pageNum - 1) * pageSize;
    const pageData = allMatched.slice(startIdx, startIdx + pageSize);

    const tierCounts = {};
    for (const r of allMatched) {
      tierCounts[r.matchTier] = (tierCounts[r.matchTier] || 0) + 1;
    }

    res.json({
      success: true,
      count: pageData.length,
      data: pageData,
      meta: {
        coordinateBased: hasCoords,
        radiusKm: radius,
        total,
        page: pageNum,
        limit: pageSize,
        totalPages,
        tierCounts,
        tierLabels: Object.fromEntries(
          Object.entries(TIER_META).map(([tier, meta]) => [tier, meta.label])
        ),
      }
    });
  } catch (error) {
    console.error('❌ searchRides error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET USER STATS — UNCHANGED (Bug #5 still present, not in scope this pass)
// ═══════════════════════════════════════════════════════════════════════════
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    if (role === 'driver') {
      const rides = await Ride.find({
        $or: [{ driverId: userId }, { postedBy: userId }, { driver: userId }]
      });

      const totalRides = rides.length;
      const activeRides = rides.filter((ride) => ride.rideStatus === 'active').length;
      const completedRides = rides.filter((ride) => ride.rideStatus === 'completed').length;

      let totalEarnings = 0;
      rides.forEach((ride) => {
        if (Array.isArray(ride.bookings)) {
          ride.bookings.forEach((booking) => {
            if (booking.status === 'completed' && booking.paymentStatus === 'paid') {
              totalEarnings += booking.calculatedFare || 0;
            }
          });
        }
      });

      return res.json({
        success: true,
        data: {
          totalRides,
          activeRides,
          completedRides,
          totalEarnings
        }
      });
    }

    const bookings = await Booking.aggregate([
      { $match: { passenger: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSpent: { $sum: '$calculatedFare' }
        }
      }
    ]);

    const totalBookings = bookings.reduce((sum, item) => sum + (item.count || 0), 0);
    const completedTrips = bookings.find((item) => item._id === 'completed')?.count || 0;
    const totalSpent = bookings
      .filter((item) => item._id === 'completed')
      .reduce((sum, item) => sum + (item.totalSpent || 0), 0);

    return res.json({
      success: true,
      data: {
        totalBookings,
        completedTrips,
        totalSpent
      }
    });
  } catch (error) {
    console.error('❌ getUserStats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CHECK RIDE AVAILABILITY / SEGMENT FARE — UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════
exports.checkRideAvailability = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const pickupPoint = req.query.pickupPoint || req.query.pickupLocation || req.query.pickup || '';
    const dropPoint = req.query.dropPoint || req.query.dropLocation || req.query.drop || '';
    const availableSeats = ride.availableSeats !== undefined ? ride.availableSeats : ride.seats;
    const baseCanBook = ride.canBook ? ride.canBook(1) : availableSeats > 0;

    let pickupDistance = null;
    let dropDistance = null;
    let validSegment = false;
    let segmentFare = null;

    if (pickupPoint && dropPoint) {
      if (typeof ride.getDistanceForLocation === 'function') {
        pickupDistance = ride.getDistanceForLocation(pickupPoint);
        dropDistance = ride.getDistanceForLocation(dropPoint);
      }

      if (pickupDistance !== null && dropDistance !== null && dropDistance > pickupDistance) {
        validSegment = true;
      }

      if (typeof ride.calculateSegmentFare === 'function') {
        const fareInfo = ride.calculateSegmentFare(pickupPoint, dropPoint);
        segmentFare = fareInfo?.totalFare ?? null;
      }
    }

    res.json({
      success: true,
      data: {
        availableSeats,
        canBook: baseCanBook && (!pickupPoint || !dropPoint || validSegment),
        pickupPoint,
        dropPoint,
        pickupDistance,
        dropDistance,
        segmentFare,
        validSegment
      }
    });
  } catch (error) {
    console.error('❌ checkRideAvailability error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET RIDE BY ID — UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driverId', 'name email phone avatar ratingSummary isDriverVerified')
      .populate('bookings')
      .lean();
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE RIDE — UNCHANGED (round-trip fields intentionally NOT added to the
// `allowed` list — editing one leg's route/fare/etc. should never silently
// mutate its linked leg; that stays a fully separate PUT if ever needed)
// ═══════════════════════════════════════════════════════════════════════════
exports.updateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const userId = req.user._id.toString();
    const isOwner = [ride.driverId, ride.postedBy, ride.driver]
      .some(id => id?.toString() === userId);
    if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });

    const allowed = [
      'start', 'end', 'date', 'time', 'seats', 'fare', 'phoneNumber', 'address',
      'vehicleNumber', 'fareMode', 'perKmRate', 'totalDistance', 'estimatedDuration',
      'waypoints', 'vehicle', 'preferences', 'notes', 'pickupInstructions',
      'tollIncluded', 'negotiableFare', 'recurringRide', 'recurringDays',
      'allowPartialRoute', 'maxDetourAllowed', 'liveLocationSharing',
      'pickup', 'destination'
    ];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) ride[field] = req.body[field];
    });

    if (req.body.vehicleNumber) {
      ride.vehicleNumber = req.body.vehicleNumber.toUpperCase().trim();
    }

    if (req.body.pickup?.address) ride.start = req.body.pickup.address;
    if (req.body.destination?.address) ride.end = req.body.destination.address;

    await ride.save();
    res.json({ success: true, message: 'Ride updated', data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE RIDE STATUS — UNCHANGED (Bug #2 duplicate still present, not in
// scope this pass)
// ═══════════════════════════════════════════════════════════════════════════
exports.updateRideStatus = async (req, res) => {
  try {
    const { rideStatus, cancellationReason } = req.body;
    const valid = ['active', 'in_progress', 'completed', 'cancelled', 'expired'];
    if (!valid.includes(rideStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${valid.join(', ')}`
      });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const userId = req.user._id.toString();
    const isOwner = [ride.driverId, ride.postedBy, ride.driver]
      .some(id => id?.toString() === userId);
    if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });

    ride.rideStatus = rideStatus;
    if (['completed', 'cancelled', 'expired'].includes(rideStatus)) {
      ride.isActive = false;
    }
    if (rideStatus === 'cancelled') {
      ride.cancelledAt = new Date();
      if (cancellationReason) ride.cancellationReason = cancellationReason;
      await Booking.updateMany(
        { ride: ride._id, status: { $in: ['pending', 'accepted'] } },
        {
          status: 'cancelled',
          cancelledBy: 'driver',
          cancelledAt: new Date()
        }
      );
    }

    await ride.save();
    res.json({ success: true, message: `Ride status → ${rideStatus}`, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INCREMENT VIEW COUNT — UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════
exports.incrementViewCount = async (req, res) => {
  try {
    await Ride.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET FEATURED RIDES — UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════
exports.getFeaturedRides = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const rides = await Ride.find({
      isActive: true, rideStatus: 'active', date: { $gte: new Date() },
      $or: [{ featured: true }, { verified: true }]
    })
      .populate('driverId', 'name email phone avatar ratingSummary')
      .sort({ featured: -1, verified: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    res.json({ success: true, count: rides.length, data: rides });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET RIDE BOOKINGS (driver view) — UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════
exports.getRideBookings = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('bookings').lean();
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const userId = req.user._id.toString();
    const isOwner = [ride.driverId, ride.postedBy, ride.driver]
      .some(id => id?.toString() === userId);
    if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });

    res.json({ success: true, count: ride.bookings?.length || 0, data: ride.bookings || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = exports;