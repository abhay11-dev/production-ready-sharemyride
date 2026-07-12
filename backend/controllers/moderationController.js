const ModerationFlag = require('../models/ModerationFlag');
const AuditLog = require('../models/AuditLogs');
const User = require('../models/User');
const emailService = require('../services/emailService');

async function logAudit({ action, resourceId, note, changes }) {
    try {
        await AuditLog.create({
            actorRole: 'admin',
            action,
            resource: 'ModerationFlag',
            resourceId,
            note,
            changes,
        });
    } catch (err) {
        console.warn('⚠️ AuditLog write failed (non-blocking):', err.message);
    }
}

// @desc    List moderation flags, filterable and paginated
// @route   GET /api/moderation/flags
// @query   page, limit, severity (comma-separated, e.g. "high,critical"),
//          reviewed ("true" | "false"), conversation (id)
// @access  Private (Admin)
exports.getFlags = async (req, res) => {
    try {
        const { page = 1, limit = 20, severity, reviewed, conversation } = req.query;
        const skip = (page - 1) * limit;

        const query = {};
        if (severity) {
            const severities = severity.split(',').map(s => s.trim()).filter(Boolean);
            if (severities.length) query.severity = { $in: severities };
        }
        if (reviewed === 'true') query.reviewed = true;
        if (reviewed === 'false') query.reviewed = false;
        if (conversation) query.conversation = conversation;

        const flags = await ModerationFlag.find(query)
            // originalText is intentionally included here — this whole route
            // is admin-only (protectAdmin), which is exactly what that field
            // is gated on.
            .populate('sender', 'name email phone')
            .populate('conversation', 'ride passenger driver')
            .populate('message', 'text createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ModerationFlag.countDocuments(query);

        res.json({
            success: true,
            data: flags,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Moderation flags list error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch moderation flags' });
    }
};

// @desc    Get a single moderation flag, including unmasked original text
// @route   GET /api/moderation/flags/:id
// @access  Private (Admin)
exports.getFlagById = async (req, res) => {
    try {
        const flag = await ModerationFlag.findById(req.params.id)
            .populate('sender', 'name email phone')
            .populate({
                path: 'conversation',
                select: 'ride passenger driver',
                populate: [
                    { path: 'passenger', select: 'name email phone' },
                    { path: 'driver', select: 'name email phone' },
                ],
            })
            .populate('message', 'text type createdAt')
            .populate('reviewedBy', 'name email');

        if (!flag) {
            return res.status(404).json({ success: false, message: 'Moderation flag not found' });
        }

        res.json({ success: true, data: flag });
    } catch (error) {
        console.error('Moderation flag fetch error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch moderation flag' });
    }
};

// @desc    Mark a flag reviewed, optionally with an admin note
// @route   POST /api/moderation/flags/:id/review
// @body    { adminNote?: string, adminName?: string }
// @access  Private (Admin)
exports.reviewFlag = async (req, res) => {
    try {
        const { adminNote, adminName } = req.body;

        const flag = await ModerationFlag.findById(req.params.id);
        if (!flag) {
            return res.status(404).json({ success: false, message: 'Moderation flag not found' });
        }

        const wasReviewed = flag.reviewed;

        flag.reviewed = true;
        flag.reviewedAt = new Date();
        // See file-level note: no real admin User document exists to ref,
        // so we fold whatever identifier the frontend sends into the note
        // instead of trying to cast it into reviewedBy.
        const notePrefix = adminName ? `[${adminName}] ` : '';
        if (adminNote) {
            flag.adminNote = `${notePrefix}${adminNote}`.trim();
        } else if (adminName && !flag.adminNote) {
            flag.adminNote = notePrefix.trim();
        }

        await flag.save();

        await logAudit({
            action: 'moderation.flag',
            resourceId: flag._id,
            note: wasReviewed ? 'Flag re-reviewed' : 'Flag marked reviewed',
            changes: { before: { reviewed: wasReviewed }, after: { reviewed: true, adminNote: flag.adminNote } },
        });

        res.json({ success: true, data: flag });
    } catch (error) {
        console.error('Moderation flag review error:', error);
        res.status(500).json({ success: false, message: 'Failed to review moderation flag' });
    }
};

// @desc    Send a warning email to a flagged message's sender. Does NOT
//          touch User.accountStatus — that's what the existing Suspend
//          flow (PUT /api/admin/users/:id) is for. This is purely a
//          notice + audit trail entry.
// @route   POST /api/moderation/flags/:id/warn
// @body    { reason?: string, adminName?: string }
// @access  Private (Admin)
exports.warnUser = async (req, res) => {
    try {
        const { reason, adminName } = req.body;

        const flag = await ModerationFlag.findById(req.params.id).populate('sender', 'name email');
        if (!flag) {
            return res.status(404).json({ success: false, message: 'Moderation flag not found' });
        }
        if (!flag.sender?.email) {
            return res.status(400).json({ success: false, message: 'Flagged sender has no email on file' });
        }

        const emailResult = await emailService.sendUserWarningEmail(flag.sender, {
            reason,
            adminName,
            flagId: flag._id.toString(),
        });

        await logAudit({
            action: 'moderation.warn',
            resourceId: flag._id,
            note: `Warning sent to ${flag.sender.email}${reason ? ` — reason: ${reason}` : ''}`,
        });

        try {
            const { emitToUser } = require('../services/socket');
            emitToUser(flag.sender._id, 'moderation:warned', {
                flagId: flag._id, reason: reason || 'Platform safety guideline warning',
            });
        } catch { /* socket not initialized — non-fatal */ }

        res.json({
            success: true,
            message: 'Warning email prepared',
            emailAction: emailResult?.emailAction || null,
        });
    } catch (error) {
        console.error('Moderation warn error:', error);
        res.status(500).json({ success: false, message: 'Failed to warn user' });
    }
};

// @desc    Apply an account-restricting action (Suspend/Block/Ban) to the
//          sender of a flagged message, in one step from the moderation
//          queue. Reuses the exact same User.accountStatus fields already
//          driven by PUT /api/admin/users/:id — this is just a shortcut
//          that also stamps the triggering flag and returns an emailAction
//          the frontend fires (same EmailJS payload pattern as warnUser).
// @route   POST /api/moderation/flags/:id/suspend | /block | /ban
// @body    { reason?: string, adminName?: string }
// @access  Private (Admin)
async function applyAccountAction(req, res, accountStatus, actionLabel) {
    try {
        const { reason, adminName } = req.body;

        const flag = await ModerationFlag.findById(req.params.id).populate('sender', 'name email');
        if (!flag) {
            return res.status(404).json({ success: false, message: 'Moderation flag not found' });
        }
        if (!flag.sender?._id) {
            return res.status(400).json({ success: false, message: 'Flagged message has no sender on file' });
        }

        const user = await User.findByIdAndUpdate(
            flag.sender._id,
            {
                accountStatus,
                isActive: false,
                suspendedAt: new Date(),
                suspensionReason: reason || `${actionLabel} due to moderation flag ${flag._id}`,
            },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        flag.reviewed = true;
        flag.reviewedAt = new Date();
        const notePrefix = adminName ? `[${adminName}] ` : '';
        flag.adminNote = `${notePrefix}${actionLabel}${reason ? ` — ${reason}` : ''}`.trim();
        await flag.save();

        let emailResult = null;
        if (user.email) {
            emailResult = await emailService.sendUserWarningEmail(user, {
                reason: reason || `Your account has been ${actionLabel.toLowerCase()} for violating our platform safety guidelines.`,
                adminName,
                flagId: flag._id.toString(),
            });
        }

        await logAudit({
            action: `moderation.${accountStatus.toLowerCase()}`,
            resourceId: flag._id,
            note: `${actionLabel} applied to ${user.email || user._id}${reason ? ` — reason: ${reason}` : ''}`,
            changes: { after: { accountStatus, userId: user._id } },
        });

        try {
            const { emitToUser } = require('../services/socket');
            emitToUser(user._id, 'moderation:action', {
                action: actionLabel, accountStatus, reason: reason || null, flagId: flag._id,
            });
        } catch { /* socket not initialized — non-fatal */ }

        res.json({
            success: true,
            message: `${actionLabel} applied`,
            data: { user, flag },
            emailAction: emailResult?.emailAction || null,
        });
    } catch (error) {
        console.error(`Moderation ${actionLabel.toLowerCase()} error:`, error);
        res.status(500).json({ success: false, message: `Failed to ${actionLabel.toLowerCase()} user` });
    }
}

exports.suspendUser = (req, res) => applyAccountAction(req, res, 'SUSPENDED', 'Suspend');
exports.blockUser = (req, res) => applyAccountAction(req, res, 'BLOCKED', 'Block');
exports.banUser = (req, res) => applyAccountAction(req, res, 'BANNED', 'Permanent ban');

// @desc    Aggregate counts for an admin dashboard widget
// @route   GET /api/moderation/stats
// @access  Private (Admin)
exports.getModerationStats = async (req, res) => {
    try {
        const bySeverity = await ModerationFlag.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]);

        const unreviewedBySeverity = await ModerationFlag.aggregate([
            { $match: { reviewed: false } },
            { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]);

        const total = await ModerationFlag.countDocuments();
        const totalUnreviewed = await ModerationFlag.countDocuments({ reviewed: false });
        const totalAdminNotified = await ModerationFlag.countDocuments({ adminNotified: true });

        const toMap = (rows) => rows.reduce((acc, row) => {
            acc[row._id] = row.count;
            return acc;
        }, { low: 0, medium: 0, high: 0, critical: 0 });

        res.json({
            success: true,
            data: {
                total,
                totalUnreviewed,
                totalAdminNotified,
                bySeverity: toMap(bySeverity),
                unreviewedBySeverity: toMap(unreviewedBySeverity),
            },
        });
    } catch (error) {
        console.error('Moderation stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch moderation stats' });
    }
};