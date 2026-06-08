const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { getSignedUrl } = require('../services/s3Service');

const getFreshDocumentUrl = async (key, fallbackUrl = null) => {
  if (!key) return fallbackUrl;
  try {
    return await getSignedUrl(key, 3600); // 1 hour validity
  } catch (error) {
    console.warn('Unable to generate signed S3 URL:', key, error.message);
    return fallbackUrl;
  }
};

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Hardcoded credentials as requested by user
    if (username === 'ShareMyRide' && password === 'ShareMyRide@11') {
      const token = jwt.sign(
        { id: 'admin', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        token
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid admin credentials'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all driver verifications
// @route   GET /api/admin/verifications
// @access  Private (Admin)
exports.getVerifications = async (req, res) => {
  try {
    // Find all users who have submitted their verification
    const users = await User.find({
      'driverVerification.status': { $ne: 'not_started' }
    }).sort({ 'driverVerification.submittedAt': -1 });

    // Generate fresh presigned URLs for each user
    const usersWithFreshUrls = await Promise.all(users.map(async (user) => {
      const dv = user.driverVerification;
      const userObj = user.toObject();
      
      if (dv) {
        if (dv.profilePhoto) {
          userObj.driverVerification.profilePhoto.url = await getFreshDocumentUrl(
            dv.profilePhoto.s3Key, dv.profilePhoto.url
          );
        }
        if (dv.aadhaar) {
          userObj.driverVerification.aadhaar.frontImageUrl = await getFreshDocumentUrl(
            dv.aadhaar.frontImageKey, dv.aadhaar.frontImageUrl
          );
          userObj.driverVerification.aadhaar.backImageUrl = await getFreshDocumentUrl(
            dv.aadhaar.backImageKey, dv.aadhaar.backImageUrl
          );
        }
        if (dv.drivingLicense) {
          userObj.driverVerification.drivingLicense.frontImageUrl = await getFreshDocumentUrl(
            dv.drivingLicense.frontImageKey, dv.drivingLicense.frontImageUrl
          );
          userObj.driverVerification.drivingLicense.backImageUrl = await getFreshDocumentUrl(
            dv.drivingLicense.backImageKey, dv.drivingLicense.backImageUrl
          );
        }
      }
      return userObj;
    }));

    res.status(200).json({
      success: true,
      count: usersWithFreshUrls.length,
      data: usersWithFreshUrls
    });
  } catch (error) {
    console.error('Fetch verifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a verification request
// @route   PUT /api/admin/verifications/:id
// @access  Private (Admin)
exports.updateVerification = async (req, res) => {
  try {
    const { status, remark } = req.body;
    const userId = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update status
    user.driverVerification.status = status;
    
    // Add audit trail entry
    const actionMap = {
      approved: 'Approved',
      rejected: 'Rejected',
      under_review: 'Marked Under Review',
      needs_info: 'Needs Information',
      submitted: 'Reset to Submitted'
    };

    user.driverVerification.auditTrail.unshift({
      action: actionMap[status] || status,
      remark: remark || 'No remarks provided.',
      timestamp: new Date(),
      admin: 'ShareMyRide'
    });

    if (status === 'approved') {
      user.driverVerification.approvedAt = new Date();
      user.driverVerification.rejectionReason = null;
      // The pre-save hook on User will automatically set isDriverVerified = true
    } else if (status === 'rejected' || status === 'needs_info') {
      user.driverVerification.rejectionReason = remark;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `Verification marked as ${status}`,
      data: user
    });
  } catch (error) {
    console.error('Update verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
