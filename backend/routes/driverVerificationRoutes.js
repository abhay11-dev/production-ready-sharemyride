// routes/driverVerificationRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const { protect } = require('../middleware/auth');
const {
  uploadProfilePhoto,
  uploadAadhaar,
  uploadDrivingLicense,
  submitVerification,
  getVerificationStatus
} = require('../controllers/driverVerificationController');

// ─── Multer configuration ─────────────────────────────────────────────────────
// Uses memory storage so files are available as req.file.buffer for S3 upload.
// 5 MB limit per file; images and PDFs allowed.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ─── Multer error handler ─────────────────────────────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5 MB.'
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────
// All routes require a valid JWT (protect middleware)

// GET  /api/driver-verification/status
router.get('/status', protect, getVerificationStatus);

// POST /api/driver-verification/profile-photo
// Field name: "photo"  (single file)
router.post(
  '/profile-photo',
  protect,
  upload.single('photo'),
  handleMulterError,
  uploadProfilePhoto
);

// POST /api/driver-verification/aadhaar
// Field names: "frontImage" + "backImage"  (two files)
router.post(
  '/aadhaar',
  protect,
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
  ]),
  handleMulterError,
  uploadAadhaar
);

// POST /api/driver-verification/driving-license
// Field names: "frontImage" + "backImage"  (two files)
router.post(
  '/driving-license',
  protect,
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
  ]),
  handleMulterError,
  uploadDrivingLicense
);

// POST /api/driver-verification/submit
// No file — just marks the application as submitted for admin review
router.post('/submit', protect, submitVerification);

module.exports = router;
