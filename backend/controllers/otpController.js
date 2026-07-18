// controllers/otpController.js
//
// Interim in-app OTP endpoints, per explicit decision (2026-07-17): real
// email/SMS delivery isn't wired yet, so passenger/driver read the OTP from
// the app instead. Both endpoints are booking-scoped and require the caller
// to be the booking's passenger OR driver — same authorization pattern as
// bookingController.getBookingById.

const Booking = require('../models/Booking');
const RideOTP = require('../models/RideOTP');
const { revealPlaintextOtp } = require('../services/otpService');

async function assertBookingParty(bookingId, userId) {
  const booking = await Booking.findById(bookingId).select('passenger driver');
  if (!booking) return { authorized: false, status: 404, message: 'Booking not found' };

  const passengerId = booking.passenger?.toString();
  const driverId = booking.driver?.toString();
  const uid = userId.toString();

  if (uid !== passengerId && uid !== driverId) {
    return { authorized: false, status: 403, message: 'Not authorized for this booking' };
  }
  return { authorized: true, booking };
}

/**
 * @route   GET /api/otp/booking/:bookingId/reveal
 * @desc    One-time plaintext reveal of the current ride OTP (interim, see
 *          file header). Meant to be called by the PASSENGER's client so
 *          they can read it aloud to the driver, per the spec's Phase 2
 *          flow ("Passenger tells OTP. Driver enters OTP."). Driver access
 *          is intentionally also allowed here since Phase 1 has no separate
 *          "driver view" restriction elsewhere in the codebase — tighten to
 *          passenger-only if you want to enforce that at the API layer too.
 * @access  Private (booking passenger or driver)
 */
exports.revealOtp = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const check = await assertBookingParty(bookingId, userId);
    if (!check.authorized) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const result = await revealPlaintextOtp({ bookingId });

    if (!result.found) {
      return res.status(404).json({
        success: false,
        message: 'No OTP has been generated for this booking yet'
      });
    }

    if (result.expired) {
      return res.status(410).json({
        success: false,
        message: 'This OTP has expired. Ask the driver to request a new one.',
        code: 'OTP_EXPIRED'
      });
    }

    if (result.alreadyRevealed) {
      return res.status(409).json({
        success: false,
        message: 'This OTP has already been revealed once and cannot be shown again for security reasons.',
        code: 'OTP_ALREADY_REVEALED'
      });
    }

    return res.status(200).json({
      success: true,
      data: { otp: result.otp }
    });

  } catch (error) {
    console.error('❌ Error revealing OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reveal OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

/**
 * @route   GET /api/otp/booking/:bookingId/status
 * @desc    Non-sensitive status check — does an OTP exist, is it expired,
 *          is it used, has it already been revealed. Never returns the OTP
 *          itself. Safe to poll from the UI to decide whether to show a
 *          "Reveal OTP" button, an "expired, ask driver to regenerate"
 *          message, etc.
 * @access  Private (booking passenger or driver)
 */
exports.getOtpStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const check = await assertBookingParty(bookingId, userId);
    if (!check.authorized) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const rideOtpDoc = await RideOTP.findOne({ booking: bookingId })
      .sort({ createdAt: -1 })
      .select('used usedAt expiresAt otpPlaintextRevealed attempts maxAttempts lockedUntil createdAt');

    if (!rideOtpDoc) {
      return res.status(200).json({
        success: true,
        data: { exists: false }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        exists: true,
        used: rideOtpDoc.used,
        usedAt: rideOtpDoc.usedAt,
        expired: rideOtpDoc.expiresAt < new Date(),
        expiresAt: rideOtpDoc.expiresAt,
        revealed: rideOtpDoc.otpPlaintextRevealed,
        locked: !!(rideOtpDoc.lockedUntil && rideOtpDoc.lockedUntil > new Date()),
        attemptsRemaining: Math.max(0, rideOtpDoc.maxAttempts - rideOtpDoc.attempts)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching OTP status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch OTP status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

module.exports = exports;