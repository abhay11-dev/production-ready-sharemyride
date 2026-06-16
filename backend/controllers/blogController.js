const BlogPost = require('../models/BlogPost');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { logAction } = require('../services/auditService');

// @desc    Get all published blog posts
// @route   GET /api/blogs
// @access  Public
exports.getPublishedBlogs = async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = { status: 'published' };

        if (category && category !== 'All') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } }
            ];
        }

        const posts = await BlogPost.find(query)
            .populate('author', 'name avatar role')
            .sort({ publishedAt: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: posts.length,
            data: posts
        });
    } catch (error) {
        console.error('Fetch published blogs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get blog post by slug
// @route   GET /api/blogs/post/:slug
// @access  Public
exports.getBlogBySlug = async (req, res) => {
    try {
        const post = await BlogPost.findOne({ slug: req.params.slug })
            .populate('author', 'name avatar role email')
            .populate('comments.author', 'name avatar');

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Increment view count
        post.viewCount += 1;
        await post.save();

        res.status(200).json({
            success: true,
            data: post
        });
    } catch (error) {
        console.error('Fetch blog by slug error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create new blog post
// @route   POST /api/blogs
// @access  Private (User/Driver/Admin)
exports.createBlogPost = async (req, res) => {
    try {
        const { title, content, category, tags, coverColor, coverEmoji } = req.body;
        const authorId = req.user._id;

        if (!title || !content || !category) {
            return res.status(400).json({ success: false, message: 'Title, content, and category are required' });
        }

        // Parse tags if they are comma separated string or array
        let tagArray = [];
        if (tags) {
            if (Array.isArray(tags)) {
                tagArray = tags;
            } else if (typeof tags === 'string') {
                tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
            }
        }

        const excerpt = content.substring(0, 150) + (content.length > 150 ? '...' : '');

        // If author is admin, default status is published directly. Otherwise, pending_review.
        const isAdmin = req.user.role === 'admin';
        const status = isAdmin ? 'published' : 'pending_review';
        const publishedAt = isAdmin ? new Date() : null;

        const post = new BlogPost({
            title,
            content,
            excerpt,
            category,
            tags: tagArray,
            author: authorId,
            coverColor: coverColor || 'from-blue-600 to-indigo-700',
            coverEmoji: coverEmoji || '✍️',
            status,
            publishedAt
        });

        await post.save();

        // Audit log if admin created it
        if (isAdmin) {
            await logAction({
                actor: req.user,
                action: 'blog.approve', // acts as publish/approve
                resource: 'BlogPost',
                resourceId: post._id,
                resourceRef: post.slug,
                note: 'Admin auto-published new blog post',
                req
            });
        }

        res.status(201).json({
            success: true,
            message: isAdmin ? 'Post published successfully!' : 'Post submitted for admin moderation!',
            data: post
        });
    } catch (error) {
        console.error('Create blog post error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Like / Unlike blog post
// @route   POST /api/blogs/:id/like
// @access  Private
exports.likeBlogPost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const index = post.likes.indexOf(req.user._id);

        if (index === -1) {
            post.likes.push(req.user._id);
        } else {
            post.likes.splice(index, 1);
        }

        post.likeCount = post.likes.length;
        await post.save();

        res.status(200).json({
            success: true,
            likeCount: post.likeCount,
            liked: index === -1
        });
    } catch (error) {
        console.error('Like blog post error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Add comment to blog post
// @route   POST /api/blogs/:id/comments
// @access  Private
exports.commentBlogPost = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'Comment content is required' });
        }

        const post = await BlogPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const newComment = {
            author: req.user._id,
            content,
            likes: [],
            likeCount: 0
        };

        post.comments.push(newComment);
        post.commentCount = post.comments.filter(c => !c.isDeleted).length;
        await post.save();

        // Populate and return the newly added comment
        const updatedPost = await BlogPost.findById(req.params.id)
            .populate('comments.author', 'name avatar');
        
        const addedComment = updatedPost.comments[updatedPost.comments.length - 1];

        res.status(201).json({
            success: true,
            data: addedComment,
            commentCount: post.commentCount
        });
    } catch (error) {
        console.error('Comment blog post error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── ADMIN ONLY ENDPOINTS ──────────────────────────────────────────────────

// @desc    Get all blog posts (Admin)
// @route   GET /api/blogs/admin
// @access  Private (Admin)
exports.getAllBlogsAdmin = async (req, res) => {
    try {
        const posts = await BlogPost.find({})
            .populate('author', 'name email avatar role')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: posts.length,
            data: posts
        });
    } catch (error) {
        console.error('Fetch all blogs admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Moderate blog post (approve/reject/archive)
// @route   PUT /api/blogs/admin/:id/moderate
// @access  Private (Admin)
exports.moderateBlogPost = async (req, res) => {
    try {
        const { status, rejectionNote } = req.body;
        const validStatuses = ['published', 'rejected', 'archived'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status is required' });
        }

        const post = await BlogPost.findById(req.params.id).populate('author', 'name email');

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const oldStatus = post.status;
        post.status = status;

        if (status === 'published') {
            post.publishedAt = new Date();
            post.rejectionNote = null;
        } else if (status === 'rejected') {
            post.rejectedAt = new Date();
            post.rejectionNote = rejectionNote || 'Does not comply with community guidelines';
        }

        await post.save();

        // Send email notification to author
        if (post.author && post.author.email) {
            await emailService.sendBlogStatusNotification(post, status, rejectionNote);
        }

        // Audit log action
        const action = status === 'published' ? 'blog.approve' : 'blog.reject';
        await logAction({
            actor: req.admin || 'admin',
            action,
            resource: 'BlogPost',
            resourceId: post._id,
            resourceRef: post.slug,
            changes: { before: { status: oldStatus }, after: { status } },
            note: status === 'rejected' ? `Rejected: ${rejectionNote}` : `Approved and published`,
            req
        });

        res.status(200).json({
            success: true,
            message: `Blog post marked as ${status}`,
            data: post
        });
    } catch (error) {
        console.error('Moderate blog error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Toggle feature status of blog post (Admin)
// @route   PUT /api/blogs/admin/:id/feature
// @access  Private (Admin)
exports.featureBlogPost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const oldFeatured = post.featured;
        post.featured = !post.featured;
        await post.save();

        // Audit log
        await logAction({
            actor: req.admin || 'admin',
            action: 'blog.feature',
            resource: 'BlogPost',
            resourceId: post._id,
            resourceRef: post.slug,
            changes: { before: { featured: oldFeatured }, after: { featured: post.featured } },
            note: post.featured ? 'Featured post' : 'Unfeatured post',
            req
        });

        res.status(200).json({
            success: true,
            message: post.featured ? 'Featured successfully' : 'Unfeatured successfully',
            data: post
        });
    } catch (error) {
        console.error('Feature blog error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete blog post (Admin)
// @route   DELETE /api/blogs/admin/:id
// @access  Private (Admin)
exports.deleteBlogPostAdmin = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        await BlogPost.findByIdAndDelete(req.params.id);

        // Audit log
        await logAction({
            actor: req.admin || 'admin',
            action: 'blog.delete',
            resource: 'BlogPost',
            resourceId: post._id,
            resourceRef: post.slug,
            note: 'Admin deleted blog post',
            req
        });

        res.status(200).json({
            success: true,
            message: 'Blog post deleted successfully'
        });
    } catch (error) {
        console.error('Delete blog error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete comment from blog post (Admin)
// @route   DELETE /api/blogs/admin/:id/comments/:commentId
// @access  Private (Admin)
exports.deleteCommentAdmin = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const comment = post.comments.id(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        // soft delete comment
        comment.isDeleted = true;
        comment.deletedAt = new Date();
        post.commentCount = post.comments.filter(c => !c.isDeleted).length;
        await post.save();

        // Audit log
        await logAction({
            actor: req.admin || 'admin',
            action: 'blog.comment_delete',
            resource: 'BlogPost',
            resourceId: post._id,
            resourceRef: `${post.slug} (comment: ${comment._id})`,
            note: 'Admin soft deleted a blog comment',
            req
        });

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully',
            data: post
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
