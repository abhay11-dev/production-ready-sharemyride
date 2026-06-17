const express = require('express');
const router = express.Router();
const {
    createInquiry,
    getInquiries,
    getInquiryById,
    updateInquiryStatus,
    assignInquiry,
    addInquiryNote,
    replyInquiry,
    addInternalNote,
    getFounderInbox,
    getAnalytics,
    updateInquiryPriority
} = require('../controllers/inquiryController');
const { protectAdmin } = require('../middleware/auth');

// ── Public Routes ──
// Submit inquiry (public endpoint)
router.post('/', createInquiry);

// ── Admin Routes ──
// List all inquiries with filtering
router.get('/', protectAdmin, getInquiries);

// Get single inquiry by ID
router.get('/:id', protectAdmin, getInquiryById);

// Update inquiry status (tracks resolution time automatically)
router.put('/:id/status', protectAdmin, updateInquiryStatus);

// Assign inquiry to admin
router.put('/:id/assign', protectAdmin, assignInquiry);

// Add public note to inquiry
router.post('/:id/notes', protectAdmin, addInquiryNote);

// Add internal note (admin-only, not visible to user)
router.post('/:id/internal-notes', protectAdmin, addInternalNote);

// Send reply to user and mark resolved
router.post('/:id/reply', protectAdmin, replyInquiry);

// Update priority and tags
router.put('/:id/priority', protectAdmin, updateInquiryPriority);

// ── Founder/Analytics Routes ──
// Get Founder Inbox (high-priority aggregated view)
router.get('/founder/inbox', protectAdmin, getFounderInbox);

// Get analytics and reporting data
router.get('/analytics/overview', protectAdmin, getAnalytics);

module.exports = router;
