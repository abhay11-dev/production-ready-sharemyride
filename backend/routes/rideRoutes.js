// routes/rideRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rideController');
const { protect, requireVerifiedDriver } = require('../middleware/authMiddleware');

// ── Public ─────────────────────────────────────────────────────────────────
router.get('/search', ctrl.searchRides);
router.get('/featured', ctrl.getFeaturedRides);

// ── Authenticated ──────────────────────────────────────────────────────────
router.use(protect);

router.get('/my', ctrl.getMyRides);
router.get('/:id', ctrl.getRideById);
router.get('/:id/bookings', ctrl.getRideBookings);
router.post('/:id/view', ctrl.incrementViewCount);
router.put('/:id', ctrl.updateRide);
router.patch('/:id/status', ctrl.updateRideStatus);
router.delete('/:id', ctrl.deleteRide);

// ── Verified drivers only ──────────────────────────────────────────────────
// requireVerifiedDriver returns 403 with action code if not approved
router.post('/', requireVerifiedDriver, ctrl.postRide);

module.exports = router;