// controllers/chatController.js
//
// MILESTONE 4 — Chat REST API (see PROJECT_STATE.md §6/§7)
//
// Socket.IO (services/socket.js) handles LIVE message delivery, typing, and
// read receipts. This controller handles everything a socket connection
// doesn't: initial conversation list, paginated message history (a client
// needs this on first load / scroll-back — you can't get chat history
// through a live socket event), and a REST fallback for sending a message
// if the socket isn't connected for some reason.
//
// Endpoints (wired in routes/chatRoutes.js, mounted at /api/chat):
//   POST /api/chat/conversations              getOrCreateConversation
//   GET  /api/chat/conversations               getMyConversations
//   GET  /api/chat/conversations/:id/messages  getMessages (paginated)
//   POST /api/chat/conversations/:id/messages  sendMessageRest

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Ride = require('../models/Ride');
const { scanAndMask, scheduleAnalysis } = require('../services/moderationService'); // Milestone 5

function roleOf(conversation, userId) {
    const uid = userId.toString();
    if (conversation.passenger.toString() === uid) return 'passenger';
    if (conversation.driver.toString() === uid) return 'driver';
    return null;
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/chat/conversations — get-or-create the conversation for a ride
// body: { rideId }
// This is the entry point for the "Chat with Driver" negotiation card
// (Milestone 2) — it's called whether or not a negotiation exists yet.
// ─────────────────────────────────────────────────────────────────────────
exports.getOrCreateConversation = async (req, res) => {
    try {
        const { rideId } = req.body;
        if (!rideId) return res.status(400).json({ success: false, message: 'rideId is required' });

        const ride = await Ride.findById(rideId);
        if (!ride || !ride.isActive) {
            return res.status(404).json({ success: false, message: 'Ride not found or no longer active' });
        }

        const driverId = ride.driverId || ride.postedBy;
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
            const conversation = await Conversation.findOne({
                ride: req.body.rideId,
                passenger: req.user._id,
            });
            if (conversation) return res.json({ success: true, data: conversation });
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
            .populate('ride', 'start end date time fare')
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

        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

        const role = roleOf(conversation, req.user._id);
        if (!role) return res.status(403).json({ success: false, message: 'Not authorized' });

        // Milestone 5, step 1: quick-scan (synchronous, regex) BEFORE saving —
        // the masked version is what actually gets stored/delivered.
        const { maskedText, quickScanMatches, originalText } = scanAndMask(text.trim());

        const message = await Message.create({
            conversation: conversation._id,
            sender: req.user._id,
            type: 'text',
            text: maskedText,
        });

        // Milestone 5, step 2: now that the message has a real _id, schedule
        // the background AI analysis (fire-and-forget, never awaited here).
        scheduleAnalysis({ message, conversation, senderId: req.user._id, originalText, quickScanMatches });

        conversation.lastMessage = { text: text.trim(), sender: req.user._id, sentAt: message.createdAt };
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