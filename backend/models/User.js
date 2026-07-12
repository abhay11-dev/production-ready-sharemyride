// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Driver Verification Sub-Schema ─────────────────────────────────────────
const driverVerificationSchema = new mongoose.Schema({
  profilePhoto: {
    url: { type: String, default: null },
    s3Key: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    verified: { type: Boolean, default: false }
  },
  aadhaar: {
    number: { type: String, default: null },
    numberMasked: { type: String, default: null },
    frontImageUrl: { type: String, default: null },
    frontImageKey: { type: String, default: null },
    backImageUrl: { type: String, default: null },
    backImageKey: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null }
  },
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
  status: {
    type: String,
    enum: ['not_started', 'pending', 'submitted', 'under_review', 'approved', 'rejected', 'needs_info'],
    default: 'not_started',
    index: true
  },
  rejectionReason: { type: String, default: null },
  submittedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  auditTrail: [{
    action: { type: String },
    remark: { type: String },
    timestamp: { type: Date, default: Date.now },
    admin: { type: String }
  }]
}, { _id: false });


// ─── Main User Schema ────────────────────────────────────────────────────────
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
    unique: true,
    lowercase: true,
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
    select: false   // Never returned in queries unless explicitly .select('+password')
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
  avatar: { type: String, default: null },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    default: null
  },
  dateOfBirth: { type: Date, default: null },

  // ── Driver Verification ──────────────────────────────────────────────────
  driverVerification: {
    type: driverVerificationSchema,
    default: () => ({})
  },
  isDriverVerified: { type: Boolean, default: false, index: true },
  drivingLicense: {
    number: String,
    expiryDate: Date,
    verified: { type: Boolean, default: false }
  },

  // ── Ratings & Rides ───────────────────────────────────────────────────────
  ratingSummary: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalRidesAsDriver: { type: Number, default: 0 },
  totalRidesAsPassenger: { type: Number, default: 0 },

  // ── Emergency Contact ─────────────────────────────────────────────────────
  emergencyContact: { type: String, trim: true },
  emergencyContactName: { type: String, trim: true },

  // ── Trusted Contacts (Ride Safety Platform — Phase 4) ─────────────────────
  // Superset of the legacy single emergencyContact/emergencyContactName pair
  // above — kept alongside rather than migrating, so nothing that already
  // reads those two fields breaks. New SOS flow reads trustedContacts only,
  // falling back to the legacy pair if a user hasn't set any up yet (see
  // services/emergencyService.js:getContactsForUser).
  trustedContacts: [
    {
      name: { type: String, trim: true, required: true },
      phone: { type: String, trim: true, required: true },
      relationship: {
        type: String,
        enum: ['primary', 'secondary', 'guardian', 'family', 'friend'],
        default: 'primary'
      },
      // Consent flag for Phase 5 (privacy) — a contact can be stored
      // without yet being notifiable if the user hasn't confirmed they
      // have that person's permission to be contacted during emergencies.
      notifiable: { type: Boolean, default: true }
    }
  ],

  // ── Password Reset ────────────────────────────────────────────────────────
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  resetOtp: { type: String, default: null, select: false },
  resetOtpExpires: { type: Date, default: null, select: false },
  resetOtpAttempts: { type: Number, default: 0, select: false },
  resetOtpLastSentAt: { type: Date, default: null, select: false },

  // ── Email Verification ────────────────────────────────────────────────────
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null, select: false },
  emailVerificationExpires: { type: Date, default: null },
  emailVerificationAttempts: { type: Number, default: 0 },
  lastEmailVerificationAttempt: { type: Date, default: null },
  signupOtp: { type: String, default: null, select: false },
  signupOtpExpires: { type: Date, default: null, select: false },
  signupOtpAttempts: { type: Number, default: 0, select: false },
  signupOtpLastSentAt: { type: Date, default: null, select: false },

  // ── Login Security ────────────────────────────────────────────────────────
  // Number of consecutive failed login attempts since last success
  failedLoginAttempts: {
    type: Number,
    default: 0,
    select: false   // Not exposed in normal queries
  },
  // Account locked until this datetime; null = not locked
  lockoutUntil: {
    type: Date,
    default: null,
    select: false
  },
  // Timestamp of last successful login (for audit/analytics)
  lastLogin: { type: Date, default: null },

  // ── Account Status ────────────────────────────────────────────────────────
  accountStatus: {
    type: String,
    enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'BANNED'],
    default: 'PENDING_VERIFICATION'
  },
  isActive: { type: Boolean, default: true },
  suspendedAt: { type: Date, default: null },
  suspensionReason: { type: String, default: null }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ isDriverVerified: 1 });
userSchema.index({ 'driverVerification.status': 1 });
// Index for lockout queries (login path)
userSchema.index({ lockoutUntil: 1 }, { sparse: true });

// ─── Pre-save: Hash password ──────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Pre-save: Sync isDriverVerified shortcut ─────────────────────────────────
userSchema.pre('save', function (next) {
  if (this.isModified('driverVerification.status')) {
    this.isDriverVerified = this.driverVerification?.status === 'approved';
  }
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  // this.password requires .select('+password') on the query
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateResetToken = function () {
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
  return token;
};

userSchema.methods.generateEmailVerificationToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

userSchema.methods.canPostRide = function () {
  return this.driverVerification?.status === 'approved';
};

userSchema.methods.maskAadhaar = function (number) {
  const clean = number.replace(/\D/g, '');
  if (clean.length !== 12) return null;
  return `XXXX-XXXX-${clean.slice(8)}`;
};

// ─── toJSON: Strip all sensitive fields ──────────────────────────────────────
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  // Auth & security — never expose
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.emailVerificationToken;
  delete user.signupOtp;
  delete user.signupOtpExpires;
  delete user.resetOtp;
  delete user.resetOtpExpires;
  delete user.failedLoginAttempts;
  delete user.lockoutUntil;
  delete user.__v;
  // Driver doc internals
  if (user.driverVerification?.aadhaar?.number) {
    delete user.driverVerification.aadhaar.number;
  }
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