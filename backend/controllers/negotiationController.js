// controllers/negotiationController.js
//
// MILESTONE 3 — Negotiation API (see PROJECT_STATE.md §6/§7)
//
// Endpoints implemented here (wired in routes/negotiationRoutes.js, mounted
// at /api/negotiations in server.js):
//   POST   /api/negotiations               initiateNegotiation
//   GET    /api/negotiations/my            getMyNegotiations
//   GET    /api/negotiations/:id           getNegotiationById
//   POST   /api/negotiations/:id/counter   counterOffer
//   POST   /api/negotiations/:id/accept    acceptNegotiation
//   POST   /api/negotiations/:id/reject    rejectNegotiation
//   POST   /api/negotiations/:id/cancel    cancelNegotiation
//   POST   /api/negotiations/:id/finalize  finalizeNegotiation  (driver only)
//
// FIX (this session): initiateNegotiation previously saved the negotiation,
// logged the audit, and sent the response — then fell through into a
// SECOND identical save/log/response block. That second res.json() call
// threw ERR_HTTP_HEADERS_SENT on every single request because Express
// cannot send two responses to one request. The duplicate block has been
// removed; behavior is otherwise unchanged.
//
// IMPORTANT — things this file deliberately does NOT do:
//   - Never modifies the original Ride document's route/schema fields.
//     Only touches `ride.availableSeats` on finalize, mirroring the exact
//     decrement pattern already used in bookingController.createBooking,
//     so seat accounting stays consistent across both booking paths.
//   - Never bypasses the existing Booking/payment pipeline. finalize()
//     creates a normal `pending` Booking via Booking.calculateFare() (the
//     model's own method) — the SAME lifecycle every other booking goes
//     through from that point on (accept/payment/cancellation all reuse
//     existing bookingController logic untouched).

const Negotiation = require('../models/Negotiation');
const Ride = require('../models/Ride');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLogs');

// Small helper — write an audit log entry without ever throwing (a failed
// audit write should never block the actual negotiation action)
async function logAudit({ actor, action, resourceId, note, changes }) {
    try {
        await AuditLog.create({
            actor: actor?._id || actor,
            actorEmail: actor?.email,
            actorRole: actor?.role,
            action,
            resource: 'Negotiation',
            resourceId,
            note,
            changes,
        });
    } catch (err) {
        console.warn('⚠️ AuditLog write failed (non-blocking):', err.message);
    }
}

// Determine whether the requesting user is the passenger or driver on a
// negotiation (or neither, i.e. not authorized to act on it)
function roleOf(negotiation, userId) {
    const uid = userId.toString();
    if (negotiation.passenger.toString() === uid) return 'passenger';
    if (negotiation.driver.toString() === uid) return 'driver';
    return null;
}

const VALID_SOURCES = ['chat', 'negotiate_fare', 'request_partial', 'discuss_pickup', 'discuss_drop'];

// ─────────────────────────────────────────────────────────────────────────
// POST /api/negotiations — start a new negotiation on a ride
// body: { rideId, source, proposedFare?, pickupLocation?, pickupCoordinates?,
//         dropLocation?, dropCoordinates?, time?, date?, seats?, message? }
// ─────────────────────────────────────────────────────────────────────────
exports.initiateNegotiation = async (req, res) => {
    try {
        const {
            rideId, source,
            proposedFare, pickupLocation, pickupCoordinates,
            dropLocation, dropCoordinates, time, date, seats, message,
        } = req.body;

        if (!rideId || !source || !VALID_SOURCES.includes(source)) {
            return res.status(400).json({
                success: false,
                message: `rideId and a valid source (${VALID_SOURCES.join(', ')}) are required`,
            });
        }

        if (message && typeof message === 'string' && message.length > 500) {
            return res.status(400).json({ success: false, message: 'Message must be 500 characters or fewer' });
        }

        const ride = await Ride.findById(rideId);
        if (!ride || !ride.isActive) {
            return res.status(404).json({ success: false, message: 'Ride not found or no longer active' });
        }

        const driverId = ride.driverId || ride.postedBy || ride.driver;
        if (!driverId) {
            return res.status(422).json({ success: false, message: 'Ride has no driver on record' });
        }
        if (driverId.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot negotiate on your own ride' });
        }

        // A specific rule per action type, per the eligibility logic already
        // enforced on the frontend (Milestone 2) — re-checked server-side so
        // the API can't be called directly to bypass it.
        if (source === 'negotiate_fare' && !ride.negotiableFare) {
            return res.status(400).json({ success: false, message: 'This ride does not allow fare negotiation' });
        }
        if (source === 'request_partial' && !ride.allowPartialRoute) {
            return res.status(400).json({ success: false, message: 'This ride does not allow partial-route requests' });
        }

        if (proposedFare != null && (isNaN(parseFloat(proposedFare)) || parseFloat(proposedFare) < 0)) {
            return res.status(400).json({ success: false, message: 'proposedFare must be a non-negative number' });
        }

        // Prevent duplicate open negotiations between the same passenger/ride
        const existing = await Negotiation.findOne({
            ride: rideId,
            passenger: req.user._id,
            status: { $in: ['pending', 'countered', 'accepted'] },
            isActive: true,
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'You already have an open negotiation on this ride',
                negotiationId: existing._id,
            });
        }

        const seatsRequested = Math.min(8, Math.max(1, parseInt(seats) || 1));
        const availableSeats = ride.availableSeats ?? ride.seats ?? 0;
        if (availableSeats < seatsRequested) {
            return res.status(400).json({ success: false, message: 'Not enough seats available on this ride' });
        }

        const terms = {
            pickupLocation: pickupLocation || ride.start,
            pickupCoordinates: pickupCoordinates || ride.pickup || undefined,
            dropLocation: dropLocation || ride.end,
            dropCoordinates: dropCoordinates || ride.destination || undefined,
            fare: proposedFare != null ? parseFloat(proposedFare) : ride.fare,
            time: time || ride.time,
            date: date ? new Date(date) : ride.date,
            seats: seatsRequested,
        };

        const negotiation = new Negotiation({
            ride: rideId,
            passenger: req.user._id,
            driver: driverId,
            source,
            initiatedBy: 'passenger',
            currentTerms: terms,
            proposals: [{
                proposedBy: 'passenger',
                proposedByUser: req.user._id,
                terms,
                message: message || '',
            }],
        });

        await negotiation.save();

        // Attach to the existing conversation for this (ride, passenger, driver)
        // triple, creating it if this is the first contact — per ARCHITECTURE.md
        // §7's design ("a negotiation attaches to the existing conversation
        // rather than spawning a parallel thread"). Get-or-create mirrors
        // chatController.getOrCreateConversation exactly, so calling this
        // endpoint has the same idempotency guarantee.
        let conversation = null;
        try {
            conversation = await Conversation.findOne({
                ride: rideId,
                passenger: req.user._id,
                driver: driverId,
            });
            if (!conversation) {
                conversation = await Conversation.create({
                    ride: rideId,
                    passenger: req.user._id,
                    driver: driverId,
                    negotiationId: negotiation._id,
                });
            } else if (!conversation.negotiationId) {
                conversation.negotiationId = negotiation._id;
                await conversation.save();
            }

            // Post a system message into the thread so the negotiation shows
            // up inline, matching the moderation pipeline's existing
            // type:'system' pattern (services/moderationService.js) rather
            // than inventing a second notification mechanism.
            const sourceLabels = {
                negotiate_fare: 'requested a fare negotiation',
                request_partial: 'requested a partial-route booking',
                discuss_pickup: 'wants to discuss the pickup point',
                discuss_drop: 'wants to discuss the drop point',
                chat: 'started a negotiation',
            };
            const sysMsg = await Message.create({
                conversation: conversation._id,
                type: 'system',
                text: `${req.user.name || 'Passenger'} ${sourceLabels[source] || 'started a negotiation'}.`,
            });

            conversation.lastMessage = { text: sysMsg.text, sender: null, sentAt: sysMsg.createdAt };
            conversation.unreadCount.driver += 1;
            await conversation.save();

            try {
                const { getIO } = require('../services/socket');
                getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
            } catch {
                // Socket.IO not initialized (e.g. tests) — non-fatal
            }
        } catch (convErr) {
            // Non-fatal — the negotiation itself is already saved and usable
            // via /api/negotiations/my even if the chat linkage fails
            console.warn('⚠️ Conversation linkage failed (non-blocking):', convErr.message);
        }

        await logAudit({
            actor: req.user, action: 'negotiation.initiate', resourceId: negotiation._id,
            note: `Negotiation started (${source}) on ride ${rideId}`,
        });

        return res.status(201).json({
            success: true,
            data: negotiation,
            conversationId: conversation?._id || null,
        });
    } catch (error) {
        console.error('❌ initiateNegotiation error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/negotiations/my — negotiations where the user is passenger OR driver
// query: ?role=passenger|driver (optional filter), ?status=pending,countered...
// ─────────────────────────────────────────────────────────────────────────
exports.getMyNegotiations = async (req, res) => {
    try {
        const { role, status } = req.query;
        const query = { isActive: true };

        if (role === 'passenger') query.passenger = req.user._id;
        else if (role === 'driver') query.driver = req.user._id;
        else query.$or = [{ passenger: req.user._id }, { driver: req.user._id }];

        if (status) {
            const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
            const validStatuses = ['pending', 'countered', 'accepted', 'rejected', 'expired', 'finalized', 'cancelled'];
            const filtered = statuses.filter(s => validStatuses.includes(s));
            if (filtered.length) query.status = { $in: filtered };
        }

        const negotiations = await Negotiation.find(query)
            .populate('ride', 'start end date time fare negotiableFare allowPartialRoute rideStatus')
            .populate('passenger', 'name avatar ratingSummary')
            .populate('driver', 'name avatar ratingSummary')
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean();

        res.json({ success: true, count: negotiations.length, data: negotiations });
    } catch (error) {
        console.error('❌ getMyNegotiations error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/negotiations/:id
// ─────────────────────────────────────────────────────────────────────────
exports.getNegotiationById = async (req, res) => {
    try {
        const negotiation = await Negotiation.findById(req.params.id)
            .populate('ride')
            .populate('passenger', 'name avatar ratingSummary phone email')
            .populate('driver', 'name avatar ratingSummary phone email')
            .populate('proposals.proposedByUser', 'name');

        if (!negotiation) {
            return res.status(404).json({ success: false, message: 'Negotiation not found' });
        }

        if (!roleOf(negotiation, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this negotiation' });
        }

        // Contact confidentiality: phone is only meaningful once a booking is
        // actually finalized from this negotiation. Strip it otherwise so a
        // negotiation view can't be used to see the other party's number
        // before any booking exists.
        if (negotiation.status !== 'finalized') {
            if (negotiation.passenger && typeof negotiation.passenger === 'object') negotiation.passenger.phone = undefined;
            if (negotiation.driver && typeof negotiation.driver === 'object') negotiation.driver.phone = undefined;
        }

        negotiation.checkExpiry();
        if (negotiation.isModified()) await negotiation.save();

        res.json({ success: true, data: negotiation });
    } catch (error) {
        console.error('❌ getNegotiationById error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/negotiations/:id/counter — either party proposes new terms
// body: { pickupLocation?, dropLocation?, fare?, time?, date?, seats?, message? }
// ─────────────────────────────────────────────────────────────────────────
exports.counterOffer = async (req, res) => {
    try {
        const negotiation = await Negotiation.findById(req.params.id);
        if (!negotiation) return res.status(404).json({ success: false, message: 'Negotiation not found' });

        const role = roleOf(negotiation, req.user._id);
        if (!role) return res.status(403).json({ success: false, message: 'Not authorized' });

        negotiation.checkExpiry();
        if (!['pending', 'countered'].includes(negotiation.status)) {
            if (negotiation.isModified()) await negotiation.save();
            return res.status(400).json({
                success: false,
                message: `Cannot counter a negotiation with status "${negotiation.status}"`,
            });
        }

        if (negotiation.roundCount >= negotiation.maxRounds) {
            negotiation.status = 'expired';
            await negotiation.save();
            return res.status(409).json({
                success: false,
                message: `Maximum negotiation rounds (${negotiation.maxRounds}) reached`,
            });
        }

        const { pickupLocation, pickupCoordinates, dropLocation, dropCoordinates, fare, time, date, seats, message } = req.body;

        if (fare != null && (isNaN(parseFloat(fare)) || parseFloat(fare) < 0)) {
            return res.status(400).json({ success: false, message: 'fare must be a non-negative number' });
        }
        if (message && typeof message === 'string' && message.length > 500) {
            return res.status(400).json({ success: false, message: 'Message must be 500 characters or fewer' });
        }

        const newTerms = {
            pickupLocation: pickupLocation || negotiation.currentTerms.pickupLocation,
            pickupCoordinates: pickupCoordinates || negotiation.currentTerms.pickupCoordinates,
            dropLocation: dropLocation || negotiation.currentTerms.dropLocation,
            dropCoordinates: dropCoordinates || negotiation.currentTerms.dropCoordinates,
            fare: fare != null ? parseFloat(fare) : negotiation.currentTerms.fare,
            time: time || negotiation.currentTerms.time,
            date: date ? new Date(date) : negotiation.currentTerms.date,
            seats: seats != null ? Math.min(8, Math.max(1, parseInt(seats))) : negotiation.currentTerms.seats,
        };

        negotiation.currentTerms = newTerms;
        negotiation.proposals.push({
            proposedBy: role,
            proposedByUser: req.user._id,
            terms: newTerms,
            message: message || '',
        });
        negotiation.roundCount += 1;
        negotiation.status = 'countered';
        // Reset the expiry window on each counter-offer (Q4 default)
        negotiation.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await negotiation.save();
        await logAudit({
            actor: req.user, action: 'negotiation.counter', resourceId: negotiation._id,
            note: `Round ${negotiation.roundCount} counter-offer by ${role}`,
        });

        // Post a system message into the linked conversation so the counter
        // is visible inline, same pattern as initiate/finalize.
        try {
            const conversation = await Conversation.findOne({ negotiationId: negotiation._id });
            if (conversation) {
                const sysMsg = await Message.create({
                    conversation: conversation._id,
                    type: 'system',
                    text: `${req.user.name || (role === 'passenger' ? 'Passenger' : 'Driver')} countered: ₹${newTerms.fare} for ${newTerms.seats} seat(s).`,
                });
                const otherRole = role === 'passenger' ? 'driver' : 'passenger';
                conversation.lastMessage = { text: sysMsg.text, sender: null, sentAt: sysMsg.createdAt };
                conversation.unreadCount[otherRole] += 1;
                await conversation.save();
                try {
                    const { getIO } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                } catch { /* non-fatal */ }
            }
        } catch (convErr) {
            console.warn('⚠️ Counter system message failed (non-blocking):', convErr.message);
        }

        res.json({ success: true, data: negotiation });
    } catch (error) {
        console.error('❌ counterOffer error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/negotiations/:id/accept — accept the current terms on the table
// (does NOT create a booking yet — driver still has to click Finalize)
// ─────────────────────────────────────────────────────────────────────────
exports.acceptNegotiation = async (req, res) => {
    try {
        const negotiation = await Negotiation.findById(req.params.id);
        if (!negotiation) return res.status(404).json({ success: false, message: 'Negotiation not found' });

        const role = roleOf(negotiation, req.user._id);
        if (!role) return res.status(403).json({ success: false, message: 'Not authorized' });

        negotiation.checkExpiry();
        if (!['pending', 'countered'].includes(negotiation.status)) {
            if (negotiation.isModified()) await negotiation.save();
            return res.status(400).json({
                success: false,
                message: `Cannot accept a negotiation with status "${negotiation.status}"`,
            });
        }

        negotiation.status = 'accepted';
        await negotiation.save();
        await logAudit({
            actor: req.user, action: 'negotiation.accept', resourceId: negotiation._id,
            note: `Accepted by ${role}`,
        });

        try {
            const conversation = await Conversation.findOne({ negotiationId: negotiation._id });
            if (conversation) {
                const sysMsg = await Message.create({
                    conversation: conversation._id,
                    type: 'system',
                    text: `${req.user.name || 'A participant'} accepted the current terms. ${role === 'passenger' ? 'Waiting for driver to finalize.' : 'Ready to finalize the booking.'}`,
                });
                const otherRole = role === 'passenger' ? 'driver' : 'passenger';
                conversation.lastMessage = { text: sysMsg.text, sender: null, sentAt: sysMsg.createdAt };
                conversation.unreadCount[otherRole] += 1;
                await conversation.save();
                try {
                    const { getIO } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                } catch { /* non-fatal */ }
            }
        } catch (convErr) {
            console.warn('⚠️ Accept system message failed (non-blocking):', convErr.message);
        }

        res.json({ success: true, data: negotiation });
    } catch (error) {
        console.error('❌ acceptNegotiation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/negotiations/:id/reject
// ─────────────────────────────────────────────────────────────────────────
exports.rejectNegotiation = async (req, res) => {
    try {
        const negotiation = await Negotiation.findById(req.params.id);
        if (!negotiation) return res.status(404).json({ success: false, message: 'Negotiation not found' });

        const role = roleOf(negotiation, req.user._id);
        if (!role) return res.status(403).json({ success: false, message: 'Not authorized' });

        if (['finalized', 'rejected', 'cancelled', 'expired'].includes(negotiation.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot reject a negotiation with status "${negotiation.status}"`,
            });
        }

        negotiation.status = 'rejected';
        await negotiation.save();
        await logAudit({
            actor: req.user, action: 'negotiation.reject', resourceId: negotiation._id,
            note: `Rejected by ${role}`,
        });

        try {
            const conversation = await Conversation.findOne({ negotiationId: negotiation._id });
            if (conversation) {
                const sysMsg = await Message.create({
                    conversation: conversation._id,
                    type: 'system',
                    text: `${req.user.name || 'A participant'} declined this negotiation.`,
                });
                const otherRole = role === 'passenger' ? 'driver' : 'passenger';
                conversation.lastMessage = { text: sysMsg.text, sender: null, sentAt: sysMsg.createdAt };
                conversation.unreadCount[otherRole] += 1;
                await conversation.save();
                try {
                    const { getIO } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                } catch { /* non-fatal */ }
            }
        } catch (convErr) {
            console.warn('⚠️ Reject system message failed (non-blocking):', convErr.message);
        }

        res.json({ success: true, data: negotiation });
    } catch (error) {
        console.error('❌ rejectNegotiation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/negotiations/:id/cancel — either party withdraws early
// ─────────────────────────────────────────────────────────────────────────
exports.cancelNegotiation = async (req, res) => {
    try {
        const negotiation = await Negotiation.findById(req.params.id);
        if (!negotiation) return res.status(404).json({ success: false, message: 'Negotiation not found' });

        const role = roleOf(negotiation, req.user._id);
        if (!role) return res.status(403).json({ success: false, message: 'Not authorized' });

        if (negotiation.status === 'finalized') {
            return res.status(400).json({ success: false, message: 'Cannot cancel a finalized negotiation' });
        }

        negotiation.status = 'cancelled';
        await negotiation.save();
        await logAudit({
            actor: req.user, action: 'negotiation.cancel', resourceId: negotiation._id,
            note: `Cancelled by ${role}`,
        });

        try {
            const conversation = await Conversation.findOne({ negotiationId: negotiation._id });
            if (conversation) {
                const sysMsg = await Message.create({
                    conversation: conversation._id,
                    type: 'system',
                    text: `${req.user.name || 'A participant'} cancelled this negotiation.`,
                });
                const otherRole = role === 'passenger' ? 'driver' : 'passenger';
                conversation.lastMessage = { text: sysMsg.text, sender: null, sentAt: sysMsg.createdAt };
                conversation.unreadCount[otherRole] += 1;
                await conversation.save();
                try {
                    const { getIO } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                } catch { /* non-fatal */ }
            }
        } catch (convErr) {
            console.warn('⚠️ Cancel system message failed (non-blocking):', convErr.message);
        }

        res.json({ success: true, data: negotiation });
    } catch (error) {
        console.error('❌ cancelNegotiation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/negotiations/:id/finalize — DRIVER ONLY.
// Creates a normal Booking from currentTerms, reusing Booking's own
// calculateFare() method — same fare-breakdown logic every other booking
// uses. Original Ride is not modified except availableSeats (same pattern
// as bookingController.createBooking).
// ─────────────────────────────────────────────────────────────────────────
exports.finalizeNegotiation = async (req, res) => {
    try {
        const negotiation = await Negotiation.findById(req.params.id);
        if (!negotiation) return res.status(404).json({ success: false, message: 'Negotiation not found' });

        if (negotiation.driver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the driver can finalize a negotiation' });
        }

        negotiation.checkExpiry();
        if (negotiation.status !== 'accepted') {
            if (negotiation.isModified()) await negotiation.save();
            return res.status(400).json({
                success: false,
                message: `Negotiation must be "accepted" before it can be finalized (current status: "${negotiation.status}")`,
            });
        }

        const ride = await Ride.findById(negotiation.ride);
        if (!ride || !ride.isActive) {
            return res.status(404).json({ success: false, message: 'Ride no longer active' });
        }

        const terms = negotiation.currentTerms;
        const seatsBooked = terms.seats || 1;
        const availableSeats = ride.availableSeats ?? ride.seats ?? 0;
        if (availableSeats < seatsBooked) {
            return res.status(400).json({ success: false, message: 'Not enough seats remaining on this ride' });
        }

        const booking = new Booking({
            ride: ride._id,
            passenger: negotiation.passenger,
            driver: negotiation.driver,
            seatsBooked,
            pickupLocation: terms.pickupLocation,
            pickupCoordinates: terms.pickupCoordinates,
            dropLocation: terms.dropLocation,
            dropCoordinates: terms.dropCoordinates,
            status: 'pending',
            paymentStatus: 'pending',
            // Milestone 3 additions to Booking schema (additive, see PROJECT_STATE.md §7)
            negotiated: true,
            negotiationId: negotiation._id,
        });

        // Reuse the Booking model's own fare-calculation method rather than
        // re-implementing the formula here.
        booking.calculateFare(terms.fare, seatsBooked, false);
        await booking.save();

        // Mirror the exact seat-decrement pattern used in bookingController.createBooking
        ride.availableSeats = Math.max(0, availableSeats - seatsBooked);
        await ride.save();

        negotiation.status = 'finalized';
        negotiation.finalizedBookingId = booking._id;
        await negotiation.save();

        // Post a system confirmation into the linked conversation, if one exists
        try {
            const conversation = await Conversation.findOne({ negotiationId: negotiation._id });
            if (conversation) {
                const sysMsg = await Message.create({
                    conversation: conversation._id,
                    type: 'system',
                    text: `Negotiation finalized — booking confirmed at ₹${terms.fare} for ${seatsBooked} seat(s).`,
                });
                conversation.lastMessage = { text: sysMsg.text, sender: null, sentAt: sysMsg.createdAt };
                conversation.unreadCount.passenger += 1;
                await conversation.save();
                try {
                    const { getIO } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                } catch { /* socket not initialized — non-fatal */ }
            }
        } catch (convErr) {
            console.warn('⚠️ Finalize system message failed (non-blocking):', convErr.message);
        }

        await logAudit({
            actor: req.user, action: 'negotiation.finalize', resourceId: negotiation._id,
            note: `Finalized into booking ${booking._id}`,
            changes: { after: { bookingId: booking._id, fare: terms.fare, seats: seatsBooked } },
        });

        res.status(201).json({ success: true, data: { negotiation, booking } });
    } catch (error) {
        console.error('❌ finalizeNegotiation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};