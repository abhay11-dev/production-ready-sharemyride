// models/Conversation.js
//
// MILESTONE 4 — Chat service (see PROJECT_STATE.md §6/§7)
//
// Design decision (resolved before this milestone started): chat is a
// STANDALONE Conversation/Message model, not embedded inside Negotiation.
// A Conversation is created the first time either party sends a message
// about a ride — with or without an open negotiation. If a negotiation is
// later opened on the same ride/passenger/driver pair, it references the
// existing conversation via `negotiationId` rather than creating a new one.
//
// One conversation per (ride, passenger, driver) triple — enforced by the
// unique compound index below.

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        required: true,
        index: true,
    },
    passenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    // Set once a negotiation is opened on this ride/passenger/driver pair.
    // Nullable — plain chat (no negotiation yet) is fully supported.
    negotiationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Negotiation',
        default: null,
    },

    lastMessage: {
        text: { type: String, trim: true, maxlength: 500 },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        sentAt: { type: Date },
    },

    // Per-participant unread counters (keyed by role, not userId, since a
    // conversation only ever has these 2 fixed roles)
    unreadCount: {
        passenger: { type: Number, default: 0 },
        driver: { type: Number, default: 0 },
    },

    // Presence snapshot — updated by the socket layer, not authoritative for
    // anything beyond a "last seen" UI hint (see services/socket.js)
    lastSeenBy: {
        passenger: { type: Date },
        driver: { type: Date },
    },

    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
    },
    isActive: { type: Boolean, default: true },

}, { timestamps: true });

// One conversation per ride+passenger+driver triple
conversationSchema.index({ ride: 1, passenger: 1, driver: 1 }, { unique: true });
conversationSchema.index({ passenger: 1, status: 1, updatedAt: -1 });
conversationSchema.index({ driver: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);