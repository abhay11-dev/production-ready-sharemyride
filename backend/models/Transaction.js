// models/Transaction.js

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // References
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true,
    index: true
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Razorpay Integration
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true,
    index: true
  },
  razorpaySignature: {
    type: String
  },

  // PAYMENT AMOUNTS - Driver Side
  baseFare: {
    type: Number,
    required: true,
    min: 0
  },
  platformFeePercentage: {
    type: Number,
    default: 8, // 8%
    min: 0,
    max: 100
  },
  platformFee: {
    type: Number,
    required: true,
    default: 0
  },
  gstOnPlatformFeePercentage: {
    type: Number,
    default: 18, // 18%
    min: 0,
    max: 100
  },
  gstOnPlatformFee: {
    type: Number,
    required: true,
    default: 0
  },
  driverNetAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // PAYMENT AMOUNTS - Passenger Side
  passengerServiceFee: {
    type: Number,
    default: 10, // ₹10 fixed
    required: true
  },
  gstOnPassengerServiceFee: {
    type: Number,
    default: 1.80, // 18% of ₹10
    required: true
  },
  totalPassengerServiceCharges: {
    type: Number,
    required: true,
    default: 11.80 // ₹10 + ₹1.80
  },

  // TOTAL AMOUNTS
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  seatsBooked: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },

  // PLATFORM COMMISSION
  platformTotalCommission: {
    type: Number,
    required: true,
    default: 0
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['created', 'pending', 'captured', 'failed', 'refunded'],
    default: 'created',
    required: true,
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'netbanking', 'wallet'],
    sparse: true
  },
  paymentDetails: {
    // For cards
    cardType: String,
    cardLast4: String,
    cardNetwork: String,
    bankName: String,
    
    // For UPI
    upiId: String
  },

  // Payout Status (Driver)
  payoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  payoutDate: {
    type: Date
  },
  payoutTransactionId: {
    type: String
  },

  // Contact Information (for reference)
  passengerEmail: String,
  passengerPhone: String,
  passengerName: String,
  driverEmail: String,
  driverPhone: String,
  driverName: String,

  // Metadata
  metadata: {
    paymentMode: {
      type: String,
      enum: ['online', 'cash'],
      default: 'online'
    },
    pickupLocation: String,
    dropLocation: String,
    seatsBooked: Number,
    matchType: String,
    userSearchDistance: Number,
    segmentFare: Number
  },

  // Refund Information
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  refundDate: Date,
  refundTransactionId: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  capturedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// ===================================
// INSTANCE METHODS
// ===================================

/**
 * Calculate all payment amounts based on base fare and seats
 * @param {number} baseFare - Base fare per seat set by driver
 * @param {number} seatsBooked - Number of seats booked
 * @param {number} passengerServiceFee - Fixed service fee (default ₹10)
 * @param {number} platformFeePercentage - Platform fee percentage (default 8%)
 * @param {number} gstPercentage - GST percentage (default 18%)
 */
transactionSchema.methods.calculateAmounts = function(
  baseFare,
  seatsBooked = 1,
  passengerServiceFee = 10,
  platformFeePercentage = 8,
  gstPercentage = 18
) {
  const fare = parseFloat(baseFare);
  const seats = parseInt(seatsBooked);
  const serviceFee = parseFloat(passengerServiceFee);
  const platformPercent = parseFloat(platformFeePercentage) / 100;
  const gstPercent = parseFloat(gstPercentage) / 100;

  // ===== DRIVER SIDE CALCULATIONS =====
  // Platform fee: 8% of base fare per seat
  const platformFeePerSeat = fare * platformPercent;
  
  // GST on platform fee: 18% of platform fee
  const gstOnPlatformFeePerSeat = platformFeePerSeat * gstPercent;
  
  // Driver net amount per seat
  const driverNetPerSeat = fare - platformFeePerSeat - gstOnPlatformFeePerSeat;

  // ===== PASSENGER SIDE CALCULATIONS =====
  // Fixed service fee + GST
  const gstOnServiceFee = serviceFee * gstPercent;
  const totalServiceCharges = serviceFee + gstOnServiceFee;
  
  // Total passenger pays per seat
  const passengerPaysPerSeat = fare + totalServiceCharges;

  // ===== TOTALS FOR ALL SEATS =====
  this.baseFare = fare;
  this.seatsBooked = seats;
  
  // Driver deductions (total for all seats)
  this.platformFeePercentage = platformFeePercentage;
  this.platformFee = platformFeePerSeat * seats;
  
  this.gstOnPlatformFeePercentage = gstPercentage;
  this.gstOnPlatformFee = gstOnPlatformFeePerSeat * seats;
  
  this.driverNetAmount = driverNetPerSeat * seats;
  
  // Passenger charges (total for all seats)
  this.passengerServiceFee = serviceFee * seats;
  this.gstOnPassengerServiceFee = gstOnServiceFee * seats;
  this.totalPassengerServiceCharges = totalServiceCharges * seats;
  
  // Total amount passenger pays
  this.totalAmount = passengerPaysPerSeat * seats;
  
  // Platform total commission (from both driver and passenger)
  this.platformTotalCommission = 
    this.platformFee + 
    this.gstOnPlatformFee + 
    this.passengerServiceFee + 
    this.gstOnPassengerServiceFee;

  // Validation
  const calculatedTotal = this.driverNetAmount + this.platformTotalCommission;
  const difference = Math.abs(this.totalAmount - calculatedTotal);
  
  if (difference > 0.01) {
    console.warn('⚠️ Amount calculation mismatch:', {
      totalAmount: this.totalAmount,
      calculatedTotal,
      difference
    });
  }

  return this;
};

/**
 * Mark payment as captured
 */
transactionSchema.methods.capturePayment = function(paymentId, signature) {
  this.razorpayPaymentId = paymentId;
  this.razorpaySignature = signature;
  this.paymentStatus = 'captured';
  this.capturedAt = new Date();
  return this.save();
};

/**
 * Mark payment as failed
 */
transactionSchema.methods.failPayment = function(reason) {
  this.paymentStatus = 'failed';
  if (reason) {
    this.metadata = { ...this.metadata, failureReason: reason };
  }
  return this.save();
};

/**
 * Process payout to driver
 */
transactionSchema.methods.completePayout = function(payoutTransactionId) {
  this.payoutStatus = 'completed';
  this.payoutDate = new Date();
  this.payoutTransactionId = payoutTransactionId;
  return this.save();
};

/**
 * Process refund
 */
transactionSchema.methods.processRefund = function(amount, reason, transactionId) {
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundDate = new Date();
  this.refundTransactionId = transactionId;
  this.paymentStatus = 'refunded';
  return this.save();
};

/**
 * Get breakdown summary
 */
transactionSchema.methods.getBreakdown = function() {
  return {
    // Driver receives
    driver: {
      baseFare: this.baseFare,
      platformFee: -this.platformFee,
      gstOnPlatformFee: -this.gstOnPlatformFee,
      netAmount: this.driverNetAmount,
      seatsBooked: this.seatsBooked
    },
    
    // Passenger pays
    passenger: {
      baseFare: this.baseFare * this.seatsBooked,
      serviceFee: this.passengerServiceFee,
      gstOnServiceFee: this.gstOnPassengerServiceFee,
      totalAmount: this.totalAmount,
      perSeat: this.totalAmount / this.seatsBooked
    },
    
    // Platform earns
    platform: {
      fromDriver: this.platformFee + this.gstOnPlatformFee,
      fromPassenger: this.passengerServiceFee + this.gstOnPassengerServiceFee,
      total: this.platformTotalCommission
    }
  };
};

// ===================================
// STATIC METHODS
// ===================================

/**
 * Get driver earnings summary
 */
transactionSchema.statics.getDriverEarningsSummary = async function(driverId) {
  const result = await this.aggregate([
    {
      $match: {
        driverId: mongoose.Types.ObjectId(driverId),
        paymentStatus: 'captured'
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$driverNetAmount' },
        totalTransactions: { $sum: 1 },
        totalSeatsBooked: { $sum: '$seatsBooked' },
        avgEarningPerTransaction: { $avg: '$driverNetAmount' }
      }
    }
  ]);

  return result[0] || {
    totalEarnings: 0,
    totalTransactions: 0,
    totalSeatsBooked: 0,
    avgEarningPerTransaction: 0
  };
};

/**
 * Get pending payouts for driver
 */
transactionSchema.statics.getPendingPayouts = async function(driverId) {
  return await this.find({
    driverId,
    paymentStatus: 'captured',
    payoutStatus: 'pending'
  })
  .populate('rideId', 'start end date')
  .populate('bookingId', 'pickupLocation dropLocation')
  .sort({ createdAt: -1 });
};

/**
 * Get platform revenue summary
 */
transactionSchema.statics.getPlatformRevenue = async function(startDate, endDate) {
  const match = {
    paymentStatus: 'captured'
  };

  if (startDate || endDate) {
    match.capturedAt = {};
    if (startDate) match.capturedAt.$gte = new Date(startDate);
    if (endDate) match.capturedAt.$lte = new Date(endDate);
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$platformTotalCommission' },
        fromDrivers: { $sum: { $add: ['$platformFee', '$gstOnPlatformFee'] } },
        fromPassengers: { $sum: { $add: ['$passengerServiceFee', '$gstOnPassengerServiceFee'] } },
        totalTransactions: { $sum: 1 },
        totalSeatsBooked: { $sum: '$seatsBooked' }
      }
    }
  ]);

  return result[0] || {
    totalRevenue: 0,
    fromDrivers: 0,
    fromPassengers: 0,
    totalTransactions: 0,
    totalSeatsBooked: 0
  };
};

// ===================================
// INDEXES
// ===================================

transactionSchema.index({ rideId: 1, bookingId: 1 });
transactionSchema.index({ passengerId: 1, paymentStatus: 1 });
transactionSchema.index({ driverId: 1, payoutStatus: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ capturedAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;