// models/DriverBankAccount.js
const mongoose = require('mongoose');

const driverBankAccountSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Bank Details
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
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
    enum: ['savings', 'current'],
    default: 'savings'
  },
  
  // RazorpayX Details
  razorpayxContactId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayxFundAccountId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verificationMethod: String, // 'penny_drop', 'manual', etc.
  
  // KYC Details
  panNumber: {
    type: String,
    uppercase: true,
    trim: true
  },
  isPanVerified: {
    type: Boolean,
    default: false
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  lastUsedAt: Date,
  totalPayoutsReceived: {
    type: Number,
    default: 0
  },
  totalAmountReceived: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Encrypt sensitive data (add encryption in production)
driverBankAccountSchema.methods.toJSON = function() {
  const obj = this.toObject();
  // Mask account number for API responses
  if (obj.accountNumber) {
    obj.accountNumber = obj.accountNumber.replace(/\d(?=\d{4})/g, '*');
  }
  return obj;
};

module.exports = mongoose.model('DriverBankAccount', driverBankAccountSchema);