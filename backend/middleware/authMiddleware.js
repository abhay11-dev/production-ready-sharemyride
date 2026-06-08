// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── protect: verify JWT ────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended. Please contact support.'
        });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// ─── requireVerifiedDriver: gate ride posting ────────────────────────────────
// Must be used AFTER protect middleware
const requireVerifiedDriver = async (req, res, next) => {
  const user = req.user;
  const status = user.driverVerification?.status;

  if (status === 'approved') {
    return next();
  }

  // Return specific codes so the frontend can route the user correctly
  const statusMap = {
    not_started: {
      code: 'VERIFICATION_NOT_STARTED',
      message: 'Please complete driver verification before posting a ride.',
      action: 'START_VERIFICATION'
    },
    pending: {
      code: 'VERIFICATION_INCOMPLETE',
      message: 'Your verification is incomplete. Please upload all required documents.',
      action: 'COMPLETE_VERIFICATION'
    },
    submitted: {
      code: 'VERIFICATION_UNDER_REVIEW',
      message: 'Your documents are under review. You will be notified once approved.',
      action: 'WAIT'
    },
    rejected: {
      code: 'VERIFICATION_REJECTED',
      message: `Your verification was rejected. Reason: ${user.driverVerification?.rejectionReason || 'See profile for details'}. Please re-submit.`,
      action: 'RESUBMIT'
    }
  };

  const response = statusMap[status] || statusMap['not_started'];

  return res.status(403).json({
    success: false,
    ...response,
    verificationStatus: status || 'not_started'
  });
};

// ─── requireAdmin ────────────────────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

module.exports = { protect, requireVerifiedDriver, requireAdmin };