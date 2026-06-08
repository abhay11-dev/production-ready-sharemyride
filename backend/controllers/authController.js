const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail } = require('../services/emailService');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// ─── Signup ──────────────────────────────────────────────────────────────────
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
      password
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in.',
      user
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup'
    });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Welcome back! Login successful.',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// ─── Get Profile ─────────────────────────────────────────────────────────────
// GET /api/auth/profile  [protected]
// Returns the authenticated user's profile.
// req.user is already populated and sanitized by the protect middleware
// (password excluded via .select('-password'), toJSON() strips remaining
//  sensitive fields like resetPasswordToken and S3 keys).
const getProfile = async (req, res) => {
  try {
    // Re-fetch from DB so the response is always fresh (middleware may have
    // cached a slightly stale object if requests arrive in quick succession).
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user // toJSON() handles field filtering automatically
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
// PUT /api/auth/profile  [protected]
// Allowed fields: name, phone, avatar, gender, dateOfBirth,
//                 emergencyContact, emergencyContactName
//
// NOT allowed via this endpoint (each has its own dedicated flow):
//   email   → changing email requires re-verification (out of scope here)
//   password → use the /reset-password flow
//   role    → admin-only operation
//   driverVerification → managed by the driver verification flow
const updateProfile = async (req, res) => {
  try {
    // Whitelist of fields the user may update themselves
    const ALLOWED_FIELDS = [
      'name',
      'phone',
      'avatar',
      'gender',
      'dateOfBirth',
      'emergencyContact',
      'emergencyContactName'
    ];

    // Build the update object from only the whitelisted fields present in body
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

    // Field-level validation
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
          message: "Gender must be one of: male, female, other"
        });
      }
    }

    if (updates.dateOfBirth !== undefined && updates.dateOfBirth !== null) {
      const dob = new Date(updates.dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date of birth'
        });
      }
      if (dob >= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Date of birth must be in the past'
        });
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

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);

    // Mongoose validation error (e.g. schema-level phone regex failed)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// ─── Delete Account ───────────────────────────────────────────────────────────
// DELETE /api/auth/account  [protected]
//
// Implements SOFT DELETE consistent with the isActive / suspendedAt pattern
// already present on the User model. The account is deactivated rather than
// physically removed so that:
//   • Ride history and booking records stay intact for other participants.
//   • The user can be reinstated by an admin if the deletion was accidental.
//   • Audit trails remain in place.
//
// Requires the user's current password as confirmation to prevent accidental
// or CSRF-triggered deletions.
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

    res.status(200).json({
      success: true,
      message: 'Your account has been deactivated successfully. Contact support if you wish to reactivate it.'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
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

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please register first.'
      });
    }

    const resetToken = user.generateResetToken();
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);

      res.status(200).json({
        success: true,
        message: 'Password reset code sent to your email'
      });
    } catch (emailError) {
      console.error('Email service error:', emailError);

      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please check your email service configuration.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process reset request. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Verify Reset Code ────────────────────────────────────────────────────────
const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and code are required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Code verified successfully'
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
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
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  forgotPassword,
  verifyResetCode,
  resetPassword
};