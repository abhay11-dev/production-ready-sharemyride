// controllers/chatController.js


const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Ride = require('../models/Ride');
const Negotiation = require('../models/Negotiation');
const { scanAndMask, scheduleAnalysis, summarizeConversation } = require('../services/moderationService');

function refId(ref) {
    if (!ref) return null;
    return typeof ref === 'object' ? (ref._id ? ref._id.toString() : ref.toString()) : ref.toString();
}

function roleOf(conversation, userId) {
    const uid = userId.toString();
    if (refId(conversation.passenger) === uid) return 'passenger';
    if (refId(conversation.driver) === uid) return 'driver';
    return null;
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/chat/conversations — get-or-create the conversation for a ride
// body: { rideId }
// This is the entry point for the "Chat with Driver" negotiation card —
// it's called whether or not a negotiation exists yet.
// ─────────────────────────────────────────────────────────────────────────
exports.getOrCreateConversation = async (req, res) => {
    try {
        const { rideId } = req.body;
        if (!rideId) return res.status(400).json({ success: false, message: 'rideId is required' });

        const ride = await Ride.findById(rideId);
        if (!ride || !ride.isActive) {
            return res.status(404).json({ success: false, message: 'Ride not found or no longer active' });
        }

        const driverId = ride.driverId || ride.postedBy || ride.driver;
        if (!driverId) {
            return res.status(422).json({ success: false, message: 'Ride has no driver on record' });
        }
        if (driverId.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot chat with yourself' });
        }

        let conversation = await Conversation.findOne({
            ride: rideId,
            passenger: req.user._id,
            driver: driverId,
        });

        if (!conversation) {
            conversation = await Conversation.create({
                ride: rideId,
                passenger: req.user._id,
                driver: driverId,
            });
        }

        res.json({ success: true, data: conversation });
    } catch (error) {
        // Unique index race: two near-simultaneous requests both trying to
        // create the same (ride, passenger, driver) conversation
        if (error.code === 11000) {
            try {
                const conversation = await Conversation.findOne({
                    ride: req.body.rideId,
                    passenger: req.user._id,
                });
                if (conversation) return res.json({ success: true, data: conversation });
            } catch (raceErr) {
                console.error('❌ getOrCreateConversation race-recovery error:', raceErr);
            }
        }
        console.error('❌ getOrCreateConversation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations — conversation list for the logged-in user
// ─────────────────────────────────────────────────────────────────────────
exports.getMyConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            $or: [{ passenger: req.user._id }, { driver: req.user._id }],
            isActive: true,
        })
            .populate('ride', 'start end date time fare rideStatus preferences negotiableFare allowPartialRoute availableSeats seats')
            .populate('passenger', 'name avatar')
            .populate('driver', 'name avatar')
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean();

        res.json({ success: true, count: conversations.length, data: conversations });
    } catch (error) {
        console.error('❌ getMyConversations error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getConversationById = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id)
            .populate('ride', 'start end date time fare rideStatus preferences negotiableFare allowPartialRoute availableSeats seats')
            .populate('passenger', 'name avatar ratingSummary')
            .populate('driver', 'name avatar ratingSummary');

        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
        if (!roleOf(conversation, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, data: conversation });
    } catch (error) {
        console.error('❌ getConversationById error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations/:id/messages — paginated history
// query: ?page=1&limit=30 (returned newest-first, client reverses for display)
// ─────────────────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
        if (!roleOf(conversation, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));

        const messages = await Message.find({ conversation: conversation._id, isActive: true })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('sender', 'name avatar')
            .lean();

        const total = await Message.countDocuments({ conversation: conversation._id, isActive: true });

        res.json({
            success: true,
            data: messages,
            meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
        });
    } catch (error) {
        console.error('❌ getMessages error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/chat/conversations/:id/messages — REST fallback send
// (the socket 'message:send' event is the primary path; this exists so
// sending still works if the client's socket isn't connected)
// ─────────────────────────────────────────────────────────────────────────
exports.sendMessageRest = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ success: false, message: 'Message text is required' });
        if (text.trim().length > 1000) {
            return res.status(400).json({ success: false, message: 'Message must be 1000 characters or fewer' });
        }

        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

        const role = roleOf(conversation, req.user._id);
        if (!role) return res.status(403).json({ success: false, message: 'Not authorized' });

        // Quick-scan (synchronous, regex) BEFORE saving — the masked
        // version is what actually gets stored/delivered.
        const { maskedText, quickScanMatches, originalText } = scanAndMask(text.trim());

        const message = await Message.create({
            conversation: conversation._id,
            sender: req.user._id,
            type: 'text',
            text: maskedText,
        });

        // Now that the message has a real _id, schedule the background AI
        // analysis (fire-and-forget, never awaited here).
        scheduleAnalysis({ message, conversation, senderId: req.user._id, originalText, quickScanMatches });

        conversation.lastMessage = { text: maskedText, sender: req.user._id, sentAt: message.createdAt };
        if (role === 'passenger') conversation.unreadCount.driver += 1;
        else conversation.unreadCount.passenger += 1;
        await conversation.save();

        // Also push it to anyone live-connected on the socket, so both delivery
        // paths converge to the same real-time behavior
        try {
            const { getIO } = require('../services/socket');
            getIO().to(`conversation:${conversation._id}`).emit('message:new', message);
        } catch (err) {
            // Socket.IO not initialized (e.g. in a test environment) — non-fatal,
            // the message is still saved and will show up on next fetch
        }

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        console.error('❌ sendMessageRest error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getConversationSummary = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
        if (!roleOf(conversation, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const messages = await Message.find({ conversation: conversation._id, isActive: true })
            .sort({ createdAt: 1 })
            .limit(200)
            .populate('sender', 'name')
            .lean();

        const negotiations = await Negotiation.find({
            ride: conversation.ride,
            passenger: conversation.passenger,
            driver: conversation.driver,
            isActive: true,
        }).lean();

        const summary = await summarizeConversation({ messages, negotiations });
        if (!summary) {
            return res.status(503).json({ success: false, message: 'Summary generation is unavailable right now' });
        }

        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('❌ getConversationSummary error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};