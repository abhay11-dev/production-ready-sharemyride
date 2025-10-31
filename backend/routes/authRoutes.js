// backend/routes/authRoutes.js (Final Corrected Code)
const express = require('express');
const router = express.Router();



// Destructure the controller functions
const { signup, login, getProfile } = require('../controllers/authController');

// 🛑 FIX: Import 'protect' using destructuring, as it's the function you need.
// We assume '../middleware/auth' exports { protect, authorize }
const { protect } = require('../middleware/auth'); 

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile
// ✅ Use 'protect' (which is now the function) as the middleware
router.get('/profile', protect, getProfile); 

module.exports = router;