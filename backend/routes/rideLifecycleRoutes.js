// routes/rideLifecycleRoutes.js


const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rideLifecycleController');
const trackingCtrl = require('../controllers/liveTrackingController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/:rideId', ctrl.getJourney);
router.post('/:rideId/start', ctrl.startRide);
router.post('/:rideId/board', ctrl.passengerBoarded);
router.post('/:rideId/begin-active', ctrl.beginActiveLeg);
router.post('/:rideId/destination-reached', ctrl.destinationReached);
router.post('/:rideId/complete', ctrl.completeRide);
router.post('/:rideId/archive', ctrl.archiveJourney);
router.post('/:rideId/cancel', ctrl.cancelJourney);

// Phase 2 — Live Location Tracking
router.post('/:rideId/location', trackingCtrl.reportLocation);
router.get('/:rideId/location/history', trackingCtrl.getLocationHistory);

// Phase 3 — Intelligent Safety Check-ins
router.post('/:rideId/safety-check/respond', ctrl.respondToSafetyCheck);

// Phase 5 — Privacy & Consent
router.post('/:rideId/location/consent', ctrl.setLocationConsent);

module.exports = router;