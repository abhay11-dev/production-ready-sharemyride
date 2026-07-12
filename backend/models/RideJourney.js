// models/RideJourney.js


const mongoose = require('mongoose');

const STAGES = [
  'scheduled',
  'started',
  'boarding',
  'active',
  'destination_reached',
  'completed',
  'archived',
  'cancelled'
];

const passengerProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    boarded: { type: Boolean, default: false },
    boardedAt: { type: Date, default: null },
    // Placeholder for later phases (safety check-ins) — harmless now.
    lastSafetyResponse: {
      type: String,
      enum: ['safe', 'need_help', 'contact_support', null],
      default: null
    },
    // ── PHASE 5 — Privacy & Consent ────────────────────────────────────
    // Passenger location sharing is opt-in — driver location is not
    // gated the same way, since sharing the vehicle's position is
    // inherent to operating the ride itself, not an optional extra.
    // liveTrackingService.ingestLocation refuses passenger location
    // points until this is granted (see services/liveTrackingService.js).
    locationConsent: {
      granted: { type: Boolean, default: false },
      at: { type: Date, default: null }
    },
    // ── PHASE 3 — Intelligent Safety Check-ins ─────────────────────────
    // Kept per-passenger since each rider on a shared ride gets their own
    // check-ins, independently capped and independently answered.
    safetyChecks: [
      {
        _id: false,
        reason: {
          type: String,
          enum: ['routine', 'route_deviation', 'long_stop'],
          required: true
        },
        message: String,
        triggeredAt: { type: Date, default: Date.now },
        respondedAt: { type: Date, default: null },
        response: {
          type: String,
          enum: ['safe', 'need_help', 'contact_support', null],
          default: null
        }
      }
    ]
  },
  { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    actorRole: {
      type: String,
      enum: ['driver', 'passenger', 'system', 'admin'],
      default: 'system'
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    message: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const rideJourneySchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
      unique: true,
      index: true
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    stage: {
      type: String,
      enum: STAGES,
      default: 'scheduled',
      index: true
    },

    passengers: [passengerProgressSchema],

    timeline: [timelineEventSchema],

    // Stage timestamps — kept flat (rather than only in `timeline`) so
    // dashboards can render them without walking the whole event array.
    startedAt: Date,
    boardingAt: Date,
    activeAt: Date,
    destinationReachedAt: Date,
    completedAt: Date,
    archivedAt: Date,
    cancelledAt: Date,

    // Placeholder fields for Phase 2/3 — declared now so the frontend
    // contract doesn't need to change again when those phases land.
    eta: {
      minutes: { type: Number, default: null },
      updatedAt: { type: Date, default: null }
    },
    safetyStatus: {
      type: String,
      enum: ['normal', 'check_in_pending', 'alert', 'emergency'],
      default: 'normal',
      index: true
    },

    // ── PHASE 2 — Live Location Tracking ──────────────────────────────
    // Last known position per participant (driver + each passenger who has
    // opted in). Kept on the journey doc itself — O(1) to read for
    // dashboards, rather than querying the LocationPing collection on
    // every page load.
    lastKnownLocations: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['driver', 'passenger'], required: true },
        lat: Number,
        lng: Number,
        speed: Number, // m/s, if the device reports it
        heading: Number, // degrees, if the device reports it
        accuracy: Number, // meters
        at: Date // client-reported timestamp (may lag `receivedAt` after offline buffering)
      }
    ],

    // Rolling anomaly-detection state, updated O(1) per incoming ping
    // rather than re-querying ping history every time — matters at scale
    // since this is the highest-volume write path in the whole platform.
    monitoring: {
      lastDriverPing: {
        lat: Number,
        lng: Number,
        at: Date
      },
      deviationStreak: { type: Number, default: 0 }, // consecutive off-route pings
      stoppedSince: { type: Date, default: null }, // set when driver speed ~0 begins
      // Phase 3 guards — prevent one ongoing anomaly from re-triggering a
      // fresh check-in on every subsequent ping while it's still active.
      deviationCheckTriggered: { type: Boolean, default: false },
      longStopCheckTriggered: { type: Boolean, default: false }
    },

    routeDeviation: {
      active: { type: Boolean, default: false },
      distanceMeters: Number,
      since: Date
    },

    longStop: {
      active: { type: Boolean, default: false },
      since: Date,
      lat: Number,
      lng: Number
    }
  },
  { timestamps: true }
);

rideJourneySchema.index({ driver: 1, stage: 1 });
rideJourneySchema.index({ 'passengers.user': 1, stage: 1 });

rideJourneySchema.statics.STAGES = STAGES;

module.exports = mongoose.model('RideJourney', rideJourneySchema);