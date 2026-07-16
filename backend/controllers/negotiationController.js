// controllers/negotiationController.js


const Negotiation = require('../models/Negotiation');
const { PREFERENCE_KEYS } = require('../models/Negotiation');
const Ride = require('../models/Ride');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLogs');
const { evaluateText, checkRateLimit } = require('../services/moderationFilter');

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

const VALID_SOURCES = ['chat', 'negotiate_fare', 'request_partial', 'discuss_pickup', 'discuss_drop', 'preference'];

const PREFERENCE_LABELS = {
    smoking: 'smoking',
    music: 'playing music',
    pets: 'travelling with a pet',
    luggage: 'extra luggage',
    womenOnly: 'women-only seating',
    talkative: 'conversation preference',
    childSeat: 'a child seat',
    flexiblePickup: 'a flexible pickup point',
};

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
            preferenceKey, preferenceRequested, preferenceNote,
        } = req.body;

        if (!rideId || !source || !VALID_SOURCES.includes(source)) {
            return res.status(400).json({
                success: false,
                message: `rideId and a valid source (${VALID_SOURCES.join(', ')}) are required`,
            });
        }

        if (source === 'preference') {
            if (!preferenceKey || !PREFERENCE_KEYS.includes(preferenceKey)) {
                return res.status(400).json({
                    success: false,
                    message: `preferenceKey is required and must be one of: ${PREFERENCE_KEYS.join(', ')}`,
                });
            }
            if (typeof preferenceRequested !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'preferenceRequested (boolean) is required when source is "preference"',
                });
            }
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
        // enforced on the frontend — re-checked server-side so
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

        // Prevent duplicate open negotiations between the same passenger/ride.
        // Scoped by source (and preferenceKey, when applicable) so a passenger
        // can have an open fare negotiation and an open "pets" preference
        // negotiation on the same ride at the same time without collision.
        const dupQuery = {
            ride: rideId,
            passenger: req.user._id,
            source,
            status: { $in: ['pending', 'countered', 'accepted'] },
            isActive: true,
        };
        if (source === 'preference') dupQuery.preferenceKey = preferenceKey;

        const existing = await Negotiation.findOne(dupQuery);
        if (existing) {
            return res.status(409).json({
                success: false,
                message: source === 'preference'
                    ? `You already have an open negotiation about "${preferenceKey}" on this ride`
                    : 'You already have an open negotiation of this type on this ride',
                negotiationId: existing._id,
            });
        }

        // Moderation pass — mask-only here (no Message document exists yet
        // for this proposal text, and negotiation proposals never become one,
        // so there is no ModerationFlag row to attach to for this path).
        let safeMessage = message || '';
        if (safeMessage) {
            safeMessage = evaluateText(safeMessage).text;
        }

        const seatsRequested = Math.min(8, Math.max(1, parseInt(seats) || 1));
        const availableSeats = ride.availableSeats ?? ride.seats ?? 0;

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

        if (source === 'preference') {
            terms.preferences = {
                [preferenceKey]: {
                    requested: preferenceRequested,
                    status: 'pending',
                    note: preferenceNote || '',
                },
            };
        }

        const negotiation = new Negotiation({
            ride: rideId,
            passenger: req.user._id,
            driver: driverId,
            source,
            preferenceKey: source === 'preference' ? preferenceKey : null,
            initiatedBy: 'passenger',
            currentTerms: terms,
            proposals: [{
                proposedBy: 'passenger',
                proposedByUser: req.user._id,
                terms,
                message: safeMessage,
            }],
            statusHistory: [{ status: 'pending', changedBy: req.user._id, note: `Negotiation initiated (${source})` }],
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
                preference: `asked about ${PREFERENCE_LABELS[preferenceKey] || 'a ride preference'}`,
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
                const { getIO, emitToUser } = require('../services/socket');
                getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                emitToUser(driverId, 'negotiation:new', {
                    negotiationId: negotiation._id,
                    conversationId: conversation._id,
                    source,
                    preferenceKey: source === 'preference' ? preferenceKey : null,
                    fromUser: { id: req.user._id, name: req.user.name },
                    message: sysMsg.text,
                });
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
        const { role, status, rideId } = req.query;
        const query = { isActive: true };

        if (role === 'passenger') query.passenger = req.user._id;
        else if (role === 'driver') query.driver = req.user._id;
        else query.$or = [{ passenger: req.user._id }, { driver: req.user._id }];

        if (rideId) query.ride = rideId;

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
//
// Also doubles as the REOPEN path: if the negotiation is rejected/cancelled/
// expired (and has no finalizedBookingId), a fresh counter-offer here
// reopens it — re-checking ride activity and seat capacity first, since
// time may have passed since it died.
// ─────────────────────────────────────────────────────────────────────────
exports.counterOffer = async (req, res) => {
    try {
        const negotiation = await Negotiation.findById(req.params.id);
        if (!negotiation) return res.status(404).json({ success: false, message: 'Negotiation not found' });

        const role = roleOf(negotiation, req.user._id);
        if (!role) return res.status(403).json({ success: false, message: 'Not authorized' });

        negotiation.checkExpiry();

        const isLive = ['pending', 'countered'].includes(negotiation.status);
        const isReopen = !isLive && negotiation.canReopen();

        if (!isLive && !isReopen) {
            if (negotiation.isModified()) await negotiation.save();
            return res.status(400).json({
                success: false,
                message: negotiation.finalizedBookingId
                    ? 'Cannot counter a finalized negotiation — it already has a booking.'
                    : `Cannot counter a negotiation with status "${negotiation.status}"`,
            });
        }

        if (isLive && negotiation.roundCount >= negotiation.maxRounds) {
            negotiation.transitionTo('expired', req.user._id, `Max rounds (${negotiation.maxRounds}) reached`);
            await negotiation.save();
            return res.status(409).json({
                success: false,
                message: `Maximum negotiation rounds (${negotiation.maxRounds}) reached`,
            });
        }

        const { pickupLocation, pickupCoordinates, dropLocation, dropCoordinates, fare, time, date, seats, message, preferenceNote } = req.body;

        if (fare != null && (isNaN(parseFloat(fare)) || parseFloat(fare) < 0)) {
            return res.status(400).json({ success: false, message: 'fare must be a non-negative number' });
        }
        if (message && typeof message === 'string' && message.length > 500) {
            return res.status(400).json({ success: false, message: 'Message must be 500 characters or fewer' });
        }

        // Reopen-specific re-validation: ride must still be active, and the
        // requested (or carried-forward) seat count must still fit.
        let ride = null;
        if (isReopen) {
            ride = await Ride.findById(negotiation.ride);
            if (!ride || !ride.isActive) {
                return res.status(404).json({ success: false, message: 'Ride is no longer active — cannot reopen' });
            }
            const availableSeats = ride.availableSeats ?? ride.seats ?? 0;
            const requestedSeats = seats != null ? parseInt(seats) : negotiation.currentTerms.seats;
            if (requestedSeats > availableSeats) {
                return res.status(409).json({
                    success: false,
                    message: `Only ${availableSeats} seat(s) available now — adjust seats to reopen.`,
                });
            }
        }

        // Rate limit + moderation pass on the message field
        let safeMessage = message || '';
        if (safeMessage) {
            if (!checkRateLimit(req.user._id, `negotiation:${negotiation._id}`)) {
                return res.status(429).json({ success: false, message: 'You are sending offers too quickly. Please slow down.' });
            }
            safeMessage = evaluateText(safeMessage).text;
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

        // A counter-offer on a preference negotiation carries the preference
        // forward unchanged (same requested value) but flips its status to
        // 'counter_offered' and lets the countering party attach a note
        // (e.g. "I can allow a small pet carrier but not a large dog").
        if (negotiation.source === 'preference' && negotiation.preferenceKey) {
            const key = negotiation.preferenceKey;
            const prevPref = negotiation.currentTerms.preferences?.[key] || {};
            newTerms.preferences = {
                [key]: {
                    requested: prevPref.requested,
                    status: 'counter_offered',
                    note: preferenceNote != null ? preferenceNote : (prevPref.note || ''),
                },
            };
        }

        negotiation.currentTerms = newTerms;
        negotiation.proposals.push({
            proposedBy: role,
            proposedByUser: req.user._id,
            terms: newTerms,
            message: safeMessage,
        });
        negotiation.roundCount += 1;

        if (isReopen) {
            negotiation.reopenCount += 1;
            negotiation.transitionTo('countered', req.user._id, `Reopened after ${negotiation.status} (round ${negotiation.roundCount})`);
        } else {
            negotiation.transitionTo('countered', req.user._id, `Round ${negotiation.roundCount} counter-offer by ${role}`);
        }

        // Reset the expiry window on each counter-offer / reopen (Q4 default)
        negotiation.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await negotiation.save();
        await logAudit({
            actor: req.user, action: 'negotiation.counter', resourceId: negotiation._id,
            note: isReopen
                ? `Negotiation reopened, round ${negotiation.roundCount} by ${role}`
                : `Round ${negotiation.roundCount} counter-offer by ${role}`,
        });

        // Post a system message into the linked conversation so the counter
        // (or reopen) is visible inline, same pattern as initiate/finalize.
        try {
            const conversation = await Conversation.findOne({ negotiationId: negotiation._id });
            if (conversation) {
                const actorName = req.user.name || (role === 'passenger' ? 'Passenger' : 'Driver');
                let counterText;
                if (negotiation.source === 'preference') {
                    counterText = `${actorName} countered on ${PREFERENCE_LABELS[negotiation.preferenceKey] || 'the preference request'}${preferenceNote ? `: "${preferenceNote}"` : '.'}`;
                } else if (isReopen) {
                    counterText = `${actorName} reopened this negotiation with a new offer: ₹${newTerms.fare} for ${newTerms.seats} seat(s).`;
                } else {
                    counterText = `${actorName} countered: ₹${newTerms.fare} for ${newTerms.seats} seat(s).`;
                }
                const sysMsg = await Message.create({
                    conversation: conversation._id,
                    type: 'system',
                    text: counterText,
                });
                const otherRole = role === 'passenger' ? 'driver' : 'passenger';
                conversation.lastMessage = { text: sysMsg.text, sender: null, sentAt: sysMsg.createdAt };
                conversation.unreadCount[otherRole] += 1;
                await conversation.save();
                try {
                    const { getIO, emitToUser } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                    const otherUserId = otherRole === 'passenger' ? negotiation.passenger : negotiation.driver;
                    emitToUser(otherUserId, isReopen ? 'negotiation:reopened' : 'negotiation:countered', {
                        negotiationId: negotiation._id, conversationId: conversation._id, message: sysMsg.text,
                    });
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

        negotiation.transitionTo('accepted', req.user._id, `Accepted by ${role}`);
        if (negotiation.source === 'preference' && negotiation.preferenceKey) {
            const key = negotiation.preferenceKey;
            if (negotiation.currentTerms.preferences?.[key]) {
                negotiation.currentTerms.preferences[key].status = 'accepted';
                negotiation.markModified('currentTerms.preferences');
            }
        }
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
                    const { getIO, emitToUser } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                    const otherUserId = otherRole === 'passenger' ? negotiation.passenger : negotiation.driver;
                    emitToUser(otherUserId, 'negotiation:accepted', {
                        negotiationId: negotiation._id, conversationId: conversation._id, message: sysMsg.text,
                    });
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

        negotiation.transitionTo('rejected', req.user._id, `Rejected by ${role}`);
        if (negotiation.source === 'preference' && negotiation.preferenceKey) {
            const key = negotiation.preferenceKey;
            if (negotiation.currentTerms.preferences?.[key]) {
                negotiation.currentTerms.preferences[key].status = 'rejected';
                negotiation.markModified('currentTerms.preferences');
            }
        }
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
                    const { getIO, emitToUser } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                    const otherUserId = otherRole === 'passenger' ? negotiation.passenger : negotiation.driver;
                    emitToUser(otherUserId, 'negotiation:rejected', {
                        negotiationId: negotiation._id, conversationId: conversation._id, message: sysMsg.text,
                    });
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

        negotiation.transitionTo('cancelled', req.user._id, `Cancelled by ${role}`);
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
                    const { getIO, emitToUser } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                    const otherUserId = otherRole === 'passenger' ? negotiation.passenger : negotiation.driver;
                    emitToUser(otherUserId, 'negotiation:cancelled', {
                        negotiationId: negotiation._id, conversationId: conversation._id, message: sysMsg.text,
                    });
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

        if (negotiation.source === 'preference') {
            return res.status(400).json({
                success: false,
                message: 'Preference negotiations don\'t create a booking on their own — accepting is the final step. Finalize the ride via a fare/chat negotiation or the normal booking flow instead.',
            });
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
            // Additive fields on the Booking schema (negotiated / negotiationId)
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

        negotiation.transitionTo('finalized', req.user._id, `Finalized into booking ${booking._id}`);
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
                    const { getIO, emitToUser } = require('../services/socket');
                    getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                    emitToUser(negotiation.passenger, 'negotiation:finalized', {
                        negotiationId: negotiation._id, conversationId: conversation._id,
                        bookingId: booking._id, message: sysMsg.text,
                    });
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

// ─────────────────────────────────────────────────────────────────────────
// POST /api/negotiations/:id/dispute — either party flags a negotiation
// for admin review. Non-terminal — the negotiation continues to function
// normally while disputed=true; this is a visibility flag, not a lock.
// ─────────────────────────────────────────────────────────────────────────
exports.raiseDispute = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason?.trim()) return res.status(400).json({ success: false, message: 'A dispute reason is required' });

        const negotiation = await Negotiation.findById(req.params.id);
        if (!negotiation) return res.status(404).json({ success: false, message: 'Negotiation not found' });
        if (!roleOf(negotiation, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized' });
        if (negotiation.disputed) return res.status(400).json({ success: false, message: 'Already under dispute' });

        negotiation.disputed = true;
        negotiation.disputeReason = reason.trim();
        negotiation.disputeRaisedBy = req.user._id;
        negotiation.disputeRaisedAt = new Date();
        negotiation.statusHistory.push({ status: negotiation.status, changedBy: req.user._id, note: `Dispute raised: ${reason.trim()}` });
        await negotiation.save();

        await logAudit({ actor: req.user, action: 'negotiation.dispute_raised', resourceId: negotiation._id, note: reason.trim() });
        res.json({ success: true, data: negotiation });
    } catch (error) {
        console.error('❌ raiseDispute error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/admin/negotiations/:id/resolve-dispute — admin only
// body: { resolution, forceStatus? } — forceStatus optional: 'rejected' | 'cancelled'
// ─────────────────────────────────────────────────────────────────────────
exports.resolveDispute = async (req, res) => {
    try {
        const { resolution, forceStatus } = req.body;
        const negotiation = await Negotiation.findById(req.params.id);
        if (!negotiation) return res.status(404).json({ success: false, message: 'Negotiation not found' });
        if (!negotiation.disputed) return res.status(400).json({ success: false, message: 'This negotiation is not under dispute' });

        negotiation.disputed = false;
        negotiation.disputeResolvedBy = req.user._id;
        negotiation.disputeResolution = resolution?.trim() || '';
        negotiation.disputeResolvedAt = new Date();

        if (forceStatus && ['rejected', 'cancelled'].includes(forceStatus)) {
            negotiation.transitionTo(forceStatus, req.user._id, `Admin resolved dispute: ${resolution?.trim()}`);
        } else {
            negotiation.statusHistory.push({ status: negotiation.status, changedBy: req.user._id, note: `Dispute resolved (no status change): ${resolution?.trim()}` });
        }

        await negotiation.save();
        await logAudit({ actor: req.user, action: 'negotiation.dispute_resolved', resourceId: negotiation._id, note: resolution?.trim() });
        res.json({ success: true, data: negotiation });
    } catch (error) {
        console.error('❌ resolveDispute error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/admin/negotiations/disputed — admin queue of flagged negotiations
// ─────────────────────────────────────────────────────────────────────────
exports.getDisputedNegotiations = async (req, res) => {
    try {
        const negotiations = await Negotiation.find({ disputed: true })
            .populate('ride', 'start end date time fare')
            .populate('passenger', 'name email phone')
            .populate('driver', 'name email phone')
            .populate('disputeRaisedBy', 'name email')
            .sort({ disputeRaisedAt: -1 })
            .limit(100)
            .lean();

        res.json({ success: true, count: negotiations.length, data: negotiations });
    } catch (error) {
        console.error('❌ getDisputedNegotiations error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};