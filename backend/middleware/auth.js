// backend/middleware/auth.js (Corrected File)

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 1. Rename the main function to 'protect' and export it using 'exports.protect'
exports.protect = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No valid Authorization header');
            return res.status(401).json({ 
                success: false,
                message: 'No token provided. Authorization denied.' 
            });
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('🔑 Token received:', token.substring(0, 20) + '...');

        // Verify token
        // Ensure process.env.JWT_SECRET is loaded (e.g., via dotenv in server.js)
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        console.log('✅ Token verified for user:', decoded.id);
        
        // Find user
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            console.log('❌ User not found:', decoded.id);
            return res.status(401).json({ 
                success: false,
                message: 'User not found. Token invalid.' 
            });
        }

        console.log('✅ User authenticated:', user.email);

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('❌ Auth Middleware Error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token is invalid.' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token has expired. Please login again.' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Server error in authentication.' 
        });
    }
};

// 2. Add the 'authorize' function and export it
exports.authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        console.log(`❌ Authorization failed for role: ${req.user.role}. Required: ${roles.join(', ')}`);
        return res.status(403).json({
            success: false,
            message: `User role ${req.user.role || 'none'} is not authorized to access this route`
        });
    }
    console.log(`✅ User authorized: ${req.user.role}`);
    next();
};

// 3. Set module.exports to the exports object to ensure all are available
// This line is optional but ensures consistency if other modules rely on it
module.exports = exports;