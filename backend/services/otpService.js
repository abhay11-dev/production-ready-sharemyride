// services/otpService.js
//
// Generation lives in Phase 1 (called from webhookController on payment
// capture). Verification is written now too, since it's pure and Phase 2
// (Start Ride) will call it as-is — no reason to split it across phases.

const crypto = require('crypto');
const RideOTP = require('../models/RideOTP');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = parseInt(process.env.RIDE_OTP_EXPIRY_MINUTES || '30', 10);
const MAX_ATTEMPTS = 5;

/** Cryptographically-random 6-digit numeric OTP (100000-999999, never a leading zero). */
function generateNumericOtp(length = OTP_LENGTH) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/** Salted SHA-256 hash. Salt is stored alongside the hash on the document. */
function hashOtp(otp, salt) {
  return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

/**
 * Create and persist a new ride OTP for a booking, invalidating any prior
 * unused OTP for the same booking (defensive — normal flow only calls this
 * once per booking, guarded by the idempotency check in webhookController).
 *
 * @returns {Promise<{ otp: string, rideOtpDoc: object }>} raw otp (for
 *   sending in the notification — never persisted in plaintext) + the saved doc.
 */
async function generateRideOtp({ bookingId, passengerId, driverId }) {
  // Invalidate any previous unused OTP for this booking so only one is ever
  // "live" at a time (prevents stale OTPs from earlier retries being usable).
  await RideOTP.updateMany(
    { booking: bookingId, used: false },
    { $set: { used: true, usedAt: new Date() } }
  );

  const otp = generateNumericOtp();
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = hashOtp(otp, salt);

  const rideOtpDoc = await RideOTP.create({
    booking: bookingId,
    passenger: passengerId,
    driver: driverId,
    otpHash,
    otpSalt: salt,
    // TEMPORARY (see model comment): cached until first reveal, then
    // nulled by otpController.revealOtp. Delete this once real email/SMS
    // delivery replaces in-app reveal.
    otpPlaintextTemp: otp,
    otpPlaintextRevealed: false,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    used: false,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS
  });

  return { otp, rideOtpDoc };
}

/**
 * One-time reveal of the cached plaintext OTP for in-app display (interim
 * measure, see model + generateRideOtp comments). Clears the plaintext
 * immediately after the first successful read so it never lingers in the
 * database longer than necessary. Callable repeatedly by the SAME caller
 * within one "session" is not supported by design — if the passenger closes
 * the app and reopens, they will no longer be able to re-reveal it via this
 * endpoint, only see that an OTP exists and its expiry (matches the
 * single-reveal, minimize-plaintext-exposure intent).
 *
 * @returns {Promise<{ found: boolean, otp?: string, alreadyRevealed?: boolean, expired?: boolean, used?: boolean }>}
 */
async function revealPlaintextOtp({ bookingId }) {
  const rideOtpDoc = await RideOTP.findOne({
    booking: bookingId,
    used: false
  }).sort({ createdAt: -1 });

  if (!rideOtpDoc) {
    return { found: false };
  }

  if (rideOtpDoc.expiresAt < new Date()) {
    return { found: true, expired: true };
  }

  if (rideOtpDoc.otpPlaintextRevealed || !rideOtpDoc.otpPlaintextTemp) {
    return { found: true, alreadyRevealed: true };
  }

  const otp = rideOtpDoc.otpPlaintextTemp;
  rideOtpDoc.otpPlaintextTemp = null;
  rideOtpDoc.otpPlaintextRevealed = true;
  await rideOtpDoc.save();

  return { found: true, otp };
}

/**
 * Verify a submitted OTP against the current live OTP for a booking.
 * Used by Phase 2's "Start Ride" endpoint. Included here so Phase 2 doesn't
 * need to touch this file again — pure function, no route/controller wiring.
 *
 * @returns {Promise<{ valid: boolean, reason?: string, rideOtpDoc?: object }>}
 */
async function verifyRideOtp({ bookingId, submittedOtp }) {
  const rideOtpDoc = await RideOTP.findOne({
    booking: bookingId,
    used: false
  }).sort({ createdAt: -1 });

  if (!rideOtpDoc) {
    return { valid: false, reason: 'OTP_NOT_FOUND' };
  }

  if (rideOtpDoc.lockedUntil && rideOtpDoc.lockedUntil > new Date()) {
    return { valid: false, reason: 'OTP_LOCKED', rideOtpDoc };
  }

  if (rideOtpDoc.expiresAt < new Date()) {
    return { valid: false, reason: 'OTP_EXPIRED', rideOtpDoc };
  }

  const candidateHash = hashOtp(submittedOtp, rideOtpDoc.otpSalt);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(candidateHash, 'hex'),
    Buffer.from(rideOtpDoc.otpHash, 'hex')
  );

  if (!isMatch) {
    rideOtpDoc.attempts += 1;
    if (rideOtpDoc.attempts >= rideOtpDoc.maxAttempts) {
      rideOtpDoc.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
    }
    await rideOtpDoc.save();
    return { valid: false, reason: 'OTP_MISMATCH', rideOtpDoc };
  }

  rideOtpDoc.used = true;
  rideOtpDoc.usedAt = new Date();
  await rideOtpDoc.save();

  return { valid: true, rideOtpDoc };
}

module.exports = {
  generateRideOtp,
  verifyRideOtp,
  revealPlaintextOtp,
  // exported for tests
  generateNumericOtp,
  hashOtp
};