const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const { calculateCommissionBreakdown } = require('../services/commissionService');
const { sendPaymentReceipt, sendDriverPaymentNotification } = require('../services/emailService');

// Initialize Razorpay
const razorpayPayment = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log('✅ Razorpay initialized with key:', process.env.RAZORPAY_KEY_ID?.substring(0, 15) + '...');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay order for payment
 * @access  Private (Passenger)
 */
exports.createPaymentOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const passengerId = req.user._id;
    
    console.log('=== CREATE PAYMENT ORDER ===');
    console.log('Booking ID:', bookingId);
    console.log('Passenger ID:', passengerId);
    console.log('User:', req.user.email);
    
    // Get booking with ride details
    const booking = await Booking.findById(bookingId).populate('rideId');
    
    if (!booking) {
      console.log('❌ Booking not found');
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    console.log('✅ Booking found - Status:', booking.status, 'Fare:', booking.totalFare);
    
    // Verify passenger owns this booking
    if (booking.passengerId.toString() !== passengerId.toString()) {
      console.log('❌ Unauthorized access');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to booking'
      });
    }
    
    // Check if booking is accepted
    if (booking.status !== 'accepted') {
      console.log('❌ Booking not accepted');
      return res.status(400).json({
        success: false,
        message: 'Booking is not in accepted status. Current status: ' + booking.status
      });
    }
    
    // Check if payment already exists
    const existingTransaction = await Transaction.findOne({
      bookingId,
      paymentStatus: { $in: ['captured', 'pending', 'created'] }
    });
    
    if (existingTransaction) {
      console.log('⚠️ Payment already exists, returning existing order');
      return res.status(200).json({
        success: true,
        message: 'Payment order already exists',
        data: {
          orderId: existingTransaction.razorpayOrderId,
          amount: Math.round(booking.totalFare * 100),
          currency: 'INR',
          transactionId: existingTransaction._id,
          booking: {
            id: booking._id,
            pickupLocation: booking.pickupLocation,
            dropLocation: booking.dropLocation,
            totalFare: booking.totalFare,
            seatsBooked: booking.seatsBooked
          },
          razorpayKeyId: process.env.RAZORPAY_KEY_ID
        }
      });
    }
    
    // Get driver ID from the ride
    const driverId = booking.rideId?.driverId || booking.rideId?.driver;
    
    if (!driverId) {
      console.log('❌ Driver ID not found');
      return res.status(400).json({
        success: false,
        message: 'Driver information not found for this booking'
      });
    }
    
    console.log('✅ Driver ID:', driverId);
    
    // Calculate commission breakdown
    const commissionBreakdown = calculateCommissionBreakdown(
      booking.totalFare,
      process.env.PLATFORM_COMMISSION_PERCENT || 15,
      process.env.GST_PERCENT || 18
    );
    
    console.log('Commission breakdown:', commissionBreakdown);
    
    // Create Razorpay order with SHORT receipt (under 40 chars)
    const shortBookingId = bookingId.toString().slice(-12);
    const receipt = `bk_${shortBookingId}`;
    
    console.log('Receipt:', receipt, '(length:', receipt.length, ')');
    
    const razorpayOrderOptions = {
      amount: Math.round(booking.totalFare * 100), // Amount in paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        bookingId: bookingId.toString(),
        passengerId: passengerId.toString(),
        driverId: driverId.toString(),
        pickup: booking.pickupLocation || 'N/A',
        drop: booking.dropLocation || 'N/A'
      }
    };
    
    console.log('Creating Razorpay order...');
    
    const razorpayOrder = await razorpayPayment.orders.create(razorpayOrderOptions);
    
    console.log('✅ Razorpay order created:', razorpayOrder.id);
    
    // Create transaction record
    const transaction = new Transaction({
      bookingId,
      passengerId,
      driverId: driverId,
      razorpayOrderId: razorpayOrder.id,
      ...commissionBreakdown,
      paymentStatus: 'created',
      payoutStatus: 'pending',
      passengerEmail: req.user.email,
      passengerPhone: req.user.phone
    });
    
    await transaction.save();
    
    console.log('✅ Transaction saved:', transaction._id);
    
    // Update booking payment status
    booking.paymentStatus = 'pending';
    await booking.save();
    
    console.log('✅ Booking updated');
    console.log('=== PAYMENT ORDER SUCCESS ===');
    
    // Return order details for frontend
    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        transactionId: transaction._id,
        booking: {
          id: booking._id,
          pickupLocation: booking.pickupLocation,
          dropLocation: booking.dropLocation,
          totalFare: booking.totalFare,
          seatsBooked: booking.seatsBooked
        },
        commissionBreakdown: commissionBreakdown.breakdown,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      }
    });
    
  } catch (error) {
    console.error('=== PAYMENT ORDER ERROR ===');
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/payments/verify-payment
 * @desc    Verify Razorpay payment signature
 * @access  Private (Passenger)
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      transactionId
    } = req.body;
    
    console.log('=== VERIFY PAYMENT ===');
    console.log('Order ID:', razorpayOrderId);
    console.log('Payment ID:', razorpayPaymentId);
    console.log('Transaction ID:', transactionId);
    console.log('User:', req.user.email);
    
    // Find transaction
    const transaction = await Transaction.findById(transactionId)
      .populate('bookingId')
      .populate('driverId', 'name email phone');
    
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
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    if (generatedSignature !== razorpaySignature) {
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
    const payment = await razorpayPayment.payments.fetch(razorpayPaymentId);
    
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
    transaction.razorpayPaymentId = razorpayPaymentId;
    transaction.razorpaySignature = razorpaySignature;
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
    
    // Send email receipts
    try {
      console.log('📧 Sending email receipts...');
      
      const populatedBooking = await Booking.findById(booking._id)
        .populate('passengerId')
        .populate({
          path: 'rideId',
          populate: { path: 'driverId' }
        });
      
      // Send receipt to passenger
      await sendPaymentReceipt(
        transaction,
        populatedBooking,
        populatedBooking.passengerId,
        populatedBooking.rideId.driverId
      );
      
      // Send notification to driver
      await sendDriverPaymentNotification(
        transaction,
        populatedBooking,
        populatedBooking.passengerId,
        populatedBooking.rideId.driverId
      );
      
      console.log('✅ Email receipts sent successfully');
    } catch (emailError) {
      console.error('❌ Error sending emails:', emailError.message);
      // Don't fail the payment if email fails
    }
    
    console.log('=== PAYMENT VERIFICATION SUCCESS ===');
    
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        transactionId: transaction._id,
        paymentId: razorpayPaymentId,
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