// controllers/driverVerificationController.js
const User = require('../models/User');
const {
  uploadFileToS3,
  deleteFileFromS3,
  getSignedUrl
} = require('../services/s3Service');

const sanitizeFileName = (name = 'document') =>
  name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

const buildS3Key = (userId, folder, file) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `driver-verification/${userId}/${folder}/${timestamp}-${random}-${sanitizeFileName(file.originalname)}`;
};

const uploadVerificationFile = async (userId, folder, file) => {
  const key = buildS3Key(userId, folder, file);
  return uploadFileToS3(file, key);
};

const safeDeleteS3Object = async (key) => {
  if (!key) return;
  try {
    await deleteFileFromS3(key);
  } catch (error) {
    console.warn('Unable to delete old verification document from S3:', key, error.message);
  }
};

const getFreshDocumentUrl = async (key, fallbackUrl = null) => {
  if (!key) return fallbackUrl;
  try {
    return await getSignedUrl(key, 3600);
  } catch (error) {
    console.warn('Unable to generate signed S3 URL:', key, error.message);
    return fallbackUrl;
  }
};

const getDocumentState = (dv) => {
  const profilePhotoUploaded = !!(dv?.profilePhoto?.s3Key || dv?.profilePhoto?.url);
  const aadhaarFrontUploaded = !!(dv?.aadhaar?.frontImageKey || dv?.aadhaar?.frontImageUrl);
  const aadhaarBackUploaded = !!(dv?.aadhaar?.backImageKey || dv?.aadhaar?.backImageUrl);
  const dlFrontUploaded = !!(dv?.drivingLicense?.frontImageKey || dv?.drivingLicense?.frontImageUrl);
  const dlBackUploaded = !!(dv?.drivingLicense?.backImageKey || dv?.drivingLicense?.backImageUrl);

  const steps = {
    profilePhoto: profilePhotoUploaded,
    aadhaar: aadhaarFrontUploaded && aadhaarBackUploaded,
    drivingLicense: dlFrontUploaded && dlBackUploaded
  };

  return {
    steps,
    allStepsDone: steps.profilePhoto && steps.aadhaar && steps.drivingLicense,
    profilePhotoUploaded,
    aadhaarFrontUploaded,
    aadhaarBackUploaded,
    dlFrontUploaded,
    dlBackUploaded
  };
};

// ─── POST /api/driver-verification/profile-photo ─────────────────────────────
// Body (multipart): photo (file)
const uploadProfilePhoto = async (req, res) => {
  try {
    const file = req.file; // set by multer middleware

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Profile photo file is required'
      });
    }

    const oldKey = req.user.driverVerification?.profilePhoto?.s3Key;
    const { url, key } = await uploadVerificationFile(req.user._id, 'profile-photo', file);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'driverVerification.profilePhoto.url': url,
          'driverVerification.profilePhoto.s3Key': key,
          'driverVerification.profilePhoto.uploadedAt': new Date(),
          'driverVerification.profilePhoto.verified': false,
          // Move status to 'pending' if it was 'not_started'
          ...(req.user.driverVerification?.status === 'not_started' && {
            'driverVerification.status': 'pending'
          })
        }
      },
      { new: true, runValidators: false }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await safeDeleteS3Object(oldKey);

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        url,
        uploadedAt: user.driverVerification.profilePhoto.uploadedAt,
        verificationStatus: user.driverVerification.status
      }
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile photo'
    });
  }
};

// ─── POST /api/driver-verification/aadhaar ────────────────────────────────────
// Body (multipart): aadhaarNumber (string), frontImage (file), backImage (file)
const uploadAadhaar = async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;
    const files = req.files || {};
    const frontImage = files.frontImage?.[0];
    const backImage = files.backImage?.[0];

    // Validation
    if (!aadhaarNumber) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number is required'
      });
    }

    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number must be exactly 12 digits'
      });
    }

    if (!frontImage || !backImage) {
      return res.status(400).json({
        success: false,
        message: 'Both front and back images of Aadhaar are required'
      });
    }

    // Mask before storing — never persist raw 12-digit number
    const maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(8)}`;

    const oldFrontKey = req.user.driverVerification?.aadhaar?.frontImageKey;
    const oldBackKey = req.user.driverVerification?.aadhaar?.backImageKey;
    const front = await uploadVerificationFile(req.user._id, 'aadhaar/front', frontImage);
    const back = await uploadVerificationFile(req.user._id, 'aadhaar/back', backImage);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'driverVerification.aadhaar.numberMasked': maskedAadhaar,
          'driverVerification.aadhaar.frontImageUrl': front.url,
          'driverVerification.aadhaar.frontImageKey': front.key,
          'driverVerification.aadhaar.backImageUrl': back.url,
          'driverVerification.aadhaar.backImageKey': back.key,
          'driverVerification.aadhaar.uploadedAt': new Date(),
          'driverVerification.aadhaar.verified': false,
          ...(req.user.driverVerification?.status === 'not_started' && {
            'driverVerification.status': 'pending'
          })
        }
      },
      { new: true, runValidators: false }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Promise.all([
      safeDeleteS3Object(oldFrontKey),
      safeDeleteS3Object(oldBackKey)
    ]);

    res.status(200).json({
      success: true,
      message: 'Aadhaar uploaded successfully',
      data: {
        numberMasked: maskedAadhaar,
        frontImageUrl: front.url,
        backImageUrl: back.url,
        uploadedAt: user.driverVerification.aadhaar.uploadedAt,
        verificationStatus: user.driverVerification.status
      }
    });
  } catch (error) {
    console.error('Aadhaar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading Aadhaar'
    });
  }
};

// ─── POST /api/driver-verification/driving-license ───────────────────────────
// Body (multipart): licenseNumber (string), expiryDate (ISO string),
//                   frontImage (file), backImage (file)
const uploadDrivingLicense = async (req, res) => {
  try {
    const { licenseNumber, expiryDate } = req.body;
    const files = req.files || {};
    const frontImage = files.frontImage?.[0];
    const backImage = files.backImage?.[0];

    // Validation
    if (!licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'Driving license number is required'
      });
    }

    if (!expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'License expiry date is required'
      });
    }

    const parsedExpiry = new Date(expiryDate);
    if (isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiry date format'
      });
    }

    if (parsedExpiry <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Driving license has already expired'
      });
    }

    if (!frontImage || !backImage) {
      return res.status(400).json({
        success: false,
        message: 'Both front and back images of the driving license are required'
      });
    }

    const oldFrontKey = req.user.driverVerification?.drivingLicense?.frontImageKey;
    const oldBackKey = req.user.driverVerification?.drivingLicense?.backImageKey;
    const front = await uploadVerificationFile(req.user._id, 'driving-license/front', frontImage);
    const back = await uploadVerificationFile(req.user._id, 'driving-license/back', backImage);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'driverVerification.drivingLicense.number': licenseNumber.trim().toUpperCase(),
          'driverVerification.drivingLicense.expiryDate': parsedExpiry,
          'driverVerification.drivingLicense.frontImageUrl': front.url,
          'driverVerification.drivingLicense.frontImageKey': front.key,
          'driverVerification.drivingLicense.backImageUrl': back.url,
          'driverVerification.drivingLicense.backImageKey': back.key,
          'driverVerification.drivingLicense.uploadedAt': new Date(),
          'driverVerification.drivingLicense.verified': false,
          ...(req.user.driverVerification?.status === 'not_started' && {
            'driverVerification.status': 'pending'
          })
        }
      },
      { new: true, runValidators: false }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Promise.all([
      safeDeleteS3Object(oldFrontKey),
      safeDeleteS3Object(oldBackKey)
    ]);

    res.status(200).json({
      success: true,
      message: 'Driving license uploaded successfully',
      data: {
        licenseNumber: licenseNumber.trim().toUpperCase(),
        expiryDate: parsedExpiry,
        frontImageUrl: front.url,
        backImageUrl: back.url,
        uploadedAt: user.driverVerification.drivingLicense.uploadedAt,
        verificationStatus: user.driverVerification.status
      }
    });
  } catch (error) {
    console.error('Driving license upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading driving license'
    });
  }
};

// ─── POST /api/driver-verification/submit ────────────────────────────────────
// Called after all documents are uploaded — marks the application as submitted
// for admin review.
const submitVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const dv = user.driverVerification;

    // Guard: all three document steps must be uploaded before submission
    const documentState = getDocumentState(dv);
    const missing = [];
    if (!documentState.steps.profilePhoto) missing.push('profile photo');
    if (!documentState.steps.aadhaar) missing.push('Aadhaar front and back');
    if (!documentState.steps.drivingLicense) missing.push('driving license front and back');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please upload the following before submitting: ${missing.join(', ')}`
      });
    }

    if (['submitted', 'approved'].includes(dv?.status)) {
      return res.status(400).json({
        success: false,
        message: `Verification is already ${dv.status}`
      });
    }

    user.driverVerification.status = 'submitted';
    user.driverVerification.submittedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Verification documents submitted successfully. Our team will review them within 24–48 hours.',
      data: {
        status: user.driverVerification.status,
        submittedAt: user.driverVerification.submittedAt
      }
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting verification'
    });
  }
};

// ─── GET /api/driver-verification/status ─────────────────────────────────────
const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const dv = user.driverVerification;
    const documentState = getDocumentState(dv);
    const profilePhotoUrl = await getFreshDocumentUrl(
      dv?.profilePhoto?.s3Key,
      dv?.profilePhoto?.url ?? null
    );
    const aadhaarFrontImageUrl = await getFreshDocumentUrl(
      dv?.aadhaar?.frontImageKey,
      dv?.aadhaar?.frontImageUrl ?? null
    );
    const aadhaarBackImageUrl = await getFreshDocumentUrl(
      dv?.aadhaar?.backImageKey,
      dv?.aadhaar?.backImageUrl ?? null
    );
    const dlFrontImageUrl = await getFreshDocumentUrl(
      dv?.drivingLicense?.frontImageKey,
      dv?.drivingLicense?.frontImageUrl ?? null
    );
    const dlBackImageUrl = await getFreshDocumentUrl(
      dv?.drivingLicense?.backImageKey,
      dv?.drivingLicense?.backImageUrl ?? null
    );

    res.status(200).json({
      success: true,
      data: {
        status: dv?.status ?? 'not_started',
        isDriverVerified: user.isDriverVerified,
        rejectionReason: dv?.rejectionReason ?? null,
        submittedAt: dv?.submittedAt ?? null,
        approvedAt: dv?.approvedAt ?? null,
        allStepsDone: documentState.allStepsDone,
        steps: documentState.steps,
        profilePhotoUrl,
        aadhaarMasked: dv?.aadhaar?.numberMasked ?? null,
        aadhaarFrontUploaded: documentState.aadhaarFrontUploaded,
        aadhaarBackUploaded: documentState.aadhaarBackUploaded,
        dlNumber: dv?.drivingLicense?.number ?? null,
        dlExpiry: dv?.drivingLicense?.expiryDate ?? null,
        dlFrontUploaded: documentState.dlFrontUploaded,
        dlBackUploaded: documentState.dlBackUploaded,
        documents: {
          profilePhoto: {
            uploaded: documentState.profilePhotoUploaded,
            url: profilePhotoUrl,
            uploadedAt: dv?.profilePhoto?.uploadedAt ?? null
          },
          aadhaar: {
            uploaded: documentState.steps.aadhaar,
            numberMasked: dv?.aadhaar?.numberMasked ?? null,
            frontImageUrl: aadhaarFrontImageUrl,
            backImageUrl: aadhaarBackImageUrl,
            uploadedAt: dv?.aadhaar?.uploadedAt ?? null
          },
          drivingLicense: {
            uploaded: documentState.steps.drivingLicense,
            number: dv?.drivingLicense?.number ?? null,
            expiryDate: dv?.drivingLicense?.expiryDate ?? null,
            frontImageUrl: dlFrontImageUrl,
            backImageUrl: dlBackImageUrl,
            uploadedAt: dv?.drivingLicense?.uploadedAt ?? null
          }
        }
      }
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching verification status'
    });
  }
};

module.exports = {
  uploadProfilePhoto,
  uploadAadhaar,
  uploadDrivingLicense,
  submitVerification,
  getVerificationStatus
};
