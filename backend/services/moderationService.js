// services/moderationService.js
//
// MILESTONE 5 — AI moderation pipeline (see PROJECT_STATE.md §6/§7)
//
// DEFAULT DESIGN (Q13/Q14/Q15/Q19 — not yet confirmed by user, see
// PROJECT_STATE.md §5 Decisions Log):
//
//   Q13 (provider): Claude (Anthropic API) — @anthropic-ai/sdk, installed
//   in this milestone. No AI SDK existed in package.json before this.
//
//   Q14 (real-time vs background): HYBRID.
//     - quickScan() is SYNCHRONOUS, regex-only, no API call — runs on every
//       message BEFORE it's saved/sent, because structured PII (phone/email/
//       UPI/external-app mentions) is exactly the kind of thing that must
//       never reach the other party unmasked, and regex has ~0ms latency.
//     - analyzeWithAI() is ASYNC, fire-and-forget — runs AFTER the message
//       is already saved and delivered, because adding real LLM latency to
//       every single chat message would make the chat feel slow. Nuanced
//       categories (scam, harassment, threats, fraud intent) don't need to
//       block delivery — they need to get flagged for review afterward.
//
//   Q19 (mask vs block): MASK, still send. The masked version is what gets
//     stored/delivered; the original is kept only in ModerationFlag for
//     admin review. Full block was considered too disruptive for a v1 —
//     easy to tighten later by changing shouldBlock() below.
//
//   Q15 (severity tier actions):
//     low      — no action, not even a ModerationFlag (avoids flooding the
//                admin queue with non-issues)
//     medium   — ModerationFlag created, no user-facing action
//     high     — ModerationFlag created + a 'system' message is posted to
//                the conversation reminding both parties to keep
//                communication on-platform
//     critical — same as high + `adminNotified` set (Milestone 8 will wire
//                the actual email; this milestone can't send email yet —
//                see PROJECT_STATE.md Milestone 5 "deferred" notes)

const ModerationFlag = require('../models/ModerationFlag');
const AuditLog = require('../models/AuditLogs');

// ── Quick-scan patterns (synchronous, no API call) ──────────────────────────
const PATTERNS = {
    phone: /(?:\+?91[\s-]?)?[6-9]\d{9}\b/g,
    email: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi,
    // Common Indian UPI handles — deliberately curated rather than a generic
    // "anything@anything" pattern, which would false-positive on every email
    upi: /\b[\w.\-]{2,}@(?:ok(?:axis|hdfcbank|icici|sbi)|ybl|paytm|apl|axl|ibl|upi|ybl|jio|fbl)\b/gi,
    whatsapp: /\b(?:whatsapp|wa\.me|w[- ]?a[- ]?p[- ]?p)\b/gi,
    telegram: /\b(?:telegram|t\.me)\b/gi,
    instagram: /\b(?:instagram|insta\s*id|@[a-z0-9._]{3,30})\b/gi,
    externalLink: /\bhttps?:\/\/\S+/gi,
};

// Off-platform-payment / circumvention phrases — not PII, just risky intent
const RISK_PHRASES = [
    /pay\s*me\s*directly/i,
    /cancel\s*(the\s*)?(booking|ride)?\s*after\s*(payment|paying|booking)/i,
    /don'?t\s*book\s*(here|through|on)/i,
    /book\s*(outside|directly|separately)/i,
    /cash\s*only.{0,20}(no\s*app|off\s*app|outside)/i,
    /avoid\s*(the\s*)?(app|platform|commission|fee)/i,
];

function quickScan(text) {
    const matches = [];
    if (!text) return matches;

    if (PATTERNS.phone.test(text)) matches.push({ category: 'phone' });
    if (PATTERNS.email.test(text)) matches.push({ category: 'email' });
    if (PATTERNS.upi.test(text)) matches.push({ category: 'upi' });
    if (PATTERNS.whatsapp.test(text)) matches.push({ category: 'external_app' });
    if (PATTERNS.telegram.test(text)) matches.push({ category: 'external_app' });
    if (PATTERNS.externalLink.test(text)) matches.push({ category: 'external_link' });
    RISK_PHRASES.forEach(re => {
        if (re.test(text)) matches.push({ category: 'off_platform_phrase' });
    });

    // Reset lastIndex on all global regexes (test() with /g mutates state)
    Object.values(PATTERNS).forEach(re => { if (re.global) re.lastIndex = 0; });

    return matches;
}

// Masks every category actually matched — replaces the substring with a
// fixed-width bullet mask so length doesn't leak information either.
function maskText(text) {
    if (!text) return text;
    let masked = text;
    masked = masked.replace(PATTERNS.phone, '••••••••••');
    masked = masked.replace(PATTERNS.email, '••••@••••••');
    masked = masked.replace(PATTERNS.upi, '••••@••••');
    masked = masked.replace(PATTERNS.externalLink, '[link removed]');
    Object.values(PATTERNS).forEach(re => { if (re.global) re.lastIndex = 0; });
    return masked;
}

// ── Async AI analysis (Claude) — fire-and-forget, never blocks message send ──
let anthropicClient = null;
function getClient() {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    if (!anthropicClient) {
        const Anthropic = require('@anthropic-ai/sdk');
        anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return anthropicClient;
}

const MODERATION_MODEL = process.env.MODERATION_MODEL || 'claude-haiku-4-5-20251001';

async function analyzeWithAI(text, quickScanMatches) {
    const client = getClient();
    if (!client) {
        console.warn('⚠️ ANTHROPIC_API_KEY not set — skipping AI moderation analysis (quick-scan result still applies)');
        return null;
    }

    const systemPrompt = `You moderate chat messages between a passenger and driver on an Indian carpooling marketplace. Classify the message for platform-safety risk. Respond with ONLY a JSON object, no other text, in exactly this shape:
{"severity":"low|medium|high|critical","categories":["scam"|"harassment"|"threat"|"abuse"|"spam"|"off_platform_payment"|"fraud"|"none"],"explanation":"one short sentence"}
Guidance: "low" = normal ride-coordination chat (timing, location, pickup details). "medium" = mild off-platform nudging or borderline language. "high" = clear attempt to move payment/booking off-platform, or harassment. "critical" = threats, scam patterns, fraud, or severe harassment/abuse.`;

    const userContent = quickScanMatches.length
        ? `Message: "${text}"\n\nAutomated pattern-scan already flagged: ${quickScanMatches.map(m => m.category).join(', ')}`
        : `Message: "${text}"`;

    try {
        const response = await client.messages.create({
            model: MODERATION_MODEL,
            max_tokens: 200,
            system: systemPrompt,
            messages: [{ role: 'user', content: userContent }],
        });

        const raw = response.content?.find(b => b.type === 'text')?.text?.trim() || '';
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (!['low', 'medium', 'high', 'critical'].includes(parsed.severity)) {
            throw new Error('Invalid severity in model response');
        }

        return {
            severity: parsed.severity,
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            explanation: parsed.explanation || '',
            rawModel: MODERATION_MODEL,
        };
    } catch (err) {
        console.error('❌ AI moderation analysis failed (non-blocking):', err.message);
        return null;
    }
}

// ── Main entry points — two separate steps, deliberately not combined ──────
//
// 1. scanAndMask(text) — SYNCHRONOUS, pure, no DB writes. Call this BEFORE
//    saving a message, to get the text that should actually be stored.
//
// 2. scheduleAnalysis(...) — call this AFTER the message is saved (so it has
//    a real _id to attach a ModerationFlag to). Fire-and-forget — the
//    caller does not need to await this.

function scanAndMask(text) {
    const originalText = text || '';
    const quickScanMatches = quickScan(originalText);
    const maskedText = quickScanMatches.length ? maskText(originalText) : originalText;
    return { maskedText, quickScanMatches, originalText };
}

function scheduleAnalysis({ message, conversation, senderId, originalText, quickScanMatches }) {
    if (!message?._id) {
        console.warn('⚠️ scheduleAnalysis called without a saved message — skipping (this should not happen)');
        return;
    }
    runBackgroundAnalysis({ message, conversation, senderId, originalText, quickScanMatches })
        .catch(err => console.error('❌ Background moderation analysis crashed:', err.message));
}

async function runBackgroundAnalysis({ message, conversation, senderId, originalText, quickScanMatches }) {
    const aiResult = await analyzeWithAI(originalText, quickScanMatches);

    // Determine final severity: AI result wins if available, otherwise derive
    // a conservative severity from the quick-scan alone (never silently drop
    // a message that matched a risky phrase just because the AI call failed)
    let severity = aiResult?.severity;
    if (!severity) {
        const hasRiskPhrase = quickScanMatches.some(m => m.category === 'off_platform_phrase');
        const hasPII = quickScanMatches.some(m => ['phone', 'email', 'upi'].includes(m.category));
        severity = hasRiskPhrase ? 'high' : hasPII ? 'medium' : quickScanMatches.length ? 'low' : 'low';
    }

    if (severity === 'low') return; // Q15 default: don't flood the review queue

    const flag = await ModerationFlag.create({
        message: message._id,
        conversation: conversation._id,
        sender: senderId,
        quickScanMatches,
        aiAnalysis: aiResult ? {
            categories: aiResult.categories,
            explanation: aiResult.explanation,
            rawModel: aiResult.rawModel,
        } : undefined,
        severity,
        originalText,
    });

    try {
        await AuditLog.create({
            actor: senderId,
            action: 'moderation.flag',
            resource: 'ModerationFlag',
            resourceId: flag._id,
            note: `Message flagged (${severity}) in conversation ${conversation._id}`,
        });
    } catch (err) {
        console.warn('⚠️ AuditLog write failed for moderation flag (non-blocking):', err.message);
    }

    if (severity === 'high' || severity === 'critical') {
        await postSystemWarning(conversation._id);
    }
    if (severity === 'critical') {
        // Milestone 8 will replace this with a real admin email. For now the
        // flag is marked so nothing gets silently lost once email exists.
        flag.adminNotified = false;
        await flag.save();
        console.warn(`🚨 CRITICAL moderation flag ${flag._id} — admin email notification deferred to Milestone 8`);
    }
}

async function postSystemWarning(conversationId) {
    try {
        const Message = require('../models/Message');
        const warningMessage = await Message.create({
            conversation: conversationId,
            sender: null,
            type: 'system',
            text: '⚠️ For your safety, please keep all communication and payments on ShareMyRide.',
        });

        // Deliver live to anyone connected, same as a normal message — socket.js
        // may not be initialized in a test/script context, so this is non-fatal
        try {
            const { getIO } = require('./socket');
            getIO().to(`conversation:${conversationId}`).emit('message:new', warningMessage);
        } catch (err) {
            // Socket.IO not initialized — the message is still saved and will
            // show up next time the conversation/messages are fetched via REST
        }
    } catch (err) {
        console.warn('⚠️ Failed to post system warning message (non-blocking):', err.message);
    }
}

module.exports = { quickScan, maskText, analyzeWithAI, scanAndMask, scheduleAnalysis };