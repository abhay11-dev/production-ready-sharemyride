// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isTestUser } = require('../utils/testBypass');

// ─── Protect ──────────────────────────────────────────────────────────────────
// Verifies the Bearer access token and attaches req.user.
// Also enforces account-level checks (active, not suspended, not locked).
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in.'
      });
    }

    // Verify signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }

    // Reject refresh tokens presented as access tokens
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }

    // Fetch user — exclude password and lockout fields (not needed here)
    const user = await User.findById(decoded.id).select('-password -failedLoginAttempts -lockoutUntil');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.'
      });
    }

    // Account-level guards
    if (!user.isActive || user.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Skip email verification check for test accounts
    if (!user.emailVerified && !isTestUser(user.email)) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email to access this resource.',
        requiresEmailVerification: true
      });
    }

    req.user = user;
    next();

  } catch (error) {
    // Never leak internal error details to client
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please log in again.'
    });
  }
};

// ─── Authorize ────────────────────────────────────────────────────────────────
// Usage: router.get('/admin-only', protect, authorize('admin'), handler)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.'
      });
    }

    next();
  };
};

// ─── Optional Auth ────────────────────────────────────────────────────────────
// Attaches req.user if a valid token is present, but does NOT fail the request.
// Use for routes that behave differently for authenticated vs anonymous users.
exports.optionalAuth = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type === 'access') {
        const user = await User.findById(decoded.id).select('-password -failedLoginAttempts -lockoutUntil');
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
  } catch {
    // Silently ignore — optional means we continue regardless
  }
  next();
};

// ─── Protect Admin ────────────────────────────────────────────────────────────
// Validates an isolated admin JWT (different secret, role embedded in payload).
exports.protectAdmin = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin' || decoded.id !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized as admin.' });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
};


exports.requireVerifiedDriver = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated.'
    });
  }

  // Test accounts bypass driver verification entirely
  if (isTestUser(req.user.email)) return next();

  const isApprovedDriver = req.user.isDriverVerified === true || req.user.driverVerification?.status === 'approved';

  if (!isApprovedDriver) {
    return res.status(403).json({
      success: false,
      message: 'Driver verification not approved.',
      actionCode: 'DRIVER_NOT_VERIFIED'
    });
  }

  next();
};

module.exports = {
  protect: exports.protect,
  authorize: exports.authorize,
  optionalAuth: exports.optionalAuth,
  protectAdmin: exports.protectAdmin,
  requireVerifiedDriver: exports.requireVerifiedDriver
};
