// controllers/paymentController.js
const { razorpayInstance, verifyPaymentSignature } = require('../config/razorpay.config');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const { sendBookingConfirmationEmails } = require('../services/emailService');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay order for booking
 * @access  Private (Passenger)
 */
exports.createPaymentOrder = async (req, res) => {
  try {
    const { rideId, bookingId } = req.body;
    const passengerId = req.user._id;
    
    console.log('=== CREATE PAYMENT ORDER ===');
    console.log('Ride ID:', rideId);
    console.log('Booking ID:', bookingId);
    console.log('Passenger ID:', passengerId);
    
    if (!rideId || !bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Ride ID and Booking ID are required'
      });
    }
    
    if (!razorpayInstance) {
      console.error('❌ Razorpay not initialized');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured'
      });
    }
    
    const booking = await Booking.findById(bookingId)
      .populate('passenger', 'name email phone')
      .populate('driver', 'name email phone')
      .populate('ride');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    console.log('✅ Booking found:', booking._id);
    console.log('Status:', booking.status);
    console.log('Payment Status:', booking.paymentStatus);
    
    const ride = booking.ride;
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride information not found'
      });
    }
    
    if (booking.passenger._id.toString() !== passengerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - This is not your booking'
      });
    }
    
    if (booking.status !== 'accepted' && booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot create payment for ${booking.status} booking. Booking must be accepted by driver first.`
      });
    }
    
    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking already paid'
      });
    }
    
    let fareAmount = booking.finalAmount || booking.totalFare || booking.baseFare || 0;
    
    if (fareAmount <= 0) {
      console.error('❌ Invalid fare amount:', fareAmount);
      return res.status(400).json({
        success: false,
        message: 'Invalid fare amount for this booking',
        debug: {
          finalAmount: booking.finalAmount,
          totalFare: booking.totalFare,
          baseFare: booking.baseFare
        }
      });
    }
    
    console.log('💵 Fare Amount: ₹', fareAmount);
    
    await Transaction.deleteMany({
      bookingId,
      paymentStatus: { $in: ['pending', 'created', 'failed'] }
    });
    
    const amountInPaise = Math.round(fareAmount * 100);
    
    console.log('💵 Amount:', amountInPaise, 'paise (₹' + fareAmount + ')');
    
    const receipt = `booking_${bookingId.toString().slice(-8)}_${Date.now()}`;
    
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        booking_id: bookingId.toString(),
        ride_id: rideId.toString(),
        passenger_id: passengerId.toString(),
        driver_id: booking.driver._id.toString(),
        route: `${booking.pickupLocation} → ${booking.dropLocation}`,
        seats_booked: booking.seatsBooked || 1
      }
    };
    
    console.log('🚀 Creating Razorpay order...');
    
    let razorpayOrder;
    try {
      razorpayOrder = await razorpayInstance.orders.create(orderOptions);
      console.log('✅ Order created:', razorpayOrder.id);
    } catch (razorpayError) {
      console.error('❌ Razorpay Error:', razorpayError.message);
      console.error('Details:', razorpayError);
      
      return res.status(500).json({
        success: false,
        message: 'Razorpay API error: ' + razorpayError.message,
        error: razorpayError.message
      });
    }
    
    const transaction = new Transaction({
      rideId,
      bookingId,
      passengerId,
      driverId: booking.driver._id,
      razorpayOrderId: razorpayOrder.id,
      
      paymentStatus: 'created',
      payoutStatus: 'pending',
      
      passengerEmail: req.user.email,
      passengerPhone: req.user.phone || booking.passenger.phone || 'N/A',
      passengerName: booking.passenger.name,
      
      driverEmail: booking.driver.email,
      driverPhone: booking.driver.phone,
      driverName: booking.driver.name,
      
      metadata: {
        paymentMode: 'online',
        pickupLocation: booking.pickupLocation,
        dropLocation: booking.dropLocation,
        seatsBooked: booking.seatsBooked || 1,
        matchType: booking.matchType,
        userSearchDistance: booking.userSearchDistance,
        segmentFare: booking.segmentFare
      }
    });
    
    transaction.calculateAmounts(
      booking.baseFare,
      booking.seatsBooked || 1,
      booking.passengerServiceFee || 10,
      8,
      18
    );
    
    await transaction.save();
    console.log('✅ Transaction saved:', transaction._id);
    console.log('💰 Transaction amounts:', {
      totalAmount: transaction.totalAmount,
      driverNetAmount: transaction.driverNetAmount,
      platformCommission: transaction.platformTotalCommission
    });
    
    booking.paymentStatus = 'pending';
    booking.transactionId = transaction._id;
    await booking.save();
    
    console.log('=== ORDER CREATED SUCCESSFULLY ===');
    
    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        bookingId: booking._id,
        rideId: ride._id,
        fare: fareAmount,
        route: {
          pickup: booking.pickupLocation,
          drop: booking.dropLocation,
          seatsBooked: booking.seatsBooked || 1
        },
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
 * @desc    Verify Razorpay payment and send confirmation emails
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
        message: 'Invalid payment signature'
      });
    }
    
    console.log('✅ Signature verified');
    
    // Fetch payment details from Razorpay
    const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      transaction.paymentStatus = 'failed';
      await transaction.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment not successful',
        paymentStatus: payment.status
      });
    }
    
    // Update transaction
    await transaction.capturePayment(razorpay_payment_id, razorpay_signature);
    transaction.paymentMethod = payment.method || 'upi';
    
    // Store payment details
    if (payment.method === 'card') {
      transaction.paymentDetails = {
        cardType: payment.card?.type,
        cardLast4: payment.card?.last4,
        cardNetwork: payment.card?.network,
        bankName: payment.card?.issuer
      };
    } else if (payment.method === 'upi') {
      transaction.paymentDetails = {
        upiId: payment.vpa || 'N/A'
      };
    }
    
    await transaction.save();
    
    console.log('✅ Transaction updated');
    
    // Update booking with full population for email
    const booking = await Booking.findById(transaction.bookingId)
      .populate('passenger', 'name email phone')
      .populate('driver', 'name email phone')
      .populate('ride');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Update booking status
    await booking.completePayment(
      payment.method,
      razorpay_payment_id,
      transaction._id
    );
    
    // Store Razorpay IDs
    booking.paymentId = razorpay_payment_id;
    booking.transactionId = transaction._id;
    
    // ✅ NEW: Add razorpayPaymentId for email template
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpayOrderId = razorpay_order_id;
    booking.razorpaySignature = razorpay_signature;
    
    await booking.save();
    
    console.log('✅ Booking payment confirmed');
    
    // ===================================
    // 📧 SEND CONFIRMATION EMAILS
    // ===================================
    try {
      console.log('📧 Sending confirmation emails...');
      
      const emailResult = await sendBookingConfirmationEmails(
        booking,
        booking.ride,
        booking.driver,
        booking.passenger
      );
      
      console.log('✅ Emails sent successfully!');
      console.log('Passenger Email ID:', emailResult.passengerEmailId);
      console.log('Driver Email ID:', emailResult.driverEmailId);
      
      // Optional: Update booking to track email sent
      booking.emailSent = true;
      booking.emailSentAt = new Date();
      await booking.save();
      
    } catch (emailError) {
      // ⚠️ Don't fail the payment if email fails
      console.error('⚠️ Email sending failed (payment was successful):', emailError);
      console.error('Email error details:', emailError.message);
      
      // You can log this to a separate error tracking service
      // or save it to database for retry later
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'captured',
        amount: transaction.totalAmount,
        paymentMethod: payment.method,
        emailSent: booking.emailSent || false,
        booking: {
          id: booking._id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          pickupLocation: booking.pickupLocation,
          dropLocation: booking.dropLocation
        }
      }
    });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
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
      .populate('rideId', 'start end date time fare')
      .populate('passengerId', 'name email phone')
      .populate('driverId', 'name email phone');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    const userId = req.user._id.toString();
    if (transaction.passengerId._id.toString() !== userId && 
        transaction.driverId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
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
    const { page = 1, limit = 20, status } = req.query;
    
    const query = { passengerId };
    if (status) {
      query.paymentStatus = status;
    }
    
    const transactions = await Transaction.find(query)
      .populate('rideId', 'start end date time')
      .populate('driverId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Transaction.countDocuments(query);
    
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
 * @desc    Get driver earnings summary
 * @access  Private (Driver)
 */
exports.getDriverEarnings = async (req, res) => {
  try {
    const driverId = req.user._id;
    
    const earnings = await Transaction.aggregate([
      { 
        $match: { 
          driverId: new mongoose.Types.ObjectId(driverId), 
          paymentStatus: 'captured' 
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalEarnings: { $sum: '$driverNetAmount' },
          totalAmount: { $sum: '$totalAmount' },
          platformCommission: { $sum: '$platformTotalCommission' },
          count: { $sum: 1 }
        } 
      }
    ]);
    
    const pendingPayouts = await Transaction.aggregate([
      { 
        $match: { 
          driverId: new mongoose.Types.ObjectId(driverId),
          paymentStatus: 'captured',
          payoutStatus: 'pending'
        } 
      },
      { 
        $group: { 
          _id: null, 
          amount: { $sum: '$driverNetAmount' },
          count: { $sum: 1 }
        } 
      }
    ]);
    
    const result = earnings[0] || { totalEarnings: 0, totalAmount: 0, platformCommission: 0, count: 0 };
    const pending = pendingPayouts[0] || { amount: 0, count: 0 };
    
    res.status(200).json({
      success: true,
      data: {
        totalEarnings: result.totalEarnings,
        totalTransactions: result.count,
        totalAmount: result.totalAmount,
        platformCommission: result.platformCommission,
        pendingPayoutAmount: pending.amount,
        pendingPayoutCount: pending.count
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

/**
 * @route   GET /api/payments/booking/:bookingId
 * @desc    Get payment status for a specific booking
 * @access  Private
 */
exports.getBookingPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;
    
    const booking = await Booking.findById(bookingId)
      .populate('passenger', 'name email phone')
      .populate('driver', 'name email phone')
      .populate('ride');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.passenger._id.toString() !== userId.toString() &&
        booking.driver._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    const transaction = await Transaction.findOne({ bookingId })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        booking: {
          id: booking._id,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          paymentMethod: booking.paymentMethod,
          baseFare: booking.baseFare,
          totalFare: booking.totalFare,
          finalAmount: booking.finalAmount,
          seatsBooked: booking.seatsBooked,
          emailSent: booking.emailSent || false
        },
        transaction: transaction || null
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: error.message
    });
  }
};

module.exports = exports;