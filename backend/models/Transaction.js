// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Core References
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Payment Gateway Details
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'cashfree', 'payu'],
    default: 'razorpay'
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true // Allow null for pending payments
  },
  razorpaySignature: String,
  
  // Amount Breakdown
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  baseCommissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  baseCommissionPercent: {
    type: Number,
    required: true,
    default: 15
  },
  gstAmount: {
    type: Number,
    required: true,
    min: 0
  },
  gstPercent: {
    type: Number,
    required: true,
    default: 18
  },
  platformTotalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  driverNetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Gateway Fees (if applicable)
  gatewayFee: {
    type: Number,
    default: 0
  },
  gatewayGst: {
    type: Number,
    default: 0
  },
  
  // Status
  paymentStatus: {
    type: String,
    enum: ['created', 'pending', 'captured', 'failed', 'refunded'],
    default: 'created',
    index: true
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'netbanking', 'wallet'],
    default: 'upi'
  },
  
  // Timestamps
  paymentCreatedAt: {
    type: Date,
    default: Date.now
  },
  paymentCapturedAt: Date,
  payoutInitiatedAt: Date,
  payoutCompletedAt: Date,
  
  // Additional Details
  passengerEmail: String,
  passengerPhone: String,
  
  // Invoice Details
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  invoiceGeneratedAt: Date,
  
  // Error Handling
  errorCode: String,
  errorDescription: String,
  
  // Metadata
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ paymentStatus: 1, createdAt: -1 });
transactionSchema.index({ driverId: 1, payoutStatus: 1 });
transactionSchema.index({ razorpayOrderId: 1 });

// Methods
transactionSchema.methods.calculateAmounts = function(totalAmount, commissionPercent = 10, gstPercent = 18) {
  this.totalAmount = totalAmount;
  this.baseCommissionPercent = commissionPercent;
  this.gstPercent = gstPercent;
  
  this.baseCommissionAmount = (totalAmount * commissionPercent) / 100;
  this.gstAmount = (this.baseCommissionAmount * gstPercent) / 100;
  this.platformTotalAmount = this.baseCommissionAmount + this.gstAmount;
  this.driverNetAmount = totalAmount - this.platformTotalAmount;
};

module.exports = mongoose.model('Transaction', transactionSchema);