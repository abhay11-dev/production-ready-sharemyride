// services/socket.js
//
// MILESTONE 4 — Websocket infra (see PROJECT_STATE.md §6/§7)
//
// Attaches Socket.IO to the existing http.Server instance (server.js was
// changed from `app.listen()` to `http.createServer(app)` + `server.listen()`
// specifically to make this possible — Express alone has no socket access).
//
// Auth: mirrors middleware/auth.js's JWT verification exactly (same
// JWT_SECRET, same `decoded.id` payload shape) so a client uses the SAME
// access token for both REST calls and the socket handshake — no separate
// socket-specific auth system.
//
// Rooms: one Socket.IO room per Conversation (`conversation:<id>`). A user
// joins the rooms for all conversations they're a participant in in one
// bulk operation right after connecting, rather than joining per-message.
//
// Events (client → server):
//   'message:send'    { conversationId, text }
//   'typing:start'     { conversationId }
//   'typing:stop'      { conversationId }
//   'message:read'     { conversationId }
//
// Events (server → client):
//   'message:new'      the saved Message document
//   'typing:update'     { conversationId, userId, isTyping }
//   'presence:update'   { userId, online }
//   'conversation:read' { conversationId, userId, readAt }
//
// This file exports `initSocket(httpServer)` (call once from server.js) and
// `getIO()` (so REST controllers — e.g. negotiationController on finalize —
// can also emit events without needing the socket connection themselves).

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { scanAndMask, scheduleAnalysis } = require('./moderationService'); // Milestone 5

let io = null;

// userId (string) -> Set of live socket ids. A user can have multiple tabs/
// devices open; they're only "offline" once every socket disconnects.
const onlineUsers = new Map();

function markOnline(userId, socketId) {
    const key = userId.toString();
    if (!onlineUsers.has(key)) onlineUsers.set(key, new Set());
    onlineUsers.get(key).add(socketId);
    return onlineUsers.get(key).size === 1; // true if this is their first connection
}

function markOffline(userId, socketId) {
    const key = userId.toString();
    const sockets = onlineUsers.get(key);
    if (!sockets) return true;
    sockets.delete(socketId);
    if (sockets.size === 0) {
        onlineUsers.delete(key);
        return true; // true if they're now fully offline
    }
    return false;
}

function isOnline(userId) {
    return onlineUsers.has(userId.toString());
}

function initSocket(httpServer) {
    const { Server } = require('socket.io');

    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            credentials: true,
        },
    });

    // ── Auth middleware — runs once per connection ─────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(' ')[1];

            if (!token) return next(new Error('No token provided'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (!user) return next(new Error('User not found'));

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication failed: ' + err.message));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user._id.toString();
        const firstConnection = markOnline(userId, socket.id);

        // Join a room per conversation this user participates in
        try {
            const conversations = await Conversation.find({
                $or: [{ passenger: userId }, { driver: userId }],
                isActive: true,
            }).select('_id').lean();

            conversations.forEach(c => socket.join(`conversation:${c._id}`));
        } catch (err) {
            console.warn('⚠️ Socket room join failed:', err.message);
        }

        if (firstConnection) {
            io.emit('presence:update', { userId, online: true });
        }

        // ── message:send ───────────────────────────────────────────────────
        socket.on('message:send', async ({ conversationId, text }, ack) => {
            try {
                if (!text?.trim()) return ack?.({ success: false, message: 'Message text required' });

                const conversation = await Conversation.findById(conversationId);
                if (!conversation) return ack?.({ success: false, message: 'Conversation not found' });

                const isParticipant = [conversation.passenger.toString(), conversation.driver.toString()].includes(userId);
                if (!isParticipant) return ack?.({ success: false, message: 'Not a participant in this conversation' });

                // Milestone 5, step 1: quick-scan/mask BEFORE saving (see chatController
                // for the identical pattern used on the REST send path — both writers
                // go through the same moderationService functions, not duplicated logic)
                const { maskedText, quickScanMatches, originalText } = scanAndMask(text.trim());

                const message = await Message.create({
                    conversation: conversationId,
                    sender: userId,
                    type: 'text',
                    text: maskedText,
                });

                // Milestone 5, step 2: schedule background AI analysis now that the
                // message has a real _id
                scheduleAnalysis({ message, conversation, senderId: userId, originalText, quickScanMatches });

                const isPassenger = conversation.passenger.toString() === userId;
                conversation.lastMessage = { text: text.trim(), sender: userId, sentAt: message.createdAt };
                // Increment the OTHER participant's unread count
                if (isPassenger) conversation.unreadCount.driver += 1;
                else conversation.unreadCount.passenger += 1;
                await conversation.save();

                io.to(`conversation:${conversationId}`).emit('message:new', message);
                ack?.({ success: true, data: message });
            } catch (err) {
                console.error('❌ message:send error:', err.message);
                ack?.({ success: false, message: 'Server error' });
            }
        });

        // ── typing indicators ────────────────────────────────────────────────
        socket.on('typing:start', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId, isTyping: true });
        });
        socket.on('typing:stop', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId, isTyping: false });
        });

        // ── read receipts ─────────────────────────────────────────────────────
        socket.on('message:read', async ({ conversationId }) => {
            try {
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) return;

                const isPassenger = conversation.passenger.toString() === userId;
                if (isPassenger) conversation.unreadCount.passenger = 0;
                else conversation.unreadCount.driver = 0;
                conversation.lastSeenBy = conversation.lastSeenBy || {};
                conversation.lastSeenBy[isPassenger ? 'passenger' : 'driver'] = new Date();
                await conversation.save();

                io.to(`conversation:${conversationId}`).emit('conversation:read', {
                    conversationId, userId, readAt: new Date(),
                });
            } catch (err) {
                console.warn('⚠️ message:read error:', err.message);
            }
        });

        socket.on('disconnect', () => {
            const fullyOffline = markOffline(userId, socket.id);
            if (fullyOffline) {
                io.emit('presence:update', { userId, online: false, lastSeen: new Date() });
            }
        });
    });

    console.log('🔌 Socket.IO initialized');
    return io;
}

function getIO() {
    if (!io) throw new Error('Socket.IO not initialized — call initSocket(httpServer) first');
    return io;
}

module.exports = { initSocket, getIO, isOnline };