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
    
    // Validate bookingId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }
    
    // Check Razorpay instance
    if (!razorpayInstance) {
      console.error('❌ Razorpay not initialized');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please check server configuration.'
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
    console.log('Driver ID:', booking.driverId || 'NOT SET');
    
    // Verify ownership
    if (booking.passengerId.toString() !== passengerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this booking'
      });
    }
    
    // Check if already paid
    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid'
      });
    }
    
    // Validate fare
    if (!booking.totalFare || booking.totalFare <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking fare'
      });
    }
    
    // Clean up old transactions
    await Transaction.deleteMany({
      bookingId,
      paymentStatus: { $in: ['pending', 'created', 'failed'] }
    });
    
    // Convert to paise (Razorpay uses paise, not rupees)
    const amountInPaise = Math.round(booking.totalFare * 100);
    
    console.log('💵 Amount:', amountInPaise, 'paise (₹' + booking.totalFare + ')');
    
    // Create simple Razorpay order (NO ROUTE, NO SPLITS)
    const receipt = `test_${bookingId.toString().slice(-8)}_${Date.now()}`;
    
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        booking_id: bookingId.toString(),
        passenger_id: passengerId.toString(),
        test_mode: 'true',
        mode: 'test_no_driver'
      }
    };
    
    console.log('🚀 Creating Razorpay order...');
    console.log('Options:', JSON.stringify(orderOptions, null, 2));
    
    let razorpayOrder;
    try {
      razorpayOrder = await razorpayInstance.orders.create(orderOptions);
      console.log('✅ Razorpay Order created successfully:', razorpayOrder.id);
      console.log('Order details:', JSON.stringify(razorpayOrder, null, 2));
    } catch (razorpayError) {
      console.error('❌ Razorpay API Error:', razorpayError.message);
      console.error('Error Details:', JSON.stringify(razorpayError, null, 2));
      console.error('Full Error:', razorpayError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order with Razorpay',
        error: razorpayError.message,
        details: 'Please check Razorpay credentials and configuration'
      });
    }
    
    // TEST MODE: Use passenger as driver fallback
    const effectiveDriverId = booking.driverId || passengerId;
    
    console.log('Using driver ID:', effectiveDriverId, '(fallback to passenger in test mode)');
    
    // Save transaction (minimal fields for test mode)
    const transaction = new Transaction({
      bookingId,
      passengerId,
      driverId: effectiveDriverId, // Required field - use fallback
      razorpayOrderId: razorpayOrder.id,
      totalAmount: booking.totalFare,
      baseCommissionAmount: 0,
      gstAmount: 0,
      totalCommissionAmount: 0,
      driverNetAmount: booking.totalFare,
      paymentStatus: 'created',
      payoutStatus: 'pending',
      passengerEmail: req.user.email || 'test@example.com',
      passengerPhone: req.user.phone || '0000000000',
      metadata: {
        paymentMode: 'test',
        note: 'Test mode payment - no driver splits',
        testMode: true,
        driverFallback: !booking.driverId
      }
    });
    
    try {
      await transaction.save();
      console.log('✅ Transaction saved:', transaction._id);
    } catch (dbError) {
      console.error('❌ Database Error saving transaction:', dbError.message);
      console.error('Validation errors:', dbError.errors);
      
      // Try to cleanup the Razorpay order (optional)
      // Note: Razorpay doesn't have a delete order API
      
      return res.status(500).json({
        success: false,
        message: 'Failed to save transaction to database',
        error: dbError.message
      });
    }
    
    // Update booking status
    try {
      booking.paymentStatus = 'pending';
      await booking.save();
      console.log('✅ Booking status updated to pending');
    } catch (bookingError) {
      console.error('⚠️ Warning: Could not update booking status:', bookingError.message);
      // Continue anyway - transaction is created
    }
    
    console.log('=== ORDER CREATED SUCCESSFULLY ===');
    
    // Return order details to frontend
    res.status(201).json({
      success: true,
      message: 'Payment order created successfully (TEST MODE)',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        bookingId: booking._id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        transactionId: transaction._id
      },
      testMode: true
    });
    
  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while creating payment order',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    // Validate inputs
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters'
      });
    }
    
    // Find transaction
    const transaction = await Transaction.findOne({ 
      razorpayOrderId: razorpay_order_id 
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found for this order'
      });
    }
    
    // Check if already verified
    if (transaction.paymentStatus === 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Payment already verified for this transaction'
      });
    }
    
    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    
    if (!isValid) {
      console.log('❌ Invalid payment signature');
      transaction.paymentStatus = 'failed';
      transaction.metadata.failureReason = 'Invalid signature';
      await transaction.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - invalid signature'
      });
    }
    
    console.log('✅ Signature verified successfully');
    
    // Fetch payment details from Razorpay
    let payment;
    try {
      payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
      console.log('✅ Payment fetched from Razorpay:', payment.status);
    } catch (fetchError) {
      console.error('❌ Error fetching payment from Razorpay:', fetchError.message);
      return res.status(500).json({
        success: false,
        message: 'Could not verify payment with Razorpay'
      });
    }
    
    // Check payment status
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      console.log('❌ Payment not successful. Status:', payment.status);
      transaction.paymentStatus = 'failed';
      transaction.metadata.failureReason = `Payment status: ${payment.status}`;
      await transaction.save();
      
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Status: ${payment.status}`
      });
    }
    
    // Update transaction
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.paymentStatus = 'captured';
    transaction.paymentCapturedAt = new Date();
    transaction.paymentMethod = payment.method || 'unknown';
    await transaction.save();
    
    console.log('✅ Transaction updated successfully');
    
    // Update booking
    const booking = await Booking.findById(transaction.bookingId);
    if (booking) {
      booking.paymentStatus = 'completed';
      booking.paymentCompletedAt = new Date();
      booking.status = 'completed';
      await booking.save();
      console.log('✅ Booking marked as completed');
    }
    
    console.log('=== PAYMENT VERIFICATION SUCCESSFUL ===');
    
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'captured',
        amount: transaction.totalAmount,
        booking: booking ? {
          id: booking._id,
          status: booking.status,
          paymentStatus: booking.paymentStatus
        } : null
      },
      testMode: true
    });
    
  } catch (error) {
    console.error('=== ERROR VERIFYING PAYMENT ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
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
    console.error('Error fetching transaction:', error);
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
    console.error('Error fetching passenger transactions:', error);
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
    console.error('Error fetching driver earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings',
      error: error.message
    });
  }
};

module.exports = exports;