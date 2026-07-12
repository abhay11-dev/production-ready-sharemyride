// models/EmergencyEvent.js


const mongoose = require('mongoose');

const emergencyEventSchema = new mongoose.Schema(
  {
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
    rideJourney: { type: mongoose.Schema.Types.ObjectId, ref: 'RideJourney', required: true },

    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    triggeredByRole: { type: String, enum: ['driver', 'passenger'], required: true },

    status: {
      type: String,
      enum: ['active', 'resolved', 'false_alarm'],
      default: 'active',
      index: true
    },

    // Best available location at the moment SOS was pressed — from the
    // trigger request if the client supplied one, else the last known
    // ping on the journey. Never blocks triggering on a fresh GPS fix.
    location: {
      lat: Number,
      lng: Number,
      at: Date,
      source: { type: String, enum: ['client_provided', 'last_known'], default: 'last_known' }
    },

    // Snapshot of contacts notified at trigger time — kept here (not just
    // referenced against User.trustedContacts) because a user could edit
    // their contacts later and this must stay an accurate historical
    // record of who was actually notified during this specific event.
    notifiedContacts: [
      {
        _id: false,
        name: String,
        phone: String,
        relationship: String,
        notifiedAt: { type: Date, default: Date.now }
      }
    ],

    platformSupportNotified: { type: Boolean, default: false },

    adminAcknowledgement: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null }
    },

    resolution: {
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      resolvedAt: { type: Date, default: null },
      outcome: { type: String, enum: ['resolved', 'false_alarm', null], default: null },
      notes: { type: String, default: '' }
    },

    // Set true once services/emergencyService.js locks this ride's
    // LocationPing history against TTL deletion (see models/LocationPing.js).
    telemetryLocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

emergencyEventSchema.index({ ride: 1, status: 1 });

module.exports = mongoose.model('EmergencyEvent', emergencyEventSchema);