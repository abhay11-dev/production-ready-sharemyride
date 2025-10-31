// controllers/payoutController.js
const Payout = require('../models/Payout');
const Transaction = require('../models/Transaction');
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
        razorpayxFundAccountId: bankAccount.razorpayxFundAccountId
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
      .populate('transactionId', 'totalAmount razorpayPaymentId')
      .populate('bookingId', 'pickupLocation dropLocation')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Payout.countDocuments(query);
    
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
      .populate('bookingId');
    
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
    
    res.status(200).json({
      success: true,
      data: payout
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
    
    res.status(200).json({
      success: true,
      data: status
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

module.exports = exports;