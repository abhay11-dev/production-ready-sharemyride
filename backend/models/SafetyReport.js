/**
 * Safety Report Model
 * Tracks user-reported safety concerns, harassment, inappropriate behavior, etc.
 */

const mongoose = require('mongoose');

const reporterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    email: String,
    phone: String
  },
  { _id: false }
);

const investigationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'reviewing_evidence', 'closed'],
      default: 'not_started'
    },
    investigator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: [
      {
        note: String,
        addedBy: mongoose.Schema.Types.ObjectId,
        addedAt: { type: Date, default: Date.now }
      }
    ],
    evidence: [
      {
        type: String, // URLs to screenshots, logs, etc.
        uploadedAt: Date,
        description: String
      }
    ],
    finding: {
      type: String,
      enum: ['not_substantiated', 'partially_substantiated', 'substantiated', 'unknown'],
      default: null
    },
    action: {
      type: String,
      enum: ['no_action', 'warning', 'temporary_suspension', 'permanent_ban', 'other'],
      default: null
    },
    actionDetails: String,
    closedAt: Date,
    closedBy: mongoose.Schema.Types.ObjectId
  },
  { _id: false }
);

const safetyReportSchema = new mongoose.Schema(
  {
    /* ── BASIC INFO ── */
    ticketId: { type: String, unique: true, index: true },
    reporterInfo: reporterSchema,
    
    /* ── INCIDENT DETAILS ── */
    incidentType: {
      type: String,
      required: true,
      enum: [
        'harassment',
        'threat',
        'inappropriate_behavior',
        'safety_concern',
        'accident',
        'vehicle_issue',
        'driver_behavior',
        'passenger_behavior',
        'property_damage',
        'financial_fraud',
        'identity_concern',
        'other_safety'
      ]
    },
    
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    
    description: {
      type: String,
      required: true,
      maxlength: 5000
    },
    
    incidentDate: {
      type: Date,
      required: true
    },
    
    /* ── INVOLVED PARTIES ── */
    involvedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    involvedUserRole: {
      type: String,
      enum: ['driver', 'passenger', 'platform_staff', 'other'],
      default: 'driver'
    },
    
    /* ── CONTEXT ── */
    relatedRide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null
    },
    
    relatedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
    },
    
    location: {
      address: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    
    /* ── EVIDENCE ── */
    attachments: [
      {
        type: String, // URLs
        uploadedAt: Date,
        description: String
      }
    ],
    
    /* ── STATUS WORKFLOW ── */
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'investigating', 'on_hold', 'resolved', 'closed'],
      default: 'new',
      index: true
    },
    
    /* ── INVESTIGATION ── */
    investigation: investigationSchema,
    
    /* ── FOLLOW-UP ── */
    outcome: {
      type: String,
      default: null
    },
    
    outcomeSentToReporter: {
      type: Boolean,
      default: false
    },
    
    outcomeSentDate: Date,
    
    /* ── PRIORITY & URGENCY ── */
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    
    requiresPolice: {
      type: Boolean,
      default: false
    },
    
    policeReportFiled: {
      type: Boolean,
      default: false
    },
    
    policeReportNumber: String,
    
    /* ── ASSIGNMENT ── */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    assignedAt: Date,
    
    /* ── AUDIT TRAIL ── */
    internalNotes: String,
    
    activityLog: [
      {
        action: String,
        performedBy: mongoose.Schema.Types.ObjectId,
        performedAt: { type: Date, default: Date.now },
        details: String
      }
    ],
    
    /* ── TIMESTAMPS ── */
    acknowledgedAt: Date,
    resolvedAt: Date,
    closedAt: Date
  },
  { timestamps: true }
);

/* ── AUTO-GENERATE TICKET ID ── */
safetyReportSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(100000 + Math.random() * 900000);
    this.ticketId = `SAF-${year}-${rand}`;
  }
  next();
});

/* ── INDEXES ── */
safetyReportSchema.index({ status: 1, severity: 1, createdAt: -1 });
safetyReportSchema.index({ reporterInfo: 1 });
safetyReportSchema.index({ involvedUser: 1 });
safetyReportSchema.index({ relatedRide: 1 });
safetyReportSchema.index({ priority: 1, createdAt: -1 });
safetyReportSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('SafetyReport', safetyReportSchema);
