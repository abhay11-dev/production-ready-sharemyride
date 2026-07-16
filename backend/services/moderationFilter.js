// backend/services/moderationFilter.js
// Two-phase design driven by ModerationFlag's real schema:
//   1. evaluateText()      — synchronous mask pass (profanity + existing PII
//                             quick-scan), runs BEFORE a Message exists.
//   2. createFlagForMessage() — writes the actual ModerationFlag row AFTER
//                             the Message has been saved, since the schema's
//                             `message` field is a required ref to it.
//
// Negotiation proposal text (Negotiation.proposals[].message) never becomes
// a Message document, so it only ever goes through evaluateText() for
// masking — it is never eligible for a formal ModerationFlag row. That's a
// deliberate limitation, not an oversight: don't fake a `message` ref for it.

const ModerationFlag = require('../models/ModerationFlag');
const { scanAndMask } = require('./moderationService'); // existing PII quick-scan, reused as-is

// ── Rate limiting ──────────────────────────────────────────────────────
// In-memory window — fine for a single-instance deployment; swap for Redis
// if you scale horizontally. Only meaningful when a real conversationId
// exists (regular chat, and negotiation counters once a Conversation is
// linked); negotiation-initiate calls this with the rideId as a stand-in
// key so a passenger can't spam "initiate" across many rides either.
const sendTimestamps = new Map(); // "userId:key" -> [timestamps]
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20; // messages per user per key per minute

function checkRateLimit(userId, key) {
    const mapKey = `${userId}:${key}`;
    const now = Date.now();
    const timestamps = (sendTimestamps.get(mapKey) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    timestamps.push(now);
    sendTimestamps.set(mapKey, timestamps);
    return timestamps.length <= RATE_LIMIT_MAX;
}

setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of sendTimestamps.entries()) {
        const fresh = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
        if (fresh.length === 0) sendTimestamps.delete(key);
        else sendTimestamps.set(key, fresh);
    }
}, 5 * 60 * 1000);

// ── Profanity ───────────────────────────────────────────────────────────
// Kept short and generic on purpose — extend via env config in production,
// not hardcoded here. Case-insensitive whole-word match.
const PROFANITY_LIST = [
    'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'slut', 'whore',
];
const PROFANITY_REGEX = new RegExp(`\\b(${PROFANITY_LIST.join('|')})\\b`, 'gi');

function containsProfanity(text) {
    return PROFANITY_REGEX.test(text);
}

function maskProfanity(text) {
    return text.replace(PROFANITY_REGEX, (match) => '*'.repeat(match.length));
}

/**
 * Synchronous mask pass. Safe to call before any Message/Negotiation exists.
 *
 * @param {string} text
 * @returns {{
 *   text: string,               // fully masked, safe-to-store text
 *   originalText: string,       // untouched input, for audit/AI-analysis use
 *   profanityDetected: boolean,
 *   quickScanMatches: Array,    // from moderationService.scanAndMask
 * }}
 */
function evaluateText(text) {
    const profanityDetected = containsProfanity(text);
    const profanityMasked = profanityDetected ? maskProfanity(text) : text;

    // scanAndMask handles PII (phone/email/UPI/off-platform phrases) — same
    // function already used on the socket chat path, not duplicated logic.
    const { maskedText, quickScanMatches } = scanAndMask(profanityMasked);

    return {
        text: maskedText,
        originalText: text,
        profanityDetected,
        quickScanMatches: quickScanMatches || [],
    };
}

/**
 * Write the actual ModerationFlag row. Call ONLY after the underlying
 * Message has been saved — `messageId` must be a real Message _id, since
 * the schema requires it.
 *
 * No-ops (returns null) if nothing was actually caught, so normal messages
 * never generate empty flag rows.
 */
async function createFlagForMessage({ messageId, conversationId, senderId, evaluation }) {
    const { profanityDetected, quickScanMatches, originalText } = evaluation;
    if (!profanityDetected && (!quickScanMatches || quickScanMatches.length === 0)) {
        return null; // nothing to flag
    }

    const severity = quickScanMatches?.length ? 'medium' : 'low';

    try {
        return await ModerationFlag.create({
            message: messageId,
            conversation: conversationId,
            sender: senderId,
            quickScanMatches: (quickScanMatches || []).map((m) => (
                typeof m === 'string' ? { category: m } : m
            )),
            severity,
            originalText,
        });
    } catch (err) {
        console.warn('⚠️ ModerationFlag write failed (non-blocking):', err.message);
        return null;
    }
}

module.exports = {
    checkRateLimit,
    containsProfanity,
    maskProfanity,
    evaluateText,
    createFlagForMessage,
};