const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const { generateReceipt } = require('../services/pdfReceiptService');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const RECEIPT_CONFIG = {
  GENERATION_TIMEOUT_MS: 30000, // 30 seconds
  ALLOWED_PAYMENT_STATUSES: ['captured', 'success'],
  FILE_PREFIX: 'RideShare_Receipt'
};

// Logger utility (fallback if not available)
const logger = {
  info: (...args) => console.log('[INFO]:', ...args),
  warn: (...args) => console.warn('[WARN]:', ...args),
  error: (...args) => console.error('[ERROR]:', ...args),
  debug: (...args) => console.debug('[DEBUG]:', ...args)
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validates booking authorization
 */
const validateAuthorization = (booking, userId) => {
  const isPassenger = booking.passengerId._id.toString() === userId.toString();
  const isDriver = booking.rideId?.driverId?._id?.toString() === userId.toString();
  
  return {
    isAuthorized: isPassenger || isDriver,
    role: isPassenger ? 'passenger' : isDriver ? 'driver' : null,
    userId
  };
};

/**
 * Safely deletes a file with error handling
 */
const safeDeleteFile = async (filepath) => {
  try {
    await fs.unlink(filepath);
    logger.debug(`Temporary file deleted: ${filepath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn(`Failed to delete temporary file: ${filepath}`, { error: error.message });
    }
  }
};

/**
 * Generates download filename with timestamp
 */
const generateDownloadFilename = (bookingId) => {
  const timestamp = new Date().getTime();
  return `${RECEIPT_CONFIG.FILE_PREFIX}_${bookingId}_${timestamp}.pdf`;
};

// ============================================
// ROUTE: DOWNLOAD RECEIPT
// ============================================

/**
 * @route   GET /api/receipts/download/:bookingId
 * @desc    Generate and download PDF receipt
 * @access  Private
 */
router.get('/download/:bookingId', protect, async (req, res) => {
  const startTime = Date.now();
  const { bookingId } = req.params;
  const userId = req.user._id;
  let tempFilePath = null;

  try {
    // Input validation
    if (!bookingId || !bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn('Invalid booking ID format', { bookingId, userId });
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid booking ID format' 
      });
    }

    logger.info('Receipt generation started', { bookingId, userId });

    // Fetch booking with related data
    const booking = await Booking.findById(bookingId)
      .populate('passengerId', 'name email phone')
      .populate({
        path: 'rideId',
        populate: { 
          path: 'driverId',
          select: 'name phone email'
        }
      })
      .lean();

    if (!booking) {
      logger.warn('Booking not found', { bookingId, userId });
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Authorization check
    const auth = validateAuthorization(booking, userId);
    if (!auth.isAuthorized) {
      logger.warn('Unauthorized receipt access attempt', { 
        bookingId, 
        userId, 
        passengerId: booking.passengerId._id,
        driverId: booking.rideId?.driverId?._id 
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized. You can only access receipts for your own bookings.' 
      });
    }

    // Fetch transaction
    const transaction = await Transaction.findOne({ 
      bookingId, 
      paymentStatus: { $in: RECEIPT_CONFIG.ALLOWED_PAYMENT_STATUSES }
    }).lean();

    if (!transaction) {
      logger.warn('Transaction not found or incomplete', { bookingId, userId });
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not completed. Receipt cannot be generated.' 
      });
    }

    logger.info('Transaction validated', { 
      bookingId, 
      transactionId: transaction._id,
      amount: booking.totalFare
    });

    // Generate PDF with timeout
    const pdfGenerationPromise = generateReceipt(
      transaction, 
      booking, 
      booking.passengerId, 
      booking.rideId.driverId
    );

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('PDF generation timeout')), 
      RECEIPT_CONFIG.GENERATION_TIMEOUT_MS)
    );

    const { filepath, filename } = await Promise.race([
      pdfGenerationPromise,
      timeoutPromise
    ]);

    tempFilePath = filepath;
    const generationTime = Date.now() - startTime;

    logger.info('PDF generated successfully', { 
      bookingId, 
      filepath,
      generationTime 
    });

    // Send file to client
    const downloadFilename = generateDownloadFilename(booking._id);
    
    res.download(filepath, downloadFilename, async (err) => {
      if (err) {
        logger.error('Failed to send receipt file', { 
          bookingId, 
          error: err.message 
        });
        
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'Failed to download receipt'
          });
        }
      } else {
        logger.info('Receipt sent successfully', {
          bookingId,
          userId,
          role: auth.role,
          generationTime
        });
      }

      // Cleanup temporary file
      if (tempFilePath) {
        await safeDeleteFile(tempFilePath);
      }
    });

  } catch (error) {
    logger.error('Receipt generation failed', { 
      bookingId, 
      userId,
      error: error.message,
      stack: error.stack
    });

    // Cleanup on error
    if (tempFilePath) {
      await safeDeleteFile(tempFilePath);
    }

    // Don't send response if headers already sent
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate receipt. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { 
          error: error.message 
        })
      });
    }
  }
});

// ============================================
// ROUTE: PREVIEW RECEIPT
// ============================================

/**
 * @route   GET /api/receipts/preview/:bookingId
 * @desc    Preview receipt details without downloading
 * @access  Private
 */
router.get('/preview/:bookingId', protect, async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  try {
    // Input validation
    if (!bookingId || !bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid booking ID format' 
      });
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate('passengerId', 'name email phone')
      .populate({
        path: 'rideId',
        populate: { 
          path: 'driverId',
          select: 'name phone email'
        }
      })
      .lean();

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Authorization check
    const auth = validateAuthorization(booking, userId);
    if (!auth.isAuthorized) {
      logger.warn('Unauthorized preview access', { bookingId, userId });
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access' 
      });
    }

    // Fetch transaction
    const transaction = await Transaction.findOne({ 
      bookingId, 
      paymentStatus: { $in: RECEIPT_CONFIG.ALLOWED_PAYMENT_STATUSES }
    }).lean();

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    // Format and return preview data
    const receiptData = {
      receipt: {
        receiptNumber: transaction._id.toString().slice(-8).toUpperCase(),
        generatedAt: new Date().toISOString(),
        userRole: auth.role
      },
      transaction: {
        id: transaction._id,
        paymentId: transaction.razorpayPaymentId,
        paymentDate: transaction.paymentCapturedAt || transaction.createdAt,
        paymentMethod: transaction.paymentMethod || 'card',
        status: transaction.paymentStatus
      },
      ride: {
        date: booking.rideId.date,
        time: booking.rideId.time,
        from: booking.pickupLocation,
        to: booking.dropLocation,
        seats: booking.seatsBooked,
        bookingStatus: booking.status
      },
      passenger: {
        name: booking.passengerId.name,
        email: booking.passengerId.email,
        phone: booking.passengerId.phone
      },
      driver: {
        name: booking.rideId.driverId.name,
        phone: booking.rideId.driverId.phone || booking.rideId.phoneNumber,
        email: booking.rideId.driverId.email,
        vehicle: booking.rideId.vehicleNumber
      },
      payment: {
        baseFare: booking.baseFare || 0,
        platformFee: booking.platformFee || 0,
        gst: booking.gst || 0,
        totalFare: booking.totalFare,
        commission: transaction.baseCommissionAmount || 0,
        gstOnCommission: transaction.gstAmount || 0,
        driverNetAmount: transaction.driverNetAmount || 0
      }
    };

    logger.info('Receipt preview generated', { bookingId, userId, role: auth.role });

    res.json({
      success: true,
      data: receiptData
    });

  } catch (error) {
    logger.error('Receipt preview failed', { 
      bookingId, 
      userId,
      error: error.message 
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to preview receipt',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message 
      })
    });
  }
});

// ============================================
// ROUTE: RECEIPT STATUS
// ============================================

/**
 * @route   GET /api/receipts/status/:bookingId
 * @desc    Check if receipt is available for a booking
 * @access  Private
 */
router.get('/status/:bookingId', protect, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    if (!bookingId || !bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid booking ID format' 
      });
    }

    const booking = await Booking.findById(bookingId)
      .select('passengerId rideId status')
      .populate('rideId', 'driverId')
      .lean();

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    const auth = validateAuthorization(booking, userId);
    if (!auth.isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access' 
      });
    }

    const transaction = await Transaction.findOne({ 
      bookingId, 
      paymentStatus: { $in: RECEIPT_CONFIG.ALLOWED_PAYMENT_STATUSES }
    }).select('paymentStatus paymentCapturedAt').lean();

    res.json({
      success: true,
      data: {
        receiptAvailable: !!transaction,
        bookingStatus: booking.status,
        paymentStatus: transaction?.paymentStatus || 'pending',
        paymentDate: transaction?.paymentCapturedAt || null
      }
    });

  } catch (error) {
    logger.error('Receipt status check failed', { 
      bookingId: req.params.bookingId,
      error: error.message 
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check receipt status' 
    });
  }
});

module.exports = router;