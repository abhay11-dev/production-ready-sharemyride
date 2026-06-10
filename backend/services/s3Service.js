// services/s3Service.js
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl: awsGetSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.AWS_S3_BUCKET;

// Allowed MIME types for document uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ensureS3Configured = () => {
  const missing = [];
  if (!process.env.AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
  if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!BUCKET) missing.push('AWS_S3_BUCKET');

  if (missing.length > 0) {
    throw new Error(`S3 upload is not configured. Missing: ${missing.join(', ')}`);
  }
};

/**
 * Upload a file buffer to S3
 * @param {Object} file - Multer file object
 * @param {string} s3Key - Full S3 key (path in bucket)
 * @returns {Promise<{url: string, key: string}>}
 */
const uploadFileToS3 = async (file, s3Key) => {
  ensureS3Configured();

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, PDF`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5MB');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: file.buffer,
    ContentType: file.mimetype,
    // Documents are private — accessed via signed URLs only
    // Do NOT set ACL: 'public-read' for KYC documents
  });

  await s3Client.send(command);

  // Return a signed URL valid for 1 hour for immediate display
  const url = await getSignedUrl(s3Key, 3600);

  return { url, key: s3Key };
};

/**
 * Delete a file from S3
 */
const deleteFileFromS3 = async (s3Key) => {
  ensureS3Configured();

  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key });
  await s3Client.send(command);
};

/**
 * Generate a pre-signed URL for private S3 object
 * @param {string} s3Key
 * @param {number} expiresIn - seconds (default 1 hour)
 */
const getSignedUrl = async (s3Key, expiresIn = 3600) => {
  ensureS3Configured();

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return awsGetSignedUrl(s3Client, command, { expiresIn });
};

const normalizeS3Key = (value) => {
  if (!value || typeof value !== 'string') return null;

  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, '');
  }

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname;
    const pathKey = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));

    if (BUCKET && hostname === `${BUCKET}.s3.amazonaws.com`) {
      return pathKey;
    }

    if (BUCKET && hostname.startsWith(`${BUCKET}.s3.`)) {
      return pathKey;
    }

    if (hostname === 's3.amazonaws.com' || hostname.startsWith('s3.')) {
      const [bucketFromPath, ...keyParts] = pathKey.split('/');
      if (!BUCKET || bucketFromPath === BUCKET) {
        return keyParts.join('/');
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

const getObjectFromS3 = async (s3Key) => {
  ensureS3Configured();

  const key = normalizeS3Key(s3Key);
  if (!key) {
    throw new Error('S3 object key is required');
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const object = await s3Client.send(command);
  return {
    key,
    body: object.Body,
    contentType: object.ContentType || 'application/octet-stream',
    contentLength: object.ContentLength,
    lastModified: object.LastModified,
    cacheControl: object.CacheControl
  };
};

module.exports = {
  uploadFileToS3,
  deleteFileFromS3,
  getSignedUrl,
  getObjectFromS3,
  normalizeS3Key
};
