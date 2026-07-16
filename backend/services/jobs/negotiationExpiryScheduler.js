// backend/services/jobs/negotiationExpiryScheduler.js
// Cron: proactively expires stale pending/countered negotiations rather than
// relying only on the lazy checkExpiry() on read paths — so a negotiation
// nobody reopens the thread on still gets closed out and notified.

const cron = require('node-cron');
const Negotiation = require('../../models/Negotiation');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');

async function sweepExpiredNegotiations() {
    try {
        const stale = await Negotiation.find({
            status: { $in: ['pending', 'countered'] },
            expiresAt: { $lt: new Date() },
            isActive: true,
        });

        if (!stale.length) return;

        const { getIO, emitToUser } = require('../socket');

        for (const negotiation of stale) {
            negotiation.transitionTo('expired', null, 'Auto-expired by scheduler (24h window elapsed)');
            await negotiation.save();

            try {
                const conversation = await Conversation.findOne({ negotiationId: negotiation._id });
                if (conversation) {
                    const sysMsg = await Message.create({
                        conversation: conversation._id,
                        type: 'system',
                        text: 'This negotiation expired after 24 hours with no resolution. You can start a new offer to reopen it.',
                    });
                    conversation.lastMessage = { text: sysMsg.text, sender: null, sentAt: sysMsg.createdAt };
                    conversation.unreadCount.passenger += 1;
                    conversation.unreadCount.driver += 1;
                    await conversation.save();

                    try {
                        getIO().to(`conversation:${conversation._id}`).emit('message:new', sysMsg);
                        emitToUser(negotiation.passenger, 'negotiation:expired', { negotiationId: negotiation._id, conversationId: conversation._id });
                        emitToUser(negotiation.driver, 'negotiation:expired', { negotiationId: negotiation._id, conversationId: conversation._id });
                    } catch {
                        // Socket.IO not initialized (e.g. tests) — non-fatal
                    }
                }
            } catch (convErr) {
                console.warn('⚠️ Expiry system message failed (non-blocking):', convErr.message);
            }
        }

        console.log(`⏰ negotiationExpiryScheduler: expired ${stale.length} negotiation(s)`);
    } catch (err) {
        console.error('❌ negotiationExpiryScheduler error:', err.message);
    }
}

function startNegotiationExpiryScheduler() {
    // Every 5 minutes — frequent enough that a 24h window doesn't overshoot
    // by more than a few minutes, cheap enough not to matter at this scale.
    cron.schedule('*/5 * * * *', sweepExpiredNegotiations);
    console.log('⏰ negotiationExpiryScheduler started (every 5 min)');
}

module.exports = { startNegotiationExpiryScheduler, sweepExpiredNegotiations };