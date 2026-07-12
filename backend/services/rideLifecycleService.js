// services/rideLifecycleService.js


const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const RideJourney = require('../models/RideJourney');
const { emitToRide } = require('./socket');

const TRANSITIONS = {
  scheduled: ['started', 'cancelled'],
  started: ['boarding', 'active', 'cancelled'], // solo/no-boarding-step rides can skip straight to active
  boarding: ['active', 'cancelled'],
  active: ['destination_reached', 'cancelled'],
  destination_reached: ['completed'],
  completed: ['archived'],
  archived: [],
  cancelled: []
};

class LifecycleError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'LifecycleError';
    this.statusCode = statusCode;
  }
}

function assertTransition(fromStage, toStage) {
  const allowed = TRANSITIONS[fromStage] || [];
  if (!allowed.includes(toStage)) {
    throw new LifecycleError(
      `Cannot move ride journey from "${fromStage}" to "${toStage}"`,
      409
    );
  }
}

function isDriverOf(ride, userId) {
  const uid = userId.toString();
  return [ride.driver, ride.driverId, ride.postedBy]
    .filter(Boolean)
    .some((id) => id.toString() === uid);
}

async function getConfirmedBookings(rideId) {
  return Booking.find({ ride: rideId, status: 'accepted' })
    .select('_id passenger')
    .lean();
}

function pushTimeline(journey, { event, actorRole, actor, message, meta }) {
  journey.timeline.push({
    event,
    actorRole,
    actor: actor || null,
    message: message || '',
    meta: meta || null,
    at: new Date()
  });
}

function emitSync(rideId, journey, event, extra = {}) {
  emitToRide(rideId, event, {
    rideId: rideId.toString(),
    stage: journey.stage,
    timeline: journey.timeline.slice(-1)[0], // just the new entry — clients already hold the rest
    safetyStatus: journey.safetyStatus,
    updatedAt: journey.updatedAt,
    ...extra
  });
}

/**
 * Fetches (or lazily creates) the journey document for a ride. Called on
 * ride creation isn't wired in yet by design — the journey is created the
 * moment the driver actually starts the ride (see startRide), not at
 * ride-posting time, since most posted rides never get "started" as a
 * live monitored trip.
 */
async function getOrCreateJourney(rideId, driverId) {
  let journey = await RideJourney.findOne({ ride: rideId });
  if (journey) return journey;

  journey = await RideJourney.create({
    ride: rideId,
    driver: driverId,
    stage: 'scheduled'
  });
  return journey;
}

/**
 * Authorization + fetch used by every read endpoint: only the driver or a
 * passenger with a confirmed booking on this ride may view the journey.
 */
async function getJourneyForUser(rideId, userId) {
  const journey = await RideJourney.findOne({ ride: rideId }).lean();
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);

  const uid = userId.toString();
  const isDriver = journey.driver.toString() === uid;
  const isPassenger = journey.passengers.some((p) => p.user.toString() === uid);

  if (!isDriver && !isPassenger) {
    throw new LifecycleError('Not authorized to view this ride journey', 403);
  }

  return journey;
}

/**
 * Driver presses "Start Ride". Creates the journey if needed, seeds the
 * passenger list from confirmed bookings, and transitions scheduled ->
 * started. This is the single event both dashboards key off of.
 */
async function startRide(rideId, driverUser) {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new LifecycleError('Ride not found', 404);
  if (!isDriverOf(ride, driverUser._id)) {
    throw new LifecycleError('Only the driver can start this ride', 403);
  }

  const journey = await getOrCreateJourney(rideId, driverUser._id);
  assertTransition(journey.stage, 'started');

  const confirmedBookings = await getConfirmedBookings(rideId);
  if (confirmedBookings.length === 0) {
    throw new LifecycleError('Ride has no confirmed passengers to start with', 400);
  }

  journey.passengers = confirmedBookings.map((b) => ({
    user: b.passenger,
    booking: b._id,
    boarded: false,
    boardedAt: null
  }));

  journey.stage = 'started';
  journey.startedAt = new Date();
  pushTimeline(journey, {
    event: 'ride_started',
    actorRole: 'driver',
    actor: driverUser._id,
    message: 'Driver started the ride'
  });

  await journey.save();
  emitSync(rideId, journey, 'ride:started', {
    passengerCount: journey.passengers.length
  });
  emitSync(rideId, journey, 'ride:status');

  return journey;
}

/**
 * Passenger confirms they've joined/boarded the vehicle. First passenger
 * to board auto-advances started -> boarding (a purely informational
 * sub-stage; driver still explicitly starts the active leg).
 */
async function passengerBoarded(rideId, passengerUser) {
  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);

  const uid = passengerUser._id.toString();
  const entry = journey.passengers.find((p) => p.user.toString() === uid);
  if (!entry) {
    throw new LifecycleError('You do not have a confirmed booking on this ride', 403);
  }
  if (!['started', 'boarding'].includes(journey.stage)) {
    throw new LifecycleError(`Cannot board while ride is "${journey.stage}"`, 409);
  }

  entry.boarded = true;
  entry.boardedAt = new Date();

  if (journey.stage === 'started') {
    assertTransition(journey.stage, 'boarding');
    journey.stage = 'boarding';
    journey.boardingAt = new Date();
  }

  pushTimeline(journey, {
    event: 'passenger_boarded',
    actorRole: 'passenger',
    actor: passengerUser._id,
    message: `${passengerUser.name || 'Passenger'} boarded`
  });

  await journey.save();
  emitSync(rideId, journey, 'ride:passenger_boarded', {
    passengerId: uid,
    boardedCount: journey.passengers.filter((p) => p.boarded).length,
    totalPassengers: journey.passengers.length
  });
  emitSync(rideId, journey, 'ride:status');

  return journey;
}

/**
 * Driver confirms boarding is complete and the trip is underway. Also
 * mirrors into Ride.rideStatus so anything still reading the legacy field
 * (search/listing filters, etc.) sees the ride as in_progress — done here
 * rather than in rideController.js to keep this feature isolated.
 */
async function beginActiveLeg(rideId, driverUser) {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new LifecycleError('Ride not found', 404);
  if (!isDriverOf(ride, driverUser._id)) {
    throw new LifecycleError('Only the driver can do this', 403);
  }

  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);
  assertTransition(journey.stage, 'active');

  journey.stage = 'active';
  journey.activeAt = new Date();
  pushTimeline(journey, {
    event: 'ride_active',
    actorRole: 'driver',
    actor: driverUser._id,
    message: 'Ride is now active — journey underway'
  });
  await journey.save();

  if (ride.rideStatus !== 'in_progress') {
    ride.rideStatus = 'in_progress';
    await ride.save();
  }

  emitSync(rideId, journey, 'ride:status');
  return journey;
}

async function destinationReached(rideId, driverUser) {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new LifecycleError('Ride not found', 404);
  if (!isDriverOf(ride, driverUser._id)) {
    throw new LifecycleError('Only the driver can do this', 403);
  }

  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);
  assertTransition(journey.stage, 'destination_reached');

  journey.stage = 'destination_reached';
  journey.destinationReachedAt = new Date();
  pushTimeline(journey, {
    event: 'destination_reached',
    actorRole: 'driver',
    actor: driverUser._id,
    message: 'Destination reached'
  });
  await journey.save();

  emitSync(rideId, journey, 'ride:status');
  return journey;
}

async function completeRide(rideId, driverUser) {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new LifecycleError('Ride not found', 404);
  if (!isDriverOf(ride, driverUser._id)) {
    throw new LifecycleError('Only the driver can do this', 403);
  }

  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);
  assertTransition(journey.stage, 'completed');

  journey.stage = 'completed';
  journey.completedAt = new Date();
  pushTimeline(journey, {
    event: 'ride_completed',
    actorRole: 'driver',
    actor: driverUser._id,
    message: 'Ride completed'
  });
  await journey.save();

  if (ride.rideStatus !== 'completed') {
    ride.rideStatus = 'completed';
    ride.isActive = false;
    await ride.save();
  }

  emitSync(rideId, journey, 'ride:status');
  emitSync(rideId, journey, 'ride:completed');
  return journey;
}

/**
 * Archival is deliberately a separate, explicit step from completion (per
 * spec: Ride Completed -> Archived are distinct lifecycle stages). Phase 1
 * exposes it as an endpoint callable by the driver or admin; a later phase
 * can add a scheduled job (mirroring services/jobs/rideReminderScheduler.js)
 * to auto-archive completed journeys after N days.
 */
async function archiveJourney(rideId, actorUser, actorRole = 'driver') {
  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);
  assertTransition(journey.stage, 'archived');

  journey.stage = 'archived';
  journey.archivedAt = new Date();
  pushTimeline(journey, {
    event: 'ride_archived',
    actorRole,
    actor: actorUser?._id || null,
    message: 'Ride journey archived'
  });
  await journey.save();

  emitSync(rideId, journey, 'ride:status');
  return journey;
}

/**
 * Cancellation is restricted to the driver or an admin — a single
 * passenger backing out doesn't cancel the whole journey (that's handled
 * by the existing booking-cancellation flow in bookingController.js).
 */
async function cancelJourney(rideId, actorUser, actorRole, reason) {
  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);

  if (actorRole !== 'admin') {
    const ride = await Ride.findById(rideId);
    if (!ride || !isDriverOf(ride, actorUser._id)) {
      throw new LifecycleError('Only the driver or an admin can cancel the ride journey', 403);
    }
  }

  assertTransition(journey.stage, 'cancelled');

  journey.stage = 'cancelled';
  journey.cancelledAt = new Date();
  pushTimeline(journey, {
    event: 'ride_cancelled',
    actorRole,
    actor: actorUser?._id || null,
    message: reason || 'Ride journey cancelled'
  });
  await journey.save();

  emitSync(rideId, journey, 'ride:status');
  return journey;
}

/**
 * PHASE 5 — passenger opt-in/opt-out for live location sharing. Driver
 * location is not gated this way (see RideJourney.locationConsent comment
 * for why) — this is passenger-only.
 */
async function setLocationConsent(rideId, passengerUser, granted) {
  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No journey found for this ride', 404);

  const uid = passengerUser._id.toString();
  const entry = journey.passengers.find((p) => p.user.toString() === uid);
  if (!entry) {
    throw new LifecycleError('You do not have a confirmed booking on this ride', 403);
  }

  entry.locationConsent = { granted: !!granted, at: new Date() };

  pushTimeline(journey, {
    event: granted ? 'location_consent_granted' : 'location_consent_revoked',
    actorRole: 'passenger',
    actor: passengerUser._id,
    message: `${passengerUser.name || 'Passenger'} ${granted ? 'enabled' : 'disabled'} location sharing`
  });

  await journey.save();
  emitSync(rideId, journey, 'ride:status');
  return journey;
}

module.exports = {
  LifecycleError,
  STAGES: RideJourney.STAGES,
  getJourneyForUser,
  startRide,
  passengerBoarded,
  beginActiveLeg,
  destinationReached,
  completeRide,
  archiveJourney,
  cancelJourney,
  setLocationConsent
};