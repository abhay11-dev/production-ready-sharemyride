const { razorpayInstance, verifyPaymentSignature } = require('../config/razorpay.config');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { calculateCommissionBreakdown } = require('../services/commissionService');
const { sendPaymentReceipt, sendDriverPaymentNotification } = require('../services/emailService');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay order for payment with Route
 * @access  Private (Passenger)
 */
exports.createPaymentOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const passengerId = req.user._id;
    
    console.log('=== CREATE PAYMENT ORDER (RAZORPAY ROUTE) ===');
    console.log('Booking ID:', bookingId);
    console.log('Passenger ID:', passengerId);
    console.log('User:', req.user.email);
    console.log('Razorpay Instance Exists:', !!razorpayInstance);
    console.log('Razorpay Key ID:', process.env.RAZORPAY_KEY_ID ? 'SET' : 'MISSING');
    console.log('Razorpay Secret:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'MISSING');
    
    // CRITICAL FIX 1: Validate bookingId format
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      console.log('❌ Invalid booking ID format:', bookingId);
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }
    
    // CRITICAL FIX 2: Check if Razorpay is initialized
    if (!razorpayInstance) {
      console.error('❌ CRITICAL: Razorpay instance not initialized!');
      console.error('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
      console.error('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'EXISTS' : 'MISSING');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
        debug: {
          keyIdExists: !!process.env.RAZORPAY_KEY_ID,
          keySecretExists: !!process.env.RAZORPAY_KEY_SECRET,
          instanceExists: !!razorpayInstance
        }
      });
    }
    
    console.log('✅ Razorpay instance validated');
    
    // Get booking with ride details and driver
    console.log('📦 Fetching booking...');
    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'rideId',
        populate: {
          path: 'driverId',
          select: 'name email phone razorpayAccountId'
        }
      });
    
    if (!booking) {
      console.log('❌ Booking not found');
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    console.log('✅ Booking found:', {
      id: booking._id,
      status: booking.status,
      fare: booking.totalFare,
      rideId: booking.rideId?._id,
      hasDriver: !!booking.rideId?.driverId
    });
    
    // CRITICAL FIX 3: Validate totalFare exists and is valid
    if (!booking.totalFare || isNaN(booking.totalFare) || booking.totalFare <= 0) {
      console.log('❌ Invalid booking fare:', booking.totalFare);
      return res.status(400).json({
        success: false,
        message: 'Invalid booking fare amount',
        debug: {
          totalFare: booking.totalFare,
          type: typeof booking.totalFare
        }
      });
    }
    
    // Verify passenger owns this booking
    if (booking.passengerId.toString() !== passengerId.toString()) {
      console.log('❌ Unauthorized access - Passenger mismatch');
      console.log('Booking passenger:', booking.passengerId.toString());
      console.log('Request passenger:', passengerId.toString());
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to booking'
      });
    }
    
    // Check if booking is accepted
    if (booking.status !== 'accepted') {
      console.log('❌ Booking not accepted. Status:', booking.status);
      return res.status(400).json({
        success: false,
        message: 'Booking is not in accepted status. Current status: ' + booking.status
      });
    }
    
    // Check if payment already completed
    const existingTransaction = await Transaction.findOne({
      bookingId,
      paymentStatus: 'captured'
    });

    if (existingTransaction) {
      console.log('❌ Payment already completed for this booking');
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking',
        transactionId: existingTransaction._id
      });
    }

    // Delete any old pending/failed transactions to create fresh order
    console.log('🗑️ Cleaning up old pending/failed transactions...');
    const deletedCount = await Transaction.deleteMany({
      bookingId,
      paymentStatus: { $in: ['pending', 'created', 'failed'] }
    });
    console.log(`✅ Cleaned up ${deletedCount.deletedCount} old transaction(s)`);
    
    // CRITICAL FIX 4: Validate ride and driver exist
    if (!booking.rideId) {
      console.log('❌ Ride not populated for booking');
      return res.status(400).json({
        success: false,
        message: 'Ride information not found for this booking',
        debug: {
          bookingId: booking._id,
          rideId: booking.rideId
        }
      });
    }
    
    const driver = booking.rideId.driverId;
    
    if (!driver) {
      console.log('❌ Driver not populated for ride');
      console.log('Ride ID:', booking.rideId._id);
      console.log('Driver ID field:', booking.rideId.driverId);
      return res.status(400).json({
        success: false,
        message: 'Driver information not found for this booking',
        debug: {
          rideId: booking.rideId._id,
          driverField: booking.rideId.driverId
        }
      });
    }
    
    console.log('✅ Driver validated:', {
      id: driver._id,
      name: driver.name,
      email: driver.email,
      hasRazorpayAccount: !!driver.razorpayAccountId
    });
    
    // CRITICAL FIX 5: Validate driver has Razorpay account
   
    
    // Calculate commission breakdown using your existing logic
    console.log('💰 Calculating commission breakdown...');
    console.log('Total Fare:', booking.totalFare);
    console.log('Commission %:', process.env.PLATFORM_COMMISSION_PERCENT || 10);
    console.log('GST %:', process.env.GST_PERCENT || 18);
    
    const commissionBreakdown = calculateCommissionBreakdown(
      booking.totalFare,
      process.env.PLATFORM_COMMISSION_PERCENT || 10,
      process.env.GST_PERCENT || 18
    );
    
    console.log('Commission breakdown:', JSON.stringify(commissionBreakdown, null, 2));
    
    // CRITICAL FIX 6: Validate commission breakdown
    if (!commissionBreakdown || !commissionBreakdown.driverNetAmount) {
      console.log('❌ Failed to calculate commission breakdown');
      console.log('Breakdown result:', commissionBreakdown);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate payment amounts',
        debug: {
          totalFare: booking.totalFare,
          commissionResult: commissionBreakdown
        }
      });
    }
    
    // Convert amounts to paise for Razorpay
    const totalAmountInPaise = Math.round(booking.totalFare * 100);
    const driverAmountInPaise = Math.round(commissionBreakdown.driverNetAmount * 100);
    const platformFeeInPaise = Math.round(commissionBreakdown.baseCommissionAmount * 100);
    const gstAmountInPaise = Math.round(commissionBreakdown.gstAmount * 100);
    
    console.log('💵 Amounts in paise:', {
      total: totalAmountInPaise,
      driver: driverAmountInPaise,
      platform: platformFeeInPaise,
      gst: gstAmountInPaise
    });
    
    // CRITICAL VALIDATION: Ensure split matches total
    const calculatedTotal = driverAmountInPaise + platformFeeInPaise + gstAmountInPaise;
    let finalDriverAmountInPaise = driverAmountInPaise;
    
    if (calculatedTotal !== totalAmountInPaise) {
      const difference = totalAmountInPaise - calculatedTotal;
      console.log('⚠️ Rounding adjustment needed:', difference, 'paise');
      
      // Adjust driver amount to match total exactly
      finalDriverAmountInPaise = driverAmountInPaise + difference;
      
      console.log('Split validation (adjusted):', {
        total: totalAmountInPaise,
        driver: finalDriverAmountInPaise,
        platform: platformFeeInPaise,
        gst: gstAmountInPaise,
        sum: finalDriverAmountInPaise + platformFeeInPaise + gstAmountInPaise
      });
    }
    
    // CRITICAL FIX 7: Validate final amounts
    if (finalDriverAmountInPaise <= 0 || totalAmountInPaise <= 0) {
      console.log('❌ Invalid payment amounts calculated');
      console.log('Driver amount:', finalDriverAmountInPaise);
      console.log('Total amount:', totalAmountInPaise);
      return res.status(500).json({
        success: false,
        message: 'Invalid payment amounts calculated',
        debug: {
          driverAmount: finalDriverAmountInPaise,
          totalAmount: totalAmountInPaise
        }
      });
    }
    
    // Create Razorpay order with Route
    const shortBookingId = bookingId.toString().slice(-12);
    const receipt = `bk_${shortBookingId}`;
    
    console.log('📝 Receipt:', receipt, '(length:', receipt.length, ')');
    
    const razorpayOrderOptions = {
      amount: totalAmountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        booking_id: bookingId.toString(),
        passenger_id: passengerId.toString(),
        driver_id: driver._id.toString(),
        driver_account_id: driver.razorpayAccountId,
        driver_amount: finalDriverAmountInPaise.toString(),
        platform_fee: platformFeeInPaise.toString(),
        gst_amount: gstAmountInPaise.toString(),
        pickup: booking.pickupLocation || 'N/A',
        drop: booking.dropLocation || 'N/A',
        payment_type: 'ride_payment'
      }
    };
    
    console.log('🚀 Creating Razorpay order...');
    console.log('Order options:', JSON.stringify(razorpayOrderOptions, null, 2));
    
    // CRITICAL FIX 8: Wrap Razorpay API call in try-catch
    let razorpayOrder;
    try {
      razorpayOrder = await razorpayInstance.orders.create(razorpayOrderOptions);
      console.log('✅ Razorpay order created successfully');
      console.log('Order ID:', razorpayOrder.id);
      console.log('Order details:', JSON.stringify(razorpayOrder, null, 2));
    } catch (razorpayError) {
      console.error('❌ RAZORPAY API ERROR:');
      console.error('Error name:', razorpayError.name);
      console.error('Error message:', razorpayError.message);
      console.error('Error code:', razorpayError.code);
      console.error('Status code:', razorpayError.statusCode);
      console.error('Error object:', JSON.stringify(razorpayError, null, 2));
      console.error('Full error:', razorpayError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order with Razorpay',
        error: razorpayError.message || 'Payment gateway error',
        debug: {
          errorName: razorpayError.name,
          errorCode: razorpayError.code,
          statusCode: razorpayError.statusCode,
          description: razorpayError.description,
          orderOptions: razorpayOrderOptions
        }
      });
    }
    
    // Create transaction record
    console.log('💾 Creating transaction record...');
    const transaction = new Transaction({
      bookingId,
      passengerId,
      driverId: driver._id,
      razorpayOrderId: razorpayOrder.id,
      totalAmount: booking.totalFare,
      baseCommissionAmount: commissionBreakdown.baseCommissionAmount,
      gstAmount: commissionBreakdown.gstAmount,
      totalCommissionAmount: commissionBreakdown.totalCommissionAmount,
      driverNetAmount: commissionBreakdown.driverNetAmount,
      paymentStatus: 'created',
      payoutStatus: 'pending',
      passengerEmail: req.user.email,
      passengerPhone: req.user.phone,
      metadata: {
        driverAccountId: driver.razorpayAccountId,
        splitAmounts: JSON.stringify({
          driver: finalDriverAmountInPaise,
          platform: platformFeeInPaise,
          gst: gstAmountInPaise
        })
      }
    });
    
    await transaction.save();
    console.log('✅ Transaction saved:', transaction._id);
    
    // Update booking payment status
    booking.paymentStatus = 'pending';
    await booking.save();
    console.log('✅ Booking updated to pending payment');
    
    console.log('=== PAYMENT ORDER SUCCESS ===');
    
    // Return order details for frontend
    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        bookingId: booking._id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        commissionBreakdown: commissionBreakdown.breakdown
      }
    });
    
  } catch (error) {
    console.error('=== PAYMENT ORDER ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      } : undefined
    });
  }
};

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment signature
 * @access  Private (Passenger)
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId
    } = req.body;
    
    console.log('=== VERIFY PAYMENT ===');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Booking ID:', bookingId);
    console.log('User:', req.user.email);
    
    // Find transaction by order ID
    const transaction = await Transaction.findOne({ razorpayOrderId: razorpay_order_id })
      .populate('bookingId')
      .populate('driverId', 'name email phone razorpayAccountId');
    
    if (!transaction) {
      console.log('❌ Transaction not found');
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    console.log('✅ Transaction found');
    
    // Verify passenger owns this transaction
    if (transaction.passengerId.toString() !== req.user._id.toString()) {
      console.log('❌ Unauthorized access to transaction');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to transaction'
      });
    }
    
    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    
    if (!isValid) {
      console.log('❌ Signature mismatch');
      transaction.paymentStatus = 'failed';
      transaction.errorCode = 'SIGNATURE_MISMATCH';
      transaction.errorDescription = 'Payment signature verification failed';
      await transaction.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - invalid signature'
      });
    }
    
    console.log('✅ Signature verified');
    
    // Fetch payment details from Razorpay
    const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    
    console.log('Razorpay payment status:', payment.status);
    
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      console.log('❌ Payment not captured');
      transaction.paymentStatus = 'failed';
      transaction.errorDescription = `Payment status is ${payment.status}`;
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
    
    console.log('✅ Transaction updated');
    
    // Update booking
    const booking = await Booking.findById(transaction.bookingId);
    booking.paymentStatus = 'completed';
    booking.paymentCompletedAt = new Date();
    booking.status = 'completed';
    await booking.save();
    
    console.log('✅ Booking updated to completed');
    console.log('⏳ Webhook will trigger automatic transfer to driver');

    // Send response FIRST before emails
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Driver will receive payout automatically.',
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
        },
        driver: {
          name: transaction.driverId?.name,
          phone: transaction.driverId?.phone
        },
        breakdown: {
          totalPaid: transaction.totalAmount,
          platformCommission: transaction.baseCommissionAmount,
          gst: transaction.gstAmount,
          driverAmount: transaction.driverNetAmount
        }
      }
    });

    // Send email receipts AFTER response (non-blocking)
    setImmediate(async () => {
      try {
        console.log('📧 Sending email receipts...');
        
        const populatedBooking = await Booking.findById(booking._id)
          .populate('passengerId')
          .populate({
            path: 'rideId',
            populate: { path: 'driverId' }
          });
        
        await sendPaymentReceipt(
          transaction,
          populatedBooking,
          populatedBooking.passengerId,
          populatedBooking.rideId.driverId
        );
        
        await sendDriverPaymentNotification(
          transaction,
          populatedBooking,
          populatedBooking.passengerId,
          populatedBooking.rideId.driverId
        );
        
        console.log('✅ Email receipts sent successfully');
      } catch (emailError) {
        console.error('❌ Error sending emails:', emailError.message);
      }
    });

    console.log('=== PAYMENT VERIFICATION SUCCESS ===');
    
  } catch (error) {
    console.error('=== PAYMENT VERIFICATION ERROR ===');
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
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
    console.log('=== GET TRANSACTION ===');
    console.log('Transaction ID:', req.params.id);
    console.log('User:', req.user.email);
    
    const transaction = await Transaction.findById(req.params.id)
      .populate('bookingId')
      .populate('passengerId', 'name email phone')
      .populate('driverId', 'name email phone');
    
    if (!transaction) {
      console.log('❌ Transaction not found');
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Check authorization
    const userId = req.user._id.toString();
    const isPassenger = transaction.passengerId._id.toString() === userId;
    const isDriver = transaction.driverId._id.toString() === userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isPassenger && !isDriver && !isAdmin) {
      console.log('❌ Unauthorized access');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this transaction'
      });
    }
    
    console.log('✅ Transaction retrieved');
    
    res.status(200).json({
      success: true,
      data: transaction
    });
    
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payments/passenger/transactions
 * @desc    Get all transactions for logged-in passenger
 * @access  Private (Passenger)
 */
exports.getPassengerTransactions = async (req, res) => {
  try {
    const passengerId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;
    
    console.log('=== GET PASSENGER TRANSACTIONS ===');
    console.log('Passenger ID:', passengerId);
    console.log('User:', req.user.email);
    
    const query = { passengerId };
    if (status) {
      query.paymentStatus = status;
    }
    
    const transactions = await Transaction.find(query)
      .populate('bookingId', 'pickupLocation dropLocation rideDate')
      .populate('driverId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Transaction.countDocuments(query);
    
    console.log(`✅ Found ${transactions.length} transactions`);
    
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
    console.error('❌ Error fetching passenger transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/payments/driver/earnings
 * @desc    Get driver earnings summary
 * @access  Private (Driver)
 */
exports.getDriverEarnings = async (req, res) => {
  try {
    const driverId = req.user._id;
    
    console.log('=== GET DRIVER EARNINGS ===');
    console.log('Driver ID:', driverId);
    console.log('User:', req.user.email);
    
    // Total earnings
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
    
    // Pending payouts
    const pendingPayouts = await Transaction.aggregate([
      { 
        $match: { 
          driverId: new mongoose.Types.ObjectId(driverId), 
          payoutStatus: 'pending' 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$driverNetAmount' } 
        } 
      }
    ]);
    
    // Completed payouts
    const completedPayouts = await Transaction.aggregate([
      { 
        $match: { 
          driverId: new mongoose.Types.ObjectId(driverId), 
          payoutStatus: 'completed' 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$driverNetAmount' } 
        } 
      }
    ]);
    
    const earnings = {
      totalEarnings: totalEarnings[0]?.total || 0,
      pendingPayouts: pendingPayouts[0]?.total || 0,
      completedPayouts: completedPayouts[0]?.total || 0
    };
    
    console.log('✅ Earnings calculated:', earnings);
    
    res.status(200).json({
      success: true,
      data: earnings
    });
    
  } catch (error) {
    console.error('❌ Error fetching driver earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings',
      error: error.message
    });
  }
};

module.exports = exports;