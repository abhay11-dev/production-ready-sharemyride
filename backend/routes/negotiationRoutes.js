// routes/negotiationRoutes.js
//
// MILESTONE 3 — mounted at /api/negotiations (see server.js)
//
// Auth middleware decision (Q21, PROJECT_STATE.md §5): using `protect` from
// `../middleware/auth` — the middleware used by every other route file
// EXCEPT rideRoutes.js (which uses the stricter `authMiddleware.js`). Chose
// the majority convention for consistency/lower risk rather than the
// stricter one, since introducing a second inconsistency wasn't worth it
// for a brand-new route file. Flagged in PROJECT_STATE.md as a decision,
// not silently made.
//
// MILESTONE 9 — added POST /:id/dispute (either party flags a negotiation
// for admin review). Resolution of a dispute is an ADMIN action and lives
// in adminRoutes.js (protectAdmin), not here — this route only lets a
// passenger/driver raise one.

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/negotiationController');
const { protect } = require('../middleware/auth');

// All negotiation endpoints require authentication
router.use(protect);

router.post('/', ctrl.initiateNegotiation);
router.get('/my', ctrl.getMyNegotiations);
router.get('/:id', ctrl.getNegotiationById);
router.post('/:id/counter', ctrl.counterOffer);
router.post('/:id/accept', ctrl.acceptNegotiation);
router.post('/:id/reject', ctrl.rejectNegotiation);
router.post('/:id/cancel', ctrl.cancelNegotiation);
router.post('/:id/finalize', ctrl.finalizeNegotiation);
router.post('/:id/dispute', ctrl.raiseDispute);

module.exports = router;