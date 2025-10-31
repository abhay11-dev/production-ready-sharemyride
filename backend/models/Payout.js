// models/Payout.js
const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  // References
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  
  // Payout Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // RazorpayX Payout Details
  razorpayxPayoutId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayxFundAccountId: String,
  razorpayxContactId: String,
  
  // Bank Details (for record)
  bankAccountNumber: String,
  bankIfscCode: String,
  bankAccountHolderName: String,
  
  // Status
  status: {
    type: String,
    enum: ['queued', 'pending', 'processing', 'processed', 'cancelled', 'reversed', 'failed'],
    default: 'queued',
    index: true
  },
  
  // Payment Mode
  mode: {
    type: String,
    enum: ['NEFT', 'RTGS', 'IMPS', 'UPI'],
    default: 'IMPS'
  },
  
  // Timestamps
  queuedAt: {
    type: Date,
    default: Date.now
  },
  initiatedAt: Date,
  processedAt: Date,
  failedAt: Date,
  
  // UTR (Unique Transaction Reference)
  utr: String,
  
  // Fees
  payoutFee: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  
  // Error Details
  failureReason: String,
  errorCode: String,
  errorDescription: String,
  
  // Retry Info
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  nextRetryAt: Date,
  
  // Metadata
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
payoutSchema.index({ status: 1, createdAt: -1 });
payoutSchema.index({ driverId: 1, status: 1 });

module.exports = mongoose.model('Payout', payoutSchema);