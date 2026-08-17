// services/rideMonitoringService.js

const RideJourney = require('../models/RideJourney');
const { emitToUser, emitToRide, emitToAdmins } = require('./socket');
const { LifecycleError } = require('./rideLifecycleService');

const MAX_CHECKS_PER_PASSENGER = 2;
const MIN_GAP_BETWEEN_CHECKS_MS = 10 * 60 * 1000; // don't re-check the same passenger too soon
const ROUTINE_CHECK_FALLBACK_MS = 15 * 60 * 1000; // if no ETA data, check once ~15min into the active leg

const MESSAGES = {
  routine: [
    'Hope your journey is going well. Everything OK?',
    'Just checking in — how\'s the ride so far?'
  ],
  route_deviation: 'We noticed the route changed — everything okay?',
  long_stop: 'Noticed a longer stop than expected — need any assistance?'
};

function pickRoutineMessage() {
  return MESSAGES.routine[Math.floor(Math.random() * MESSAGES.routine.length)];
}

function lastCheckFor(passenger) {
  if (!passenger.safetyChecks || passenger.safetyChecks.length === 0) return null;
  return passenger.safetyChecks[passenger.safetyChecks.length - 1];
}

function canTrigger(passenger, now) {
  if ((passenger.safetyChecks?.length || 0) >= MAX_CHECKS_PER_PASSENGER) return false;
  const last = lastCheckFor(passenger);
  if (!last) return true;
  return now - new Date(last.triggeredAt).getTime() >= MIN_GAP_BETWEEN_CHECKS_MS;
}

function triggerCheck(journey, passenger, reason, message) {
  passenger.safetyChecks.push({ reason, message, triggeredAt: new Date(), respondedAt: null, response: null });
  journey.safetyStatus = journey.safetyStatus === 'normal' ? 'check_in_pending' : journey.safetyStatus;

  const payload = {
    rideId: journey.ride.toString(),
    passengerId: passenger.user.toString(),
    reason,
    message,
    triggeredAt: new Date()
  };

  // Passenger-only delivery — their personal room (works even if they
  // don't currently have the ride dashboard open) AND the ride room (for
  // when they do). Never emitted to the driver.
  emitToUser(passenger.user, 'ride:safety_check', payload);
  emitToRide(journey.ride, 'ride:safety_check', payload);
}

/**
 * Evaluates every boarded passenger on an active ride against the current
 * anomaly state + elapsed time, and triggers at most the ones that
 * genuinely warrant it. Mutates `journey` in place — caller saves it
 * (liveTrackingService already saves the journey once per ingest, so this
 * rides along on that same save rather than causing a second write).
 */
function evaluateCheckIns(journey, ride) {
  if (journey.stage !== 'active' || !journey.activeAt) return;

  const now = Date.now();
  const activeMs = now - new Date(journey.activeAt).getTime();
  const routineThreshold = ride?.estimatedDuration
    ? Math.min((ride.estimatedDuration * 60 * 1000) / 2, ROUTINE_CHECK_FALLBACK_MS * 2)
    : ROUTINE_CHECK_FALLBACK_MS;

  for (const passenger of journey.passengers) {
    if (!passenger.boarded) continue;
    if (!canTrigger(passenger, now)) continue;

    // Anomaly-triggered checks take priority over the routine one, and
    // only fire once per anomaly occurrence via the guard flags.
    if (journey.routeDeviation.active && !journey.monitoring.deviationCheckTriggered) {
      triggerCheck(journey, passenger, 'route_deviation', MESSAGES.route_deviation);
      journey.monitoring.deviationCheckTriggered = true;
      continue;
    }
    if (journey.longStop.active && !journey.monitoring.longStopCheckTriggered) {
      triggerCheck(journey, passenger, 'long_stop', MESSAGES.long_stop);
      journey.monitoring.longStopCheckTriggered = true;
      continue;
    }

    const hasRoutineCheck = passenger.safetyChecks.some((c) => c.reason === 'routine');
    if (!hasRoutineCheck && activeMs >= routineThreshold) {
      triggerCheck(journey, passenger, 'routine', pickRoutineMessage());
    }
  }
}

/**
 * SOS / safety-check respond endpoint.
 *
 * Who can call this:
 *   - Any passenger with a confirmed booking on the ride (responds to a pending check-in)
 *   - The driver of the ride (can only send 'need_help' or 'contact_support' — i.e. SOS)
 *
 * Passengers use it to reply to automated safety check-ins.
 * Both drivers AND passengers use it for SOS (the frontend sends 'need_help').
 */
async function respondToCheckIn(rideId, actorUser, response) {
  if (!['safe', 'need_help', 'contact_support'].includes(response)) {
    throw new LifecycleError('Invalid response type', 400);
  }

  const journey = await RideJourney.findOne({ ride: rideId }).populate('ride', 'driverId postedBy driver');
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);

  const userId = actorUser._id.toString();

  // ── Determine if actor is the driver ─────────────────────────────────────
  const ride = journey.ride;
  const driverId = (ride?.driverId || ride?.postedBy || ride?.driver)?.toString();
  const isDriver = driverId && driverId === userId;

  // ── Driver SOS path ───────────────────────────────────────────────────────
  if (isDriver) {
    // Drivers can only send emergency signals, not respond to passenger check-ins
    if (response === 'safe') {
      throw new LifecycleError('Drivers cannot respond to passenger check-ins', 403);
    }

    journey.safetyStatus = 'alert';
    journey.timeline.push({
      event: 'driver_sos',
      actorRole: 'driver',
      actor: actorUser._id,
      message: `Driver triggered SOS (${response})`,
      at: new Date()
    });
    await journey.save();

    const payload = { rideId: rideId.toString(), actorId: userId, role: 'driver', response, at: new Date() };
    emitToRide(rideId, 'ride:passenger_alert', payload);
    emitToAdmins('ride:passenger_alert', payload);
    return journey;
  }

  // ── Passenger path ────────────────────────────────────────────────────────
  const passenger = journey.passengers.find((p) => p.user.toString() === userId);
  if (!passenger) throw new LifecycleError('You do not have a confirmed booking on this ride', 403);

  const pending = [...(passenger.safetyChecks || [])].reverse().find((c) => !c.respondedAt);

  // For SOS (need_help / contact_support), passengers don't need a pending check-in
  if (!pending && response === 'safe') {
    throw new LifecycleError('No pending safety check to respond to', 404);
  }

  if (pending) {
    pending.respondedAt = new Date();
    pending.response = response;
    passenger.lastSafetyResponse = response;
  }

  journey.timeline.push({
    event: response === 'safe' ? 'passenger_confirmed_safe' : 'passenger_escalated',
    actorRole: 'passenger',
    actor: actorUser._id,
    message:
      response === 'safe'
        ? `${actorUser.name || 'Passenger'} confirmed they're safe`
        : `${actorUser.name || 'Passenger'} requested help (${response})`,
    at: new Date()
  });

  if (response === 'safe') {
    if (!journey.routeDeviation.active && !journey.longStop.active) {
      journey.safetyStatus = 'normal';
    }
  } else {
    journey.safetyStatus = 'alert';
  }

  await journey.save();

  const payload = {
    rideId: rideId.toString(),
    passengerId: passengerUser._id.toString(),
    response,
    at: pending.respondedAt
  };

  if (response === 'safe') {
    emitToRide(rideId, 'ride:safety_check_resolved', payload);
  } else {
    // Passive banner on the ride room (driver sees it, doesn't get
    // interrupted with a decision to make) + a real escalation to admins.
    emitToRide(rideId, 'ride:passenger_alert', payload);
    emitToAdmins('ride:passenger_alert', payload);
  }

  return journey;
}

module.exports = {
  evaluateCheckIns,
  respondToCheckIn,
  MAX_CHECKS_PER_PASSENGER
};