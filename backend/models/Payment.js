const mongoose = require('mongoose');

const paymentDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // UPI Details
  upiId: {
    type: String,
    trim: true
  },
  upiQrCode: {
    type: String, // URL or base64 of QR code image
  },
  
  // Bank Details
  accountHolderName: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  ifscCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  bankName: {
    type: String,
    trim: true
  },
  
  // Card Details (optional - for future)
  cardHolderName: {
    type: String,
    trim: true
  },
  
  // Preferences
  preferredMethod: {
    type: String,
    enum: ['upi', 'bank', 'card'],
    default: 'upi'
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Payment Transaction Schema
const paymentTransactionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Payment Details
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank', 'card', 'cash'],
    required: true
  },
  
  // Transaction Info
  transactionId: {
    type: String,
    trim: true
  },
  upiTransactionId: {
    type: String,
    trim: true
  },
  
  // Payment Proof
  paymentScreenshot: {
    type: String // URL or base64 of payment screenshot
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
    default: 'pending'
  },
  
  // Notes
  passengerNotes: {
    type: String,
    trim: true
  },
  driverNotes: {
    type: String,
    trim: true
  },
  
  // Timestamps for different stages
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
paymentDetailsSchema.index({ userId: 1 });
paymentTransactionSchema.index({ bookingId: 1 });
paymentTransactionSchema.index({ passengerId: 1 });
paymentTransactionSchema.index({ driverId: 1 });
paymentTransactionSchema.index({ status: 1 });

const PaymentDetails = mongoose.model('PaymentDetails', paymentDetailsSchema);
const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = { PaymentDetails, PaymentTransaction };