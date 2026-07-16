const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
        actorEmail: { type: String },
        actorRole: { type: String },

        action: {
            type: String,
            required: true,
            enum: [
                // Inquiry actions
                'inquiry.view', 'inquiry.status_change', 'inquiry.assign',
                'inquiry.reply', 'inquiry.note_add', 'inquiry.archive',
                'inquiry.export',
                // Blog actions
                'blog.approve', 'blog.reject', 'blog.feature', 'blog.delete',
                'blog.comment_delete', 'blog.flag',
                // User actions
                'user.suspend', 'user.activate', 'user.verify_driver',
                'user.role_change', 'user.view',
                // Ride actions
                'ride.feature', 'ride.delete', 'ride.view',
                // Negotiation actions (Milestone 3)
                'negotiation.initiate', 'negotiation.counter', 'negotiation.accept',
                'negotiation.reject', 'negotiation.cancel', 'negotiation.finalize',
                // Negotiation dispute actions (Milestone 9)
                'negotiation.dispute_raised', 'negotiation.dispute_resolved',
                // Moderation actions (Milestone 5)
                'moderation.flag',
                // Ride Safety Platform — Phase 5 (Privacy, Consent & Retention)
                'ride.location_view', 'ride.location_consent_change',
                'ride.journey_auto_archive', 'ride.telemetry_minimized',
                'contact.add', 'contact.update', 'contact.remove',
                // System
                'export.data', 'admin.login',
            ],
        },

        resource: { type: String }, // e.g. 'Inquiry', 'BlogPost', 'User'
        resourceId: { type: mongoose.Schema.Types.ObjectId },
        resourceRef: { type: String }, // human-readable ref like ticket number

        changes: {
            before: mongoose.Schema.Types.Mixed,
            after: mongoose.Schema.Types.Mixed,
        },

        note: { type: String },
        ipAddress: { type: String },
        userAgent: { type: String },
    },
    { timestamps: true }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);