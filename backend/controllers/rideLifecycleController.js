// controllers/rideLifecycleController.js


const lifecycle = require('../services/rideLifecycleService');
const monitoring = require('../services/rideMonitoringService');

function handleError(res, error) {
  if (error instanceof lifecycle.LifecycleError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error('❌ ride lifecycle error:', error);
  return res.status(500).json({ success: false, message: 'Server error' });
}

// GET /api/ride-journey/:rideId
exports.getJourney = async (req, res) => {
  try {
    const journey = await lifecycle.getJourneyForUser(req.params.rideId, req.user._id);
    res.json({ success: true, data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/start
exports.startRide = async (req, res) => {
  try {
    const journey = await lifecycle.startRide(req.params.rideId, req.user);
    res.json({ success: true, message: 'Ride started', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/board
exports.passengerBoarded = async (req, res) => {
  try {
    const journey = await lifecycle.passengerBoarded(req.params.rideId, req.user);
    res.json({ success: true, message: 'Boarding confirmed', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/begin-active
exports.beginActiveLeg = async (req, res) => {
  try {
    const journey = await lifecycle.beginActiveLeg(req.params.rideId, req.user);
    res.json({ success: true, message: 'Ride is now active', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/destination-reached
exports.destinationReached = async (req, res) => {
  try {
    const journey = await lifecycle.destinationReached(req.params.rideId, req.user);
    res.json({ success: true, message: 'Destination reached', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/complete
exports.completeRide = async (req, res) => {
  try {
    const journey = await lifecycle.completeRide(req.params.rideId, req.user);
    res.json({ success: true, message: 'Ride completed', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/archive
exports.archiveJourney = async (req, res) => {
  try {
    const actorRole = req.user.role === 'admin' ? 'admin' : 'driver';
    const journey = await lifecycle.archiveJourney(req.params.rideId, req.user, actorRole);
    res.json({ success: true, message: 'Ride journey archived', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/cancel
exports.cancelJourney = async (req, res) => {
  try {
    const actorRole = req.user.role === 'admin' ? 'admin' : 'driver';
    const journey = await lifecycle.cancelJourney(
      req.params.rideId,
      req.user,
      actorRole,
      req.body?.reason
    );
    res.json({ success: true, message: 'Ride journey cancelled', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/safety-check/respond
// Body: { response: 'safe' | 'need_help' | 'contact_support' }
exports.respondToSafetyCheck = async (req, res) => {
  try {
    const journey = await monitoring.respondToCheckIn(req.params.rideId, req.user, req.body?.response);
    res.json({ success: true, message: 'Response recorded', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/ride-journey/:rideId/location/consent
// Body: { granted: boolean }
exports.setLocationConsent = async (req, res) => {
  try {
    const journey = await lifecycle.setLocationConsent(req.params.rideId, req.user, !!req.body?.granted);
    res.json({ success: true, message: 'Location sharing preference updated', data: journey });
  } catch (error) {
    handleError(res, error);
  }
};