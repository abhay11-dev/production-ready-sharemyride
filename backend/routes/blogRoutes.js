const express = require('express');
const router = express.Router();
const {
    getPublishedBlogs,
    getBlogBySlug,
    createBlogPost,
    likeBlogPost,
    commentBlogPost,
    getAllBlogsAdmin,
    moderateBlogPost,
    featureBlogPost,
    deleteBlogPostAdmin,
    deleteCommentAdmin
} = require('../controllers/blogController');
const { protect, protectAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getPublishedBlogs);
router.get('/post/:slug', getBlogBySlug);

// Authenticated user routes
router.post('/', protect, createBlogPost);
router.post('/:id/like', protect, likeBlogPost);
router.post('/:id/comments', protect, commentBlogPost);

// Admin-only routes
router.get('/admin/all', protectAdmin, getAllBlogsAdmin);
router.put('/admin/:id/moderate', protectAdmin, moderateBlogPost);
router.put('/admin/:id/feature', protectAdmin, featureBlogPost);
router.delete('/admin/:id', protectAdmin, deleteBlogPostAdmin);
router.delete('/admin/:id/comments/:commentId', protectAdmin, deleteCommentAdmin);

module.exports = router;
