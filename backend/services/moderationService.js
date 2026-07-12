// services/moderationService.js


const ModerationFlag = require('../models/ModerationFlag');
const AuditLog = require('../models/AuditLogs');
const User = require('../models/User');
const { sendAdminNotificationEmail } = require('./emailService');
const { sendServerEmail } = require('./emailjsServerClient');

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

async function summarizeConversation({ messages, negotiations }) {
  const client = getClient();
  if (!client) {
    console.warn('⚠️ ANTHROPIC_API_KEY not set — cannot generate conversation summary');
    return null;
  }

  const transcript = messages
    .map(m => `${m.type === 'system' ? '[system]' : (m.sender?.name || 'user')}: ${m.text}`)
    .join('\n');

  const negotiationState = negotiations.map(n => ({
    source: n.source,
    preferenceKey: n.preferenceKey || null,
    status: n.status,
    terms: n.currentTerms,
  }));

  const systemPrompt = `You summarize a ride-share negotiation chat between a passenger and driver on an Indian carpooling marketplace. Respond with ONLY a JSON object, no other text, in exactly this shape:
{"agreedFare":number|null,"reservedSeats":number|null,"pickup":string|null,"drop":string|null,"partialRoute":string|null,"acceptedPreferences":[string],"rejectedPreferences":[string],"driverConditions":[string],"passengerConditions":[string],"specialAgreements":[string],"summary":"2-3 sentence plain-language recap"}
Use the negotiation records as the source of truth for status (accepted/rejected/pending); use the chat transcript to fill in anything the negotiation records don't cover, like conditions mentioned in free text.`;

  const userContent = `Negotiation records:\n${JSON.stringify(negotiationState, null, 2)}\n\nChat transcript:\n${transcript || '(no messages yet)'}`;

  try {
    const response = await client.messages.create({
      model: MODERATION_MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = response.content?.find(b => b.type === 'text')?.text?.trim() || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('❌ Conversation summary generation failed:', err.message);
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
    const adminSent = await notifyAdminForCriticalFlag(flag, conversation, senderId);
    flag.adminNotified = adminSent;
    await flag.save();
    if (adminSent) {
      console.log(`🚨 CRITICAL moderation flag ${flag._id} — admin notification email sent`);
    } else {
      console.warn(`🚨 CRITICAL moderation flag ${flag._id} — admin email notification was not sent`);
    }
  }
}

async function notifyAdminForCriticalFlag(flag, conversation, senderId) {
  const templateId = process.env.EMAILJS_TEMPLATE_ADMIN_ALERT || process.env.VITE_EMAILJS_TEMPLATE_ADMIN_ALERT;
  if (!templateId) {
    console.warn('⚠️ EMAILJS_TEMPLATE_ADMIN_ALERT / VITE_EMAILJS_TEMPLATE_ADMIN_ALERT not configured — cannot send critical moderation admin email');
    return false;
  }

  const sender = await User.findById(senderId).select('name email phone').lean();
  const senderName = sender?.name || 'Unknown user';
  const senderEmail = sender?.email || 'unknown@sharemyride.app';
  const senderPhone = sender?.phone || '';

  const emailResult = await sendAdminNotificationEmail({
    to: process.env.EMAIL_USER || process.env.EMAIL_CONTACT || 'sharemyride.contact@gmail.com',
    ticketNumber: flag._id.toString(),
    type: 'moderation_critical',
    priority: 'critical',
    name: senderName,
    email: senderEmail,
    subject: `Critical moderation alert in conversation ${conversation._id}`,
    message: flag.originalText || '(original text unavailable)',
    meta: {
      phone: senderPhone,
      affectedPage: `${process.env.FRONTEND_URL || 'https://sharemyride.in'}/messages/${conversation._id}`,
      severity: flag.severity,
    },
  });

  if (!emailResult?.success || !emailResult.emailAction?.payload) {
    console.warn('⚠️ Failed to build moderation admin email payload');
    return false;
  }

  try {
    await sendServerEmail(templateId, emailResult.emailAction.payload);
    return true;
  } catch (err) {
    console.error('❌ Failed to send moderation admin email:', err.message);
    return false;
  }
}

module.exports = {
  scanAndMask,
  scheduleAnalysis,
  summarizeConversation,
};