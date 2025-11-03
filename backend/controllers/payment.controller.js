const { razorpayInstance, verifyPaymentSignature } = require('../config/razorpay.config');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');

/**
 * TEST MODE PAYMENT CONTROLLER
 * Simplified version - bypasses all driver checks
 * Only validates basic booking info and creates Razorpay order
 */

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay order (TEST MODE - No validations)
 * @access  Private (Passenger)
 */
exports.createPaymentOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const passengerId = req.user._id;
    
    console.log('=== TEST MODE: CREATE PAYMENT ORDER ===');
    console.log('Booking ID:', bookingId);
    console.log('Passenger ID:', passengerId);
    
    // Basic validation
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }
    
    // Check Razorpay instance
    if (!razorpayInstance) {
      console.error('❌ Razorpay not initialized');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured'
      });
    }
    
    // Get booking (minimal populate)
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    console.log('✅ Booking found:', booking._id);
    console.log('Fare:', booking.totalFare);
    
    // Verify ownership
    if (booking.passengerId.toString() !== passengerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Clean up old transactions
    await Transaction.deleteMany({
      bookingId,
      paymentStatus: { $in: ['pending', 'created', 'failed'] }
    });
    
    // Convert to paise
    const amountInPaise = Math.round(booking.totalFare * 100);
    
    console.log('💵 Amount:', amountInPaise, 'paise (₹' + booking.totalFare + ')');
    
    // Create simple Razorpay order (NO ROUTE, NO SPLITS)
    const receipt = `test_${bookingId.toString().slice(-8)}`;
    
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        booking_id: bookingId.toString(),
        passenger_id: passengerId.toString(),
        test_mode: 'true'
      }
    };
    
    console.log('🚀 Creating Razorpay order...');
    console.log('Options:', orderOptions);
    
    let razorpayOrder;
    try {
      razorpayOrder = await razorpayInstance.orders.create(orderOptions);
      console.log('✅ Order created:', razorpayOrder.id);
    } catch (razorpayError) {
      console.error('❌ Razorpay Error:', razorpayError.message);
      console.error('Details:', razorpayError);
      
      return res.status(500).json({
        success: false,
        message: 'Razorpay API error',
        error: razorpayError.message
      });
    }
    
    // Save transaction with ALL REQUIRED FIELDS
    const transaction = new Transaction({
      bookingId,
      passengerId,
      driverId: booking.driverId || passengerId, // Use passenger as fallback in test mode
      razorpayOrderId: razorpayOrder.id,
      totalAmount: booking.totalFare,
      
      // REQUIRED FIELDS - Set to 0 in test mode
      baseCommissionAmount: 0,
      gstAmount: 0,
      totalCommissionAmount: 0,
      platformTotalAmount: 0, // THIS WAS MISSING!
      driverNetAmount: booking.totalFare,
      
      paymentStatus: 'created',
      payoutStatus: 'pending',
      passengerEmail: req.user.email,
      passengerPhone: req.user.phone || 'N/A',
      metadata: {
        paymentMode: 'test',
        note: 'Test mode payment - no driver splits'
      }
    });
    
    await transaction.save();
    console.log('✅ Transaction saved:', transaction._id);
    
    // Update booking
    booking.paymentStatus = 'pending';
    await booking.save();
    
    console.log('=== ORDER CREATED SUCCESSFULLY ===');
    
    // Return order details
    res.status(201).json({
      success: true,
      message: 'Payment order created (TEST MODE)',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        bookingId: booking._id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      }
    });
    
  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment
 * @access  Private (Passenger)
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;
    
    console.log('=== VERIFY PAYMENT ===');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    
    // Find transaction
    const transaction = await Transaction.findOne({ 
      razorpayOrderId: razorpay_order_id 
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    
    if (!isValid) {
      console.log('❌ Invalid signature');
      transaction.paymentStatus = 'failed';
      await transaction.save();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }
    
    console.log('✅ Signature verified');
    
    // Fetch payment from Razorpay
    const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      transaction.paymentStatus = 'failed';
      await transaction.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }
    
    // Update transaction
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.paymentStatus = 'captured';
    transaction.paymentCapturedAt = new Date();
    transaction.paymentMethod = payment.method || 'unknown';
    await transaction.save();
    
    console.log('✅ Transaction updated');
    
    // Update booking
    const booking = await Booking.findById(transaction.bookingId);
    booking.paymentStatus = 'completed';
    booking.paymentCompletedAt = new Date();
    booking.status = 'completed';
    await booking.save();
    
    console.log('✅ Booking completed');
    
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully (TEST MODE)',
      data: {
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'captured',
        amount: transaction.totalAmount,
        booking: {
          id: booking._id,
          status: booking.status,
          paymentStatus: booking.paymentStatus
        }
      }
    });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payments/transaction/:id
 * @desc    Get transaction details
 * @access  Private
 */
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('bookingId')
      .populate('passengerId', 'name email phone')
      .populate('driverId', 'name email phone');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payments/passenger/transactions
 * @desc    Get passenger transactions
 * @access  Private (Passenger)
 */
exports.getPassengerTransactions = async (req, res) => {
  try {
    const passengerId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    
    const transactions = await Transaction.find({ passengerId })
      .populate('bookingId', 'pickupLocation dropLocation')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Transaction.countDocuments({ passengerId });
    
    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payments/driver/earnings
 * @desc    Get driver earnings
 * @access  Private (Driver)
 */
exports.getDriverEarnings = async (req, res) => {
  try {
    const driverId = req.user._id;
    
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
    
    res.status(200).json({
      success: true,
      data: {
        totalEarnings: totalEarnings[0]?.total || 0,
        pendingPayouts: 0,
        completedPayouts: 0
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings',
      error: error.message
    });
  }
};

module.exports = exports;