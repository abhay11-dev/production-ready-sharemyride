const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
    {
        note: { type: String, required: true },
        addedBy: { type: String, required: true }, // admin username or email
        addedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const replySchema = new mongoose.Schema(
    {
        message: { type: String, required: true },
        repliedBy: { type: String, required: true }, // admin username or email
        repliedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const inquirySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        subject: { type: String, required: true, trim: true },
        message: { type: String, required: true },
        
        inquiryType: {
            type: String,
            required: true,
            enum: ['general', 'partnership', 'corporate', 'community', 'media', 'feedback', 'bug', 'report', 'safety', 'other'],
            default: 'general'
        },

        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved', 'archived'],
            default: 'open'
        },

        assignedTo: { type: String, default: null }, // admin username/email
        ticketId: { type: String, unique: true }, // unique ticket reference, e.g. TKT-12345, REP-12345
        
        notes: [noteSchema],
        replies: [replySchema],

        metadata: {
            affectedPage: String,
            stepsToReproduce: String,
            expected: String,
            actual: String,
            additionalNotes: String,
            userAgent: String,
            ipAddress: String
        }
    },
    { timestamps: true }
);

/* ── Auto-generate Ticket ID ── */
inquirySchema.pre('save', async function (next) {
    if (!this.ticketId) {
        const rand = Math.floor(10000 + Math.random() * 90000); // 5 digit random number
        const prefix = ['report', 'bug', 'safety'].includes(this.inquiryType) ? 'REP' : 'TKT';
        this.ticketId = `${prefix}-${rand}`;
    }
    next();
});

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ email: 1 });
inquirySchema.index({ ticketId: 1 }, { unique: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
