// services/socket.js


const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { scanAndMask, scheduleAnalysis } = require('./moderationService');

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

      if (decoded.type && decoded.type !== 'access') {
        return next(new Error('Invalid token type'));
      }

      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      if (!user.isActive || ['SUSPENDED', 'BLOCKED', 'BANNED'].includes(user.accountStatus)) {
        return next(new Error('Account suspended'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed: ' + err.message));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    const firstConnection = markOnline(userId, socket.id);

    // Join a room per conversation this user participates in, plus a
    // personal room for in-app notifications that aren't tied to an open
    // conversation (new negotiation requests, moderation notices, etc.)
    socket.join(`user:${userId}`);
    if (socket.user.role === 'admin') {
      // Ride Safety Platform — Phase 3/4: admin dashboard needs a single
      // room to receive safety escalations (need_help, SOS) from every
      // ride at once, without joining each ride room individually.
      socket.join('admin:global');
    }
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

    // ── ride journey rooms (Ride Safety Platform — Phase 1) ──────────────
    // Clients join explicitly (rather than auto-joining every ride like
    // conversations above) because a user may have many past rides but
    // only ever needs the room for whichever ride's dashboard is open.
    // Authorization (is this user actually the driver or a confirmed
    // passenger?) is checked before responding to the ack, not just before
    // emitting — joining a room you're not authorized for would let you
    // silently receive that ride's events.
    socket.on('ride:join', async ({ rideId }, ack) => {
      try {
        if (!rideId) return ack?.({ success: false, message: 'rideId required' });

        const RideJourney = require('../models/RideJourney');
        const journey = await RideJourney.findOne({ ride: rideId }).select('driver passengers').lean();
        if (!journey) return ack?.({ success: false, message: 'No ride journey found' });

        const isDriver = journey.driver.toString() === userId;
        const isPassenger = journey.passengers.some((p) => p.user.toString() === userId);
        if (!isDriver && !isPassenger) {
          return ack?.({ success: false, message: 'Not authorized for this ride' });
        }

        socket.join(`ride:${rideId}`);
        ack?.({ success: true });
      } catch (err) {
        console.warn('⚠️ ride:join error:', err.message);
        ack?.({ success: false, message: 'Server error' });
      }
    });

    socket.on('ride:leave', ({ rideId }) => {
      if (!rideId) return;
      socket.leave(`ride:${rideId}`);
    });

    socket.on('conversation:join', async ({ conversationId }, ack) => {
      if (!conversationId) return ack?.({ success: false, message: 'conversationId required' });
      try {
        const conversation = await Conversation.findById(conversationId).select('passenger driver');
        if (!conversation) return ack?.({ success: false, message: 'Conversation not found' });

        const isParticipant = [conversation.passenger.toString(), conversation.driver.toString()].includes(userId);
        if (!isParticipant) return ack?.({ success: false, message: 'Not authorized for this conversation' });

        socket.join(`conversation:${conversationId}`);
        ack?.({ success: true });
      } catch (err) {
        console.warn('⚠️ conversation:join error:', err.message);
        ack?.({ success: false, message: 'Server error' });
      }
    });

    socket.on('conversation:leave', ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // ── message:send ───────────────────────────────────────────────────

    socket.on('message:send', async ({ conversationId, text }, ack) => {
      try {
        if (!text?.trim()) return ack?.({ success: false, message: 'Message text required' });
        if (text.trim().length > 1000) {
          return ack?.({ success: false, message: 'Message must be 1000 characters or fewer' });
        }
        if (!conversationId) return ack?.({ success: false, message: 'conversationId required' });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return ack?.({ success: false, message: 'Conversation not found' });

        const isParticipant = [conversation.passenger.toString(), conversation.driver.toString()].includes(userId);
        if (!isParticipant) return ack?.({ success: false, message: 'Not a participant in this conversation' });

        const { checkRateLimit, evaluateText, createFlagForMessage } = require('./moderationFilter');

        if (!checkRateLimit(userId, conversationId)) {
          return ack?.({ success: false, message: 'You are sending messages too quickly. Please slow down.' });
        }

        const evaluation = evaluateText(text.trim());

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          type: 'text',
          text: evaluation.text,
        });

        // Formal flag row — only written once the Message._id exists, since
        // ModerationFlag.message is a required ref.
        createFlagForMessage({
          messageId: message._id,
          conversationId,
          senderId: userId,
          evaluation,
        }).catch(() => { /* already logged inside createFlagForMessage */ });

        // Background AI analysis, unchanged — still fed the true original
        // text so it isn't analyzing an already-masked string.
        scheduleAnalysis({
          message,
          conversation,
          senderId: userId,
          originalText: evaluation.originalText,
          quickScanMatches: evaluation.quickScanMatches,
        });

        const isPassenger = conversation.passenger.toString() === userId;
        conversation.lastMessage = { text: evaluation.text, sender: userId, sentAt: message.createdAt };
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
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId, isTyping: true });
    });
    socket.on('typing:stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId, isTyping: false });
    });

    // ── read receipts ─────────────────────────────────────────────────────
    socket.on('message:read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isPassenger = conversation.passenger.toString() === userId;
        const isDriver = conversation.driver.toString() === userId;
        if (!isPassenger && !isDriver) return;

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

// Push an in-app notification event to a specific user's personal room
// (joined as `user:<id>` on connect above), regardless of which conversation
// (if any) they currently have open. Non-fatal if Socket.IO isn't
// initialized (e.g. scripts/tests) — callers already wrap this in try/catch
// per the existing pattern used for conversation-room emits.
function emitToUser(userId, event, payload) {
  getIO().to(`user:${userId}`).emit(event, payload);
}

// Push a ride-journey event to everyone currently viewing that ride's
// dashboard (driver + passenger(s), whoever has called `ride:join`).
// This is what keeps both dashboards synchronized off a single event —
// see services/rideLifecycleService.js for every call site.
function emitToRide(rideId, event, payload) {
  getIO().to(`ride:${rideId}`).emit(event, payload);
}

// Push a safety escalation (Phase 3 need_help/contact_support responses,
// Phase 4 SOS) to every connected admin at once.
function emitToAdmins(event, payload) {
  getIO().to('admin:global').emit(event, payload);
}

module.exports = { initSocket, getIO, isOnline, emitToUser, emitToRide, emitToAdmins };