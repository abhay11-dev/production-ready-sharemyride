// controllers/liveTrackingController.js


const tracking = require('../services/liveTrackingService');
const { LifecycleError } = require('../services/rideLifecycleService');

function handleError(res, error) {
  if (error instanceof LifecycleError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error('❌ live tracking error:', error);
  return res.status(500).json({ success: false, message: 'Server error' });
}

// POST /api/ride-journey/:rideId/location
// Body: { points: [{ lat, lng, speed?, heading?, accuracy?, battery?, at? }] }
// Accepts a batch so a device that buffered points while offline can flush
// them all in one request (see services/liveTrackingService.js).
exports.reportLocation = async (req, res) => {
  try {
    const points = Array.isArray(req.body?.points) ? req.body.points : [req.body];
    const result = await tracking.ingestLocation(req.params.rideId, req.user, points);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/ride-journey/:rideId/location/history?role=driver&limit=500
exports.getLocationHistory = async (req, res) => {
  try {
    const { role, limit } = req.query;
    const pings = await tracking.getLocationHistory(req.params.rideId, req.user, { role, limit }, req);
    res.json({ success: true, data: pings });
  } catch (error) {
    handleError(res, error);
  }
};