// services/jobs/rideDataRetentionScheduler.js


const cron = require('node-cron');
const RideJourney = require('../../models/RideJourney');
const EmergencyEvent = require('../../models/EmergencyEvent');
const { archiveJourney } = require('../rideLifecycleService');
const { logAction } = require('../auditService');

const AUTO_ARCHIVE_AFTER_DAYS = 7;
const MINIMIZE_AFTER_DAYS = 30;

async function hasEmergencyRecord(rideId) {
  const count = await EmergencyEvent.countDocuments({ ride: rideId });
  return count > 0;
}

async function autoArchiveCompletedJourneys() {
  const cutoff = new Date(Date.now() - AUTO_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await RideJourney.find({ stage: 'completed', completedAt: { $lte: cutoff } }).select('ride');

  let archived = 0;
  for (const { ride } of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await archiveJourney(ride, null, 'system');
      archived++;
    } catch (err) {
      console.warn(`⚠️ [retention] Failed to auto-archive journey for ride ${ride}:`, err.message);
    }
  }
  return archived;
}

async function minimizeOldArchivedJourneys() {
  const cutoff = new Date(Date.now() - MINIMIZE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await RideJourney.find({
    stage: 'archived',
    archivedAt: { $lte: cutoff },
    'lastKnownLocations.0': { $exists: true } // skip ones already minimized
  });

  let minimized = 0;
  for (const journey of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await hasEmergencyRecord(journey.ride)) continue; // investigation data takes priority

    journey.lastKnownLocations = [];
    journey.monitoring = {
      lastDriverPing: null,
      deviationStreak: 0,
      stoppedSince: null,
      deviationCheckTriggered: false,
      longStopCheckTriggered: false
    };
    // eslint-disable-next-line no-await-in-loop
    await journey.save();

    // eslint-disable-next-line no-await-in-loop
    await logAction({
      actor: 'system',
      action: 'ride.telemetry_minimized',
      resource: 'RideJourney',
      resourceId: journey._id,
      note: `Cleared raw location data after ${MINIMIZE_AFTER_DAYS} days (timeline retained)`
    }).catch(() => {});

    minimized++;
  }
  return minimized;
}

async function runRetentionSweep() {
  const cid = Date.now().toString(36);
  try {
    const archived = await autoArchiveCompletedJourneys();
    const minimized = await minimizeOldArchivedJourneys();
    if (archived || minimized) {
      console.log(`🗄️ [retention:${cid}] Auto-archived ${archived} journeys, minimized ${minimized} journeys`);
    }
  } catch (err) {
    console.error(`❌ [retention:${cid}] Sweep failed:`, err.message);
  }
}

function startRideDataRetentionScheduler() {
  // Once every 6 hours — this is housekeeping, not time-critical.
  cron.schedule('0 */6 * * *', runRetentionSweep);
  console.log('🗄️ Ride data retention scheduler started (every 6 hours)');
}

module.exports = { startRideDataRetentionScheduler, runRetentionSweep };