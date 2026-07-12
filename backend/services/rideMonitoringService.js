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
 * One-tap passenger response: 'safe' | 'need_help' | 'contact_support'.
 * 'safe' quietly resolves; the other two escalate to the admin dashboard
 * (and clear back down to a passive banner on the driver's side, never an
 * interactive prompt — see the module doc above).
 */
async function respondToCheckIn(rideId, passengerUser, response) {
  if (!['safe', 'need_help', 'contact_support'].includes(response)) {
    throw new LifecycleError('Invalid response type', 400);
  }

  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);

  const passenger = journey.passengers.find((p) => p.user.toString() === passengerUser._id.toString());
  if (!passenger) throw new LifecycleError('You do not have a confirmed booking on this ride', 403);

  const pending = [...(passenger.safetyChecks || [])].reverse().find((c) => !c.respondedAt);
  if (!pending) throw new LifecycleError('No pending safety check to respond to', 404);

  pending.respondedAt = new Date();
  pending.response = response;
  passenger.lastSafetyResponse = response;

  journey.timeline.push({
    event: response === 'safe' ? 'passenger_confirmed_safe' : 'passenger_escalated',
    actorRole: 'passenger',
    actor: passengerUser._id,
    message:
      response === 'safe'
        ? `${passengerUser.name || 'Passenger'} confirmed they're safe`
        : `${passengerUser.name || 'Passenger'} requested help (${response})`,
    at: new Date()
  });

  if (response === 'safe') {
    // Only drop back to 'normal' if nothing else (deviation/long-stop) is
    // still active — those own the elevated status until they clear.
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