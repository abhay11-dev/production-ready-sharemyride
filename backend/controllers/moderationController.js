// controllers/moderationController.js
//
// MILESTONE 5 — AI moderation, admin review API (see PROJECT_STATE.md §1/§6/§7)
//
// This is the last missing piece of Milestone 5: ModerationFlag documents
// have been created correctly since the moderation pipeline shipped, but
// until now there was no way for an admin to actually see or act on them.
//
// Endpoints implemented here (wired in routes/moderationRoutes.js, mounted
// at /api/moderation in server.js, all admin-only via protectAdmin):
//   GET   /api/moderation/flags            getFlags
//   GET   /api/moderation/flags/:id        getFlagById
//   POST  /api/moderation/flags/:id/review reviewFlag
//   GET   /api/moderation/stats            getModerationStats
//
// IMPORTANT — things this file deliberately does NOT do:
//   - Never exposes `originalText` (the unmasked message) on anything other
//     than these admin-only routes. The Message model only ever stores the
//     masked text; the unmasked original lives solely on ModerationFlag,
//     specifically so a non-admin code path can never leak it.
//   - Does NOT set `reviewedBy` to a real User document reference. Admin
//     auth in this app (`protectAdmin`, middleware/auth.js) is an isolated
//     JWT with a synthetic payload ({ role: 'admin', id: 'admin' }) — there
//     is no real admin User document to point a ref at. This mirrors the
//     existing convention already used elsewhere in adminController.js
//     (e.g. updateEnquiry stores `sentBy: adminName || 'ShareMyRide Support'`
//     as a free-text string, not a User ref) rather than inventing a new
//     pattern. `reviewedBy` is left unset; the admin's identifying name (if
//     the frontend sends one) is folded into `adminNote` instead.

const ModerationFlag = require('../models/ModerationFlag');
const AuditLog = require('../models/AuditLogs');

// Small helper — write an audit log entry without ever throwing (a failed
// audit write should never block the actual review action). Same pattern
// used in negotiationController.js.
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

// @desc    Aggregate counts for an admin dashboard widget (Milestone 7 will
//          likely surface this; built now since it's a trivial addition
//          alongside the other three endpoints)
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