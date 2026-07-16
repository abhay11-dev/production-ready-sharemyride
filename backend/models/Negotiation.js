// models/Negotiation.js


const mongoose = require('mongoose');

// Each preference key mirrors a card in the frontend Preference panel.
// `status` tracks what's on the table for that single preference within
// this negotiation; it is intentionally independent of the overall
// Negotiation.status so a passenger/driver can be negotiating fare AND
// preferences in the same thread without them clobbering each other.
const PREFERENCE_KEYS = [
  'smoking', 'music', 'pets', 'luggage',
  'womenOnly', 'talkative', 'childSeat', 'flexiblePickup',
];

const preferenceStateSchema = new mongoose.Schema({
  requested: { type: Boolean, default: null }, // true = passenger wants it allowed, false = wants it disallowed
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'counter_offered'],
    default: 'pending',
  },
  note: { type: String, trim: true, maxlength: 300 },
}, { _id: false });

const preferencesSchema = new mongoose.Schema(
  PREFERENCE_KEYS.reduce((shape, key) => {
    shape[key] = { type: preferenceStateSchema, default: undefined };
    return shape;
  }, {}),
  { _id: false }
);

const termsSchema = new mongoose.Schema({
  pickupLocation: { type: String, trim: true },
  pickupCoordinates: { lat: Number, lng: Number },
  dropLocation: { type: String, trim: true },
  dropCoordinates: { lat: Number, lng: Number },
  fare: { type: Number, min: 0 },
  time: { type: String, trim: true }, // e.g. "14:30"
  date: { type: Date },
  seats: { type: Number, min: 1, max: 8 },
  // Only populated when this negotiation/proposal concerns preferences
  // (source: 'preference'). Sparse by design — most negotiations never
  // touch this key.
  preferences: { type: preferencesSchema, default: undefined },
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

  // Which negotiation-card action started this thread
  source: {
    type: String,
    enum: ['chat', 'negotiate_fare', 'request_partial', 'discuss_pickup', 'discuss_drop', 'preference'],
    required: true,
  },

  // Only set when source === 'preference' — which single preference this
  // negotiation thread is about (e.g. a passenger can open separate
  // preference negotiations for 'pets' and 'music' on the same ride).
  preferenceKey: {
    type: String,
    enum: [...PREFERENCE_KEYS, null],
    default: null,
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

  // ── Reopen / lifecycle audit ─────────────────────────────────────────
  // A rejected/cancelled/expired negotiation can be reopened by either
  // party sending a fresh counter-offer (see canReopen() below). This
  // tracks how many times that's happened, and statusHistory logs every
  // transition (including reopens) so the negotiation's full lifecycle
  // stays auditable in one document rather than fragmenting across
  // multiple linked negotiations.
  reopenCount: { type: Number, default: 0 },

  statusHistory: {
    type: [{
      status: { type: String, required: true },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      changedAt: { type: Date, default: Date.now },
      note: { type: String, trim: true, maxlength: 300 },
    }],
    default: [],
  },

  // ── Disputes ──────────────────────────────────────────────────────────
  disputed: { type: Boolean, default: false },
  disputeReason: { type: String, trim: true, maxlength: 500 },
  disputeRaisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  disputeRaisedAt: { type: Date, default: null },
  disputeResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  disputeResolution: { type: String, trim: true, maxlength: 500 },
  disputeResolvedAt: { type: Date, default: null },

  // Soft delete pattern (matches existing app convention e.g. Ride.isActive)
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

negotiationSchema.index({ ride: 1, passenger: 1, status: 1 });
negotiationSchema.index({ driver: 1, status: 1 });
negotiationSchema.index({ passenger: 1, status: 1 });
negotiationSchema.index({ status: 1, expiresAt: 1 });
negotiationSchema.index({ disputed: 1, updatedAt: -1 });

// Lazy expiry: checked on read paths (getById / list) rather than a cron job.
negotiationSchema.methods.checkExpiry = function () {
  if (['pending', 'countered'].includes(this.status) && this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  return this;
};

// Logs every status change to statusHistory and applies it — replaces bare
// `negotiation.status = 'x'` assignments throughout the controller so the
// full lifecycle (including reopens) is always auditable.
negotiationSchema.methods.transitionTo = function (newStatus, actorId, note) {
  this.statusHistory.push({ status: newStatus, changedBy: actorId, changedAt: new Date(), note });
  this.status = newStatus;
  return this;
};

// A negotiation can be reopened if it died non-terminally (rejected,
// cancelled, expired) but never if a Booking already exists off it.
negotiationSchema.methods.canReopen = function () {
  return ['rejected', 'cancelled', 'expired'].includes(this.status) && !this.finalizedBookingId;
};

module.exports = mongoose.model('Negotiation', negotiationSchema);
module.exports.PREFERENCE_KEYS = PREFERENCE_KEYS;