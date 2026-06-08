// middleware/uploadMiddleware.js
const multer = require('multer');

// Use memory storage — files go directly to S3, never touch disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, PDF allowed.'), false);
  }
};

const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

// Single file uploads
const uploadSingle = (fieldName) =>
  multer({ storage, fileFilter, limits }).single(fieldName);

// Multi-field uploads (front + back for documents)
const uploadDocumentPair = multer({ storage, fileFilter, limits }).fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 }
]);

// Error handler for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Max 5MB allowed.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { uploadSingle, uploadDocumentPair, handleUploadError };