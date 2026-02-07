// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // ===========================
  // CORE REFERENCES
  // ===========================
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: [true, 'Ride is required'],
    index: true
  },
 
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger is required'],
    index: true
  },
 
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // ===========================
  // BOOKING DETAILS
  // ===========================
  seatsBooked: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [1, 'Minimum 1 seat required'],
    max: [8, 'Maximum 8 seats allowed']
  },
  
  pickupLocation: {
    type: String,
    required: [true, 'Pickup location is required'],
    trim: true
  },
  pickupCoordinates: {
    lat: Number,
    lng: Number
  },
  
  dropLocation: {
    type: String,
    required: [true, 'Drop location is required'],
    trim: true
  },
  dropCoordinates: {
    lat: Number,
    lng: Number
  },
  
  // models/Booking.js

  dropCoordinates: {
    lat: Number,
    lng: Number
  },
  
  // ===========================
  // 🎯 SEGMENT BOOKING DATA (Route-Matched Rides)
  // ===========================
  matchType: {
    type: String,
    enum: ['exact', 'on_route', 'nearby', null],
    default: null,
    index: true
  },
  
  userSearchDistance: {
    type: Number,
    min: 0,
    default: null,
    comment: 'Passenger\'s segment distance in km (for route-matched bookings)'
  },
  
  perKmRate: {
    type: Number,
    min: 0,
    default: null,
    comment: 'Driver\'s per km rate at time of booking'
  },
  
  segmentFare: {
    type: Number,
    min: 0,
    default: null,
    comment: 'Calculated segment fare for passenger\'s journey (includes all fees)'
  },
  
  matchQuality: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
    comment: 'Route match percentage'
  },
  
  // ===========================
  // PASSENGER NOTES
  // ===========================
  passengerNotes: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  passengerNotes: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // ===========================
  // FARE BREAKDOWN
  // ===========================
  baseFare: {
    type: Number,
    required: [true, 'Base fare is required'],
    min: [0, 'Base fare cannot be negative'],
    default: 0
  },
  
  // Passenger service fee (per seat)
  passengerServiceFee: {
    type: Number,
    required: [true, 'Passenger service fee is required'],
    min: [0, 'Service fee cannot be negative'],
    default: 0
  },
  
  // GST on passenger service fee
  passengerServiceFeeGST: {
    type: Number,
    required: [true, 'GST is required'],
    min: [0, 'GST cannot be negative'],
    default: 0
  },
  
  // Legacy fields (keeping for backward compatibility)
  platformFee: {
    type: Number,
    min: 0,
    default: 0
  },
  gst: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Total amount passenger pays
  totalFare: {
    type: Number,
    required: [true, 'Total fare is required'],
    min: [0, 'Total fare cannot be negative'],
    default: 0
  },
  
  // Discount & offers
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Final amount after discount
  finalAmount: {
    type: Number,
    min: 0
  },
  
  // ===========================
  // BOOKING STATUS
  // ===========================
 status: {
  type: String,
  // FIXED: Match backend controller validation
  enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'no_show'],
  default: 'pending',
  index: true
},
  
  // ===========================
  // PAYMENT STATUS
  // ===========================
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet', 'netbanking', 'emi'],
    default: null
  },
  
  paymentId: {
    type: String,
    default: null
  },
  
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
    index: true
  },
  
  paymentDate: {
    type: Date,
    default: null
  },
  
  paymentCompletedAt: {
    type: Date,
    default: null
  },
  
  paymentFailedAt: {
    type: Date,
    default: null
  },
  
  // ===========================
  // CONFIRMATION DETAILS
  // ===========================
  confirmedAt: {
    type: Date,
    default: null
  },
  
  confirmationNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // ===========================
  // REJECTION DETAILS
  // ===========================
  rejectedAt: {
    type: Date,
    default: null
  },
  
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  
  rejectedBy: {
    type: String,
    enum: ['driver', 'admin', 'system'],
    default: null
  },
  
  // ===========================
  // CANCELLATION DETAILS
  // ===========================
  cancelledAt: {
    type: Date,
    default: null
  },
  
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  
  cancelledBy: {
    type: String,
    enum: ['passenger', 'driver', 'admin', 'system'],
    default: null
  },
  
  cancellationFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  refundStatus: {
    type: String,
    enum: ['none', 'initiated', 'processing', 'completed', 'failed'],
    default: 'none'
  },
  
  refundInitiatedAt: {
    type: Date,
    default: null
  },
  
  refundCompletedAt: {
    type: Date,
    default: null
  },
  
  // ===========================
  // COMPLETION DETAILS
  // ===========================
  completedAt: {
    type: Date,
    default: null
  },
  
  actualPickupTime: {
    type: Date,
    default: null
  },
  
  actualDropTime: {
    type: Date,
    default: null
  },
  
  actualDistance: {
    type: Number,
    default: null
  },
  
  actualDuration: {
    type: Number,
    default: null
  },
  
  // ===========================
  // RATING & REVIEW
  // ===========================
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  review: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
    default: null
  },
  
  reviewDate: {
    type: Date,
    default: null
  },
  
  // Driver rating (passenger rates driver)
  driverRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  driverReview: {
    type: String,
    trim: true,
    maxlength: [1000, 'Driver review cannot exceed 1000 characters'],
    default: null
  },
  
  driverReviewDate: {
    type: Date,
    default: null
  },
  
  // Passenger rating (driver rates passenger)
  passengerRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  passengerReview: {
    type: String,
    trim: true,
    maxlength: [1000, 'Passenger review cannot exceed 1000 characters'],
    default: null
  },
  
  passengerReviewDate: {
    type: Date,
    default: null
  },
  


  razorpayPaymentId: {
    type: String,
    default: null
  },
  
  razorpayOrderId: {
    type: String,
    default: null
  },
  
  razorpaySignature: {
    type: String,
    default: null
  },
  
  // ✅ Add these fields for email tracking (optional but recommended)
  emailSent: {
    type: Boolean,
    default: false
  },
  
  emailSentAt: {
    type: Date,
    default: null
  },


  
  // ===========================
  // COMMUNICATION
  // ===========================
  messageThreadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MessageThread',
    default: null
  },
  
  notifications: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'whatsapp']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'failed', 'delivered']
    },
    content: String
  }],
  
  // ===========================
  // TRACKING & LOCATION
  // ===========================
  trackingEnabled: {
    type: Boolean,
    default: false
  },
  
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  
  estimatedArrival: {
    type: Date,
    default: null
  },
  
  // ===========================
  // SPECIAL REQUESTS
  // ===========================
  specialRequests: [{
    type: String,
    enum: [
      'child_seat',
      'wheelchair',
      'extra_luggage',
      'pet',
      'stop_required',
      'ac_required',
      'music_preference',
      'quiet_ride'
    ]
  }],
  
  stopPoints: [{
    location: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    duration: Number, // in minutes
    reached: {
      type: Boolean,
      default: false
    },
    reachedAt: Date
  }],
  
  // ===========================
  // EMERGENCY
  // ===========================
  emergencyAlertActive: {
    type: Boolean,
    default: false
  },
  
  emergencyAlerts: [{
    triggeredAt: Date,
    triggeredBy: {
      type: String,
      enum: ['passenger', 'driver']
    },
    resolvedAt: Date,
    resolved: {
      type: Boolean,
      default: false
    },
    notes: String
  }],
  
  // ===========================
  // METADATA
  // ===========================
  bookingSource: {
    type: String,
    enum: ['web', 'mobile_app', 'api', 'admin'],
    default: 'web'
  },
  
  deviceInfo: {
    platform: String,
    osVersion: String,
    appVersion: String,
    deviceModel: String
  },
  
  ipAddress: {
    type: String,
    default: null
  },
  
  userAgent: {
    type: String,
    default: null
  },
  
  // ===========================
  // INTERNAL NOTES
  // ===========================
  internalNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  flags: [{
    type: String,
    enum: ['suspicious', 'fraud', 'disputed', 'vip', 'priority']
  }],
  
  // ===========================
  // TIMESTAMPS
  // ===========================
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===========================
// INDEXES
// ===========================
bookingSchema.index({ passengerId: 1, createdAt: -1 });
bookingSchema.index({ rideId: 1, createdAt: -1 });
bookingSchema.index({ driver: 1, status: 1 });
bookingSchema.index({ status: 1, paymentStatus: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ transactionId: 1 });

// Compound indexes for common queries
bookingSchema.index({ passengerId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ rideId: 1, status: 1, paymentStatus: 1 });
bookingSchema.index({ driver: 1, status: 1, createdAt: -1 });

// ===========================
// VIRTUAL FIELDS
// ===========================
bookingSchema.virtual('rideDetails', {
  ref: 'Ride',
  localField: 'ride',
  foreignField: '_id',
  justOne: true
});

bookingSchema.virtual('passengerDetails', {
  ref: 'User',
  localField: 'passenger',
  foreignField: '_id',
  justOne: true
});

bookingSchema.virtual('driverDetails', {
  ref: 'User',
  localField: 'driver',
  foreignField: '_id',
  justOne: true
});

bookingSchema.virtual('transactionDetails', {
  ref: 'Transaction',
  localField: 'transactionId',
  foreignField: '_id',
  justOne: true
});

// Virtual for booking age in days
bookingSchema.virtual('bookingAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for ride date
bookingSchema.virtual('isUpcoming').get(function() {
  return this.status === 'confirmed' && this.ride && new Date(this.ride.date) > new Date();
});

// ===========================
// INSTANCE METHODS
// ===========================

// Confirm booking
bookingSchema.methods.confirm = function(notes) {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  if (notes) this.confirmationNotes = notes;
  return this.save();
};

// Reject booking
bookingSchema.methods.reject = function(reason, rejectedBy = 'driver') {
  this.status = 'rejected';
  this.rejectionReason = reason;
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  return this.save();
};

// Cancel booking
bookingSchema.methods.cancel = function(reason, cancelledBy = 'passenger', cancellationFee = 0) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  this.cancellationFee = cancellationFee;
  
  // Calculate refund
  if (this.paymentStatus === 'completed') {
    this.refundAmount = this.totalFare - cancellationFee;
    this.refundStatus = 'initiated';
    this.refundInitiatedAt = new Date();
  }
  
  return this.save();
};

// Complete booking
bookingSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Mark payment as completed
bookingSchema.methods.completePayment = function(paymentMethod, paymentId, transactionId) {
  this.paymentStatus = 'completed';
  this.paymentMethod = paymentMethod;
  this.paymentId = paymentId;
  this.transactionId = transactionId;
  this.paymentDate = new Date();
  this.paymentCompletedAt = new Date();
  return this.save();
};

// Mark payment as failed
bookingSchema.methods.failPayment = function(reason) {
  this.paymentStatus = 'failed';
  this.paymentFailedAt = new Date();
  this.internalNotes = `Payment failed: ${reason}`;
  return this.save();
};

// Add driver rating
bookingSchema.methods.addDriverRating = function(rating, review) {
  this.driverRating = rating;
  this.driverReview = review;
  this.driverReviewDate = new Date();
  return this.save();
};

// Add passenger rating
bookingSchema.methods.addPassengerRating = function(rating, review) {
  this.passengerRating = rating;
  this.passengerReview = review;
  this.passengerReviewDate = new Date();
  return this.save();
};

// Trigger emergency alert
bookingSchema.methods.triggerEmergency = function(triggeredBy) {
  this.emergencyAlertActive = true;
  this.emergencyAlerts.push({
    triggeredAt: new Date(),
    triggeredBy,
    resolved: false
  });
  return this.save();
};

// Resolve emergency
bookingSchema.methods.resolveEmergency = function(notes) {
  this.emergencyAlertActive = false;
  const lastAlert = this.emergencyAlerts[this.emergencyAlerts.length - 1];
  if (lastAlert) {
    lastAlert.resolved = true;
    lastAlert.resolvedAt = new Date();
    lastAlert.notes = notes;
  }
  return this.save();
};

// Calculate fare breakdown
bookingSchema.methods.calculateFare = function(baseFarePerSeat, seatsBooked, serviceFee = 10) {
  this.baseFare = baseFarePerSeat * seatsBooked;
  this.passengerServiceFee = serviceFee * seatsBooked;
  this.passengerServiceFeeGST = this.passengerServiceFee * 0.18;
  this.totalFare = this.baseFare + this.passengerServiceFee + this.passengerServiceFeeGST;
  this.finalAmount = this.totalFare - (this.discountAmount || 0);
  return this;
};

// ===========================
// STATIC METHODS
// ===========================

// Get passenger bookings with filters
bookingSchema.statics.getPassengerBookings = function(passengerId, filters = {}) {
  const query = { passengerId };
  
  if (filters.status) query.status = filters.status;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  
  return this.find(query)
    .populate('ride')
    .populate('driver', 'name phone email verified')
    .sort({ createdAt: -1 });
};

// Get driver bookings
bookingSchema.statics.getDriverBookings = function(driverId, filters = {}) {
  const query = { driver: driverId };
  
  if (filters.status) query.status = filters.status;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  
  return this.find(query)
    .populate('passenger', 'name phone email')
    .populate('ride')
    .sort({ createdAt: -1 });
};

// Get statistics
bookingSchema.statics.getStatistics = function(filters = {}) {
  const match = {};
  
  if (filters.startDate && filters.endDate) {
    match.createdAt = {
      $gte: filters.startDate,
      $lte: filters.endDate
    };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalFare' }
      }
    }
  ]);
};

// ===========================
// PRE-SAVE MIDDLEWARE
// ===========================
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-calculate final amount if discount exists
  if (this.discountAmount > 0 && !this.finalAmount) {
    this.finalAmount = this.totalFare - this.discountAmount;
  }
  
  // Set finalAmount to totalFare if no discount
  if (!this.finalAmount) {
    this.finalAmount = this.totalFare;
  }
  
  next();
});

// ===========================
// POST-SAVE MIDDLEWARE
// ===========================
bookingSchema.post('save', async function(doc) {
  // Check if this is a new document being confirmed
  if (doc.status === 'confirmed' && doc.isNew) {  // ✅ Use isNew
    try {
      await mongoose.model('Ride').findByIdAndUpdate(
        doc.ride || doc.rideId,  // Use whichever field you have
        { $addToSet: { bookings: doc._id } }
      );
    } catch (error) {
      console.error('❌ Error updating ride bookings:', error);
    }
  }
});

// ===========================
// EXPORT
// ===========================
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;