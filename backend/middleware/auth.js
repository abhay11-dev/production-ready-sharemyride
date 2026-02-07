// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - Verify JWT token and attach user to request
 */
exports.protect = async (req, res, next) => {
  console.log('\n🔐 Auth middleware triggered');
  console.log('📍 Route:', req.method, req.originalUrl);
  
  try {
    let token;

    // Check for Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('✅ Token found:', token.substring(0, 20) + '...');
    }

    // No token found
    if (!token) {
      console.log('❌ No token in Authorization header');
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }

    // Verify token
    console.log('🔍 Verifying token with JWT_SECRET...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified. User ID from token:', decoded.id);

    // Get user from database (excluding password)
    console.log('🔍 Finding user in database...');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.log('❌ User not found in database:', decoded.id);
      return res.status(401).json({ 
        success: false,
        message: 'User not found - token invalid' 
      });
    }

    console.log('✅ User authenticated:', {
      id: user._id,
      email: user.email,
      name: user.name
    });

    // Attach user to request object
    req.user = user;
    
    console.log('✅ Auth middleware complete - proceeding to route handler\n');
    next();

  } catch (error) {
    console.error('❌ Auth Middleware Error:', {
      name: error.name,
      message: error.message
    });

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired - please login again' 
      });
    }

    // Generic error
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, token failed',
      error: error.message 
    });
  }
};

/**
 * Authorize specific roles
 * Usage: router.get('/admin', protect, authorize('admin'), handler)
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('🔒 Checking authorization for roles:', roles);
    
    if (!req.user) {
      console.log('❌ No user in request - auth middleware must run first');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`❌ Authorization denied. User role: ${req.user.role}, Required: ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    console.log(`✅ User authorized with role: ${req.user.role}`);
    next();
  };
};

/**
 * Optional middleware - Check if user is authenticated but don't fail if not
 * Useful for routes that work differently for authenticated vs non-authenticated users
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      console.log('✅ Optional auth: User authenticated:', req.user?.email);
    } else {
      console.log('ℹ️ Optional auth: No token provided - continuing without auth');
    }

    next();
  } catch (error) {
    console.log('ℹ️ Optional auth: Token invalid - continuing without auth');
    next();
  }
};

// Export all functions
module.exports = {
  protect: exports.protect,
  authorize: exports.authorize,
  optionalAuth: exports.optionalAuth
};