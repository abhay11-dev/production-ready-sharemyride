// models/LocationPing.js


const mongoose = require('mongoose');

const RETENTION_DAYS = 90;

const locationPingSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['driver', 'passenger'],
    required: true
  },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: null }, // m/s
  heading: { type: Number, default: null }, // degrees
  accuracy: { type: Number, default: null }, // meters
  battery: { type: Number, default: null }, // 0-100, if the device reports it

  // Client-reported capture time. Can be well before `receivedAt` if the
  // point was buffered offline and uploaded later — that gap is exactly
  // how "was this device offline" gets detected, so both timestamps are
  // kept rather than collapsing to one.
  at: { type: Date, required: true, index: true },
  receivedAt: { type: Date, default: Date.now },

  // TTL trigger field, set to `at + RETENTION_DAYS` at insert time (see
  // liveTrackingService.ingestLocation). Deliberately separate from `at`
  // itself: services/emergencyService.js "locks" a ride's telemetry by
  // $unset-ing this field on all of its pings — a document with no
  // `expireAt` is permanently skipped by MongoDB's TTL monitor, which is
  // exactly the "lock and preserve all ride telemetry for investigation"
  // requirement from the Emergency flow, done correctly rather than as a
  // best-effort flag an unrelated job has to remember to check.
  expireAt: { type: Date, default: null }
});

locationPingSchema.index({ ride: 1, at: 1 });
locationPingSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

locationPingSchema.statics.RETENTION_DAYS = RETENTION_DAYS;

module.exports =
  mongoose.models.LocationPing ||
  mongoose.model('LocationPing', locationPingSchema);