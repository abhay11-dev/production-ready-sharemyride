// controllers/payoutController.js
const Payout = require('../models/Payout');
const Transaction = require('../models/Transaction');
const Ride = require('../models/Ride');
const DriverBankAccount = require('../models/DriverBankAccount');
const {
  createDriverPayout,
  setupDriverForPayouts,
  retryFailedPayout,
  getPayoutStatus
} = require('../services/payoutService');

/**
 * @route   POST /api/payouts/trigger/:transactionId
 * @desc    Manually trigger payout for a transaction (Admin only)
 * @access  Private (Admin)
 */
exports.triggerPayout = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { mode = 'IMPS' } = req.body;
    
    // Verify transaction exists
    const transaction = await Transaction.findById(transactionId)
      .populate('rideId', 'start end')
      .populate('driverId', 'name email phone');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Check if transaction is captured
    if (transaction.paymentStatus !== 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create payout for uncaptured transaction'
      });
    }
    
    // Check if payout already exists
    const existingPayout = await Payout.findOne({ 
      transactionId,
      status: { $nin: ['failed', 'cancelled'] }
    });
    
    if (existingPayout) {
      return res.status(400).json({
        success: false,
        message: 'Payout already exists for this transaction',
        data: existingPayout
      });
    }
    
    const result = await createDriverPayout(transactionId, mode);
    
    res.status(201).json({
      success: true,
      message: 'Payout initiated successfully',
      data: result.payout
    });
    
  } catch (error) {
    console.error('Error triggering payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger payout',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/payouts/setup-driver
 * @desc    Setup driver for payouts (create contact & fund account)
 * @access  Private (Driver)
 */
exports.setupDriver = async (req, res) => {
  try {
    const driverId = req.user._id;
    
    const bankAccount = await setupDriverForPayouts(driverId);
    
    res.status(200).json({
      success: true,
      message: 'Driver setup for payouts successfully',
      data: {
        isVerified: bankAccount.isVerified,
        razorpayxContactId: bankAccount.razorpayxContactId,
        razorpayxFundAccountId: bankAccount.razorpayxFundAccountId,
        accountNumber: bankAccount.accountNumber.slice(-4), // Last 4 digits only
        ifscCode: bankAccount.ifscCode
      }
    });
    
  } catch (error) {
    console.error('Error setting up driver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup driver for payouts',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payouts/driver/history
 * @desc    Get driver's payout history
 * @access  Private (Driver)
 */
exports.getDriverPayoutHistory = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { driverId };
    if (status) {
      query.status = status;
    }
    
    const payouts = await Payout.find(query)
      .populate('transactionId', 'totalAmount razorpayPaymentId driverNetAmount')
      .populate('rideId', 'start end date time')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Payout.countDocuments(query);
    
    // Enhance payout data with booking details from rides
    const enrichedPayouts = await Promise.all(
      payouts.map(async (payout) => {
        const payoutObj = payout.toObject();
        
        // If we have rideId and bookingId, fetch booking details
        if (payout.rideId && payout.bookingId) {
          const ride = await Ride.findById(payout.rideId);
          if (ride) {
            const booking = ride.bookings.id(payout.bookingId);
            if (booking) {
              payoutObj.bookingDetails = {
                pickupPoint: booking.pickupPoint,
                dropPoint: booking.dropPoint,
                travelDistance: booking.travelDistance,
                seatsBooked: booking.seatsBooked,
                status: booking.status
              };
            }
          }
        }
        
        return payoutObj;
      })
    );
    
    res.status(200).json({
      success: true,
      data: enrichedPayouts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching payout history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payout history',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payouts/:payoutId
 * @desc    Get single payout details
 * @access  Private
 */
exports.getPayoutDetails = async (req, res) => {
  try {
    const { payoutId } = req.params;
    
    const payout = await Payout.findById(payoutId)
      .populate('transactionId')
      .populate('driverId', 'name email phone')
      .populate('rideId', 'start end date time vehicle fare');
    
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }
    
    // Check authorization
    const userId = req.user._id.toString();
    const isDriver = payout.driverId._id.toString() === userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this payout'
      });
    }
    
    const payoutObj = payout.toObject();
    
    // Fetch booking details from ride
    if (payout.rideId && payout.bookingId) {
      const ride = await Ride.findById(payout.rideId);
      if (ride) {
        const booking = ride.bookings.id(payout.bookingId);
        if (booking) {
          payoutObj.bookingDetails = {
            id: booking._id,
            pickupPoint: booking.pickupPoint,
            dropPoint: booking.dropPoint,
            pickupDistance: booking.pickupDistance,
            dropDistance: booking.dropDistance,
            travelDistance: booking.travelDistance,
            calculatedFare: booking.calculatedFare,
            seatsBooked: booking.seatsBooked,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            bookedAt: booking.bookedAt
          };
        }
      }
    }
    
    res.status(200).json({
      success: true,
      data: payoutObj
    });
    
  } catch (error) {
    console.error('Error fetching payout details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payout details',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/payouts/retry/:payoutId
 * @desc    Retry failed payout (Admin only)
 * @access  Private (Admin)
 */
exports.retryPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    
    // Verify payout exists and is in failed state
    const payout = await Payout.findById(payoutId);
    
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }
    
    if (payout.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: `Cannot retry payout with status: ${payout.status}. Only failed payouts can be retried.`
      });
    }
    
    const result = await retryFailedPayout(payoutId);
    
    res.status(200).json({
      success: true,
      message: 'Payout retry initiated',
      data: result.payout
    });
    
  } catch (error) {
    console.error('Error retrying payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry payout',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payouts/status/:razorpayxPayoutId
 * @desc    Get payout status from RazorpayX
 * @access  Private (Admin)
 */
exports.checkPayoutStatus = async (req, res) => {
  try {
    const { razorpayxPayoutId } = req.params;
    
    const status = await getPayoutStatus(razorpayxPayoutId);
    
    // Update local payout record
    const payout = await Payout.findOne({ razorpayxPayoutId });
    
    if (payout && status.status !== payout.status) {
      payout.status = status.status;
      payout.razorpayxResponse = status;
      await payout.save();
    }
    
    res.status(200).json({
      success: true,
      data: status,
      localPayout: payout || null
    });
    
  } catch (error) {
    console.error('Error checking payout status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payout status',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payouts/driver/summary
 * @desc    Get driver's payout summary (total, pending, completed)
 * @access  Private (Driver)
 */
exports.getDriverPayoutSummary = async (req, res) => {
  try {
    const driverId = req.user._id;
    
    const summary = await Payout.aggregate([
      { 
        $match: { 
          driverId: new mongoose.Types.ObjectId(driverId)
        } 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get total earnings from transactions
    const totalEarnings = await Transaction.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          paymentStatus: 'captured'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$driverNetAmount' }
        }
      }
    ]);
    
    // Format summary
    const formattedSummary = {
      totalEarnings: totalEarnings[0]?.total || 0,
      pending: {
        count: 0,
        amount: 0
      },
      processing: {
        count: 0,
        amount: 0
      },
      completed: {
        count: 0,
        amount: 0
      },
      failed: {
        count: 0,
        amount: 0
      }
    };
    
    summary.forEach(item => {
      if (item._id === 'pending') {
        formattedSummary.pending = {
          count: item.count,
          amount: item.totalAmount
        };
      } else if (item._id === 'processing') {
        formattedSummary.processing = {
          count: item.count,
          amount: item.totalAmount
        };
      } else if (item._id === 'completed') {
        formattedSummary.completed = {
          count: item.count,
          amount: item.totalAmount
        };
      } else if (item._id === 'failed') {
        formattedSummary.failed = {
          count: item.count,
          amount: item.totalAmount
        };
      }
    });
    
    res.status(200).json({
      success: true,
      data: formattedSummary
    });
    
  } catch (error) {
    console.error('Error fetching payout summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payout summary',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payouts/admin/pending
 * @desc    Get all pending payouts (Admin only)
 * @access  Private (Admin)
 */
exports.getPendingPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const payouts = await Payout.find({ 
      status: { $in: ['pending', 'processing'] } 
    })
      .populate('driverId', 'name email phone')
      .populate('transactionId', 'totalAmount driverNetAmount')
      .populate('rideId', 'start end date')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Payout.countDocuments({ 
      status: { $in: ['pending', 'processing'] } 
    });
    
    res.status(200).json({
      success: true,
      data: payouts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching pending payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending payouts',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/payouts/batch-trigger
 * @desc    Trigger payouts for multiple transactions (Admin only)
 * @access  Private (Admin)
 */
exports.batchTriggerPayouts = async (req, res) => {
  try {
    const { transactionIds, mode = 'IMPS' } = req.body;
    
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction IDs array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const transactionId of transactionIds) {
      try {
        const result = await createDriverPayout(transactionId, mode);
        results.push({
          transactionId,
          success: true,
          payoutId: result.payout._id
        });
      } catch (error) {
        errors.push({
          transactionId,
          success: false,
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Batch payout completed. ${results.length} successful, ${errors.length} failed.`,
      data: {
        successful: results,
        failed: errors
      }
    });
    
  } catch (error) {
    console.error('Error in batch payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch payouts',
      error: error.message
    });
  }
};

module.exports = exports;