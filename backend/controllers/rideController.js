// controllers/rideController.js
// Updated: postRide now accepts pickup{}/destination{} Geoapify objects
//          and stores coordinates on the ride.
//          searchRides now accepts pickupLat/pickupLng/destLat/destLng
//          and ranks results by Haversine distance when coordinates are present.
//          All other functions (getMyRides, deleteRide, updateRide, etc.) unchanged.

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
// Accepts both the new {address, latitude, longitude, ...} shape
// and gracefully falls back to plain text.
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
  // Legacy / fallback — plain text, no coordinates
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
// Now accepts optional pickup{} / destination{} Geoapify objects alongside
// the existing start / end plain-text fields.
// requireVerifiedDriver middleware must be applied on the route.
// ═══════════════════════════════════════════════════════════════════════════
exports.postRide = async (req, res) => {
  const {
    // Legacy plain-text fields (still supported)
    start, end,
    // New Geoapify structured location objects (preferred)
    pickup, destination,
    // Everything else unchanged
    date, time, seats, fare, phoneNumber, address, vehicleNumber,
    fareMode, perKmRate, totalDistance, estimatedDuration,
    waypoints, routeCoordinates, routeMapURL,
    vehicle, preferences, notes, pickupInstructions,
    tollIncluded, negotiableFare,
    isRoundTrip, returnDate,
    recurringRide, recurringDays,
    allowPartialRoute, maxDetourAllowed,
    liveLocationSharing
  } = req.body;

  // Resolve start/end strings — prefer Geoapify address, fall back to plain text
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

  if (isRoundTrip && returnDate && !isValidISODateOnly(returnDate)) {
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

    // Build structured location objects (with coordinates if Geoapify data present)
    const pickupLocation = buildLocationObject(pickup, normalizedStart);
    const destinationLocation = buildLocationObject(destination, normalizedEnd);

    // Override address with normalized string if Geoapify didn't supply one
    if (!pickupLocation.address) pickupLocation.address = normalizedStart;
    if (!destinationLocation.address) destinationLocation.address = normalizedEnd;

    // Fetch route from Google Maps if coordinates not provided by client
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

    // Build driverInfo from DB — trust the DB, not the request body
    const driverInfoFromUser = {
      name: req.user.name || '',
      phone: req.user.phone || phoneNumber,
      photoURL: req.user.driverVerification?.profilePhoto?.url || req.user.avatar || '',
      gender: req.user.gender || '',
      drivingLicenseNumber: req.user.driverVerification?.drivingLicense?.number || '',
      emergencyContact: req.user.emergencyContact || '',
      emergencyContactName: req.user.emergencyContactName || '',
      verified: true  // guaranteed by requireVerifiedDriver middleware
    };

    const rideData = {
      driver: req.user._id,
      driverId: req.user._id,
      postedBy: req.user._id,

      // Legacy string fields (pre-save hook will also set these from pickup/destination)
      start: normalizedStart,
      end: normalizedEnd,

      // NEW: structured location objects with coordinates
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

      liveLocationSharing: !!liveLocationSharing,
      rideStatus: 'active',
      isActive: true
    };

    const ride = new Ride(rideData);
    await ride.save();

    const populated = await Ride.findById(ride._id)
      .populate('driver', 'name email phone avatar ratingSummary')
      .populate('driverId', 'name email phone avatar')
      .lean();

    console.log('✅ Ride posted:', ride._id,
      '| pickup coords:', pickupLocation.latitude, pickupLocation.longitude,
      '| dest coords:', destinationLocation.latitude, destinationLocation.longitude);

    res.status(201).json({
      success: true,
      message: 'Ride posted successfully',
      data: populated
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
          populate: { path: 'passengerId', select: 'name email phone avatar' }
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
// DELETE / CANCEL RIDE — UNCHANGED
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
      { rideId: ride._id, status: { $in: ['pending', 'accepted', 'confirmed'] } },
      {
        status: 'cancelled',
        'cancellation.cancelledBy': 'driver',
        'cancellation.reason': req.body.cancellationReason || 'Ride cancelled by driver',
        'cancellation.cancelledAt': new Date()
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
// SEARCH RIDES
// Updated: now accepts optional coordinate params from Geoapify selection.
// When coordinates present → Haversine-rank results within radiusKm.
// Falls back to existing text-based matching when no coords provided.
//
// New query params (all optional, added alongside existing ones):
//   pickupLat, pickupLng  — from selected Geoapify pickup
//   destLat, destLng      — from selected Geoapify destination
//   radiusKm              — search radius in km (default: 30)
// ═══════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────
// SMART SEARCH — 7-tier ranking (Milestone 1, see PROJECT_STATE.md §6)
//
// Tier 1  exact              — same pickup AND same drop
// Tier 2  same_destination   — same drop, different pickup
// Tier 3  same_state_origin  — pickup is in the same state as the searched pickup
// Tier 4  nearby_origin      — pickup within radiusKm of searched pickup
// Tier 5  nearby_destination — drop within radiusKm of searched drop
// Tier 6  partial_route      — searched pickup/drop lie along the ride's route
//                              (covers both geometric route-coordinate matches
//                              and text/waypoint matches — same underlying idea,
//                              user just sees "you can join partway")
// Tier 7  negotiation_possible — nothing above matched, but the ride is fare-
//                              negotiable and loosely relevant (same state,
//                              wider radius) — driver may still accommodate
//
// Every result carries `matchTier` (1-7) and a human-readable `matchReason`,
// so the frontend can always explain "why this ride appeared" per the spec.
// The legacy `matchType` field ('exact' | 'on_route' | 'partial' | 'nearby')
// is preserved for backward compatibility with existing frontend code.
// ─────────────────────────────────────────────────────────────────────────────

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
      // Existing params
      start, end, date, minSeats, maxFare,
      vehicleType, acAvailable, petFriendly, womenOnly,
      musicAllowed, smokingAllowed, includePartialRoutes,
      // Coordinate params from Geoapify
      pickupLat, pickupLng, destLat, destLng,
      // NEW: optional state hints (from the same Geoapify selection that
      // populates ride.pickup.state / ride.destination.state on post)
      originState, destState,
      radiusKm = 30,
      // NEW: pagination
      page = 1,
      limit = 20,
    } = req.query;

    // At least one location param required
    if (!start && !end && !pickupLat && !destLat) {
      return res.status(400).json({
        success: false,
        message: 'Start and end locations are required'
      });
    }

    if (date && !isValidISODateOnly(date)) {
      return res.status(400).json({ success: false, message: 'Date must be a valid YYYY-MM-DD value' });
    }

    // Determine if we have coordinates for geo-ranking
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
    // Wider net used only for the last-resort "negotiation possible" tier
    const negotiationRadius = radius * 3;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));

    // ── Base DB query ─────────────────────────────────────────────────────
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

    // ── Fetch candidates ──────────────────────────────────────────────────
    // When using coordinates we fetch more to allow geo-filtering
    const fetchLimit = hasCoords ? 300 : 100;

    const allRides = await Ride.find(query)
      .populate('driverId', 'name email phone avatar ratingSummary totalRidesAsDriver isDriverVerified')
      .populate('postedBy', 'name email phone avatar ratingSummary')
      .sort({ date: 1, time: 1 })
      .limit(fetchLimit)
      .lean();

    // ── Text normalization for legacy matching ────────────────────────────
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
      const coordPickupExact = pickupDist !== null && pickupDist <= 5;   // tight radius = "same point"
      const coordDropExact = destDist !== null && destDist <= 5;
      const coordPickupNearby = pickupDist !== null && pickupDist <= radius;
      const coordDropNearby = destDist !== null && destDist <= radius;

      const pickupMatches = textPickupMatch || coordPickupExact;
      const dropMatches = textDropMatch || coordDropExact;

      let tier = null;
      let extra = {};

      // ── Tier 1: exact (both ends match) ──────────────────────────────
      if (pickupMatches && dropMatches) {
        tier = 1;
        extra.matchQuality = 100;
      }
      // ── Tier 2: same destination, different pickup ───────────────────
      else if (dropMatches && !pickupMatches) {
        tier = 2;
        extra.matchQuality = 90;
      }
      // ── Tier 3: same state as searched pickup ─────────────────────────
      else if (
        originStateLower &&
        ride.pickup?.state &&
        ride.pickup.state.toLowerCase().trim() === originStateLower
      ) {
        tier = 3;
        extra.matchQuality = 75;
      }
      // ── Tier 4: nearby pickup only ─────────────────────────────────────
      else if (coordPickupNearby) {
        tier = 4;
        extra.matchQuality = Math.max(0, 70 - Math.round(pickupDist));
      }
      // ── Tier 5: nearby destination only ─────────────────────────────────
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

      // ── Tier 6: partial route ────────────────────────────────────────
      // 6a. Waypoint/text-based partial match
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

      // 6b. Geometric route-coordinate match (uses actual logged GPS route)
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
              matchQuality: Math.max(56, match.matchQuality), // rank slightly above 6a when quality allows
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

      // ── Tier 7: negotiation possible (last resort, loose relevance) ──
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

    // ── Normalize shared display fields ───────────────────────────────────
    let allMatched = classified.map(ride => ({
      ...ride,
      segmentDistance: ride.segmentDistance || ride.totalDistance || 0,
      segmentFare: ride.segmentFare || ride.fare,
      availableSeats: ride.availableSeats ?? ride.seats,
      isFull: (ride.availableSeats ?? ride.seats) === 0
    }));

    // Deduplicate by _id — keep the best (lowest) tier, then highest quality
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

    // ── Sort: tier ascending (1 = best) → quality desc → geo distance → date ──
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

    // ── Pagination (applied after full ranking) ───────────────────────────
    const total = allMatched.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (pageNum - 1) * pageSize;
    const pageData = allMatched.slice(startIdx, startIdx + pageSize);

    // Tier breakdown — useful for the frontend to show section headers
    // ("Exact matches", "Same destination", "Negotiable rides nearby", etc.)
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
// UPDATE RIDE — updated to include pickup/destination in allowed fields
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
      // NEW: allow updating structured location objects
      'pickup', 'destination'
    ];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) ride[field] = req.body[field];
    });

    if (req.body.vehicleNumber) {
      ride.vehicleNumber = req.body.vehicleNumber.toUpperCase().trim();
    }

    // If pickup/destination updated, also sync start/end strings
    if (req.body.pickup?.address) ride.start = req.body.pickup.address;
    if (req.body.destination?.address) ride.end = req.body.destination.address;

    await ride.save();
    res.json({ success: true, message: 'Ride updated', data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE RIDE STATUS — UNCHANGED
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
        { rideId: ride._id, status: { $in: ['pending', 'accepted', 'confirmed'] } },
        {
          status: 'cancelled',
          'cancellation.cancelledBy': 'driver',
          'cancellation.cancelledAt': new Date()
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