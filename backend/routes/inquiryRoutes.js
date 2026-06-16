const express = require('express');
const router = express.Router();
const {
    createInquiry,
    getInquiries,
    getInquiryById,
    updateInquiryStatus,
    assignInquiry,
    addInquiryNote,
    replyInquiry
} = require('../controllers/inquiryController');
const { protectAdmin } = require('../middleware/auth');

// Public route to submit an inquiry
router.post('/', createInquiry);

// Admin-only routes
router.get('/', protectAdmin, getInquiries);
router.get('/:id', protectAdmin, getInquiryById);
router.put('/:id/status', protectAdmin, updateInquiryStatus);
router.put('/:id/assign', protectAdmin, assignInquiry);
router.post('/:id/notes', protectAdmin, addInquiryNote);
router.post('/:id/reply', protectAdmin, replyInquiry);

module.exports = router;
