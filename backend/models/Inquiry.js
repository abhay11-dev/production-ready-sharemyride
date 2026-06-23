const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
    {
        /* ── Who submitted ── */
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        phone: { type: String, default: null },

        /* ── What they submitted ── */
        type: {
            type: String,
            required: true,
            enum: [
                'contact_general',
                'contact_partnership',
                'contact_corporate',
                'contact_community',
                'contact_media',
                'contact_feedback',
                'help_center',
                'report_technical',
                'report_ride',
                'report_safety',
                'report_account',
                'report_payment',
                'report_other',
                'blog_submission',
                'blog_comment_report',
                'community_report',
                'support_request',
            ],
            default: 'contact_general'
        },
        subject: { type: String, required: true, trim: true },
        message: { type: String, required: true },

        /* ── Extra structured fields (for reports) ── */
        meta: {
            affectedPage: String,
            stepsToReproduce: String,
            expectedBehaviour: String,
            actualBehaviour: String,
            additionalNotes: String,
            relatedRideId: String,
            relatedUserId: String,
            severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        },

        /* ── Ticket management ── */
        ticketNumber: { type: String, unique: true },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed', 'archived', 'seen', 'replied'],
            default: 'open',
        },
        priority: { type: String, enum: ['low', 'medium', 'high', 'urgent', 'critical'], default: 'medium' },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

        /* ── Admin workflow ── */
        internalNotes: [
            {
                note: String,
                addedBy: { type: String }, // support email or admin username
                addedAt: { type: Date, default: Date.now },
            },
        ],
        adminReplies: [
            {
                message: String,
                sentBy: { type: String }, // admin email or username
                sentAt: { type: Date, default: Date.now },
                emailSent: { type: Boolean, default: false },
            },
        ],

        /* ── Delivery tracking ── */
        emailSentToAdmin: { type: Boolean, default: false },
        emailSentToUser: { type: Boolean, default: false },
        confirmationEmailAt: Date,
        adminEmailAt: Date,

        emailsSent: {
            confirmationEmail: { type: Boolean, default: false },
            confirmationEmailAt: Date,
            adminAlertEmail: { type: Boolean, default: false },
            adminAlertEmailAt: Date,
        },

        /* ── Soft-delete / archive ── */
        isArchived: { type: Boolean, default: false },
        resolvedAt: Date,
        closedAt: Date,
    },
    { timestamps: true }
);

/* ── Auto-generate ticket number ── */
inquirySchema.pre('save', async function (next) {
    if (!this.ticketNumber) {
        const prefix = this.type.startsWith('report') ? 'RPT' :
            this.type.startsWith('contact') ? 'INQ' :
                this.type.startsWith('blog') ? 'BLG' :
                    this.type === 'help_center' ? 'HLP' : 'TKT';
        const count = await this.constructor.countDocuments();
        this.ticketNumber = `${prefix}-${String(count + 1001).padStart(5, '0')}`;
    }
    next();
});

/* ── Virtuals for backward compatibility with ticketId and inquiryType ── */
inquirySchema.virtual('ticketId').get(function () {
    return this.ticketNumber;
});
inquirySchema.virtual('inquiryType').get(function () {
    return this.type;
});

inquirySchema.set('toJSON', { virtuals: true });
inquirySchema.set('toObject', { virtuals: true });

/* ── Indexes ── */
inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ type: 1, createdAt: -1 });
inquirySchema.index({ email: 1 });
inquirySchema.index({ userId: 1 });
inquirySchema.index({ ticketNumber: 1 });
inquirySchema.index({ isArchived: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);