const Inquiry = require('../models/Inquiry');
const emailService = require('../services/emailService');
const { logAction } = require('../services/auditService');

// @desc    Create a new inquiry (Public)
// @route   POST /api/inquiries
// @access  Public
exports.createInquiry = async (req, res) => {
    try {
        const { name, email, subject, message, inquiryType, metadata } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const inquiry = new Inquiry({
            name,
            email,
            subject,
            message,
            inquiryType: inquiryType || 'general',
            metadata: {
                ...metadata,
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip || req.connection.remoteAddress
            }
        });

        await inquiry.save();

        // Send confirmation email to user
        await emailService.sendInquiryReceivedEmail(inquiry);

        // Send alert to admin if high-priority/partnership/corporate/safety
        if (['partnership', 'corporate', 'bug', 'safety'].includes(inquiry.inquiryType)) {
            await emailService.sendInquiryNotificationToAdmin(inquiry);
        }

        res.status(201).json({
            success: true,
            message: 'Your request has been submitted successfully',
            data: {
                ticketId: inquiry.ticketId,
                status: inquiry.status
            }
        });
    } catch (error) {
        console.error('Create inquiry error:', error);
        res.status(500).json({ success: false, message: 'Server error occurred while submitting inquiry' });
    }
};

// @desc    Get all inquiries (Admin)
// @route   GET /api/inquiries
// @access  Private (Admin)
exports.getInquiries = async (req, res) => {
    try {
        const { status, inquiryType, search } = req.query;
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (inquiryType && inquiryType !== 'all') {
            query.inquiryType = inquiryType;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { ticketId: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } }
            ];
        }

        const inquiries = await Inquiry.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: inquiries.length,
            data: inquiries
        });
    } catch (error) {
        console.error('Fetch inquiries error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single inquiry detail (Admin)
// @route   GET /api/inquiries/:id
// @access  Private (Admin)
exports.getInquiryById = async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }

        // Log view action
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.view',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            note: 'Admin viewed inquiry details',
            req
        });

        res.status(200).json({
            success: true,
            data: inquiry
        });
    } catch (error) {
        console.error('Fetch inquiry detail error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update inquiry status (Admin)
// @route   PUT /api/inquiries/:id/status
// @access  Private (Admin)
exports.updateInquiryStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }

        const oldStatus = inquiry.status;
        inquiry.status = status;
        await inquiry.save();

        // Log audit
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.status_change',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            changes: { before: { status: oldStatus }, after: { status } },
            note: `Status changed from ${oldStatus} to ${status}`,
            req
        });

        res.status(200).json({
            success: true,
            message: `Status updated to ${status}`,
            data: inquiry
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Assign inquiry to moderator (Admin)
// @route   PUT /api/inquiries/:id/assign
// @access  Private (Admin)
exports.assignInquiry = async (req, res) => {
    try {
        const { assignedTo } = req.body; // username or email

        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }

        const oldAssigned = inquiry.assignedTo;
        inquiry.assignedTo = assignedTo || null;
        if (assignedTo && inquiry.status === 'open') {
            inquiry.status = 'in_progress';
        }
        await inquiry.save();

        // Log audit
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.assign',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            changes: { before: { assignedTo: oldAssigned }, after: { assignedTo } },
            note: assignedTo ? `Assigned to ${assignedTo}` : 'Unassigned',
            req
        });

        res.status(200).json({
            success: true,
            message: assignedTo ? `Assigned to ${assignedTo}` : 'Unassigned',
            data: inquiry
        });
    } catch (error) {
        console.error('Assign inquiry error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Add staff note to inquiry (Admin)
// @route   POST /api/inquiries/:id/notes
// @access  Private (Admin)
exports.addInquiryNote = async (req, res) => {
    try {
        const { note } = req.body;
        const adminEmail = req.admin ? (process.env.ADMIN_USERNAME || 'admin@sharemyride.com') : 'admin@sharemyride.com';

        if (!note || !note.trim()) {
            return res.status(400).json({ success: false, message: 'Note text is required' });
        }

        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }

        inquiry.notes.push({
            note,
            addedBy: adminEmail,
            addedAt: new Date()
        });

        await inquiry.save();

        // Log audit
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.note_add',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            note: `Added note: ${note.substring(0, 50)}${note.length > 50 ? '...' : ''}`,
            req
        });

        res.status(200).json({
            success: true,
            message: 'Note added successfully',
            data: inquiry
        });
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reply to inquiry / customer email (Admin)
// @route   POST /api/inquiries/:id/reply
// @access  Private (Admin)
exports.replyInquiry = async (req, res) => {
    try {
        const { message } = req.body;
        const adminEmail = req.admin ? (process.env.ADMIN_USERNAME || 'admin@sharemyride.com') : 'admin@sharemyride.com';

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Reply message is required' });
        }

        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }

        inquiry.replies.push({
            message,
            repliedBy: adminEmail,
            repliedAt: new Date()
        });

        inquiry.status = 'resolved'; // Mark as resolved automatically on reply
        await inquiry.save();

        // Send email response to user
        await emailService.sendInquiryReplyEmail(inquiry, message);

        // Log audit
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.reply',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            note: `Sent reply and resolved ticket`,
            req
        });

        res.status(200).json({
            success: true,
            message: 'Reply sent and ticket resolved',
            data: inquiry
        });
    } catch (error) {
        console.error('Reply inquiry error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
