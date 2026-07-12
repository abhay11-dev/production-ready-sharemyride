// models/ModerationFlag.js


const mongoose = require('mongoose');

const moderationFlagSchema = new mongoose.Schema({
    message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: true,
        index: true,
    },
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    // What the quick-scan (synchronous, regex-based) caught — see
    // services/moderationService.js quickScan(). Purely structural pattern
    // matches: phone numbers, emails, UPI IDs, external-app mentions.
    quickScanMatches: [{
        category: { type: String }, // 'phone' | 'email' | 'upi' | 'external_app' | 'off_platform_phrase'
        // Raw matched snippet is NOT stored here — see note below on why.
    }],

    // What the async AI pass found (may be null if AI analysis hasn't run
    // yet, is disabled, or failed — quick-scan-only flags still get created)
    aiAnalysis: {
        categories: [{ type: String }], // e.g. 'scam', 'harassment', 'threat', 'spam', 'off_platform_payment'
        explanation: { type: String, maxlength: 500 },
        rawModel: { type: String }, // which model produced this, for traceability
    },

    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true,
        index: true,
    },

    // Original, UNMASKED text — needed for admin review, since the message
    // itself stores the masked version (see moderationService.maskText()).
    // Access to this field should be admin-only at the API layer.
    originalText: { type: String, maxlength: 1000 },

    reviewed: { type: Boolean, default: false, index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    adminNote: { type: String, maxlength: 1000 },

    // Set true once a critical-severity flag has triggered an admin
    // notification (Milestone 8 will wire the actual email send — this field
    // exists now so that milestone doesn't need a schema change)
    adminNotified: { type: Boolean, default: false },

}, { timestamps: true });

moderationFlagSchema.index({ severity: 1, reviewed: 1, createdAt: -1 });
moderationFlagSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model('ModerationFlag', moderationFlagSchema);