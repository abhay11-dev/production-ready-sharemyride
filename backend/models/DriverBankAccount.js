// models/DriverBankAccount.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const driverBankAccountSchema = new mongoose.Schema({
  // ===========================
  // CORE REFERENCE
  // ===========================
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver is required'],
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver ID is required'],
    unique: true,
    index: true
  },
  
  // ===========================
  // BANK ACCOUNT DETAILS
  // ===========================
  accountHolderName: {
    type: String,
    required: [true, 'Account holder name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true,
    minlength: [9, 'Account number must be at least 9 digits'],
    maxlength: [18, 'Account number cannot exceed 18 digits']
  },
  
  // Encrypted account number for security
  encryptedAccountNumber: {
    type: String,
    select: false
  },
  
  confirmAccountNumber: {
    type: String,
    trim: true
  },
  
  ifscCode: {
    type: String,
    required: [true, 'IFSC code is required'],
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format']
  },
  
  bankName: {
    type: String,
    trim: true,
    required: [true, 'Bank name is required']
  },
  
  branchName: {
    type: String,
    trim: true
  },
  
  branchAddress: {
    type: String,
    trim: true
  },
  
  branchCity: {
    type: String,
    trim: true
  },
  
  branchState: {
    type: String,
    trim: true
  },
  
  branchPincode: {
    type: String,
    trim: true
  },
  
  accountType: {
    type: String,
    enum: ['savings', 'current', 'salary'],
    default: 'savings',
    required: true
  },
  
  micrCode: {
    type: String,
    trim: true
  },
  
  // ===========================
  // UPI DETAILS (Alternative)
  // ===========================
  upiId: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format']
  },
  
  isUpiVerified: {
    type: Boolean,
    default: false
  },
  
  upiVerifiedAt: {
    type: Date,
    default: null
  },
  
  // ===========================
  // PAYMENT GATEWAY INTEGRATION
  // ===========================
  // RazorpayX
  razorpayxContactId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  razorpayxFundAccountId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  razorpayxFundAccountStatus: {
    type: String,
    enum: ['created', 'requested', 'activated', 'rejected', 'suspended'],
    default: null
  },
  
  // Cashfree
  cashfreeBeneficiaryId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  cashfreeBeneStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: null
  },
  
  // PayU
  payuBeneficiaryId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Generic gateway reference
  paymentGateway: {
    type: String,
    enum: ['razorpayx', 'cashfree', 'payu', 'instamojo'],
    default: 'razorpayx'
  },
  
  gatewayAccountId: {
    type: String,
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
    enum: ['penny_drop', 'manual', 'document', 'api', 'bank_statement'],
    default: null
  },
  
  verificationStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'verified', 'failed', 'rejected'],
    default: 'pending'
  },
  
  verificationAttempts: {
    type: Number,
    default: 0
  },
  
  lastVerificationAttempt: {
    type: Date,
    default: null
  },
  
  verificationFailureReason: {
    type: String,
    trim: true
  },
  
  // Penny drop details
  pennyDropAmount: {
    type: Number,
    default: null
  },
  
  pennyDropReferenceId: {
    type: String,
    default: null
  },
  
  pennyDropStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: null
  },
  
  pennyDropResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // ===========================
  // KYC DETAILS
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
  
  panName: {
    type: String,
    trim: true
  },
  
  // Aadhaar (optional, for additional verification)
  aadhaarNumber: {
    type: String,
    trim: true,
    select: false
  },
  
  isAadhaarVerified: {
    type: Boolean,
    default: false
  },
  
  aadhaarVerifiedAt: {
    type: Date,
    default: null
  },
  
  // GST details (for business accounts)
  gstNumber: {
    type: String,
    uppercase: true,
    trim: true
  },
  
  isGstVerified: {
    type: Boolean,
    default: false
  },
  
  // ===========================
  // ACCOUNT STATUS
  // ===========================
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isPrimary: {
    type: Boolean,
    default: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'blocked', 'pending_verification'],
    default: 'pending_verification'
  },
  
  suspendedAt: {
    type: Date,
    default: null
  },
  
  suspensionReason: {
    type: String,
    trim: true
  },
  
  blockedAt: {
    type: Date,
    default: null
  },
  
  blockReason: {
    type: String,
    trim: true
  },
  
  // ===========================
  // PAYOUT STATISTICS
  // ===========================
  lastUsedAt: {
    type: Date,
    default: null
  },
  
  totalPayoutsReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalAmountReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lastPayoutAmount: {
    type: Number,
    default: 0
  },
  
  lastPayoutDate: {
    type: Date,
    default: null
  },
  
  failedPayoutsCount: {
    type: Number,
    default: 0
  },
  
  lastFailedPayoutDate: {
    type: Date,
    default: null
  },
  
  // ===========================
  // PAYOUT PREFERENCES
  // ===========================
  payoutFrequency: {
    type: String,
    enum: ['instant', 'daily', 'weekly', 'biweekly', 'monthly'],
    default: 'weekly'
  },
  
  preferredPayoutDay: {
    type: Number,
    min: 0,
    max: 31,
    default: null
  },
  
  minPayoutAmount: {
    type: Number,
    default: 500,
    min: 0
  },
  
  autoPayoutEnabled: {
    type: Boolean,
    default: false
  },
  
  payoutNotifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  
  // ===========================
  // DOCUMENTS
  // ===========================
  documents: [{
    type: {
      type: String,
      enum: ['cancelled_cheque', 'bank_statement', 'passbook', 'pan_card', 'aadhaar', 'gst_certificate']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // ===========================
  // COMPLIANCE & AUDIT
  // ===========================
  amlChecked: {
    type: Boolean,
    default: false
  },
  
  amlCheckDate: {
    type: Date,
    default: null
  },
  
  amlStatus: {
    type: String,
    enum: ['clear', 'flagged', 'under_review'],
    default: 'clear'
  },
  
  fraudCheckPassed: {
    type: Boolean,
    default: true
  },
  
  fraudCheckDate: {
    type: Date,
    default: null
  },
  
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // ===========================
  // CHANGE HISTORY
  // ===========================
  changeHistory: [{
    field: String,
    oldValue: String,
    newValue: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    approved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date
  }],
  
  // ===========================
  // ADMIN NOTES
  // ===========================
  internalNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  adminNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ===========================
  // METADATA
  // ===========================
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
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
  },
  
  deletedAt: {
    type: Date,
    default: null
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===========================
// INDEXES
// ===========================
driverBankAccountSchema.index({ driverId: 1, isPrimary: 1 });
driverBankAccountSchema.index({ isVerified: 1, isActive: 1 });
driverBankAccountSchema.index({ status: 1 });
driverBankAccountSchema.index({ razorpayxFundAccountId: 1 });
driverBankAccountSchema.index({ createdAt: -1 });
driverBankAccountSchema.index({ accountNumber: 1 }, { sparse: true });

// ===========================
// VIRTUAL FIELDS
// ===========================
driverBankAccountSchema.virtual('driverDetails', {
  ref: 'User',
  localField: 'driver',
  foreignField: '_id',
  justOne: true
});

driverBankAccountSchema.virtual('isFullyVerified').get(function() {
  return this.isVerified && this.isPanVerified && this.status === 'active';
});

driverBankAccountSchema.virtual('maskedAccountNumber').get(function() {
  if (!this.accountNumber) return '';
  const last4 = this.accountNumber.slice(-4);
  return `${'*'.repeat(this.accountNumber.length - 4)}${last4}`;
});

driverBankAccountSchema.virtual('maskedUpiId').get(function() {
  if (!this.upiId) return '';
  const parts = this.upiId.split('@');
  if (parts.length !== 2) return this.upiId;
  const username = parts[0];
  const masked = username.slice(0, 2) + '*'.repeat(Math.max(0, username.length - 4)) + username.slice(-2);
  return `${masked}@${parts[1]}`;
});

// ===========================
// INSTANCE METHODS
// ===========================

// Mask sensitive data for API responses
driverBankAccountSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Mask account number
  if (obj.accountNumber) {
    const last4 = obj.accountNumber.slice(-4);
    obj.accountNumber = `${'*'.repeat(obj.accountNumber.length - 4)}${last4}`;
  }
  
  // Mask UPI ID
  if (obj.upiId) {
    const parts = obj.upiId.split('@');
    if (parts.length === 2) {
      const username = parts[0];
      const masked = username.slice(0, 2) + '*'.repeat(Math.max(0, username.length - 4)) + username.slice(-2);
      obj.upiId = `${masked}@${parts[1]}`;
    }
  }
  
  // Mask PAN
  if (obj.panNumber) {
    obj.panNumber = obj.panNumber.slice(0, 2) + '***' + obj.panNumber.slice(-2);
  }
  
  // Remove encrypted fields
  delete obj.encryptedAccountNumber;
  delete obj.aadhaarNumber;
  delete obj.__v;
  
  return obj;
};

// Verify account
driverBankAccountSchema.methods.verify = function(method = 'penny_drop') {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verificationMethod = method;
  this.verificationStatus = 'verified';
  this.status = 'active';
  return this.save();
};

// Mark verification as failed
driverBankAccountSchema.methods.failVerification = function(reason) {
  this.verificationStatus = 'failed';
  this.verificationFailureReason = reason;
  this.verificationAttempts += 1;
  this.lastVerificationAttempt = new Date();
  return this.save();
};

// Suspend account
driverBankAccountSchema.methods.suspend = function(reason) {
  this.status = 'suspended';
  this.isActive = false;
  this.suspendedAt = new Date();
  this.suspensionReason = reason;
  return this.save();
};

// Activate account
driverBankAccountSchema.methods.activate = function() {
  this.status = 'active';
  this.isActive = true;
  this.suspendedAt = null;
  this.suspensionReason = null;
  return this.save();
};

// Block account
driverBankAccountSchema.methods.block = function(reason) {
  this.status = 'blocked';
  this.isActive = false;
  this.blockedAt = new Date();
  this.blockReason = reason;
  return this.save();
};

// Record payout
driverBankAccountSchema.methods.recordPayout = function(amount) {
  this.totalPayoutsReceived += 1;
  this.totalAmountReceived += amount;
  this.lastPayoutAmount = amount;
  this.lastPayoutDate = new Date();
  this.lastUsedAt = new Date();
  return this.save();
};

// Record failed payout
driverBankAccountSchema.methods.recordFailedPayout = function() {
  this.failedPayoutsCount += 1;
  this.lastFailedPayoutDate = new Date();
  return this.save();
};

// Add change to history
driverBankAccountSchema.methods.addChangeHistory = function(field, oldValue, newValue, changedBy, reason) {
  this.changeHistory.push({
    field,
    oldValue: String(oldValue),
    newValue: String(newValue),
    changedBy,
    reason,
    changedAt: new Date()
  });
  return this.save();
};

// Add admin note
driverBankAccountSchema.methods.addAdminNote = function(note, addedBy) {
  this.adminNotes.push({
    note,
    addedBy,
    addedAt: new Date()
  });
  return this.save();
};

// ===========================
// STATIC METHODS
// ===========================

// Get driver's primary account
driverBankAccountSchema.statics.getPrimaryAccount = function(driverId) {
  return this.findOne({
    driverId,
    isPrimary: true,
    isActive: true,
    isDeleted: false
  });
};

// Get all active accounts for driver
driverBankAccountSchema.statics.getDriverAccounts = function(driverId) {
  return this.find({
    driverId,
    isActive: true,
    isDeleted: false
  }).sort({ isPrimary: -1, createdAt: -1 });
};

// Get verified accounts count
driverBankAccountSchema.statics.getVerifiedCount = function() {
  return this.countDocuments({
    isVerified: true,
    isActive: true,
    isDeleted: false
  });
};

// ===========================
// PRE-SAVE MIDDLEWARE
// ===========================
driverBankAccountSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  // Ensure only one primary account per driver
  if (this.isPrimary && this.isModified('isPrimary')) {
    this.constructor.updateMany(
      { 
        driverId: this.driverId,
        _id: { $ne: this._id }
      },
      { isPrimary: false }
    ).exec();
  }
  
  // Auto-activate if fully verified
  if (this.isVerified && this.isPanVerified && this.status === 'pending_verification') {
    this.status = 'active';
  }
  
  next();
});

// ===========================
// EXPORT
// ===========================
module.exports = mongoose.model('DriverBankAccount', driverBankAccountSchema);