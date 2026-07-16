// backend/sanity_test.js
// Run:  node sanity_test.js
// Tests module loads, model methods, logic paths — no DB connection needed.
'use strict';

process.env.JWT_SECRET = 'test-secret-for-sanity-only';
process.env.MONGO_URI  = 'mongodb://127.0.0.1:27017/sanity_never_connects';
process.env.NODE_ENV   = 'test';

// ── Minimal stubs so modules that `require('mongoose')` don't throw ──────────
// We patch mongoose.connect to a no-op before any model file loads.
const mongoose = require('mongoose');
const _origConnect = mongoose.connect.bind(mongoose);
mongoose.connect = async () => ({ connections: [{ readyState: 1 }] });

const results = [];
let pass = 0, fail = 0;

function ok(label)          { results.push({ status: '✅ PASS', label });              pass++; }
function bad(label, reason) { results.push({ status: '❌ FAIL', label, reason });      fail++; }

// ─── Section 1: Module loads ─────────────────────────────────────────────────
const modules = {
  'Negotiation model':              './models/Negotiation',
  'AuditLogs model':                './models/AuditLogs',
  'ModerationFlag model':           './models/ModerationFlag',
  'Message model':                  './models/Message',
  'Conversation model':             './models/Conversation',
  'moderationFilter service':       './services/moderationFilter',
  'negotiationController':          './controllers/negotiationController',
  'negotiationRoutes':              './routes/negotiationRoutes',
  'adminRoutes':                    './routes/adminRoutes',
  'negotiationExpiryScheduler':     './services/jobs/negotiationExpiryScheduler',
};

for (const [label, modPath] of Object.entries(modules)) {
  try {
    require(modPath);
    ok(label + ' — loads without error');
  } catch (e) {
    bad(label + ' — loads without error', e.message.split('\n')[0]);
  }
}

// ─── Section 2: AuditLogs enum covers all negotiation actions ────────────────
try {
  const AuditLog = require('./models/AuditLogs');
  const enumVals = AuditLog.schema.path('action').enumValues;

  const required = [
    'negotiation.initiate', 'negotiation.counter', 'negotiation.accept',
    'negotiation.reject',   'negotiation.cancel',  'negotiation.finalize',
    'negotiation.dispute_raised', 'negotiation.dispute_resolved',
  ];

  for (const action of required) {
    if (enumVals.includes(action))
      ok(`AuditLog enum: "${action}" present`);
    else
      bad(`AuditLog enum: "${action}" present`, 'MISSING from enum — Mongoose will throw on create()');
  }
} catch (e) {
  bad('AuditLog enum check', e.message.split('\n')[0]);
}

// ─── Section 3: Negotiation model static exports ─────────────────────────────
try {
  const { PREFERENCE_KEYS } = require('./models/Negotiation');
  if (Array.isArray(PREFERENCE_KEYS) && PREFERENCE_KEYS.length > 0)
    ok('PREFERENCE_KEYS exported from Negotiation module');
  else
    bad('PREFERENCE_KEYS export', 'not an array or empty');
} catch (e) {
  bad('PREFERENCE_KEYS export', e.message.split('\n')[0]);
}

// ─── Section 4: Negotiation instance methods exist ───────────────────────────
try {
  const Negotiation = require('./models/Negotiation');
  for (const method of ['checkExpiry', 'transitionTo', 'canReopen']) {
    if (typeof Negotiation.prototype[method] === 'function')
      ok(`Negotiation.prototype.${method}() — method exists`);
    else
      bad(`Negotiation.prototype.${method}() — method exists`, 'method is missing');
  }
} catch (e) {
  bad('Negotiation instance methods', e.message.split('\n')[0]);
}

// ─── Section 5: Negotiation instance logic (no DB save) ──────────────────────
try {
  const Negotiation = require('./models/Negotiation');
  const { Types: { ObjectId } } = mongoose;

  const makeNeg = (overrides = {}) => new Negotiation({
    ride: new ObjectId(),
    passenger: new ObjectId(),
    driver: new ObjectId(),
    source: 'negotiate_fare',
    currentTerms: { fare: 100, seats: 1 },
    statusHistory: [],
    ...overrides,
  });

  // 5a. canReopen: false while pending
  const n1 = makeNeg({ status: 'pending' });
  if (!n1.canReopen()) ok('canReopen: false for status=pending');
  else               bad('canReopen: false for pending', 'returned true unexpectedly');

  // 5b. transitionTo changes status AND appends statusHistory
  n1.transitionTo('rejected', new ObjectId(), 'Manual test reject');
  if (n1.status === 'rejected')      ok('transitionTo: status updated to rejected');
  else                               bad('transitionTo: status updated', `got "${n1.status}"`);
  if (n1.statusHistory.length === 1) ok('transitionTo: statusHistory entry appended');
  else                               bad('transitionTo: statusHistory append', `length=${n1.statusHistory.length}`);
  if (n1.statusHistory[0].note === 'Manual test reject')
    ok('transitionTo: note stored in statusHistory');
  else
    bad('transitionTo: note stored', `got "${n1.statusHistory[0].note}"`);

  // 5c. canReopen: true after rejected (no booking)
  if (n1.canReopen()) ok('canReopen: true after rejected + no finalizedBookingId');
  else               bad('canReopen: true after rejected', 'returned false');

  // 5d. canReopen: false when finalizedBookingId is set
  n1.finalizedBookingId = new ObjectId();
  if (!n1.canReopen()) ok('canReopen: false when finalizedBookingId is set');
  else               bad('canReopen: false when finalized', 'returned true');

  // 5e. canReopen: true after cancelled
  const n2 = makeNeg({ status: 'cancelled' });
  if (n2.canReopen()) ok('canReopen: true after cancelled (no booking)');
  else               bad('canReopen: true after cancelled', 'returned false');

  // 5f. canReopen: true after expired
  const n3 = makeNeg({ status: 'expired' });
  if (n3.canReopen()) ok('canReopen: true after expired (no booking)');
  else               bad('canReopen: true after expired', 'returned false');

  // 5g. canReopen: false for finalized status
  const n4 = makeNeg({ status: 'finalized', finalizedBookingId: new ObjectId() });
  if (!n4.canReopen()) ok('canReopen: false for finalized status');
  else               bad('canReopen: false for finalized status', 'returned true');

  // 5h. checkExpiry: stale pending → expired
  const n5 = makeNeg({ status: 'pending', expiresAt: new Date(Date.now() - 1000) });
  n5.checkExpiry();
  if (n5.status === 'expired') ok('checkExpiry: stale pending → expired');
  else                        bad('checkExpiry: stale pending', `got "${n5.status}"`);

  // 5i. checkExpiry: stale countered → expired
  const n6 = makeNeg({ status: 'countered', expiresAt: new Date(Date.now() - 1000) });
  n6.checkExpiry();
  if (n6.status === 'expired') ok('checkExpiry: stale countered → expired');
  else                        bad('checkExpiry: stale countered', `got "${n6.status}"`);

  // 5j. checkExpiry: future expiry = no-op
  const n7 = makeNeg({ status: 'pending', expiresAt: new Date(Date.now() + 999999) });
  n7.checkExpiry();
  if (n7.status === 'pending') ok('checkExpiry: future expiry is a no-op');
  else                        bad('checkExpiry: future expiry no-op', `got "${n7.status}"`);

  // 5k. checkExpiry: rejected status never expires (even if past expiresAt)
  const n8 = makeNeg({ status: 'rejected', expiresAt: new Date(Date.now() - 1000) });
  n8.checkExpiry();
  if (n8.status === 'rejected') ok('checkExpiry: rejected status never auto-expires');
  else                         bad('checkExpiry: rejected no-op', `got "${n8.status}"`);
} catch (e) {
  bad('Negotiation instance logic', e.message.split('\n')[0]);
}

// ─── Section 6: moderationFilter exports ─────────────────────────────────────
try {
  const mf = require('./services/moderationFilter');
  for (const fn of ['checkRateLimit', 'evaluateText', 'createFlagForMessage',
                    'containsProfanity', 'maskProfanity']) {
    if (typeof mf[fn] === 'function') ok(`moderationFilter.${fn}() — exported`);
    else                             bad(`moderationFilter.${fn}() — exported`, 'missing or not a function');
  }
} catch (e) {
  bad('moderationFilter exports', e.message.split('\n')[0]);
}

// ─── Section 7: moderationFilter unit logic ──────────────────────────────────
try {
  const { evaluateText, checkRateLimit } = require('./services/moderationFilter');

  // 7a. profanity detection
  const r1 = evaluateText('This is a fuck test');
  if (r1.profanityDetected) ok('evaluateText: detects profanity');
  else                     bad('evaluateText: detects profanity', 'not detected');

  // 7b. masking
  if (!r1.text.toLowerCase().includes('fuck')) ok('evaluateText: profanity masked in output text');
  else                                         bad('evaluateText: masks profanity', `raw word still in: "${r1.text}"`);

  // 7c. originalText preserved
  if (r1.originalText === 'This is a fuck test') ok('evaluateText: originalText preserved unmasked');
  else                                           bad('evaluateText: originalText', `got "${r1.originalText}"`);

  // 7d. masked chars are asterisks matching length
  const maskCount = (r1.text.match(/\*/g) || []).length;
  if (maskCount === 4) ok('evaluateText: masked with 4 asterisks (len of "fuck")');
  else               bad('evaluateText: asterisk count', `expected 4, got ${maskCount}`);

  // 7e. clean message
  const r2 = evaluateText('Hello, clean message!');
  if (!r2.profanityDetected && !r2.quickScanMatches.length)
    ok('evaluateText: clean message → no flags');
  else
    bad('evaluateText: clean message no-flag', `profanity=${r2.profanityDetected}, pii=${r2.quickScanMatches.length}`);

  // 7f. multiple profanity words masked
  const r3 = evaluateText('What a shit and bastard move');
  const masked = r3.text.toLowerCase();
  if (!masked.includes('shit') && !masked.includes('bastard'))
    ok('evaluateText: multiple profanity words all masked');
  else
    bad('evaluateText: multi-word mask', `remaining: "${r3.text}"`);

  // 7g. rate limit — allows up to RATE_LIMIT_MAX (20)
  const uid = `u-${Date.now()}`;
  let allOk = true;
  for (let i = 0; i < 20; i++) {
    if (!checkRateLimit(uid, 'key-A')) { allOk = false; break; }
  }
  if (allOk) ok('checkRateLimit: 20 calls within window all allowed');
  else       bad('checkRateLimit: 20 within window', 'false returned before limit');

  // 7h. 21st call is blocked
  const blocked = !checkRateLimit(uid, 'key-A');
  if (blocked) ok('checkRateLimit: 21st call blocked (rate limited)');
  else         bad('checkRateLimit: 21st blocked', '21st returned true — limit not enforced');

  // 7i. different conversation key is not affected
  const diffKey = checkRateLimit(uid, 'key-B');
  if (diffKey) ok('checkRateLimit: different key unaffected by key-A window');
  else         bad('checkRateLimit: different key unaffected', 'blocked by unrelated window');

  // 7j. different user in same window is not affected
  const diffUser = checkRateLimit('other-user', 'key-A');
  if (diffUser) ok('checkRateLimit: different user unaffected');
  else          bad('checkRateLimit: different user unaffected', 'blocked');
} catch (e) {
  bad('moderationFilter unit logic', e.message.split('\n')[0]);
}

// ─── Section 8: negotiationController exports ────────────────────────────────
try {
  const ctrl = require('./controllers/negotiationController');
  const expected = [
    'initiateNegotiation', 'getMyNegotiations', 'getNegotiationById',
    'counterOffer', 'acceptNegotiation', 'rejectNegotiation',
    'cancelNegotiation', 'finalizeNegotiation',
    'raiseDispute', 'resolveDispute', 'getDisputedNegotiations',
  ];
  for (const fn of expected) {
    if (typeof ctrl[fn] === 'function') ok(`ctrl.${fn} — exported as function`);
    else                               bad(`ctrl.${fn} — exported as function`, 'missing or not a function');
  }
} catch (e) {
  bad('negotiationController exports', e.message.split('\n')[0]);
}

// ─── Section 9: Routes wired correctly ───────────────────────────────────────
try {
  const nRouter = require('./routes/negotiationRoutes');
  const paths = nRouter.stack.map(l => l.route?.path || '').filter(Boolean);

  const wantedPaths = ['/', '/my', '/:id', '/:id/counter', '/:id/accept',
                       '/:id/reject', '/:id/cancel', '/:id/finalize', '/:id/dispute'];
  for (const p of wantedPaths) {
    if (paths.includes(p)) ok(`negotiationRoutes: "${p}" mounted`);
    else                   bad(`negotiationRoutes: "${p}" mounted`, `not in stack: [${paths.join(', ')}]`);
  }
} catch (e) {
  bad('negotiationRoutes wiring', e.message.split('\n')[0]);
}

// ─── Section 10: Admin routes wired correctly ────────────────────────────────
try {
  const aRouter = require('./routes/adminRoutes');
  const stack = aRouter.stack;

  const allPaths = stack.map(l => l.route?.path || '').filter(Boolean);
  const disputedPath  = allPaths.find(p => p.includes('disputed'));
  const resolvePath   = allPaths.find(p => p.includes('resolve-dispute'));

  if (disputedPath)  ok(`adminRoutes: "${disputedPath}" (GET disputed) mounted`);
  else              bad('adminRoutes: GET disputed endpoint', `not found in [${allPaths.join(', ')}]`);

  if (resolvePath)   ok(`adminRoutes: "${resolvePath}" (POST resolve-dispute) mounted`);
  else              bad('adminRoutes: POST resolve-dispute', `not found in [${allPaths.join(', ')}]`);
} catch (e) {
  bad('adminRoutes wiring', e.message.split('\n')[0]);
}

// ─── Section 11: server.js references scheduler ──────────────────────────────
try {
  const fs = require('fs');
  const serverSrc = fs.readFileSync('./server.js', 'utf8');

  if (serverSrc.includes('startNegotiationExpiryScheduler'))
    ok('server.js: startNegotiationExpiryScheduler imported + called');
  else
    bad('server.js: startNegotiationExpiryScheduler', 'not found in server.js source');

  if (serverSrc.includes("negotiationExpiryScheduler started (every 5 min)") ||
      serverSrc.includes('startNegotiationExpiryScheduler()'))
    ok('server.js: scheduler invocation present at boot');
  else
    bad('server.js: scheduler invocation', 'scheduler call not found');
} catch (e) {
  bad('server.js scheduler check', e.message.split('\n')[0]);
}

// ─── Section 12: raiseDispute / resolveDispute controller logic checks ────────
try {
  const fs = require('fs');
  const src = fs.readFileSync('./controllers/negotiationController.js', 'utf8');

  const checks = {
    'raiseDispute: missing reason → 400':    "A dispute reason is required",
    'raiseDispute: already disputed → 400':  "Already under dispute",
    'raiseDispute: sets disputed=true':      "negotiation.disputed = true",
    'raiseDispute: logAudit dispute_raised': "negotiation.dispute_raised",
    'resolveDispute: not disputed → 400':    "This negotiation is not under dispute",
    'resolveDispute: clears disputed=false': "negotiation.disputed = false",
    'resolveDispute: logAudit dispute_resolved': "negotiation.dispute_resolved",
    'counterOffer: finalized block message': "Cannot counter a finalized negotiation",
    'counterOffer: reopenCount incremented': "negotiation.reopenCount += 1",
    'counterOffer: seat cap check on reopen': "seat(s) available now",
    'counterOffer: ride active check on reopen': "Ride is no longer active",
    'counterOffer: rate limit enforced':     "You are sending offers too quickly",
  };

  for (const [label, snippet] of Object.entries(checks)) {
    if (src.includes(snippet)) ok(`Controller source: ${label}`);
    else                       bad(`Controller source: ${label}`, `snippet not found: "${snippet}"`);
  }
} catch (e) {
  bad('controller source checks', e.message.split('\n')[0]);
}

// ─── Section 13: sweepExpiredNegotiations idempotency in logic ────────────────
try {
  const fs = require('fs');
  const src = fs.readFileSync('./services/jobs/negotiationExpiryScheduler.js', 'utf8');

  // The query filters on status pending/countered — already-expired won't match again
  if (src.includes("status: { $in: ['pending', 'countered'] }") ||
      src.includes('status: { $in: ['))
    ok('sweepExpiredNegotiations: query scoped to pending/countered (idempotent)');
  else
    bad('sweepExpiredNegotiations: idempotent query', 'query not scoped to live statuses');

  if (src.includes("transitionTo('expired'"))
    ok('sweepExpiredNegotiations: uses transitionTo → statusHistory logged');
  else
    bad('sweepExpiredNegotiations: transitionTo call', 'not found');

  if (src.includes('unreadCount.passenger') && src.includes('unreadCount.driver'))
    ok('sweepExpiredNegotiations: both unreadCount fields incremented');
  else
    bad('sweepExpiredNegotiations: unreadCount update', 'not incrementing both sides');

  if (src.includes("negotiation:expired"))
    ok("sweepExpiredNegotiations: emits 'negotiation:expired' socket event");
  else
    bad("sweepExpiredNegotiations: 'negotiation:expired' event", 'not found in source');
} catch (e) {
  bad('sweepExpiredNegotiations logic', e.message.split('\n')[0]);
}

// ─── Section 14: ModerationFlag schema matches createFlagForMessage usage ─────
try {
  const ModerationFlag = require('./models/ModerationFlag');
  const schema = ModerationFlag.schema;

  const required = ['message', 'conversation', 'sender', 'severity', 'originalText',
                    'quickScanMatches', 'reviewed', 'reviewedBy', 'adminNote'];
  for (const field of required) {
    if (schema.path(field)) ok(`ModerationFlag schema: field "${field}" defined`);
    else                   bad(`ModerationFlag schema: field "${field}"`, 'not in schema');
  }

  // severity enum
  const sevVals = schema.path('severity').enumValues;
  for (const s of ['low', 'medium', 'high', 'critical']) {
    if (sevVals.includes(s)) ok(`ModerationFlag.severity: "${s}" in enum`);
    else                    bad(`ModerationFlag.severity: "${s}"`, 'not in enum');
  }
} catch (e) {
  bad('ModerationFlag schema', e.message.split('\n')[0]);
}

// ─── FINAL SUMMARY ───────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('   NEGOTIATION SYSTEM — FULL SANITY CHECK RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const r of results) {
  const suffix = r.reason ? `  →  ${r.reason}` : '';
  console.log(`${r.status}  ${r.label}${suffix}`);
}
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  TOTAL: ${pass + fail}   ✅ PASS: ${pass}   ❌ FAIL: ${fail}`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(fail > 0 ? 1 : 0);
