// services/liveTrackingService.js


const Ride = require('../models/Ride');
const RideJourney = require('../models/RideJourney');
const LocationPing = require('../models/LocationPing');
const { calculateDistance, isPointNearRoute } = require('./utils/routeMatching');
const { emitToRide } = require('./socket');
const { LifecycleError } = require('./rideLifecycleService');
const rideMonitoringService = require('./rideMonitoringService');
const { logAction } = require('./auditService');

// ── Tunables ────────────────────────────────────────────────────────────
const DEVIATION_TOLERANCE_METERS = 700; // how far off the planned route counts as "off"
const DEVIATION_CONFIRM_STREAK = 3; // consecutive off-route pings before flagging (GPS noise guard)
const LONG_STOP_SPEED_MPS = 1; // ~3.6 km/h — effectively stationary
const LONG_STOP_DURATION_MS = 5 * 60 * 1000; // 5 minutes stationary before flagging
const MOVEMENT_RESET_METERS = 50; // moving more than this clears the "stopped" clock

function roleOf(journey, userId) {
  const uid = userId.toString();
  if (journey.driver.toString() === uid) return 'driver';
  const isPassenger = journey.passengers.some((p) => p.user.toString() === uid);
  return isPassenger ? 'passenger' : null;
}

function upsertLastKnownLocation(journey, userId, role, point) {
  const uid = userId.toString();
  const idx = journey.lastKnownLocations.findIndex((l) => l.user.toString() === uid);
  const entry = {
    user: userId,
    role,
    lat: point.lat,
    lng: point.lng,
    speed: point.speed ?? null,
    heading: point.heading ?? null,
    accuracy: point.accuracy ?? null,
    at: point.at
  };
  if (idx >= 0) journey.lastKnownLocations[idx] = entry;
  else journey.lastKnownLocations.push(entry);
}

/**
 * Runs deviation + long-stop detection off the DRIVER's latest point only.
 * Passenger location (when shared) currently feeds dashboards/emergency
 * context but isn't compared against the planned route — a passenger
 * riding along isn't "deviating," the vehicle is or isn't.
 *
 * Mutates `journey` in place; caller is responsible for saving it.
 */
function runDriverAnomalyDetection(journey, ride, point) {
  const now = point.at;

  // ── Long-stop detection ────────────────────────────────────────────
  const speed = point.speed;
  const previous = journey.monitoring.lastDriverPing;
  const movedMeters = previous ? calculateDistance(previous, point) : Infinity;

  const looksStationary =
    (typeof speed === 'number' && speed <= LONG_STOP_SPEED_MPS) ||
    (typeof speed !== 'number' && movedMeters < MOVEMENT_RESET_METERS);

  if (looksStationary) {
    if (!journey.monitoring.stoppedSince) {
      journey.monitoring.stoppedSince = now;
    }
    const stoppedMs = now - new Date(journey.monitoring.stoppedSince).getTime();
    if (stoppedMs >= LONG_STOP_DURATION_MS && !journey.longStop.active) {
      journey.longStop = { active: true, since: journey.monitoring.stoppedSince, lat: point.lat, lng: point.lng };
    }
  } else {
    journey.monitoring.stoppedSince = null;
    if (journey.longStop.active) {
      journey.longStop = { active: false, since: null, lat: null, lng: null };
      journey.monitoring.longStopCheckTriggered = false;
    }
  }

  // ── Route deviation detection ──────────────────────────────────────
  if (Array.isArray(ride.routeCoordinates) && ride.routeCoordinates.length > 0) {
    const { isNear, distance } = isPointNearRoute(point, ride.routeCoordinates, DEVIATION_TOLERANCE_METERS);

    if (!isNear) {
      journey.monitoring.deviationStreak = (journey.monitoring.deviationStreak || 0) + 1;
      if (
        journey.monitoring.deviationStreak >= DEVIATION_CONFIRM_STREAK &&
        !journey.routeDeviation.active
      ) {
        journey.routeDeviation = { active: true, distanceMeters: distance, since: now };
      } else if (journey.routeDeviation.active) {
        journey.routeDeviation.distanceMeters = distance;
      }
    } else {
      journey.monitoring.deviationStreak = 0;
      if (journey.routeDeviation.active) {
        journey.routeDeviation = { active: false, distanceMeters: null, since: null };
        journey.monitoring.deviationCheckTriggered = false;
      }
    }
  }

  journey.monitoring.lastDriverPing = { lat: point.lat, lng: point.lng, at: now };
}

/**
 * Ingests a batch of location points from one device. Batching is what
 * makes offline buffering work: a phone that lost signal for 3 minutes
 * queues points locally and flushes them all here in `at` order once back
 * online, rather than needing one request per point.
 */
async function ingestLocation(rideId, user, points) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new LifecycleError('At least one location point is required', 400);
  }
  if (points.length > 200) {
    throw new LifecycleError('Too many points in a single batch (max 200)', 400);
  }

  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);

  const role = roleOf(journey, user._id);
  if (!role) throw new LifecycleError('Not authorized to report location for this ride', 403);

  if (!['started', 'boarding', 'active'].includes(journey.stage)) {
    throw new LifecycleError(`Cannot report location while ride is "${journey.stage}"`, 409);
  }

  // PHASE 5 — passenger location sharing is opt-in. Driver location isn't
  // gated the same way (see RideJourney.locationConsent for why); a
  // passenger who hasn't granted consent yet gets a clear, specific error
  // rather than points silently being dropped.
  if (role === 'passenger') {
    const entry = journey.passengers.find((p) => p.user.toString() === user._id.toString());
    if (!entry?.locationConsent?.granted) {
      throw new LifecycleError('Location sharing consent required before reporting location', 403);
    }
  }

  // Normalize + sort by client timestamp so a buffered batch replays in
  // the order it actually happened, not upload order.
  const normalized = points
    .map((p) => ({
      lat: Number(p.lat),
      lng: Number(p.lng),
      speed: p.speed != null ? Number(p.speed) : null,
      heading: p.heading != null ? Number(p.heading) : null,
      accuracy: p.accuracy != null ? Number(p.accuracy) : null,
      battery: p.battery != null ? Number(p.battery) : null,
      at: p.at ? new Date(p.at) : new Date()
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .sort((a, b) => a.at - b.at);

  if (normalized.length === 0) {
    throw new LifecycleError('No valid location points in batch', 400);
  }

  const ride = role === 'driver' ? await Ride.findById(rideId).select('routeCoordinates estimatedDuration').lean() : null;

  await LocationPing.insertMany(
    normalized.map((p) => ({
      ride: rideId,
      user: user._id,
      role,
      ...p,
      expireAt: new Date(p.at.getTime() + LocationPing.RETENTION_DAYS * 24 * 60 * 60 * 1000)
    }))
  );

  const latest = normalized[normalized.length - 1];
  upsertLastKnownLocation(journey, user._id, role, latest);

  if (role === 'driver') {
    // Run anomaly detection over every point in the batch, in order —
    // not just the latest — so a buffered offline gap doesn't skip past a
    // deviation that happened mid-gap.
    for (const p of normalized) {
      runDriverAnomalyDetection(journey, ride || { routeCoordinates: [] }, p);
    }
    // Phase 3 — piggyback the sparse safety check-in evaluation onto this
    // same ping/save cycle rather than a separate polling job. Runs after
    // anomaly detection so a deviation/long-stop that just started on
    // this very batch is already reflected in journey.routeDeviation /
    // journey.longStop by the time this checks them.
    rideMonitoringService.evaluateCheckIns(journey, ride);
  }

  await journey.save();

  emitToRide(rideId, 'ride:location', {
    rideId: rideId.toString(),
    userId: user._id.toString(),
    role,
    lat: latest.lat,
    lng: latest.lng,
    speed: latest.speed,
    heading: latest.heading,
    at: latest.at
  });

  if (role === 'driver') {
    if (journey.routeDeviation.active) {
      emitToRide(rideId, 'ride:route_deviation', {
        rideId: rideId.toString(),
        distanceMeters: journey.routeDeviation.distanceMeters,
        since: journey.routeDeviation.since
      });
    }
    if (journey.longStop.active) {
      emitToRide(rideId, 'ride:long_stop', {
        rideId: rideId.toString(),
        since: journey.longStop.since,
        lat: journey.longStop.lat,
        lng: journey.longStop.lng
      });
    }
  }

  return {
    lastKnownLocations: journey.lastKnownLocations,
    routeDeviation: journey.routeDeviation,
    longStop: journey.longStop
  };
}

/**
 * Route replay / history — authorized users only (driver or a confirmed
 * passenger on this ride). Returns raw pings ordered by capture time.
 *
 * PHASE 5 — role-based access: a passenger can see the driver's path (needed
 * for the map/replay) and their OWN path, but never another passenger's
 * individual location. The driver, running the vehicle everyone is in,
 * can see everyone's. Every read is also audit-logged — location history
 * is exactly the kind of data where "who looked at this and when" matters.
 */
async function getLocationHistory(rideId, user, { role: filterRole, limit = 500 } = {}, req = null) {
  const journey = await RideJourney.findOne({ ride: rideId }).select('driver passengers').lean();
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);

  const requesterRole = roleOf(journey, user._id);
  if (!requesterRole) throw new LifecycleError("Not authorized to view this ride's location history", 403);

  const query = { ride: rideId };
  if (requesterRole === 'passenger') {
    query.$or = [{ role: 'driver' }, { user: user._id }];
  } else if (filterRole) {
    query.role = filterRole;
  }

  const pings = await LocationPing.find(query)
    .sort({ at: 1 })
    .limit(Math.min(Number(limit) || 500, 2000))
    .select('user role lat lng speed heading at')
    .lean();

  logAction({
    actor: user,
    action: 'ride.location_view',
    resource: 'Ride',
    resourceId: rideId,
    note: `Viewed location history (${pings.length} points) as ${requesterRole}`,
    req
  }).catch(() => {}); // audit logging must never block or fail the actual read

  return pings;
}

module.exports = {
  ingestLocation,
  getLocationHistory,
  DEVIATION_TOLERANCE_METERS,
  LONG_STOP_DURATION_MS
};