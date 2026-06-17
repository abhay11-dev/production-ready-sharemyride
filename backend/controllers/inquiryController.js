const Inquiry = require('../models/Inquiry');
const emailService = require('../services/emailService');
const { logAction } = require('../services/auditService');

/**
 * INQUIRY EVENT HANDLER
 * Central function to handle all inquiry/event type submissions
 * Creates record → sends confirmation email → notifies admin → logs audit
 */
exports.createInquiry = async (req, res) => {
    try {
        const { name, email, subject, message, inquiryType, phone, userId, metadata } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide all required fields: name, email, subject, message' 
            });
        }

        // Validate inquiry type
        const validTypes = [
            'contact', 'support', 'help_request', 'issue_report',
            'partnership', 'corporate', 'sponsorship', 'media',
            'community_feedback', 'feedback', 'feature_request', 'blog_submission',
            'blog_report', 'comment_report', 'user_report', 'ride_report',
            'safety_concern', 'fraud_report', 'security_issue', 'guideline_violation',
            'account_request', 'data_request', 'deletion_request',
            'bug', 'technical_issue', 'other'
        ];
        
        if (inquiryType && !validTypes.includes(inquiryType)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid inquiry type. Allowed types: ${validTypes.join(', ')}` 
            });
        }

        // Create inquiry record
        const inquiry = new Inquiry({
            name,
            email,
            subject,
            message,
            phone: phone || null,
            userId: userId || null,
            inquiryType: inquiryType || 'contact',
            status: 'new', // Always start as 'new'
            metadata: {
                ...metadata,
                source: metadata?.source || 'web',
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip || req.connection.remoteAddress
            },
            visibleToUser: true,
            visibleToAdmin: true,
            visibleToFounder: true
        });

        // Save to database
        await inquiry.save();

        // ── Email Workflow ──
        // 1. Send confirmation email to user with ticket ID
        try {
            await emailService.sendUserConfirmationEmail(inquiry);
            inquiry.emailsSent.confirmationEmail = true;
            inquiry.emailsSent.confirmationEmailAt = new Date();
        } catch (emailError) {
            console.error(`Failed to send confirmation email for ${inquiry.ticketId}:`, emailError);
            // Don't fail the whole request if email fails - log it but continue
        }

        // 2. Send business notification to admin for ALL inquiries
        try {
            await emailService.sendBusinessNotificationToAdmin(inquiry);
        } catch (emailError) {
            console.error(`Failed to send admin notification for ${inquiry.ticketId}:`, emailError);
        }

        // Save updated email tracking
        await inquiry.save();

        // 3. Create audit log entry
        await logAction({
            actor: userId || null,
            actorEmail: email,
            action: 'inquiry.created',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            note: `New ${inquiry.inquiryType} inquiry submitted: "${inquiry.subject}"`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        });

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Your request has been received successfully. Our team will review it shortly.',
            data: {
                ticketId: inquiry.ticketId,
                status: inquiry.status,
                estimatedResponseTime: inquiry.priority === 'critical' ? '4-6 hours' : inquiry.priority === 'high' ? '12-24 hours' : '24-48 hours'
            }
        });

    } catch (error) {
        console.error('Create inquiry error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while submitting your inquiry. Please try again.',
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
};

// @desc    Get all inquiries with comprehensive filtering (Admin/Founder)
// @route   GET /api/inquiries
// @access  Private (Admin)
exports.getInquiries = async (req, res) => {
    try {
        const { 
            status, 
            priority,
            inquiryType, 
            assignedTo,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = req.query;

        let query = {};

        // Filter by status
        if (status && status !== 'all') {
            if (Array.isArray(status)) {
                query.status = { $in: status };
            } else {
                query.status = status;
            }
        }

        // Filter by priority
        if (priority && priority !== 'all') {
            if (Array.isArray(priority)) {
                query.priority = { $in: priority };
            } else {
                query.priority = priority;
            }
        }

        // Filter by inquiry type
        if (inquiryType && inquiryType !== 'all') {
            if (Array.isArray(inquiryType)) {
                query.inquiryType = { $in: inquiryType };
            } else {
                query.inquiryType = inquiryType;
            }
        }

        // Filter by assigned admin
        if (assignedTo && assignedTo !== 'unassigned') {
            if (assignedTo === 'unassigned') {
                query.assignedTo = null;
            } else {
                query.assignedTo = assignedTo;
            }
        }

        // Search across multiple fields
        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { ticketId: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * pageSize;

        // Build sort object
        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const [inquiries, total] = await Promise.all([
            Inquiry.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(pageSize),
            Inquiry.countDocuments(query)
        ]);

        // Log view action
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.view_list',
            resource: 'Inquiry',
            note: `Viewed inquiries list with filters: ${JSON.stringify({status, priority, inquiryType})}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        });

        res.status(200).json({
            success: true,
            data: inquiries,
            pagination: {
                total,
                page: pageNum,
                limit: pageSize,
                pages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        console.error('Fetch inquiries error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
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

// @desc    Update inquiry status with proper workflow tracking (Admin)
// @route   PUT /api/inquiries/:id/status
// @access  Private (Admin)
exports.updateInquiryStatus = async (req, res) => {
    try {
        const { status, note } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const validStatuses = ['new', 'open', 'in_review', 'waiting_for_user', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid status. Allowed values: ${validStatuses.join(', ')}` 
            });
        }

        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }

        const oldStatus = inquiry.status;
        
        // Update status
        inquiry.status = status;

        // Track resolution time when marked as resolved
        if (status === 'resolved' && oldStatus !== 'resolved') {
            inquiry.resolvedAt = new Date();
            inquiry.resolutionTime = inquiry.resolvedAt - inquiry.createdAt;
        }

        // Track closed time when marked as closed
        if (status === 'closed' && oldStatus !== 'closed') {
            inquiry.closedAt = new Date();
        }

        // Add internal note if provided
        if (note && note.trim()) {
            inquiry.internalNotes.push({
                note,
                addedBy: req.admin || 'admin@sharemyride.com',
                addedAt: new Date()
            });
        }

        await inquiry.save();

        // Log audit
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.status_change',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            changes: { before: { status: oldStatus }, after: { status } },
            note: `Status updated from ${oldStatus} to ${status}`,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.status(200).json({
            success: true,
            message: `Status updated to ${status}`,
            data: inquiry
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
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

// @desc    Add internal notes to inquiry (Admin only)
// @route   POST /api/inquiries/:id/internal-notes
// @access  Private (Admin)
exports.addInternalNote = async (req, res) => {
    try {
        const { note } = req.body;

        if (!note || !note.trim()) {
            return res.status(400).json({ success: false, message: 'Note text is required' });
        }

        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }

        inquiry.internalNotes.push({
            note: note.trim(),
            addedBy: req.admin || 'admin@sharemyride.com',
            addedAt: new Date()
        });

        await inquiry.save();

        // Log audit
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.internal_note_add',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            note: `Added internal note: ${note.substring(0, 50)}...`,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.status(200).json({
            success: true,
            message: 'Internal note added',
            data: inquiry
        });
    } catch (error) {
        console.error('Add internal note error:', error);
        res.status(500).json({ success: false, message: 'Failed to add internal note' });
    }
};

// @desc    Get Founder Inbox (aggregated high-value inquiries)
// @route   GET /api/inquiries/founder/inbox
// @access  Private (Founder/Admin)
exports.getFounderInbox = async (req, res) => {
    try {
        const { view = 'all', page = 1, limit = 15 } = req.query;

        let statusFilter = {};
        
        if (view === 'new') {
            statusFilter.status = 'new';
        } else if (view === 'open') {
            statusFilter.status = { $in: ['new', 'open', 'in_review'] };
        } else if (view === 'action_needed') {
            statusFilter.status = { $in: ['waiting_for_user', 'new'] };
        }

        // Priority filter - show high-priority or critical
        const priorityFilter = {
            $or: [
                { priority: 'critical' },
                { priority: 'high' },
                { inquiryType: { $in: ['safety_concern', 'fraud_report', 'security_issue', 'partnership', 'account_request', 'data_request', 'deletion_request'] } }
            ]
        };

        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(limit) || 15));
        const skip = (pageNum - 1) * pageSize;

        const [inquiries, total] = await Promise.all([
            Inquiry.find({ ...statusFilter, ...priorityFilter })
                .sort({ priority: -1, createdAt: -1 })
                .skip(skip)
                .limit(pageSize),
            Inquiry.countDocuments({ ...statusFilter, ...priorityFilter })
        ]);

        res.status(200).json({
            success: true,
            data: inquiries,
            pagination: {
                total,
                page: pageNum,
                limit: pageSize,
                pages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        console.error('Get founder inbox error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch founder inbox' });
    }
};

// @desc    Get analytics and reporting data
// @route   GET /api/inquiries/analytics/overview
// @access  Private (Admin/Founder)
exports.getAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Aggregate statistics
        const stats = await Inquiry.aggregate([
            {
                $facet: {
                    // Total counts
                    totalCount: [{ $count: 'count' }],
                    openCount: [{ $match: { status: { $in: ['new', 'open', 'in_review'] } } }, { $count: 'count' }],
                    resolvedCount: [{ $match: { status: 'resolved' } }, { $count: 'count' }],
                    closedCount: [{ $match: { status: 'closed' } }, { $count: 'count' }],
                    
                    // By priority
                    byPriority: [
                        { $group: { _id: '$priority', count: { $sum: 1 } } },
                        { $sort: { _id: 1 } }
                    ],
                    
                    // By type
                    byType: [
                        { $group: { _id: '$inquiryType', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    
                    // By status
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    
                    // Average resolution time (in hours)
                    avgResolutionTime: [
                        { $match: { resolutionTime: { $exists: true, $ne: null } } },
                        { 
                            $group: { 
                                _id: null, 
                                avgTime: { $avg: { $divide: ['$resolutionTime', 3600000] } }
                            } 
                        }
                    ],
                    
                    // Recent inquiries
                    recent: [
                        { $match: { createdAt: { $gte: daysAgo } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 }
                    ]
                }
            }
        ]);

        const result = stats[0];

        // Format response
        const response = {
            summary: {
                total: result.totalCount[0]?.count || 0,
                open: result.openCount[0]?.count || 0,
                resolved: result.resolvedCount[0]?.count || 0,
                closed: result.closedCount[0]?.count || 0,
                resolutionRate: 0,
                avgResolutionTimeHours: 0
            },
            byPriority: {},
            byType: {},
            byStatus: {},
            recent: result.recent || []
        };

        // Calculate resolution rate
        const total = response.summary.total;
        const resolved = response.summary.resolved + response.summary.closed;
        response.summary.resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        // Format average resolution time
        if (result.avgResolutionTime[0]) {
            response.summary.avgResolutionTimeHours = Math.round(result.avgResolutionTime[0].avgTime);
        }

        // Format priority breakdown
        result.byPriority.forEach(item => {
            response.byPriority[item._id || 'unknown'] = item.count;
        });

        // Format type breakdown
        result.byType.forEach(item => {
            response.byType[item._id || 'unknown'] = item.count;
        });

        // Format status breakdown
        result.byStatus.forEach(item => {
            response.byStatus[item._id || 'unknown'] = item.count;
        });

        res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
};

// @desc    Update inquiry priority and tags
// @route   PUT /api/inquiries/:id/priority
// @access  Private (Admin)
exports.updateInquiryPriority = async (req, res) => {
    try {
        const { priority, tags } = req.body;

        if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid priority. Must be: low, medium, high, or critical' 
            });
        }

        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }

        const changes = {};
        
        if (priority) {
            changes.before = { priority: inquiry.priority };
            inquiry.priority = priority;
            changes.after = { priority };
        }

        if (tags && Array.isArray(tags)) {
            inquiry.tags = tags;
        }

        await inquiry.save();

        // Log audit
        await logAction({
            actor: req.admin || 'admin',
            action: 'inquiry.priority_update',
            resource: 'Inquiry',
            resourceId: inquiry._id,
            resourceRef: inquiry.ticketId,
            changes,
            note: `Updated priority to ${priority}`,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.status(200).json({
            success: true,
            message: 'Priority and tags updated',
            data: inquiry
        });
    } catch (error) {
        console.error('Update priority error:', error);
        res.status(500).json({ success: false, message: 'Failed to update priority' });
    }
};
