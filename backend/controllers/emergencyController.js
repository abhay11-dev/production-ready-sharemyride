// controllers/emergencyController.js
//
// RIDE SAFETY PLATFORM — PHASE 4 (Emergency / SOS)

const emergencyService = require('../services/emergencyService');
const { LifecycleError } = require('../services/rideLifecycleService');

function handleError(res, error) {
  if (error instanceof LifecycleError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error('❌ emergency service error:', error);
  return res.status(500).json({ success: false, message: 'Server error' });
}

// POST /api/emergency/:rideId/sos
// Body: { lat?, lng? } — optional fresh client location
exports.triggerSOS = async (req, res) => {
  try {
    const { lat, lng } = req.body || {};
    const result = await emergencyService.triggerSOS(
      req.params.rideId,
      req.user,
      lat && lng ? { lat, lng } : null
    );
    res.status(201).json({ success: true, message: 'Emergency alert triggered', data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/emergency/:rideId/:emergencyEventId/acknowledge  (admin)
exports.acknowledgeSOS = async (req, res) => {
  try {
    const event = await emergencyService.acknowledgeSOS(req.params.emergencyEventId, req.user);
    res.json({ success: true, message: 'Acknowledged', data: event });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/emergency/:rideId/:emergencyEventId/resolve
// Body: { outcome: 'resolved' | 'false_alarm', notes? }
exports.resolveSOS = async (req, res) => {
  try {
    const actorRole = req.user.role === 'admin' ? 'admin' : 'driver_or_passenger';
    const event = await emergencyService.resolveSOS(
      req.params.rideId,
      req.params.emergencyEventId,
      req.user,
      actorRole,
      req.body?.outcome,
      req.body?.notes
    );
    res.json({ success: true, message: 'Emergency resolved', data: event });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/emergency/active  (admin dashboard feed)
exports.getActiveEmergencies = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const events = await emergencyService.getActiveEmergencies();
    res.json({ success: true, data: events });
  } catch (error) {
    handleError(res, error);
  }
};