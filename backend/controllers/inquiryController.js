const Inquiry = require('../models/Inquiry');
const emailService = require('../services/emailService');
const { logAction } = require('../services/auditService');

/**
 * INQUIRY EVENT HANDLER
 * Creates record → builds confirmation emailAction → builds admin emailAction → logs audit
 *
 * emailService no longer sends mail directly (EmailJS migration). Each
 * emailService.send* function instead returns { success, emailAction } where
 * emailAction = { template, payload }. This controller collects those
 * actions and returns them to the frontend, which is responsible for
 * actually calling emailjs.send(serviceId, templateId, payload).
 */
exports.createInquiry = async (req, res) => {
    try {
        const { name, email, subject, message, type, phone, userId, meta } = req.body;

        // ── Required field validation ─────────────────────────────────────────
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, email, subject, message',
            });
        }

        // ── Type validation against schema enum ───────────────────────────────
        const VALID_TYPES = [
            'contact_general', 'contact_partnership', 'contact_corporate',
            'contact_community', 'contact_media', 'contact_feedback',
            'help_center',
            'report_technical', 'report_ride', 'report_safety',
            'report_account', 'report_payment', 'report_other',
            'blog_submission', 'blog_comment_report',
            'community_report', 'support_request',
        ];

        const resolvedType = type || 'contact_general';

        if (!VALID_TYPES.includes(resolvedType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid inquiry type "${resolvedType}". Allowed: ${VALID_TYPES.join(', ')}`,
            });
        }

        // ── Auto-set priority for safety/critical reports ─────────────────────
        const priority =
            resolvedType === 'report_safety'
                ? 'critical'
                : resolvedType.startsWith('report_')
                    ? 'high'
                    : 'medium';

        // ── Create inquiry record ─────────────────────────────────────────────
        const inquiry = new Inquiry({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || null,
            userId: userId || (req.user?._id) || null,
            type: resolvedType,
            subject: subject.trim(),
            message: message.trim(),
            priority,
            status: 'open',

            meta: {
                affectedPage: meta?.affectedPage || undefined,
                stepsToReproduce: meta?.stepsToReproduce || undefined,
                expectedBehaviour: meta?.expectedBehaviour || undefined,
                actualBehaviour: meta?.actualBehaviour || undefined,
                additionalNotes: meta?.additionalNotes || undefined,
                relatedRideId: meta?.relatedRideId || undefined,
                relatedUserId: meta?.relatedUserId || undefined,
                severity: meta?.severity || (priority === 'critical' ? 'critical' : 'medium'),
            },

            emailSentToAdmin: false,
            emailSentToUser: false,
        });

        await inquiry.save();

        // ── Email: confirmation to user ───────────────────────────────────────
        // sendUserConfirmationEmail expects the FULL inquiry document — it reads
        // inquiry.email, inquiry.message, inquiry.priority, inquiry.emailsSent, etc.
        let userConfirmationAction = null;
        try {
            if (typeof emailService.sendUserConfirmationEmail === 'function') {
                const result = await emailService.sendUserConfirmationEmail(inquiry);
                if (result?.emailAction) {
                    userConfirmationAction = result.emailAction;
                    inquiry.emailSentToUser = true;
                    inquiry.confirmationEmailAt = new Date();
                    inquiry.emailsSent.confirmationEmail = true;
                    inquiry.emailsSent.confirmationEmailAt = new Date();
                }
            }
        } catch (emailErr) {
            // Non-fatal — log but don't fail the request
            console.error(`[Inquiry] Confirmation emailAction build failed (${inquiry.ticketNumber}):`, emailErr.message);
        }

        // ── Email: alert to admin ─────────────────────────────────────────────
        let adminNotificationAction = null;
        try {
            if (typeof emailService.sendBusinessNotificationToAdmin === 'function') {
                const result = await emailService.sendBusinessNotificationToAdmin(inquiry);
                if (result?.emailAction) {
                    adminNotificationAction = result.emailAction;
                    inquiry.emailSentToAdmin = true;
                    inquiry.adminEmailAt = new Date();
                    inquiry.emailsSent.adminAlertEmail = true;
                    inquiry.emailsSent.adminAlertEmailAt = new Date();
                }
            }
        } catch (emailErr) {
            console.error(`[Inquiry] Admin notification emailAction build failed (${inquiry.ticketNumber}):`, emailErr.message);
        }

        // Save email tracking updates
        await inquiry.save();

        // ── Audit log ─────────────────────────────────────────────────────────
        try {
            await logAction({
                actor: inquiry.userId || null,
                actorEmail: inquiry.email,
                action: 'inquiry.created',
                resource: 'Inquiry',
                resourceId: inquiry._id,
                resourceRef: inquiry.ticketNumber,
                note: `New ${inquiry.type} inquiry: "${inquiry.subject}"`,
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent'],
            });
        } catch (auditErr) {
            console.error('[Inquiry] Audit log failed:', auditErr.message);
        }

        // ── Success response ──────────────────────────────────────────────────
        const etaMap = { critical: '4–6 hours', high: '12–24 hours', medium: '24–48 hours', low: '48–72 hours' };

        return res.status(201).json({
            success: true,
            message: 'Your report has been received. Our team will review it shortly.',
            data: {
                ticketId: inquiry.ticketNumber, // backward compat (virtual)
                ticketNumber: inquiry.ticketNumber,
                status: inquiry.status,
                estimatedResponseTime: etaMap[inquiry.priority] || '24–48 hours',
            },
            // NEW: frontend uses these to fire emailjs.send() client-side.
            // Each is either { template, payload } or null if it couldn't be built.
            emailActions: {
                userConfirmation: userConfirmationAction,
                adminNotification: adminNotificationAction,
            },
        });

    } catch (error) {
        console.error('[Inquiry] Create error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while submitting your inquiry. Please try again.',
            ...(process.env.NODE_ENV !== 'production' && { error: error.message }),
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Get all inquiries with filtering & pagination
// GET /api/inquiries
// ─────────────────────────────────────────────────────────────────────────────
exports.getInquiries = async (req, res) => {
    try {
        const {
            status, priority, type, assignedTo, search,
            sortBy = 'createdAt', sortOrder = 'desc',
            page = 1, limit = 20,
        } = req.query;

        const query = {};
        if (status && status !== 'all') query.status = Array.isArray(status) ? { $in: status } : status;
        if (priority && priority !== 'all') query.priority = Array.isArray(priority) ? { $in: priority } : priority;
        if (type && type !== 'all') query.type = Array.isArray(type) ? { $in: type } : type;
        if (assignedTo === 'unassigned') query.assignedTo = null;
        else if (assignedTo) query.assignedTo = assignedTo;

        if (search?.trim()) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { ticketNumber: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * pageSize;
        const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [inquiries, total] = await Promise.all([
            Inquiry.find(query).sort(sortObj).skip(skip).limit(pageSize),
            Inquiry.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: inquiries,
            pagination: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) },
        });
    } catch (error) {
        console.error('[Inquiry] Fetch list error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Get single inquiry
// GET /api/inquiries/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getInquiryById = async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

        try {
            await logAction({ actor: req.admin || 'admin', action: 'inquiry.view', resource: 'Inquiry', resourceId: inquiry._id, resourceRef: inquiry.ticketNumber, note: 'Admin viewed inquiry', req });
        } catch (_) { }

        return res.status(200).json({ success: true, data: inquiry });
    } catch (error) {
        console.error('[Inquiry] Fetch detail error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Update status
// PUT /api/inquiries/:id/status
// ─────────────────────────────────────────────────────────────────────────────
exports.updateInquiryStatus = async (req, res) => {
    try {
        const { status, note } = req.body;
        const VALID = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed', 'archived', 'seen', 'replied'];

        if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
        if (!VALID.includes(status)) return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${VALID.join(', ')}` });

        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

        const oldStatus = inquiry.status;
        inquiry.status = status;
        if (status === 'resolved' && oldStatus !== 'resolved') inquiry.resolvedAt = new Date();
        if (status === 'closed' && oldStatus !== 'closed') inquiry.closedAt = new Date();

        if (note?.trim()) {
            inquiry.internalNotes.push({ note: note.trim(), addedBy: req.admin || 'admin@sharemyride.com', addedAt: new Date() });
        }

        await inquiry.save();

        try {
            await logAction({ actor: req.admin || 'admin', action: 'inquiry.status_change', resource: 'Inquiry', resourceId: inquiry._id, resourceRef: inquiry.ticketNumber, changes: { before: { status: oldStatus }, after: { status } }, note: `Status: ${oldStatus} → ${status}`, req });
        } catch (_) { }

        return res.status(200).json({ success: true, message: `Status updated to ${status}`, data: inquiry });
    } catch (error) {
        console.error('[Inquiry] Update status error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Assign inquiry
// PUT /api/inquiries/:id/assign
// ─────────────────────────────────────────────────────────────────────────────
exports.assignInquiry = async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

        const oldAssigned = inquiry.assignedTo;
        inquiry.assignedTo = assignedTo || null;
        if (assignedTo && inquiry.status === 'open') inquiry.status = 'in_progress';
        await inquiry.save();

        try {
            await logAction({ actor: req.admin || 'admin', action: 'inquiry.assign', resource: 'Inquiry', resourceId: inquiry._id, resourceRef: inquiry.ticketNumber, changes: { before: { assignedTo: oldAssigned }, after: { assignedTo } }, note: assignedTo ? `Assigned to ${assignedTo}` : 'Unassigned', req });
        } catch (_) { }

        return res.status(200).json({ success: true, message: assignedTo ? `Assigned to ${assignedTo}` : 'Unassigned', data: inquiry });
    } catch (error) {
        console.error('[Inquiry] Assign error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Add internal note
// POST /api/inquiries/:id/internal-notes
// ─────────────────────────────────────────────────────────────────────────────
exports.addInternalNote = async (req, res) => {
    try {
        const { note } = req.body;
        if (!note?.trim()) return res.status(400).json({ success: false, message: 'Note text is required' });

        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

        inquiry.internalNotes.push({ note: note.trim(), addedBy: req.admin || 'admin@sharemyride.com', addedAt: new Date() });
        await inquiry.save();

        try {
            await logAction({ actor: req.admin || 'admin', action: 'inquiry.internal_note_add', resource: 'Inquiry', resourceId: inquiry._id, resourceRef: inquiry.ticketNumber, note: `Note added: ${note.substring(0, 50)}`, req });
        } catch (_) { }

        return res.status(200).json({ success: true, message: 'Internal note added', data: inquiry });
    } catch (error) {
        console.error('[Inquiry] Add internal note error:', error);
        return res.status(500).json({ success: false, message: 'Failed to add internal note' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Add public note (legacy route)
// POST /api/inquiries/:id/notes
// ─────────────────────────────────────────────────────────────────────────────
exports.addInquiryNote = async (req, res) => {
    req.body.note = req.body.note || req.body.text;
    return exports.addInternalNote(req, res);
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Reply to inquiry — now ALSO returns an emailAction in the response
// POST /api/inquiries/:id/reply
// ─────────────────────────────────────────────────────────────────────────────
exports.replyInquiry = async (req, res) => {
    try {
        const { message } = req.body;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@sharemyride.com';

        if (!message?.trim()) return res.status(400).json({ success: false, message: 'Reply message is required' });

        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

        inquiry.adminReplies.push({ message: message.trim(), sentBy: adminEmail, sentAt: new Date(), emailSent: false });
        inquiry.status = 'replied';
        await inquiry.save();

        let replyEmailAction = null;
        try {
            if (typeof emailService.sendInquiryReplyEmail === 'function') {
                const result = await emailService.sendInquiryReplyEmail(inquiry, message);
                if (result?.emailAction) {
                    replyEmailAction = result.emailAction;
                    inquiry.adminReplies[inquiry.adminReplies.length - 1].emailSent = true;
                    await inquiry.save();
                }
            }
        } catch (emailErr) {
            console.error('[Inquiry] Reply emailAction build failed:', emailErr.message);
        }

        try {
            await logAction({ actor: req.admin || 'admin', action: 'inquiry.reply', resource: 'Inquiry', resourceId: inquiry._id, resourceRef: inquiry.ticketNumber, note: 'Admin replied to inquiry', req });
        } catch (_) { }

        return res.status(200).json({
            success: true,
            message: 'Reply sent',
            data: inquiry,
            emailAction: replyEmailAction,
        });
    } catch (error) {
        console.error('[Inquiry] Reply error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Update priority
// PUT /api/inquiries/:id/priority
// ─────────────────────────────────────────────────────────────────────────────
exports.updateInquiryPriority = async (req, res) => {
    try {
        const { priority, tags } = req.body;
        const VALID = ['low', 'medium', 'high', 'urgent', 'critical'];

        if (priority && !VALID.includes(priority)) {
            return res.status(400).json({ success: false, message: `Invalid priority. Must be: ${VALID.join(', ')}` });
        }

        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

        const changes = {};
        if (priority) { changes.before = { priority: inquiry.priority }; inquiry.priority = priority; changes.after = { priority }; }
        if (tags && Array.isArray(tags)) inquiry.tags = tags;
        await inquiry.save();

        return res.status(200).json({ success: true, message: 'Priority updated', data: inquiry });
    } catch (error) {
        console.error('[Inquiry] Update priority error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update priority' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Founder: High-priority inbox
// GET /api/inquiries/founder/inbox
// ─────────────────────────────────────────────────────────────────────────────
exports.getFounderInbox = async (req, res) => {
    try {
        const { view = 'all', page = 1, limit = 15 } = req.query;
        let statusFilter = {};
        if (view === 'new') statusFilter.status = 'open';
        else if (view === 'open') statusFilter.status = { $in: ['open', 'in_progress'] };
        else if (view === 'action_needed') statusFilter.status = { $in: ['waiting_on_user', 'open'] };

        const priorityFilter = {
            $or: [
                { priority: 'critical' },
                { priority: 'high' },
                { type: { $in: ['report_safety', 'contact_partnership', 'contact_corporate'] } },
            ],
        };

        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(limit) || 15));
        const skip = (pageNum - 1) * pageSize;

        const [inquiries, total] = await Promise.all([
            Inquiry.find({ ...statusFilter, ...priorityFilter }).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(pageSize),
            Inquiry.countDocuments({ ...statusFilter, ...priorityFilter }),
        ]);

        return res.status(200).json({
            success: true,
            data: inquiries,
            pagination: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) },
        });
    } catch (error) {
        console.error('[Inquiry] Founder inbox error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch founder inbox' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Analytics overview
// GET /api/inquiries/analytics/overview
// ─────────────────────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const stats = await Inquiry.aggregate([
            {
                $facet: {
                    totalCount: [{ $count: 'count' }],
                    openCount: [{ $match: { status: { $in: ['open', 'in_progress'] } } }, { $count: 'count' }],
                    resolvedCount: [{ $match: { status: 'resolved' } }, { $count: 'count' }],
                    closedCount: [{ $match: { status: 'closed' } }, { $count: 'count' }],
                    byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
                    byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }],
                    byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                    recent: [{ $match: { createdAt: { $gte: daysAgo } } }, { $sort: { createdAt: -1 } }, { $limit: 5 }],
                },
            },
        ]);

        const r = stats[0];
        const total = r.totalCount[0]?.count || 0;
        const resolved = (r.resolvedCount[0]?.count || 0) + (r.closedCount[0]?.count || 0);

        const response = {
            summary: {
                total,
                open: r.openCount[0]?.count || 0,
                resolved: r.resolvedCount[0]?.count || 0,
                closed: r.closedCount[0]?.count || 0,
                resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
            },
            byPriority: Object.fromEntries(r.byPriority.map(i => [i._id || 'unknown', i.count])),
            byType: Object.fromEntries(r.byType.map(i => [i._id || 'unknown', i.count])),
            byStatus: Object.fromEntries(r.byStatus.map(i => [i._id || 'unknown', i.count])),
            recent: r.recent || [],
        };

        return res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error('[Inquiry] Analytics error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
};