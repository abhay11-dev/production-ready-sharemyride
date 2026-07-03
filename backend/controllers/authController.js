const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { isTestUser } = require('../utils/testBypass');

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_RESENDS = 3;
const OTP_COOLDOWN_MS = 15 * 60 * 1000;

// ─── Token Generators ─────────────────────────────────────────────────────────
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

// ─── Sanitize User ────────────────────────────────────────────────────────────
const sanitizeUser = (user) => {
  if (!user) return user;
  const safeUser = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  delete safeUser.password;
  delete safeUser.resetPasswordToken;
  delete safeUser.resetPasswordExpires;
  delete safeUser.emailVerificationToken;
  delete safeUser.signupOtp;
  delete safeUser.signupOtpExpires;
  delete safeUser.resetOtp;
  delete safeUser.resetOtpExpires;
  delete safeUser.failedLoginAttempts;
  delete safeUser.lockoutUntil;
  return safeUser;
};

// ─── Set Refresh Token Cookie ─────────────────────────────────────────────────
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const setSignupOtp = (user) => {
  const otp = generateOtpCode();
  user.signupOtp = otp;
  user.signupOtpExpires = Date.now() + OTP_EXPIRY_MS;
  user.signupOtpAttempts = 0;
  user.signupOtpLastSentAt = Date.now();
  return otp;
};

const setResetOtp = (user) => {
  const otp = generateOtpCode();
  user.resetOtp = otp;
  user.resetOtpExpires = Date.now() + OTP_EXPIRY_MS;
  user.resetOtpAttempts = 0;
  user.resetOtpLastSentAt = Date.now();
  return otp;
};

// ─── Signup ───────────────────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      // Test accounts are auto-verified so they never need OTP
      emailVerified: isTestUser(email) ? true : false,
      accountStatus: isTestUser(email) ? 'ACTIVE' : 'PENDING_VERIFICATION'
    });

    // Auto-verify test accounts — skip OTP entirely
    if (isTestUser(email)) {
      // Also pre-approve driver verification for test users
      user.isDriverVerified = true;
      user.driverVerification = {
        status: 'approved',
        approvedAt: new Date(),
        auditTrail: [{ action: 'auto-approved', remark: 'Test account bypass', timestamp: new Date(), admin: 'system' }]
      };
      await user.save();
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      setRefreshTokenCookie(res, refreshToken);
      return res.status(201).json({
        success: true,
        message: 'Test account created and verified automatically.',
        token: accessToken,
        user: sanitizeUser(user),
        verificationPending: false
      });
    }

    const otp = setSignupOtp(user);
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Please verify your email with the code sent to your inbox.',
      user: sanitizeUser(user),
      otp,
      email: user.email,
      name: user.name,
      verificationPending: true
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during signup'
    });
  }
};

const resendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If your email is registered and unverified, a new verification code has been sent.'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    const canResend = !user.signupOtpLastSentAt || Date.now() - user.signupOtpLastSentAt > OTP_COOLDOWN_MS;
    if (!canResend) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another code.',
        retryAfter: Math.ceil((OTP_COOLDOWN_MS - (Date.now() - user.signupOtpLastSentAt)) / 1000 / 60)
      });
    }

    const otp = setSignupOtp(user);
    user.signupOtpAttempts = (user.signupOtpAttempts || 0) + 1;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'A new verification code has been sent to your email.',
      otp,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Resend signup OTP error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification code. Please try again.'
    });
  }
};

const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      signupOtp: otp,
      signupOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    user.emailVerified = true;
    user.accountStatus = 'ACTIVE';
    user.signupOtp = null;
    user.signupOtpExpires = null;
    user.signupOtpAttempts = 0;
    user.signupOtpLastSentAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Verify signup OTP error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify code. Please try again.'
    });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Frontend validation mirror — never log credentials
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user — always select password + lockout fields
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +failedLoginAttempts +lockoutUntil');

    // User not found — generic message (do NOT reveal email existence)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check account lockout BEFORE password comparison
    const now = Date.now();
    if (user.lockoutUntil && user.lockoutUntil > now) {
      const minutesLeft = Math.ceil((user.lockoutUntil - now) / 1000 / 60);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked due to multiple failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
        lockedUntil: user.lockoutUntil
      });
    }

    // ── Test-account bypass ──────────────────────────────────────────────
    // For the two designated test emails, skip email-verification and
    // lockout checks entirely. Also ensure the DB record is fully verified.
    if (isTestUser(email)) {
      // Auto-patch the record so it's always in a fully-verified state
      const needsPatch =
        !user.emailVerified ||
        user.accountStatus !== 'ACTIVE' ||
        user.driverVerification?.status !== 'approved';

      if (needsPatch) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            emailVerified: true,
            accountStatus: 'ACTIVE',
            isDriverVerified: true,
            failedLoginAttempts: 0,
            lockoutUntil: null,
            'driverVerification.status': 'approved',
            'driverVerification.approvedAt': new Date(),
          }
        });
      }

      // Compare password (still enforce correct password for test users)
      const isPasswordCorrect = await user.comparePassword(password);
      if (!isPasswordCorrect) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      user.lastLogin = new Date();
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await user.save();

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      setRefreshTokenCookie(res, refreshToken);
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: accessToken,
        user: sanitizeUser(user)
      });
    }

    // Check email verification status
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        requiresEmailVerification: true,
        email: user.email
      });
    }

    // Check account status (suspended, etc.)
    if (user.accountStatus === 'SUSPENDED' || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
        suspensionReason: user.suspensionReason
      });
    }

    // Compare password using bcrypt (via model method — never plain text)
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after threshold
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockoutUntil = new Date(now + LOCKOUT_DURATION_MS);
        user.failedLoginAttempts = 0; // Reset counter after locking
        await user.save();

        return res.status(423).json({
          success: false,
          message: `Too many failed attempts. Account locked for 15 minutes.`,
          lockedUntil: user.lockoutUntil
        });
      }

      await user.save();

      const attemptsLeft = MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        // Only show warning when close to lockout to avoid enumeration
        ...(attemptsLeft <= 2 && {
          warning: `${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining before account lockout`
        })
      });
    }

    // Password matched — reset failed attempts and lockout
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate short-lived access token + long-lived refresh token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Refresh token goes in HttpOnly Secure cookie — never in response body
    setRefreshTokenCookie(res, refreshToken);

    // Return access token + non-sensitive user fields only
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: accessToken,               // Short-lived (15m)
      user: sanitizeUser(user)
    });

  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
      );
    } catch {
      // Clear invalid cookie
      res.clearCookie('refreshToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive || user.accountStatus === 'SUSPENDED') {
      res.clearCookie('refreshToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    // Rotation: issue new access + refresh tokens on every refresh
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      token: newAccessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  // Clear the HttpOnly refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
  res.clearCookie('refreshToken', { path: '/api/auth' });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const ALLOWED_FIELDS = [
      'name', 'phone', 'avatar', 'gender',
      'dateOfBirth', 'emergencyContact', 'emergencyContactName'
    ];

    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (trimmed.length < 2 || trimmed.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 2 and 50 characters'
        });
      }
      updates.name = trimmed;
    }

    if (updates.phone !== undefined) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (updates.phone && !phoneRegex.test(updates.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit Indian mobile number'
        });
      }
    }

    if (updates.gender !== undefined) {
      const validGenders = ['male', 'female', 'other', null];
      if (!validGenders.includes(updates.gender)) {
        return res.status(400).json({
          success: false,
          message: 'Gender must be one of: male, female, other'
        });
      }
    }

    if (updates.dateOfBirth !== undefined && updates.dateOfBirth !== null) {
      const dob = new Date(updates.dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date of birth' });
      }
      if (dob >= new Date()) {
        return res.status(400).json({ success: false, message: 'Date of birth must be in the past' });
      }
      updates.dateOfBirth = dob;
    }

    // runValidators: true ensures Mongoose schema-level validation also fires
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Update profile error:', error.message);

    // Mongoose validation error (e.g. schema-level phone regex failed)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// ─── Delete Account ───────────────────────────────────────────────────────────
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your current password to confirm account deletion'
      });
    }

    // Fetch with password field (excluded by default via select: false)
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password before deletion
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Account deletion cancelled.'
      });
    }

    // Soft delete: mark as inactive with a timestamp
    user.isActive = false;
    user.suspendedAt = new Date();
    user.suspensionReason = 'Account deleted by user';
    await user.save();

    // Clear auth cookie on account deletion
    res.clearCookie('refreshToken', { path: '/' });

    return res.status(200).json({
      success: true,
      message: 'Your account has been deactivated successfully. Contact support if you wish to reactivate it.'
    });
  } catch (error) {
    console.error('Delete account error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting account'
    });
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const GENERIC_MESSAGE = 'If an account exists with this email, a password reset code has been sent.';

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({ success: true, message: GENERIC_MESSAGE });
    }

    const otp = setResetOtp(user);
    await user.save();

    return res.status(200).json({
      success: true,
      message: GENERIC_MESSAGE,
      otp,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process reset request. Please try again.'
    });
  }
};

// ─── Verify Reset Code ────────────────────────────────────────────────────────
const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp, code } = req.body;
    const verificationCode = otp || code;

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and code are required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetOtp: verificationCode,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Code verified successfully'
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};
const verifyResetCode = verifyResetOtp;

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, otp, code, newPassword } = req.body;
    const verificationCode = otp || code;

    if (!email || !verificationCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, code, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetOtp: verificationCode,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    user.resetOtpLastSentAt = null;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { token, email, otp } = req.body;

    if (otp && email) {
      const user = await User.findOne({
        email: email.toLowerCase(),
        signupOtp: otp,
        signupOtpExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code'
        });
      }

      user.emailVerified = true;
      user.accountStatus = 'ACTIVE';
      user.signupOtp = null;
      user.signupOtpExpires = null;
      user.signupOtpAttempts = 0;
      user.signupOtpLastSentAt = null;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully! You can now log in.',
        user: sanitizeUser(user)
      });
    }

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Verification token and email are required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    user.emailVerified = true;
    user.accountStatus = 'ACTIVE';
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Email verification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email. Please try again.'
    });
  }
};

// ─── Resend Verification Email ────────────────────────────────────────────────
const resendVerificationEmail = resendSignupOtp;

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  deleteAccount,
  forgotPassword,
  verifyResetCode,
  verifyResetOtp,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  resendSignupOtp,
  verifySignupOtp
};