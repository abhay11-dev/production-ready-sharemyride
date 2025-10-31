const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const path = require('path');

const app = express();

// CRITICAL: Apply CORS before any other middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // List of allowed origins
  const allowedOrigins = [
    'https://share-my-ride-git-main-abhays-projects-cdb9056e.vercel.app',
    'https://share-my-ride.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ];
  
  // Check if origin is allowed or contains share-my-ride
  if (origin && (allowedOrigins.includes(origin) || 
      (origin.includes('share-my-ride') && origin.includes('vercel.app')))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Also use cors package as backup
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://share-my-ride-git-main-abhays-projects-cdb9056e.vercel.app',
      'https://share-my-ride.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ];
    
    if (origin && origin.includes('share-my-ride') && origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
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

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
      receipts: '/api/receipts'
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
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;