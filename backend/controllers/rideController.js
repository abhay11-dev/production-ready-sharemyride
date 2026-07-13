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
const { findShortestRegionPath, normalizeRegionKey } = require('../services/utils/regionGraph.js');
const { buildLocationMatchKey } = require('../services/utils/locationNormalize.js');

// ─── Search config / scoring constants ──────────────────────────────────────────
const MAX_RADIUS_KM = 30;
const PROGRESS_MIN = 0.15;
const ALIGNMENT_MIN = 0.3;
const MIN_DISTANCE_FOR_CONNECTOR_KM = 20;

// ─── Tier system (Ranking Spec — Final) ─────────────────────────────────────────
// Real 9-tier prioritized match system plus optional connector fallback.
//   1  exact            — pickup exact AND destination exact
//   2  exact_dest       — destination exact, pickup different
//   3  exact_pickup     — pickup exact, destination different
//   4  both_state       — origin state AND destination state both match
//   5  dest_state       — destination state matches only
//   6  pickup_state     — pickup state matches only
//   7  both_near        — pickup AND destination both within radius
//   8  dest_near        — destination within radius only
//   9  pickup_near      — pickup within radius only
//
// Matches that do not satisfy these nine tiers are not ranked here. A
// separate catch-all section is used for "See all rides across India".
// Connector matching remains available as a fallback but is intentionally
// ranked below the state/nearby tiers so it cannot outrank a higher-priority
// state or nearby match.
const TIER_WEIGHTS = {
  1: 2000,
  2: 1900,
  3: 1800,
  4: 1700,
  5: 1600,
  6: 1500,
  7: 1400,
  8: 1300,
  9: 1200,
  11: 100,
  12: 50,
};

const TIER_META = {
  1: { matchType: 'exact', label: 'Exact match — same pickup and drop' },
  2: { matchType: 'exact_dest', label: 'Same destination, different pickup point' },
  3: { matchType: 'exact_pickup', label: 'Same pickup, different destination' },
  4: { matchType: 'both_state', label: 'Same origin and destination region' },
  5: { matchType: 'dest_state', label: 'Same destination region' },
  6: { matchType: 'pickup_state', label: 'Same pickup region' },
  7: { matchType: 'both_near', label: 'Nearby pickup and drop point' },
  8: { matchType: 'dest_near', label: 'Nearby drop point' },
  9: { matchType: 'pickup_near', label: 'Nearby pickup point' },
  11: { matchType: 'negotiation', label: 'Fare is negotiable — discuss pickup, drop or timing with the driver' },
  12: { matchType: 'connector', label: "On the driver's route — connector match" },
};

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

const toRadians = (value) => (value * Math.PI) / 180;
const toDegrees = (value) => (value * 180) / Math.PI;

const initialBearing = (from, to) => {
  const φ1 = toRadians(from.lat);
  const φ2 = toRadians(to.lat);
  const Δλ = toRadians(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

const normalizedDistancePenalty = (distanceKm, capKm = MAX_RADIUS_KM) => {
  if (distanceKm == null || Number.isNaN(distanceKm)) return 0;
  return Math.min(distanceKm, capKm);
};

const computeProgressMetrics = (rideStart, rideEnd, destination, searchDistanceKm) => {
  if (!rideStart || !rideEnd || !destination || searchDistanceKm == null || searchDistanceKm <= 0) {
    return { progressRatio: null, alignment: null, remainingBeforeKm: null, remainingAfterKm: null };
  }

  const remainingBeforeKm = calculateDistance(rideStart.lat, rideStart.lng, destination.lat, destination.lng);
  const remainingAfterKm = calculateDistance(rideEnd.lat, rideEnd.lng, destination.lat, destination.lng);
  const progress = remainingBeforeKm - remainingAfterKm;
  const progressRatio = progress / searchDistanceKm;
  const bearingSearch = initialBearing(rideStart, destination);
  const bearingRide = initialBearing(rideStart, rideEnd);
  const alignment = Math.cos(toRadians(bearingRide - bearingSearch));

  return { progressRatio, alignment, remainingBeforeKm, remainingAfterKm };
};

// `ride.date` is stored date-only (midnight UTC); the actual departure
// clock time lives separately in `ride.time` (e.g. "14:30"). Comparing
// `ride.date` alone against `new Date()` makes a ride dated "today" look
// expired the instant the clock passes midnight, even if its `time` is
// still hours away. This combines both into one real departure instant.
const getRideDepartureDateTime = (ride) => {
  const base = new Date(ride.date);
  if (Number.isNaN(base.getTime())) return null;
  const timeStr = typeof ride.time === 'string' ? ride.time.trim() : '';
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    base.setHours(hours, minutes, 0, 0);
  }
  return base;
};

const buildRegionKey = (value) => normalizeRegionKey(value || '');
const buildLocationPoint = (location) => {
  if (!location || location.latitude == null || location.longitude == null) return null;
  return { lat: location.latitude, lng: location.longitude };
};

const buildLocationMatchTokens = (value) => {
  const key = buildLocationMatchKey(value);
  return key ? key.split(' ').filter(Boolean) : [];
};

const locationMatchContains = (queryKey, targetKey) => {
  if (!queryKey || !targetKey) return false;
  if (queryKey === targetKey) return true;

  const queryTokens = buildLocationMatchTokens(queryKey);
  const targetTokens = buildLocationMatchTokens(targetKey);
  if (!queryTokens.length || !targetTokens.length) return false;

  const queryJoined = queryTokens.join(' ');
  const targetJoined = targetTokens.join(' ');
  if (targetJoined.includes(queryJoined) || queryJoined.includes(targetJoined)) return true;

  const targetSet = new Set(targetTokens);
  if (queryTokens.every((token) => targetSet.has(token))) return true;

  let qi = 0;
  for (const token of targetTokens) {
    if (token === queryTokens[qi]) qi += 1;
    if (qi >= queryTokens.length) return true;
  }
  return false;
};

const findMatchingWaypoint = (location, waypoints, routeStart, routeEnd) => {
  const loc = buildLocationMatchKey(location);
  const start = buildLocationMatchKey(routeStart);
  const end = buildLocationMatchKey(routeEnd);
  if (start.includes(loc) || loc.includes(start))
    return { location: routeStart, distanceFromStart: 0, matched: true };
  if (end.includes(loc) || loc.includes(end))
    return { location: routeEnd, matched: true };
  if (waypoints?.length) {
    for (const wp of waypoints) {
      const wpLoc = buildLocationMatchKey(wp.location);
      if (wpLoc.includes(loc) || loc.includes(wpLoc)) return { ...wp, matched: true };
    }
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// TIER CLASSIFICATION — single source of truth (Step 2 rebuild). Replaces
// both the old inline classification block in searchRides AND the unused
// classifyRideMatch dead-code function, which duplicated most of this logic
// without ever being called.
//
// classifyRide(ride, ctx) returns either:
//   - { matchTier: 1-12, matchType, matchReason, searchScore, ... }  (ranked match)
//   - null                                                             (no ranked match)
//
// Tiers 1-9 and 11 are synchronous (text/state/radius comparisons only).
// Tier 12 (connector) may perform an async, geometry-verified route check
// (checkRouteMatch) when the ride has stored route coordinates; otherwise
// it falls back to a synchronous progress/alignment heuristic. The async
// path is only attempted once the cheap heuristic already suggests a
// plausible connector match, to avoid an expensive geocode/route check on
// every ride in the result set.
// ═══════════════════════════════════════════════════════════════════════════

const classifyExactAndStateTiers = (ride, ctx) => {
  const {
    startLower, endLower, originStateLower, destStateLower,
    pickupDist, destDist, pickupRadius, destRadius,
  } = ctx;

  const rideStartLower = buildLocationMatchKey(ride.start);
  const rideEndLower = buildLocationMatchKey(ride.end);

  const pickupMatches = !!(startLower && locationMatchContains(startLower, rideStartLower));
  const dropMatches = !!(endLower && locationMatchContains(endLower, rideEndLower));

  const originStateMatch = !!(originStateLower && ride.pickup?.state && buildRegionKey(ride.pickup.state) === originStateLower);
  const destStateMatch = !!(destStateLower && ride.destination?.state && buildRegionKey(ride.destination.state) === destStateLower);

  const coordPickupNearby = pickupDist !== null && pickupDist <= pickupRadius;
  const coordDropNearby = destDist !== null && destDist <= destRadius;

  const penalty = normalizedDistancePenalty(pickupDist) + normalizedDistancePenalty(destDist);

  // Priority 1 — exact both ends
  if (pickupMatches && dropMatches) {
    return {
      matchTier: 1,
      matchType: TIER_META[1].matchType,
      matchReason: 'exact_corridor',
      searchScore: TIER_WEIGHTS[1] - penalty,
    };
  }

  // Priority 2 — exact destination, different pickup
  if (dropMatches && !pickupMatches) {
    return {
      matchTier: 2,
      matchType: TIER_META[2].matchType,
      matchReason: 'reverse_exact',
      searchScore: TIER_WEIGHTS[2] - penalty,
    };
  }

  // Priority 3 — exact pickup, different destination (previously missing —
  // used to fall through all the way to state-match or lower)
  if (pickupMatches && !dropMatches) {
    return {
      matchTier: 3,
      matchType: TIER_META[3].matchType,
      matchReason: 'pickup_exact',
      searchScore: TIER_WEIGHTS[3] - penalty,
    };
  }

  // Priority 4/5/6 — state-based tiers
  if (originStateMatch && destStateMatch) {
    return {
      matchTier: 4,
      matchType: TIER_META[4].matchType,
      matchReason: 'both_state_match',
      searchScore: TIER_WEIGHTS[4] - penalty,
    };
  }
  if (destStateMatch) {
    return {
      matchTier: 5,
      matchType: TIER_META[5].matchType,
      matchReason: 'dest_state_match',
      searchScore: TIER_WEIGHTS[5] - penalty,
    };
  }
  if (originStateMatch) {
    return {
      matchTier: 6,
      matchType: TIER_META[6].matchType,
      matchReason: 'pickup_state_match',
      searchScore: TIER_WEIGHTS[6] - penalty,
    };
  }

  // Priority 7/8/9 — radius-based tiers
  if (coordPickupNearby && coordDropNearby) {
    return {
      matchTier: 7,
      matchType: TIER_META[7].matchType,
      matchReason: 'both_near',
      searchScore: TIER_WEIGHTS[7] - penalty,
    };
  }
  if (coordDropNearby) {
    return {
      matchTier: 8,
      matchType: TIER_META[8].matchType,
      matchReason: 'dest_near',
      searchScore: TIER_WEIGHTS[8] - penalty,
    };
  }
  if (coordPickupNearby) {
    return {
      matchTier: 9,
      matchType: TIER_META[9].matchType,
      matchReason: 'pickup_near',
      searchScore: TIER_WEIGHTS[9] - penalty,
    };
  }

  return null;
};

const classifyNegotiationTier = (ride, ctx) => {
  const { pickupDist, destDist, pickupRadius, destRadius } = ctx;
  if (!ride.negotiableFare) return null;

  const negotiationRadius = Math.max(pickupRadius, destRadius) * 3;
  const pickupNearby = pickupDist !== null && pickupDist <= negotiationRadius;
  const destNearby = destDist !== null && destDist <= negotiationRadius;
  if (!pickupNearby && !destNearby) return null;

  const penalty = normalizedDistancePenalty(pickupDist) + normalizedDistancePenalty(destDist);
  return {
    matchTier: 11,
    matchType: TIER_META[11].matchType,
    matchReason: 'negotiable_fare',
    searchScore: TIER_WEIGHTS[11] - penalty,
  };
};

// Cheap, synchronous connector heuristic: is this ride plausibly progressing
// the passenger toward their destination, based on region path and
// progress/alignment along the straight-line search vector? Used both as a
// standalone fallback and as a gate before attempting the expensive
// geometry-verified route check.
const connectorHeuristic = (ride, ctx) => {
  const { searchFromPoint, searchToPoint, searchDistanceKm, regionPath } = ctx;

  const rideStartPoint = buildLocationPoint(ride.pickup);
  const rideEndPoint = buildLocationPoint(ride.destination);
  const ridePickupState = buildRegionKey(ride.pickup?.state);
  const rideDestState = buildRegionKey(ride.destination?.state);

  const onPath = Boolean(regionPath && (
    (ridePickupState && regionPath.includes(ridePickupState)) ||
    (rideDestState && regionPath.includes(rideDestState))
  ));

  const { progressRatio, alignment } = computeProgressMetrics(
    rideStartPoint, rideEndPoint, searchToPoint, searchDistanceKm
  );

  const progressValid = progressRatio != null && progressRatio >= PROGRESS_MIN;
  const alignmentValid = alignment != null && alignment >= ALIGNMENT_MIN;
  const hasProgress = searchDistanceKm != null && searchDistanceKm >= MIN_DISTANCE_FOR_CONNECTOR_KM && progressValid && alignmentValid;

  if (!onPath && !hasProgress) return null;

  const reachCostKm = rideStartPoint && searchFromPoint
    ? calculateDistance(searchFromPoint.lat, searchFromPoint.lng, rideStartPoint.lat, rideStartPoint.lng)
    : 0;
  const connectorBonus = (progressRatio || 0) * 100 + (alignment || 0) * 50 - normalizedDistancePenalty(reachCostKm);

  return {
    matchTier: 12,
    matchType: TIER_META[12].matchType,
    matchReason: 'route_heuristic',
    progressRatio,
    alignment,
    searchScore: TIER_WEIGHTS[12] + connectorBonus,
  };
};

// Cheap, synchronous, text-based partial-route check against a ride's
// waypoints — a no-network way to confirm a connector match.
const connectorWaypointMatch = (ride, ctx) => {
  const { normalizedStart, normalizedEnd, includePartialRoutes } = ctx;
  if (!normalizedStart || !normalizedEnd) return null;
  if (!ride.allowPartialRoute || includePartialRoutes === 'false') return null;

  const pickupWp = findMatchingWaypoint(normalizedStart, ride.waypoints, ride.start, ride.end);
  const dropWp = findMatchingWaypoint(normalizedEnd, ride.waypoints, ride.start, ride.end);
  if (!pickupWp || !dropWp) return null;

  const pDist = pickupWp.distanceFromStart || 0;
  const dDist = dropWp.distanceFromStart || ride.totalDistance || 0;
  if (pDist >= dDist) return null;

  return {
    matchTier: 12,
    matchType: TIER_META[12].matchType,
    matchReason: 'route_waypoint_match',
    searchScore: TIER_WEIGHTS[12] + 50,
  };
};

// Attempts an authoritative, geometry-verified connector match using the
// ride's stored route polyline/coordinates. Only called when the cheap
// heuristic above already flagged the ride as plausible, to avoid an
// expensive geocode/route computation on every candidate in the result set.
const connectorRouteVerified = async (ride, ctx) => {
  const { normalizedStart, normalizedEnd, hasCoords, pLat, pLng, dLat, dLng } = ctx;
  if (!ride.routeCoordinates?.length) return null;
  if (!(normalizedStart || hasCoords) || !(normalizedEnd || hasCoords)) return null;

  try {
    const passengerPickup = hasCoords ? { lat: pLat, lng: pLng } : normalizedStart;
    const passengerDrop = hasCoords ? { lat: dLat, lng: dLng } : normalizedEnd;
    const match = await checkRouteMatch(
      {
        start: ride.start,
        end: ride.end,
        coordinates: ride.routeCoordinates,
        polyline: ride.routePolyline,
      },
      passengerPickup,
      passengerDrop,
      15000
    );

    if (!match.isMatch) return null;

    const fareDetails = calculateSegmentFare(ride, match.segmentDistance);
    return {
      matchTier: 12,
      matchType: TIER_META[12].matchType,
      matchReason: 'route_verified',
      searchScore: TIER_WEIGHTS[12] + 100 + match.matchQuality,
      matchedPickup: normalizedStart,
      matchedDrop: normalizedEnd,
      segmentDistance: match.segmentDistanceKm,
      segmentFare: fareDetails.totalFare,
      fareBreakdown: fareDetails,
      pickupCoordinates: match.pickupCoordinates,
      dropCoordinates: match.dropCoordinates,
      userSearchDistance: parseFloat(match.segmentDistanceKm),
      userRouteCoordinates: match.segmentCoordinates,
    };
  } catch (err) {
    console.warn(`⚠️ Route match failed for ride ${ride._id}:`, err.message);
    return null;
  }
};

// Full connector classification: cheapest checks first, escalating to the
// geometry-verified route check only when warranted by the heuristic gate.
const classifyConnector = async (ride, ctx) => {
  const heuristic = connectorHeuristic(ride, ctx);
  if (!heuristic) return null;

  const waypointMatch = connectorWaypointMatch(ride, ctx);
  if (waypointMatch) return waypointMatch;

  const verified = await connectorRouteVerified(ride, ctx);
  if (verified) return verified;

  return heuristic;
};

// Orchestrates the full ranked classification for a single ride.
// Priority order: exact/state/nearby tiers 1-9 first, then negotiable
// fallback tier 11, then connector fallback tier 12.
const classifyRide = async (ride, ctx) => {
  const exactOrStateOrNear = classifyExactAndStateTiers(ride, ctx);
  if (exactOrStateOrNear) return exactOrStateOrNear;

  const negotiable = classifyNegotiationTier(ride, ctx);
  if (negotiable) return negotiable;

  const connector = await classifyConnector(ride, ctx);
  if (connector) return connector;

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

    // ─── NEW: save vehicle to user profile if requested ────────────────────
    if (vehicle?.saveVehicle) {
      await mongoose.model('User').findByIdAndUpdate(req.user._id, {
        savedVehicle: {
          number: vehicleNumber.toUpperCase().trim(),
          type: vehicle.type || 'Sedan',
          model: vehicle.model || '',
          color: vehicle.color || '',
          acAvailable: vehicle.acAvailable !== false,
          luggageSpace: vehicle.luggageSpace || 'Medium'
        }
      });
    }

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
// SEARCH RIDES
// Tier classification now goes through the single classifyRide() function
// above (Step 2 rebuild): 1-9 ranked match tiers plus optional
// negotiation (11) and connector fallback (12). Catch-all results are
// handled separately below.
// ═══════════════════════════════════════════════════════════════════════════
exports.searchRides = async (req, res) => {
  try {
    const {
      start, end, date, minSeats, maxFare,
      vehicleType, acAvailable, petFriendly, womenOnly,
      musicAllowed, smokingAllowed, includePartialRoutes,
      pickupLat, pickupLng, destLat, destLng,
      originState, destState,
      pickupRadiusKm, destRadiusKm, radiusKm = 30,
      page = 1,
      limit = 20,
      includeCatchAll,
      catchAllPage = 1,
      catchAllLimit = 20,
      globalAllRides,
    } = req.query;

    const isGlobalAll = globalAllRides === 'true';

    if (!isGlobalAll && !start && !end && !pickupLat && !destLat) {
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
    const pickupRadius = parseFloat(pickupRadiusKm || radiusKm) || radiusKm || 30;
    const destRadius = parseFloat(destRadiusKm || radiusKm) || radiusKm || 30;
    const negotiationRadius = Math.max(pickupRadius, destRadius) * 3;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const query = {
      isActive: true,
      rideStatus: { $nin: ['cancelled', 'completed', 'expired'] },
    };

    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: searchDate, $lt: nextDay };
    } else {
      // Query from the start of *today*, not `new Date()` (current instant).
      // A ride dated today with a departure time later this evening has a
      // `ride.date` of today-at-midnight, which is already before the
      // current instant — using `new Date()` here would incorrectly drop
      // it from the query entirely. The real "has this departure already
      // passed" check happens below via getRideDepartureDateTime, which
      // also accounts for `ride.time`.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query.date = { $gte: startOfToday };
    }

    // Always exclude sold-out rides, regardless of whether the user filtered
    // by a minimum seat count. Previously this was only applied when
    // `minSeats` was present, so a plain search with no seat filter could
    // return rides with 0 available seats.
    const minSeatsRequired = minSeats ? Math.max(1, parseInt(minSeats)) : 1;
    query.availableSeats = { $gte: minSeatsRequired };
    if (maxFare) query.fare = { $lte: parseFloat(maxFare) };
    if (vehicleType) query['vehicle.type'] = vehicleType;
    if (acAvailable === 'true') query['vehicle.acAvailable'] = true;
    if (petFriendly === 'true') query['preferences.petFriendly'] = true;
    if (womenOnly === 'true') query['preferences.womenOnly'] = true;
    if (musicAllowed === 'true') query['preferences.musicAllowed'] = true;
    if (smokingAllowed === 'true') query['preferences.smokingAllowed'] = true;

    const fetchLimit = hasCoords ? 300 : 100;

    const fetchedRides = await Ride.find(query)
      .populate('driverId', 'name email phone avatar ratingSummary totalRidesAsDriver isDriverVerified')
      .populate('postedBy', 'name email phone avatar ratingSummary')
      .sort({ date: 1, time: 1 })
      .limit(fetchLimit)
      .lean();

    // Mandatory filter: departure time must not already have passed. The
    // Mongo query above can only filter on `ride.date` (date-only), so a
    // ride departing today needs its `ride.time` checked here as well.
    const now = new Date();
    const allRides = fetchedRides.filter(ride => {
      const departure = getRideDepartureDateTime(ride);
      const validStatus = ride.rideStatus === 'active' || ride.rideStatus === 'scheduled';
      return validStatus && (departure === null || departure >= now);
    });

    if (isGlobalAll) {
      const total = allRides.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const startIdx = (pageNum - 1) * pageSize;
      const pageData = allRides.slice(startIdx, startIdx + pageSize);

      return res.json({
        success: true,
        count: pageData.length,
        data: pageData,
        meta: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages,
        },
      });
    }

    const normalizedStart = start ? normalizeIndiaLocation(start) : '';
    const normalizedEnd = end ? normalizeIndiaLocation(end) : '';
    // Match keys (used only for text-matching against ride.start/ride.end)
    // go through the full normalize + typo-correct + alias-resolve pipeline
    // (Step 5, findings #11-13). `normalizedStart`/`normalizedEnd` above
    // stay untouched — they're also passed to the geocoder in the
    // connector-tier route check, where aggressive punctuation-stripping
    // and typo "correction" would do more harm than good.
    const startLower = buildLocationMatchKey(start);
    const endLower = buildLocationMatchKey(end);
    const originStateLower = originState ? buildRegionKey(originState) : '';
    const destStateLower = destState ? buildRegionKey(destState) : '';
    const searchFromPoint = hasPickupCoords ? { lat: pLat, lng: pLng } : null;
    const searchToPoint = hasDestCoords ? { lat: dLat, lng: dLng } : null;
    const searchDistanceKm = (searchFromPoint && searchToPoint)
      ? calculateDistance(searchFromPoint.lat, searchFromPoint.lng, searchToPoint.lat, searchToPoint.lng)
      : null;
    const regionPath = (originStateLower && destStateLower)
      ? findShortestRegionPath(originStateLower, destStateLower)
      : null;

    const classified = [];

    for (const ride of allRides) {
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

      const ctx = {
        startLower, endLower, originStateLower, destStateLower,
        pickupDist, destDist, pickupRadius, destRadius,
        normalizedStart, normalizedEnd,
        searchFromPoint, searchToPoint, searchDistanceKm, regionPath,
        hasCoords, pLat, pLng, dLat, dLng,
        includePartialRoutes,
      };

      const classification = await classifyRide(ride, ctx);

      if (classification) {
        classified.push({
          ...ride,
          ...classification,
          matchType: classification.matchType,
          matchReason: classification.matchReason,
          matchQuality: Math.round(classification.searchScore),
          _pickupDistKm: pickupDist !== null ? Math.round(pickupDist * 10) / 10 : null,
          _destDistKm: destDist !== null ? Math.round(destDist * 10) / 10 : null,
        });
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

      const aDeparture = getRideDepartureDateTime(a) || new Date(0);
      const bDeparture = getRideDepartureDateTime(b) || new Date(0);
      if (aDeparture.getTime() !== bDeparture.getTime()) {
        return aDeparture - bDeparture;
      }

      const aCreated = new Date(a.createdAt || a._id.getTimestamp?.() || 0);
      const bCreated = new Date(b.createdAt || b._id.getTimestamp?.() || 0);
      if (aCreated.getTime() !== bCreated.getTime()) {
        return bCreated - aCreated;
      }

      const aVerified = !!a.driverId?.isDriverVerified || !!a.driverInfo?.verified;
      const bVerified = !!b.driverId?.isDriverVerified || !!b.driverInfo?.verified;
      if (aVerified !== bVerified) return bVerified ? 1 : -1;

      const aRating = a.driverId?.ratingSummary ?? a.driverInfo?.ratingSummary ?? 0;
      const bRating = b.driverId?.ratingSummary ?? b.driverInfo?.ratingSummary ?? 0;
      if (aRating !== bRating) return bRating - aRating;

      const aId = String(a._id);
      const bId = String(b._id);
      if (aId < bId) return -1;
      if (aId > bId) return 1;
      return 0;
    });

    if (isGlobalAll) {
      const total = allMatched.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const startIdx = (pageNum - 1) * pageSize;
      const pageData = allMatched.slice(startIdx, startIdx + pageSize);

      return res.json({
        success: true,
        count: pageData.length,
        data: pageData,
        meta: {
          coordinateBased: false,
          total,
          page: pageNum,
          limit: pageSize,
          totalPages,
        },
      });
    }

    const total = allMatched.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (pageNum - 1) * pageSize;
    const pageData = allMatched.slice(startIdx, startIdx + pageSize);

    const tierCounts = {};
    for (const r of allMatched) {
      tierCounts[r.matchTier] = (tierCounts[r.matchTier] || 0) + 1;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Step 4 — catch-all section ("See all rides across India").
    //
    // This is NOT one of the 11 ranked tiers and is never mixed into
    // `data`/`allMatched` above. It's a separate, unranked "see everything
    // else that's active" bucket, surfaced by the frontend as its own
    // reveal-on-click section.
    //
    // Two levels of cost, so a plain search never pays for the expensive
    // part:
    //   1. `catchAllAvailableCount` — always computed, cheap (`countDocuments`
    //      against the same base filters already built into `query` above —
    //      no per-ride classification work). Lets the frontend show
    //      "See all N rides across India" immediately without a second
    //      round trip.
    //   2. `catchAll.data` — only fetched when the client explicitly passes
    //      `includeCatchAll=true` (i.e. the user actually clicked the
    //      reveal button). Uses the same base `query` filters (seats,
    //      fare, vehicle, prefs, date) as the ranked search, minus any
    //      geography matching, and explicitly excludes every ride already
    //      present in the ranked list (`$nin` on `allMatched` ids) so a
    //      ride never appears in both sections.
    //
    // Known limitation: like the ranked path above, the mandatory
    // "departure hasn't passed" filter (getRideDepartureDateTime) runs
    // in-memory *after* the DB-level skip/limit for this page, so a page
    // that happens to contain several just-expired-today rides can come
    // back with fewer than `catchAllLimit` results. Same trade-off the
    // pre-existing ranked path already makes; flagging here rather than
    // building out a full aggregation pipeline for this pass.
    const matchedIds = allMatched.map(r => r._id);
    const catchAllQuery = { ...query, _id: { $nin: matchedIds } };

    const catchAllAvailableCount = await Ride.countDocuments(catchAllQuery);

    let catchAllPayload = null;
    if (includeCatchAll === 'true') {
      const catchAllPageNum = Math.max(1, parseInt(catchAllPage) || 1);
      const catchAllPageSize = Math.min(100, Math.max(1, parseInt(catchAllLimit) || 20));

      const [catchAllFetched, catchAllTotal] = await Promise.all([
        Ride.find(catchAllQuery)
          .populate('driverId', 'name email phone avatar ratingSummary totalRidesAsDriver isDriverVerified')
          .populate('postedBy', 'name email phone avatar ratingSummary')
          .sort({ featured: -1, rideStatus: 1, date: 1, time: 1 })
          .skip((catchAllPageNum - 1) * catchAllPageSize)
          .limit(catchAllPageSize)
          .lean(),
        Ride.countDocuments(catchAllQuery),
      ]);

      const catchAllRides = catchAllFetched
        .filter(ride => {
          const departure = getRideDepartureDateTime(ride);
          return departure === null || departure >= now;
        })
        .map(ride => ({
          ...ride,
          matchTier: null,
          matchType: 'catch_all',
          matchReason: 'See all rides across India',
          isCatchAll: true,
          availableSeats: ride.availableSeats ?? ride.seats,
          isFull: (ride.availableSeats ?? ride.seats) === 0,
        }));

      catchAllPayload = {
        data: catchAllRides,
        meta: {
          page: catchAllPageNum,
          limit: catchAllPageSize,
          total: catchAllTotal,
          totalPages: Math.max(1, Math.ceil(catchAllTotal / catchAllPageSize)),
        },
      };
    }

    res.json({
      success: true,
      count: pageData.length,
      data: pageData,
      // Step 4: always separate from `data` — never merged into the ranked
      // list. `null` unless `includeCatchAll=true` was passed; the button
      // to trigger that request is driven by `meta.catchAllAvailableCount`
      // below, which is always populated.
      catchAll: catchAllPayload,
      meta: {
        coordinateBased: hasCoords,
        pickupRadiusKm: pickupRadius,
        destRadiusKm: destRadius,
        radiusKm: Math.max(pickupRadius, destRadius),
        total,
        page: pageNum,
        limit: pageSize,
        totalPages,
        tierCounts,
        tierLabels: Object.fromEntries(
          Object.entries(TIER_META).map(([tier, meta]) => [tier, meta.label])
        ),
        catchAllAvailableCount,
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
      .populate('driverId', 'name email phone avatar isDriverVerified')
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