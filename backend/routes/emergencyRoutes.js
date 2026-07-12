// routes/emergencyRoutes.js


const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/emergencyController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/active', ctrl.getActiveEmergencies);
router.post('/:rideId/sos', ctrl.triggerSOS);
router.post('/:rideId/:emergencyEventId/acknowledge', ctrl.acknowledgeSOS);
router.post('/:rideId/:emergencyEventId/resolve', ctrl.resolveSOS);

module.exports = router;