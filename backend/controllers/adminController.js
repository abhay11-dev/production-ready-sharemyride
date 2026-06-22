const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getSignedUrl, getObjectFromS3, normalizeS3Key } = require('../services/s3Service');

const DOCUMENT_FIELDS = {
  profilePhoto: {
    label: 'Profile Photo',
    get: (dv) => ({
      key: dv?.profilePhoto?.s3Key,
      url: dv?.profilePhoto?.url
    })
  },
  aadhaarFront: {
    label: 'Aadhaar Front',
    get: (dv) => ({
      key: dv?.aadhaar?.frontImageKey,
      url: dv?.aadhaar?.frontImageUrl
    })
  },
  aadhaarBack: {
    label: 'Aadhaar Back',
    get: (dv) => ({
      key: dv?.aadhaar?.backImageKey,
      url: dv?.aadhaar?.backImageUrl
    })
  },
  dlFront: {
    label: 'Driving License Front',
    get: (dv) => ({
      key: dv?.drivingLicense?.frontImageKey,
      url: dv?.drivingLicense?.frontImageUrl
    })
  },
  dlBack: {
    label: 'Driving License Back',
    get: (dv) => ({
      key: dv?.drivingLicense?.backImageKey,
      url: dv?.drivingLicense?.backImageUrl
    })
  }
};

const getFreshDocumentUrl = async (key, fallbackUrl = null) => {
  const s3Key = key || normalizeS3Key(fallbackUrl);
  if (!s3Key) return fallbackUrl;
  try {
    return await getSignedUrl(s3Key, 3600); // 1 hour validity
  } catch (error) {
    console.warn('Unable to generate signed S3 URL:', s3Key, error.message);
    return fallbackUrl;
  }
};

const secureCompare = (actual = '', expected = '') => {
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      console.warn('⚠️ ADMIN_USERNAME and/or ADMIN_PASSWORD env vars are not set. Falling back to default admin credentials (ShareMyRide/ShareMyRide@11) for testing.');
    }

    if (secureCompare(username, adminUsername) && secureCompare(password, adminPassword)) {
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

// @desc    Stream a private verification document for admin preview
// @route   GET /api/admin/verifications/:id/document/:documentType
// @access  Private (Admin)
exports.streamVerificationDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const field = DOCUMENT_FIELDS[documentType];

    if (!field) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    const user = await User.findById(id).select('driverVerification');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { key, url } = field.get(user.driverVerification);
    const s3Key = key || normalizeS3Key(url);

    if (!s3Key) {
      return res.status(404).json({
        success: false,
        message: `${field.label} has not been uploaded`
      });
    }

    const object = await getObjectFromS3(s3Key);

    res.setHeader('Content-Type', object.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (object.contentLength) {
      res.setHeader('Content-Length', object.contentLength);
    }

    object.body.pipe(res);
  } catch (error) {
    console.error('Stream verification document error:', {
      userId: req.params.id,
      documentType: req.params.documentType,
      name: error.name,
      message: error.message
    });

    const statusCode = error.name === 'NoSuchKey' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: 'Unable to load verification document'
    });
  }
};
