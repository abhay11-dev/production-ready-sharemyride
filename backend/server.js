require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http'); // ✅ Milestone 4 — needed to attach Socket.IO
const { initSocket } = require('./services/socket'); // ✅ Milestone 4 — chat websocket

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
app.use(cookieParser()); // ← Required to read HttpOnly refresh-token cookie

// Razorpay checkout does not require a custom Permissions-Policy header here.
// Removing unsupported policy features eliminates the browser warning.

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
const ratingRoutes = require('./routes/ratingRoutes');
const statsRoutes = require('./routes/statsRoutes');
const driverVerificationRoutes = require('./routes/driverVerificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const blogRoutes = require('./routes/blogRoutes');
const locationRoutes = require('./routes/locationRoutes');
const negotiationRoutes = require('./routes/negotiationRoutes'); // Milestone 3
const chatRoutes = require('./routes/chatRoutes'); // Milestone 4
const moderationRoutes = require('./routes/moderationRoutes'); // Milestone 5
const rideLifecycleRoutes = require('./routes/rideLifecycleRoutes'); // Ride Safety Platform — Phase 1
const emergencyRoutes = require('./routes/emergencyRoutes'); // Ride Safety Platform — Phase 4
const trustedContactsRoutes = require('./routes/trustedContactsRoutes'); // Ride Safety Platform — Phase 5
const { startRideDataRetentionScheduler } = require('./services/jobs/rideDataRetentionScheduler'); // Ride Safety Platform — Phase 5

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
app.use('/api/ratings', ratingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/driver-verification', driverVerificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/negotiations', negotiationRoutes); // Milestone 3
app.use('/api/chat', chatRoutes); // Milestone 4
app.use('/api/moderation', moderationRoutes); // Milestone 5
app.use('/api/ride-journey', rideLifecycleRoutes); // Ride Safety Platform — Phase 1
app.use('/api/emergency', emergencyRoutes); // Ride Safety Platform — Phase 4
app.use('/api/trusted-contacts', trustedContactsRoutes); // Ride Safety Platform — Phase 5
app.use('/api/location', locationRoutes);

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
      ratings: '/api/ratings',
      stats: '/api/stats',
      driverVerification: '/api/driver-verification',
      admin: '/api/admin',
      negotiations: '/api/negotiations',
      chat: '/api/chat',
      moderation: '/api/moderation',
      location: '/api/location'
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

// Create an http.Server so Socket.IO can attach to it. Express's app.listen()
// internally does exactly this, but doesn't expose the server instance — we
// need it directly for chat's websocket layer.
const server = http.createServer(app);
initSocket(server);

// Ride Safety Platform — Phase 5: periodic auto-archive + data minimization sweep.
startRideDataRetentionScheduler();

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${PORT}`;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Rating API: ${baseUrl}/api/ratings`);
    console.log(`📈 Stats API: ${baseUrl}/api/stats`);
    console.log(`🪪 Driver Verification API: ${baseUrl}/api/driver-verification`);
    console.log(`💬 Chat/Socket.IO ready at: ${baseUrl}`);
  });
} else {
  const PORT = process.env.PORT || 5000;
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${PORT}`;
  server.listen(PORT, () => {
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