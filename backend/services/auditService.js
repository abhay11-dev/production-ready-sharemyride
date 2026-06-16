const AuditLog = require('../models/AuditLogs');
const mongoose = require('mongoose');

/**
 * Log a system, user, or admin action to the AuditLog collection.
 * 
 * @param {Object} params
 * @param {Object|String} params.actor - User document, req.user, or admin payload. Can also be a string "admin" or "system".
 * @param {String} params.action - The action code (e.g. 'user.suspend', 'inquiry.reply')
 * @param {String} params.resource - Resource name (e.g. 'User', 'Inquiry', 'BlogPost')
 * @param {String|mongoose.Types.ObjectId} params.resourceId - ID of the target resource
 * @param {String} params.resourceRef - Human-readable reference (e.g. email, ticketId, slug)
 * @param {Object} params.changes - { before: Object, after: Object }
 * @param {String} params.note - Optional descriptive message
 * @param {Object} params.req - Express Request object to extract IP and User-Agent
 */
const logAction = async ({
    actor,
    action,
    resource,
    resourceId,
    resourceRef,
    changes,
    note,
    req
}) => {
    try {
        let actorId = null;
        let actorEmail = 'system@sharemyride.com';
        let actorRole = 'system';

        if (actor) {
            if (typeof actor === 'object') {
                // Check if it's a User model or req.user
                if (actor._id && mongoose.Types.ObjectId.isValid(actor._id)) {
                    actorId = actor._id;
                    actorEmail = actor.email || actorEmail;
                    actorRole = actor.role || 'user';
                } else if (actor.id === 'admin') {
                    // It's the admin payload from req.admin
                    actorEmail = process.env.ADMIN_USERNAME || 'admin@sharemyride.com';
                    actorRole = 'admin';
                }
            } else if (typeof actor === 'string') {
                if (actor === 'admin') {
                    actorEmail = process.env.ADMIN_USERNAME || 'admin@sharemyride.com';
                    actorRole = 'admin';
                } else {
                    actorEmail = actor;
                }
            }
        }

        let ipAddress = '127.0.0.1';
        let userAgent = 'Unknown';

        if (req) {
            ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || ipAddress;
            userAgent = req.headers['user-agent'] || userAgent;
        }

        // Clean up IP address format
        if (ipAddress.startsWith('::ffff:')) {
            ipAddress = ipAddress.substring(7);
        }

        const logEntry = new AuditLog({
            actor: actorId,
            actorEmail,
            actorRole,
            action,
            resource,
            resourceId: mongoose.Types.ObjectId.isValid(resourceId) ? resourceId : null,
            resourceRef,
            changes,
            note,
            ipAddress,
            userAgent
        });

        await logEntry.save();
        console.log(`📋 [AuditLog] Recorded action: ${action} by ${actorEmail} on ${resource}`);
        return logEntry;
    } catch (error) {
        console.error('❌ [AuditLog] Failed to write audit log:', error.message);
    }
};

module.exports = {
    logAction
};
