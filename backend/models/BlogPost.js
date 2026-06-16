const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true, maxlength: 2000 },
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        likeCount: { type: Number, default: 0 },
        parentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // for replies
        isDeleted: { type: Boolean, default: false },
        deletedAt: Date,
        reports: [
            {
                reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                reason: String,
                reportedAt: { type: Date, default: Date.now },
            },
        ],
        isFlagged: { type: Boolean, default: false },
        isApproved: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const blogPostSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        slug: { type: String, unique: true, sparse: true },
        excerpt: { type: String, maxlength: 500 },
        content: { type: String, required: true },

        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        category: {
            type: String,
            enum: ['Travel Stories', 'Carpooling Tips', 'Community Stories', 'Sustainability', 'Industry Insights'],
            required: true,
        },
        tags: [{ type: String, lowercase: true, trim: true }],

        coverImage: { url: String, publicId: String },
        coverEmoji: { type: String, default: '✍️' },
        coverColor: { type: String, default: 'from-blue-600 to-indigo-700' },

        /* ── Status ── */
        status: {
            type: String,
            enum: ['draft', 'pending_review', 'published', 'rejected', 'archived'],
            default: 'pending_review',
        },
        publishedAt: Date,
        rejectedAt: Date,
        rejectionNote: String,

        /* ── Engagement ── */
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        likeCount: { type: Number, default: 0 },
        comments: [commentSchema],
        commentCount: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
        shareCount: { type: Number, default: 0 },

        /* ── Moderation ── */
        reports: [
            {
                reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                reason: String,
                reportedAt: { type: Date, default: Date.now },
            },
        ],
        isFlagged: { type: Boolean, default: false },
        flagReason: String,

        /* ── Meta ── */
        readTimeMinutes: { type: Number, default: 1 },
        featured: { type: Boolean, default: false },
        pinned: { type: Boolean, default: false },
    },
    { timestamps: true }
);

/* ── Auto-generate slug ── */
blogPostSchema.pre('save', function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 80) + '-' + Date.now().toString(36);
    }
    // Auto-calculate read time (~200 wpm)
    if (this.isModified('content')) {
        const words = this.content.trim().split(/\s+/).length;
        this.readTimeMinutes = Math.max(1, Math.ceil(words / 200));
    }
    next();
});

/* ── Indexes ── */
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ author: 1, status: 1 });
blogPostSchema.index({ category: 1, status: 1 });
blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ featured: 1, status: 1 });
blogPostSchema.index({ isFlagged: 1 });
blogPostSchema.index({ likeCount: -1 });
blogPostSchema.index({ viewCount: -1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);