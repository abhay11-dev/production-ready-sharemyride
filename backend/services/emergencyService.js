// services/emergencyService.js


const Ride = require('../models/Ride');
const RideJourney = require('../models/RideJourney');
const EmergencyEvent = require('../models/EmergencyEvent');
const LocationPing = require('../models/LocationPing');
const User = require('../models/User');
const { emitToRide, emitToAdmins, emitToUser } = require('./socket');
const { LifecycleError } = require('./rideLifecycleService');

// Platform emergency support number — move to env config before shipping;
// hardcoded placeholder so the flow is complete end-to-end.
const PLATFORM_SUPPORT_NUMBER = process.env.PLATFORM_EMERGENCY_NUMBER || '+1-800-555-0100';

function roleOf(journey, userId) {
  const uid = userId.toString();
  if (journey.driver.toString() === uid) return 'driver';
  const isPassenger = journey.passengers.some((p) => p.user.toString() === uid);
  return isPassenger ? 'passenger' : null;
}

/**
 * Trusted contacts to notify for a given user, newest system first,
 * falling back to the legacy single emergencyContact/emergencyContactName
 * pair if they haven't set up the new multi-contact list yet.
 */
function resolveContacts(user) {
  if (user.trustedContacts && user.trustedContacts.length > 0) {
    return user.trustedContacts
      .filter((c) => c.notifiable !== false)
      .map((c) => ({ name: c.name, phone: c.phone, relationship: c.relationship }));
  }
  if (user.emergencyContact) {
    return [
      {
        name: user.emergencyContactName || 'Emergency Contact',
        phone: user.emergencyContact,
        relationship: 'primary'
      }
    ];
  }
  return [];
}

/**
 * Integration point for a real SMS/voice provider. Currently a no-op that
 * just logs — swap the body for a Twilio (or similar) call without
 * touching triggerSOS's control flow.
 */
async function sendSmsToContact(contact, message) {
  console.log(`📵 [emergencyService] SMS not yet wired to a provider — would send to ${contact.phone}: ${message}`);
  return { sent: false, reason: 'no_provider_configured' };
}

/**
 * Locks a ride's location history against TTL deletion by clearing
 * `expireAt` on every ping — see models/LocationPing.js for why this is
 * the correct mechanism rather than a flag a cleanup job has to check.
 */
async function lockTelemetry(rideId) {
  await LocationPing.updateMany({ ride: rideId }, { $set: { expireAt: null } });
}

/**
 * The SOS button handler. `clientLocation` is optional — if the device
 * has a fresh fix handy, pass it; otherwise this falls back to the
 * journey's last known location so triggering is never blocked waiting
 * on GPS.
 */
async function triggerSOS(rideId, user, clientLocation) {
  const ride = await Ride.findById(rideId).lean();
  if (!ride) throw new LifecycleError('Ride not found', 404);

  const journey = await RideJourney.findOne({ ride: rideId });
  if (!journey) throw new LifecycleError('No active journey for this ride', 404);

  const role = roleOf(journey, user._id);
  if (!role) throw new LifecycleError('Not authorized to trigger SOS on this ride', 403);

  // Resolve location: prefer a fresh client fix, else this participant's
  // last known ping, else the driver's.
  let location = null;
  if (clientLocation?.lat && clientLocation?.lng) {
    location = { lat: clientLocation.lat, lng: clientLocation.lng, at: new Date(), source: 'client_provided' };
  } else {
    const mine = journey.lastKnownLocations.find((l) => l.user.toString() === user._id.toString());
    const fallback = mine || journey.lastKnownLocations.find((l) => l.role === 'driver');
    if (fallback) {
      location = { lat: fallback.lat, lng: fallback.lng, at: fallback.at, source: 'last_known' };
    }
  }

  const fullUser = await User.findById(user._id)
    .select('name phone trustedContacts emergencyContact emergencyContactName')
    .lean();
  const contacts = resolveContacts(fullUser);

  const event = await EmergencyEvent.create({
    ride: rideId,
    rideJourney: journey._id,
    triggeredBy: user._id,
    triggeredByRole: role,
    location,
    notifiedContacts: contacts.map((c) => ({ ...c, notifiedAt: new Date() })),
    platformSupportNotified: true
  });

  // Fire-and-forget best-effort SMS to each notifiable contact — doesn't
  // block the SOS response on external provider latency/failure.
  Promise.allSettled(
    contacts.map((c) =>
      sendSmsToContact(
        c,
        `${fullUser.name || 'A rider'} triggered an emergency alert during a ShareMyRide trip. Location: https://maps.google.com/?q=${location?.lat},${location?.lng}`
      )
    )
  ).catch(() => {});

  // Lock telemetry immediately — investigation data must never be lost to
  // routine TTL cleanup once an emergency has been declared.
  await lockTelemetry(rideId);
  event.telemetryLocked = true;
  await event.save();

  journey.safetyStatus = 'emergency';
  journey.timeline.push({
    event: 'sos_triggered',
    actorRole: role,
    actor: user._id,
    message: `SOS triggered by ${role}`,
    meta: { emergencyEventId: event._id },
    at: new Date()
  });
  await journey.save();

  const payload = {
    rideId: rideId.toString(),
    emergencyEventId: event._id.toString(),
    triggeredBy: user._id.toString(),
    triggeredByRole: role,
    triggeredByName: fullUser.name,
    location,
    ride: {
      pickup: ride.start,
      destination: ride.end
    },
    at: event.createdAt
  };

  // Ride room: driver + passenger(s) see the SOS is active (this is the
  // one case where the driver DOES get an urgent, real-time signal — SOS
  // is explicitly the "critical alert" carve-out from the no-interrupt
  // rule elsewhere in the platform).
  emitToRide(rideId, 'ride:sos_triggered', payload);
  // Admin dashboard: the primary responder channel.
  emitToAdmins('ride:sos_triggered', payload);

  return {
    event,
    contacts,
    platformSupportNumber: PLATFORM_SUPPORT_NUMBER
  };
}

/**
 * Admin (or the triggering user, e.g. false alarm) resolves the incident.
 */
async function resolveSOS(rideId, emergencyEventId, actorUser, actorRole, outcome, notes) {
  if (!['resolved', 'false_alarm'].includes(outcome)) {
    throw new LifecycleError('Invalid resolution outcome', 400);
  }

  const event = await EmergencyEvent.findOne({ _id: emergencyEventId, ride: rideId });
  if (!event) throw new LifecycleError('Emergency event not found', 404);
  if (event.status !== 'active') throw new LifecycleError('This emergency has already been resolved', 409);

  event.status = outcome;
  event.resolution = { resolvedBy: actorUser._id, resolvedAt: new Date(), outcome, notes: notes || '' };
  await event.save();

  const journey = await RideJourney.findOne({ ride: rideId });
  if (journey) {
    const stillHasActiveConcerns = journey.routeDeviation.active || journey.longStop.active;
    journey.safetyStatus = stillHasActiveConcerns ? 'alert' : 'normal';
    journey.timeline.push({
      event: 'sos_resolved',
      actorRole,
      actor: actorUser._id,
      message: `SOS marked as ${outcome}${notes ? `: ${notes}` : ''}`,
      meta: { emergencyEventId: event._id },
      at: new Date()
    });
    await journey.save();
  }

  const payload = {
    rideId: rideId.toString(),
    emergencyEventId: event._id.toString(),
    outcome,
    resolvedBy: actorUser._id.toString(),
    at: event.resolution.resolvedAt
  };

  emitToRide(rideId, 'ride:sos_resolved', payload);
  emitToAdmins('ride:sos_resolved', payload);

  return event;
}

/**
 * Admin acknowledges they've seen the SOS — separate from full resolution
 * so responders can signal "I'm on it" immediately without needing to
 * already know the outcome.
 */
async function acknowledgeSOS(emergencyEventId, adminUser) {
  const event = await EmergencyEvent.findById(emergencyEventId);
  if (!event) throw new LifecycleError('Emergency event not found', 404);

  event.adminAcknowledgement = { by: adminUser._id, at: new Date() };
  await event.save();

  emitToRide(event.ride, 'ride:sos_acknowledged', {
    rideId: event.ride.toString(),
    emergencyEventId: event._id.toString(),
    by: adminUser._id.toString(),
    at: event.adminAcknowledgement.at
  });
  emitToUser(event.triggeredBy, 'ride:sos_acknowledged', {
    rideId: event.ride.toString(),
    emergencyEventId: event._id.toString()
  });

  return event;
}

async function getActiveEmergencies() {
  return EmergencyEvent.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .populate('triggeredBy', 'name phone')
    .populate('ride', 'start end')
    .lean();
}

module.exports = {
  triggerSOS,
  resolveSOS,
  acknowledgeSOS,
  getActiveEmergencies,
  resolveContacts,
  lockTelemetry,
  PLATFORM_SUPPORT_NUMBER
};