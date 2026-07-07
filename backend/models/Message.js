// models/Message.js
//
// MILESTONE 4 — Chat service (see PROJECT_STATE.md §6/§7)
//
// v1 scope (default, Q11 from PROJECT_STATE.md §4 — not yet confirmed by
// user): TEXT ONLY. No images/voice/documents/GIFs/reactions/edit/delete in
// this milestone — the spec's chat feature list was large, and v1 was
// trimmed deliberately to ship something real rather than a half-built
// version of everything. `type` is an enum specifically so those can be
// added later as additive values without a schema migration.

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function () { return this.type !== 'system'; },
        default: null,
    },

    type: {
        type: String,
        enum: ['text', 'system'], // 'system' = e.g. "Negotiation finalized" auto-messages
        default: 'text',
    },
    text: {
        type: String,
        trim: true,
        maxlength: 1000,
        required: function () { return this.type === 'text'; },
    },

    // Read receipts — array of {user, readAt} rather than a boolean, since a
    // conversation only has 2 participants but this shape survives group
    // chat later without a migration
    readBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
    }],

    isActive: { type: Boolean, default: true }, // soft delete, matches app convention

}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);