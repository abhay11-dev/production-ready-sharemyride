// models/Payment.js
const mongoose = require('mongoose');
const crypto = require('crypto');

// ===========================
// PAYMENT DETAILS SCHEMA
// ===========================
const paymentDetailsSchema = new mongoose.Schema({
  // ===========================
  // CORE REFERENCE
  // ===========================
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true,
    index: true
  },
  
  // ===========================
  // UPI DETAILS
  // ===========================
  upiId: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format']
  },
  
  upiQrCode: {
    type: String,
    default: null
  },
  
  isUpiVerified: {
    type: Boolean,
    default: false
  },
  
  upiVerifiedAt: {
    type: Date,
    default: null
  },
  
  upiProvider: {
    type: String,
    enum: ['gpay', 'phonepe', 'paytm', 'bhim', 'amazonpay', 'whatsapp', 'other'],
    default: null
  },
  
  // ===========================
  // BANK ACCOUNT DETAILS
  // ===========================
  accountHolderName: {
    type: String,
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  accountNumber: {
    type: String,
    trim: true,
    minlength: [9, 'Account number must be at least 9 digits'],
    maxlength: [18, 'Account number cannot exceed 18 digits']
  },
  
  confirmAccountNumber: {
    type: String,
    trim: true
  },
  
  ifscCode: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format']
  },
  
  bankName: {
    type: String,
    trim: true
  },
  
  branchName: {
    type: String,
    trim: true
  },
  
  accountType: {
    type: String,
    enum: ['savings', 'current', 'salary'],
    default: 'savings'
  },
  
  isBankVerified: {
    type: Boolean,
    default: false
  },
  
  bankVerifiedAt: {
    type: Date,
    default: null
  },
  
  bankVerificationMethod: {
    type: String,
    enum: ['penny_drop', 'manual', 'document'],
    default: null
  },
  
  // ===========================
  // CARD DETAILS
  // ===========================
  cards: [{
    cardId: {
      type: String,
      default: () => crypto.randomBytes(16).toString('hex')
    },
    cardHolderName: {
      type: String,
      trim: true
    },
    cardNumber: {
      type: String,
      trim: true
    },
    cardLast4: {
      type: String,
      trim: true
    },
    cardType: {
      type: String,
      enum: ['credit', 'debit'],
      default: 'debit'
    },
    cardBrand: {
      type: String,
      enum: ['visa', 'mastercard', 'rupay', 'amex', 'maestro'],
      default: null
    },
    expiryMonth: {
      type: String,
      match: [/^(0[1-9]|1[0-2])$/, 'Invalid month']
    },
    expiryYear: {
      type: String,
      match: [/^\d{4}$/, 'Invalid year']
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    lastUsedAt: {
      type: Date,
      default: null
    },
    // Gateway token (for saved cards)
    gatewayToken: {
      type: String,
      default: null
    },
    gatewayCustomerId: {
      type: String,
      default: null
    }
  }],
  
  // ===========================
  // WALLET DETAILS
  // ===========================
  wallets: [{
    provider: {
      type: String,
      enum: ['paytm', 'phonepe', 'amazonpay', 'mobikwik', 'freecharge', 'airtel_money'],
      required: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    isLinked: {
      type: Boolean,
      default: false
    },
    linkedAt: {
      type: Date,
      default: null
    },
    balance: {
      type: Number,
      default: 0
    },
    lastSyncedAt: {
      type: Date,
      default: null
    }
  }],
  
  // ===========================
  // PAYMENT PREFERENCES
  // ===========================
  preferredMethod: {
    type: String,
    enum: ['upi', 'bank', 'card', 'wallet', 'netbanking', 'cash'],
    default: 'upi'
  },
  
  defaultCardId: {
    type: String,
    default: null
  },
  
  autoPayEnabled: {
    type: Boolean,
    default: false
  },
  
  savePaymentMethods: {
    type: Boolean,
    default: true
  },
  
  // ===========================
  // KYC & VERIFICATION
  // ===========================
  panNumber: {
    type: String,
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format']
  },
  
  isPanVerified: {
    type: Boolean,
    default: false
  },
  
  panVerifiedAt: {
    type: Date,
    default: null
  },
  
  kycStatus: {
    type: String,
    enum: ['not_started', 'pending', 'in_progress', 'completed', 'rejected'],
    default: 'not_started'
  },
  
  kycCompletedAt: {
    type: Date,
    default: null
  },
  
  // ===========================
  // VERIFICATION STATUS
  // ===========================
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  
  verifiedAt: {
    type: Date,
    default: null
  },
  
  verificationMethod: {
    type: String,
    enum: ['automatic', 'manual', 'document'],
    default: null
  },
  
  // ===========================
  // PAYMENT LIMITS
  // ===========================
  limits: {
    dailyLimit: {
      type: Number,
      default: 50000
    },
    monthlyLimit: {
      type: Number,
      default: 200000
    },
    perTransactionLimit: {
      type: Number,
      default: 10000
    }
  },
  
  // ===========================
  // USAGE STATISTICS
  // ===========================
  stats: {
    totalTransactions: {
      type: Number,
      default: 0
    },
    totalAmountPaid: {
      type: Number,
      default: 0
    },
    lastTransactionDate: {
      type: Date,
      default: null
    },
    failedTransactions: {
      type: Number,
      default: 0
    }
  },
  
  // ===========================
  // SECURITY
  // ===========================
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  biometricEnabled: {
    type: Boolean,
    default: false
  },
  
  // ===========================
  // STATUS
  // ===========================
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'blocked'],
    default: 'active'
  },
  
  suspendedAt: {
    type: Date,
    default: null
  },
  
  suspensionReason: {
    type: String,
    trim: true
  },
  
  // ===========================
  // METADATA
  // ===========================
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  internalNotes: {
    type: String,
    trim: true
  },
  
  // ===========================
  // TIMESTAMPS
  // ===========================
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===========================
// PAYMENT TRANSACTION SCHEMA
// ===========================
const paymentTransactionSchema = new mongoose.Schema({
  // ===========================
  // CORE REFERENCES
  // ===========================
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required'],
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking ID is required'],
    index: true
  },
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    index: true
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger is required'],
    index: true
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger ID is required'],
    index: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // ===========================
  // TRANSACTION DETAILS
  // ===========================
  transactionNumber: {
    type: String,
    unique: true,
    index: true
  },
  
  transactionType: {
    type: String,
    enum: ['payment', 'refund', 'payout', 'adjustment'],
    default: 'payment',
    required: true
  },
  
  // ===========================
  // AMOUNT DETAILS
  // ===========================
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  
  baseFare: {
    type: Number,
    default: 0
  },
  
  serviceFee: {
    type: Number,
    default: 0
  },
  
  tax: {
    type: Number,
    default: 0
  },
  
  discount: {
    type: Number,
    default: 0
  },
  
  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  
  convenienceFee: {
    type: Number,
    default: 0
  },
  
  // ===========================
  // PAYMENT METHOD
  // ===========================
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank', 'card', 'wallet', 'netbanking', 'cash', 'emi'],
    required: [true, 'Payment method is required']
  },
  
  paymentProvider: {
    type: String,
    enum: ['razorpay', 'cashfree', 'payu', 'phonepe', 'gpay', 'paytm', 'stripe'],
    default: null
  },
  
  // ===========================
  // GATEWAY DETAILS
  // ===========================
  gatewayOrderId: {
    type: String,
    trim: true,
    index: true
  },
  
  gatewayPaymentId: {
    type: String,
    trim: true,
    index: true
  },