// models/Negotiation.js
//
// MILESTONE 3 — Negotiation data model (see PROJECT_STATE.md §6/§7)
//
// Design decision (Q1, PROJECT_STATE.md §5): a Negotiation is its OWN
// collection, completely separate from Ride and Booking. The original Ride
// is NEVER modified by a negotiation. When a negotiation is finalized, a
// normal Booking is created (with `negotiated: true` + `negotiationId`),
// reusing the existing booking/payment pipeline unchanged.
//
// Full proposal history is kept in `proposals[]` — nothing is ever deleted
// or overwritten, satisfying "never lose negotiation history" from the spec.
//
// `source` matches the 5 canonical action keys already defined on the
// frontend in Milestone 2 (frontend/src/utils/negotiationActions.js) —
// chat / negotiate_fare / request_partial / discuss_pickup / discuss_drop —
// so there's no translation layer between what the UI offers and what the
// API records.
//
// Verified this session — no changes needed.

const mongoose = require('mongoose');

const termsSchema = new mongoose.Schema({
  pickupLocation: { type: String, trim: true },
  pickupCoordinates: { lat: Number, lng: Number },
  dropLocation: { type: String, trim: true },
  dropCoordinates: { lat: Number, lng: Number },
  fare: { type: Number, min: 0 },
  time: { type: String, trim: true }, // e.g. "14:30"
  date: { type: Date },
  seats: { type: Number, min: 1, max: 8 },
}, { _id: false });

const proposalSchema = new mongoose.Schema({
  proposedBy: { type: String, enum: ['passenger', 'driver'], required: true },
  proposedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  terms: { type: termsSchema, required: true },
  message: { type: String, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const negotiationSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: [true, 'Ride is required'],
    index: true,
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger is required'],
    index: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver is required'],
    index: true,
  },

  // Which negotiation-card action started this (see Milestone 2)
  source: {
    type: String,
    enum: ['chat', 'negotiate_fare', 'request_partial', 'discuss_pickup', 'discuss_drop'],
    required: true,
  },

  // Q2 default: passenger-initiated only for now (driver-initiated deferred —
  // field kept so it's a non-breaking addition when that's built later)
  initiatedBy: {
    type: String,
    enum: ['passenger', 'driver'],
    default: 'passenger',
  },

  status: {
    type: String,
    enum: [
      'pending',     // waiting on the other party
      'countered',   // most recent proposal was a counter-offer
      'accepted',    // both sides agreed on currentTerms — not yet finalized into a booking
      'rejected',    // one side declined
      'expired',     // expiresAt passed with no resolution
      'finalized',   // driver clicked Finalize — a Booking now exists
      'cancelled',   // either party withdrew before resolution
    ],
    default: 'pending',
    index: true,
  },

  // Latest terms on the table (mirrors the most recent entry in proposals[])
  currentTerms: { type: termsSchema, required: true },

  // Full history — never overwritten, never deleted (spec: "maintain full audit history")
  proposals: { type: [proposalSchema], default: [] },

  // Q3 default: soft cap at 10 rounds to prevent abuse (not unlimited, not overly restrictive)
  maxRounds: { type: Number, default: 10 },
  roundCount: { type: Number, default: 1 }, // the initial proposal counts as round 1

  // Q4 default: 24-hour expiry window from creation, reset on each counter-offer
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },

  // Set once status becomes 'finalized'
  finalizedBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },

  // Soft delete pattern (matches existing app convention e.g. Ride.isActive)
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

negotiationSchema.index({ ride: 1, passenger: 1, status: 1 });
negotiationSchema.index({ driver: 1, status: 1 });
negotiationSchema.index({ passenger: 1, status: 1 });
negotiationSchema.index({ status: 1, expiresAt: 1 });

// Lazy expiry: called on read paths (getById / list) rather than a cron job
// in this milestone — see PROJECT_STATE.md §7 Milestone 3 "deferred" notes.
negotiationSchema.methods.checkExpiry = function () {
  if (['pending', 'countered'].includes(this.status) && this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  return this;
};

module.exports = mongoose.model('Negotiation', negotiationSchema);