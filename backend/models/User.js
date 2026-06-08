// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Driver Verification Sub-Schema ────────────────────────────────────────
const driverVerificationSchema = new mongoose.Schema({
  // Profile Photo
  profilePhoto: {
    url: { type: String, default: null },
    s3Key: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    verified: { type: Boolean, default: false }
  },

  // Aadhaar Card (KYC)
  aadhaar: {
    number: {
      type: String,
      default: null,
      // Stored masked: XXXX-XXXX-1234 — only last 4 stored visible
    },
    numberMasked: { type: String, default: null }, // "XXXX-XXXX-1234"
    frontImageUrl: { type: String, default: null },
    frontImageKey: { type: String, default: null },
    backImageUrl: { type: String, default: null },
    backImageKey: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null }
  },

  // Driving License
  drivingLicense: {
    number: { type: String, default: null },
    expiryDate: { type: Date, default: null },
    frontImageUrl: { type: String, default: null },
    frontImageKey: { type: String, default: null },
    backImageUrl: { type: String, default: null },
    backImageKey: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null }
  },

  // Overall Verification Status
  // pending → submitted → approved | rejected | needs_info
  status: {
    type: String,
    enum: ['not_started', 'pending', 'submitted', 'approved', 'rejected', 'needs_info'],
    default: 'not_started',
    index: true
  },
  rejectionReason: { type: String, default: null },
  submittedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  auditTrail: [{
    action: { type: String },
    remark: { type: String },
    timestamp: { type: Date, default: Date.now },
    admin: { type: String }
  }]
}, { _id: false });


// ─── Main User Schema ───────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,       // ← this already creates the index; no need for
    lowercase: true,    //   userSchema.index({ email: 1 }) below
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'driver', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number']
  },
  avatar: {
    type: String,
    default: null
  },
  isVerified: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },

  // ── Driver Verification (embedded) ───────────────────────────────────────
  driverVerification: {
    type: driverVerificationSchema,
    default: () => ({})
  },

  // Computed shortcut — set true only when driverVerification.status === 'approved'
  isDriverVerified: {
    type: Boolean,
    default: false,
    index: true
  },

  // Legacy driving license (kept for backward compat, prefer driverVerification.drivingLicense)
  drivingLicense: {
    number: String,
    expiryDate: Date,
    verified: { type: Boolean, default: false }
  },

  // Ratings & Rides
  ratingSummary: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalRidesAsDriver: { type: Number, default: 0 },
  totalRidesAsPassenger: { type: Number, default: 0 },

  // Emergency Contact
  emergencyContact: { type: String, trim: true },
  emergencyContactName: { type: String, trim: true },

  // Password Reset
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },

  // Account Status
  isActive: { type: Boolean, default: true },
  suspendedAt: { type: Date, default: null },
  suspensionReason: { type: String, default: null }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── Indexes ────────────────────────────────────────────────────────────────
// NOTE: email index is intentionally omitted here — the `unique: true` on the
// schema field above already instructs Mongoose/MongoDB to create it.
// Defining it again via userSchema.index({ email: 1 }) would cause a duplicate
// index warning on every startup and wastes storage + write overhead.
userSchema.index({ isDriverVerified: 1 });
userSchema.index({ 'driverVerification.status': 1 });

// ─── Pre-save: hash password ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Pre-save: sync isDriverVerified shortcut ─────────────────────────────
userSchema.pre('save', function (next) {
  if (this.isModified('driverVerification.status')) {
    this.isDriverVerified = this.driverVerification?.status === 'approved';
  }
  next();
});

// ─── Instance Methods ────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateResetToken = function () {
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  return token;
};

userSchema.methods.canPostRide = function () {
  return this.driverVerification?.status === 'approved';
};

// Mask aadhaar number before saving — always store masked form
userSchema.methods.maskAadhaar = function (number) {
  const clean = number.replace(/\D/g, '');
  if (clean.length !== 12) return null;
  return `XXXX-XXXX-${clean.slice(8)}`;
};

// ─── toJSON: strip sensitive fields ──────────────────────────────────────
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.__v;
  // Never expose full Aadhaar number
  if (user.driverVerification?.aadhaar?.number) {
    delete user.driverVerification.aadhaar.number;
  }
  // Never expose S3 keys (internal)
  if (user.driverVerification?.aadhaar) {
    delete user.driverVerification.aadhaar.frontImageKey;
    delete user.driverVerification.aadhaar.backImageKey;
  }
  if (user.driverVerification?.drivingLicense) {
    delete user.driverVerification.drivingLicense.frontImageKey;
    delete user.driverVerification.drivingLicense.backImageKey;
  }
  if (user.driverVerification?.profilePhoto) {
    delete user.driverVerification.profilePhoto.s3Key;
  }
  return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;