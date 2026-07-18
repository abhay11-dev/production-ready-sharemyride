// models/RideOTP.js
//
// One document per booking's ride-start OTP. Created once, when payment is
// captured (webhookController.handlePaymentCaptured). Never store the raw
// OTP — only its SHA-256 hash. Consumed exactly once in Phase 2 by
// otpService.verifyOtp() -> marks used=true.
//
// Follows the project's existing model conventions (plain mongoose.Schema,
// timestamps:true, explicit indexes, toJSON/toObject virtuals off since this
// document should basically never be serialized back to a client directly).

const mongoose = require('mongoose');

const rideOtpSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required'],
    index: true
  },

  // Denormalized for fast lookups / authorization checks without a populate,
  // mirroring how Transaction stores both `passenger`/`passengerId` style
  // pairs elsewhere in this codebase.
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger is required'],
    index: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver is required'],
    index: true
  },

  // SHA-256 hex digest of the 6-digit OTP + a per-document salt.
  // Never store the plaintext OTP.
  otpHash: {
    type: String,
    required: true
  },
  otpSalt: {
    type: String,
    required: true
  },

  // ===========================
  // INTERIM PLAINTEXT REVEAL (temporary — remove once real email/SMS
  // delivery is wired, per explicit user decision on 2026-07-17)
  // ===========================
  // Real delivery (email/SMS) isn't wired yet, so the passenger/driver have
  // no other way to learn the OTP. We cache the plaintext here ONLY until
  // it's been read once via GET /api/otp/booking/:bookingId/reveal, then
  // null it out immediately (see otpController.revealOtp). This is a
  // conscious, temporary weakening of "never store plaintext" — scoped to
  // this single field, single-read, and meant to be deleted the moment a
  // real notification channel exists (see TODO(emailService) still open in
  // webhookController.js).
  otpPlaintextTemp: {
    type: String,
    default: null
  },
  otpPlaintextRevealed: {
    type: Boolean,
    default: false
  },

  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  used: {
    type: Boolean,
    default: false,
    index: true
  },
  usedAt: {
    type: Date,
    default: null
  },

  // Basic replay / brute-force guard for Phase 2's verify endpoint.
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  lockedUntil: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// One *active* (unused) OTP per booking at a time. We don't hard-unique
// booking because Phase 2/3 error-handling ("OTP expired -> regenerate")
// needs to allow a new document after the old one is spent/expired. Query
// for the current OTP is always { booking, used: false } sorted by
// createdAt desc, guarded by the index below.
rideOtpSchema.index({ booking: 1, used: 1, createdAt: -1 });

// TTL-style cleanup is intentionally NOT used here (no `expires` option on
// expiresAt) — we want expired-but-unused OTP docs to remain queryable for
// audit/fraud review. Expiry is enforced in application logic
// (otpService.verifyOtp), not by Mongo auto-deleting the document.

module.exports = mongoose.model('RideOTP', rideOtpSchema);