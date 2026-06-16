require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const path = require('path');

const app = express();

const allowedOrigins = [
  'https://share-my-ride-git-main-abhays-projects-cdb9056e.vercel.app',
  'https://share-my-ride.vercel.app',
  'https://production-ready-sharemyride.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || 
        (origin.includes('share-my-ride') && origin.includes('vercel.app')) ||
        (origin.includes('sharemyride') && origin.includes('onrender.com'))) {
      return callback(null, true);
    }
    
    // Fallback for development or specific cases
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

console.log('🔐 JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES ✅' : 'NO ❌');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection with better error handling
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return;
  }

  console.log(
  "Mongo URI:",
  process.env.MONGO_URI?.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@")
  );

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    throw err;
  }
};

// Routes
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const receiptRoutes = require('./routes/receipts');
const ratingRoutes = require('./routes/ratingRoutes'); // ✅ NEW: Rating routes
const statsRoutes = require('./routes/statsRoutes');   // ✅ NEW: Stats routes
const driverVerificationRoutes = require('./routes/driverVerificationRoutes');
const adminRoutes = require('./routes/adminRoutes'); // ✅ NEW: Admin routes
const inquiryRoutes = require('./routes/inquiryRoutes'); // ✅ NEW: Inquiry/Support routes
const blogRoutes = require('./routes/blogRoutes'); // ✅ NEW: Blog routes

// Middleware to ensure DB connection before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// API Routes - these come BEFORE static file serving
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/ratings', ratingRoutes);  // ✅ NEW: Rating endpoints
app.use('/api/stats', statsRoutes);     // ✅ NEW: Stats endpoints
app.use('/api/driver-verification', driverVerificationRoutes);
app.use('/api/admin', adminRoutes);     // ✅ NEW: Admin endpoints
app.use('/api/inquiries', inquiryRoutes); // ✅ NEW: Inquiry/Support endpoints
app.use('/api/blogs', blogRoutes);       // ✅ NEW: Blog endpoints

app.get('/api', (req, res) => {
  res.json({ 
    message: 'API is working',
    status: 'ok'
  });
});

// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Root endpoint (for API info)
app.get('/api-info', (req, res) => {
  res.json({ 
    message: 'RideShare API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      rides: '/api/rides',
      users: '/api/users',
      bookings: '/api/bookings',
      payments: '/api/payments',
      payouts: '/api/payouts',
      webhooks: '/api/webhooks',
      receipts: '/api/receipts',
      ratings: '/api/ratings',  // ✅ NEW
      stats: '/api/stats',      // ✅ NEW
      driverVerification: '/api/driver-verification',
      admin: '/api/admin'       // ✅ NEW
    }
  });
});

// Catch-all handler for SPA - must be LAST
// This handles all non-API routes and serves index.html
app.use((req, res, next) => {
  // If request is for API and not found, send 404 JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      message: 'API route not found',
      requestedUrl: req.originalUrl,
      method: req.method
    });
  }
  
  // For all other routes, serve the React app
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'), (err) => {
    if (err) {
      res.status(500).json({ message: 'Error loading application' });
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : err.message
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${PORT}`;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Rating API: ${baseUrl}/api/ratings`);
    console.log(`📈 Stats API: ${baseUrl}/api/stats`);
    console.log(`🪪 Driver Verification API: ${baseUrl}/api/driver-verification`);
  });
} else {
  const PORT = process.env.PORT || 5000;
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${PORT}`;
  app.listen(PORT, () => {
    console.log(`🚀 Production server running on port ${PORT}`);
    console.log(`🌐 API Base URL: ${baseUrl}`);
  });
}

// Add these debug logs
console.log('=== ENVIRONMENT CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAZORPAY_KEY_ID from env:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET from env:', process.env.RAZORPAY_KEY_SECRET ? 'EXISTS' : 'MISSING');
console.log('========================\n');

// Test routes (if exists)
try {
  const testRoutes = require('./routes/testRoutes');
  app.use('/api/test', testRoutes);
} catch (err) {
  // Test routes not found, skip
}

module.exports = app;
