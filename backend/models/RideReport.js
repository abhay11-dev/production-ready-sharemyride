/**
 * Ride Report Model
 * Tracks issues reported about specific rides
 */

const mongoose = require('mongoose');

const reporterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['driver', 'passenger'],
      required: true
    }
  },
  { _id: false }
);

const rideReportSchema = new mongoose.Schema(
  {
    /* ── BASIC INFO ── */
    ticketId: { type: String, unique: true, index: true },
    
    /* ── RIDE REFERENCE ── */
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
      index: true
    },
    
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    /* ── REPORTER INFORMATION ── */
    reporter: reporterSchema,
    
    /* ── ISSUE DETAILS ── */
    issueType: {
      type: String,
      required: true,
      enum: [
        'wrong_route',
        'excessive_charge',
        'refusal_to_transport',
        'reckless_driving',
        'vehicle_condition',
        'cleanliness',
        'comfort_issue',
        'safety_concern',
        'lost_item',
        'damage_to_vehicle',
        'unprofessional_conduct',
        'other_issue'
      ]
    },
    
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    
    description: {
      type: String,
      required: true,
      maxlength: 2000
    },
    
    /* ── EVIDENCE ── */
    attachments: [
      {
        type: String, // URLs
        uploadedAt: Date,
        description: String
      }
    ],
    
    /* ── IMPACT & RESOLUTION REQUEST ── */
    requestedAction: {
      type: String,
      enum: ['refund', 'credit', 'investigation', 'driver_warning', 'other', 'none'],
      default: 'investigation'
    },
    
    requestedAmount: {
      type: Number,
      default: null,
      min: 0
    },
    
    /* ── STATUS WORKFLOW ── */
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'investigating', 'information_requested', 'resolved', 'closed'],
      default: 'new',
      index: true
    },
    
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    
    /* ── INVESTIGATION & RESOLUTION ── */
    investigationNotes: String,
    
    finding: {
      type: String,
      enum: ['valid', 'partially_valid', 'not_valid', 'inconclusive'],
      default: null
    },
    
    resolution: {
      type: String,
      default: null
    },
    
    resolutionAmount: {
      type: Number,
      default: null,
      min: 0
    },
    
    /* ── DRIVER RESPONSE ── */
    driverResponse: String,
    driverResponseAt: Date,
    
    /* ── ASSIGNMENT & TRACKING ── */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    assignedAt: Date,
    
    /* ── ACTIVITY LOG ── */
    internalNotes: String,
    
    interactions: [
      {
        type: String, // 'email_sent', 'response_received', 'investigation_started', etc.
        performedAt: { type: Date, default: Date.now },
        details: String
      }
    ],
    
    /* ── EMAIL TRACKING ── */
    emailsSent: {
      confirmation: Boolean,
      driverNotification: Boolean,
      resolution: Boolean
    },
    
    /* ── TIMESTAMPS ── */
    acknowledgedAt: Date,
    resolvedAt: Date,
    closedAt: Date
  },
  { timestamps: true }
);

/* ── AUTO-GENERATE TICKET ID ── */
rideReportSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(100000 + Math.random() * 900000);
    this.ticketId = `RID-${year}-${rand}`;
  }
  next();
});

/* ── INDEXES ── */
rideReportSchema.index({ status: 1, priority: 1, createdAt: -1 });
rideReportSchema.index({ ride: 1 });
rideReportSchema.index({ driver: 1, createdAt: -1 });
rideReportSchema.index({ passenger: 1, createdAt: -1 });
rideReportSchema.index({ 'reporter.userId': 1 });
rideReportSchema.index({ assignedTo: 1, status: 1 });
rideReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RideReport', rideReportSchema);
