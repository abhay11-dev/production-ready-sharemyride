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
        // ── User Information ──
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // if authenticated
        phone: { type: String, default: null },

        // ── Inquiry Content ──
        subject: { type: String, required: true, trim: true },
        message: { type: String, required: true },
        
        // ── Classification ──
        inquiryType: {
            type: String,
            required: true,
            enum: [
                // Support & Operations
                'contact', 'support', 'help_request', 'issue_report',
                // Business Relations
                'partnership', 'corporate', 'sponsorship', 'media',
                // Community & Quality
                'community_feedback', 'feedback', 'feature_request', 'blog_submission',
                'blog_report', 'comment_report', 'user_report', 'ride_report',
                // Safety & Security
                'safety_concern', 'fraud_report', 'security_issue', 'guideline_violation',
                // Account
                'account_request', 'data_request', 'deletion_request',
                // Technical
                'bug', 'technical_issue',
                // Other
                'other'
            ],
            default: 'general'
        },

        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },

        // ── Workflow Status ──
        status: {
            type: String,
            enum: ['new', 'open', 'in_review', 'waiting_for_user', 'resolved', 'closed'],
            default: 'new'
        },

        // ── Assignment & Tracking ──
        assignedTo: { type: String, default: null }, // admin user ID or email
        assignedAt: { type: Date, default: null },
        ticketId: { type: String, unique: true }, // unique ticket reference, e.g. TKT-12345, REP-12345
        
        // ── Resolution Tracking ──
        resolvedAt: { type: Date, default: null },
        closedAt: { type: Date, default: null },
        resolutionTime: { type: Number, default: null }, // milliseconds from created to resolved
        
        // ── Interactions ──
        notes: [noteSchema],
        replies: [replySchema],
        internalNotes: [noteSchema], // for admin-only notes
        
        // ── Tags & Categories ──
        tags: [{ type: String, trim: true }],
        category: { type: String, default: null },

        // ── Email Tracking ──
        emailsSent: {
            confirmationEmail: { type: Boolean, default: false },
            confirmationEmailAt: { type: Date, default: null },
            replyEmails: { type: Number, default: 0 },
            lastEmailAt: { type: Date, default: null }
        },

        // ── Related Resources ──
        relatedTo: {
            resourceType: { type: String, enum: ['ride', 'user', 'booking', 'blog', null] },
            resourceId: { type: mongoose.Schema.Types.ObjectId, default: null }
        },

        // ── Metadata ── 
        metadata: {
            affectedPage: String,
            stepsToReproduce: String,
            expected: String,
            actual: String,
            additionalNotes: String,
            userAgent: String,
            ipAddress: String,
            source: { type: String, default: 'web' }, // web, mobile, email, etc.
            customFields: mongoose.Schema.Types.Mixed // for future extensibility
        },

        // ── Visibility & Access ──
        visibleToUser: { type: Boolean, default: true },
        visibleToAdmin: { type: Boolean, default: true },
        visibleToFounder: { type: Boolean, default: true }
    },
    { timestamps: true }
);

/* ── Auto-generate Ticket ID ── */
inquirySchema.pre('save', async function (next) {
    if (!this.ticketId) {
        const rand = Math.floor(10000 + Math.random() * 90000); // 5 digit random number
        const typePrefix = this.inquiryType;
        const isReport = ['ride_report', 'user_report', 'comment_report', 'blog_report', 'fraud_report', 'security_issue', 'safety_concern'].includes(this.inquiryType);
        const prefix = isReport ? 'REP' : (this.inquiryType === 'support' ? 'SUP' : 'TKT');
        this.ticketId = `${prefix}-${rand}`;
    }
    
    // Set priority based on inquiry type
    if (!this.priority || this.priority === 'medium') {
        const criticalTypes = ['safety_concern', 'fraud_report', 'security_issue', 'guideline_violation'];
        const highTypes = ['partnership', 'account_request', 'data_request', 'deletion_request'];
        
        if (criticalTypes.includes(this.inquiryType)) {
            this.priority = 'critical';
        } else if (highTypes.includes(this.inquiryType)) {
            this.priority = 'high';
        }
    }
    
    // Track resolution time if status changed to resolved
    if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
        this.resolvedAt = new Date();
        this.resolutionTime = this.resolvedAt - this.createdAt;
    }
    
    if (this.isModified('status') && this.status === 'closed' && !this.closedAt) {
        this.closedAt = new Date();
    }
    
    next();
});

/* ── Indexes for Performance ── */
inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ priority: 1, createdAt: -1 });
inquirySchema.index({ email: 1 });
inquirySchema.index({ userId: 1 });
inquirySchema.index({ ticketId: 1 }, { unique: true });
inquirySchema.index({ inquiryType: 1, createdAt: -1 });
inquirySchema.index({ assignedTo: 1, status: 1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ resolvedAt: 1 });
inquirySchema.index({ 'relatedTo.resourceId': 1 });

/* ── INSTANCE METHODS ── */

// Update status with validation
inquirySchema.methods.updateStatus = function(newStatus, notes = null) {
    const validTransitions = {
        'new': ['open', 'closed'],
        'open': ['in_review', 'waiting_for_user', 'resolved', 'closed'],
        'in_review': ['waiting_for_user', 'resolved', 'open', 'closed'],
        'waiting_for_user': ['in_review', 'resolved', 'closed'],
        'resolved': ['closed'],
        'closed': []
    };

    if (validTransitions[this.status] && validTransitions[this.status].includes(newStatus)) {
        this.status = newStatus;
        if (notes) {
            this.notes.push({
                note: `Status changed to ${newStatus}: ${notes}`,
                addedBy: 'system',
                addedAt: new Date()
            });
        }
        return this.save();
    } else {
        throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }
};

// Assign to admin
inquirySchema.methods.assignToAdmin = function(adminId, adminEmail) {
    this.assignedTo = adminEmail;
    this.assignedAt = new Date();
    if (this.status === 'new') {
        this.status = 'open';
    }
    return this.save();
};

// Add internal note (admin only)
inquirySchema.methods.addInternalNote = function(note, adminEmail) {
    this.notes.push({
        note: note,
        addedBy: adminEmail,
        addedAt: new Date()
    });
    return this.save();
};

// Mark confirmation email sent
inquirySchema.methods.markConfirmationEmailSent = function() {
    this.emailsSent.confirmationEmail = true;
    this.emailsSent.confirmationEmailAt = new Date();
    this.emailsSent.lastEmailAt = new Date();
    return this.save();
};

// Increment reply email count
inquirySchema.methods.recordReplyEmailSent = function() {
    this.emailsSent.replyEmails = (this.emailsSent.replyEmails || 0) + 1;
    this.emailsSent.lastEmailAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Inquiry', inquirySchema);
