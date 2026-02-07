// models/Ride.js
const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  // ===========================
  // DRIVER REFERENCES
  // ===========================
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver is required'],
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver ID is required'],
    index: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by is required'],
    index: true
  },

  // ===========================
  // BASIC RIDE INFO
  // ===========================
  start: {
    type: String,
    required: [true, 'Start location is required'],
    trim: true,
    index: true
  },
  end: {
    type: String,
    required: [true, 'End location is required'],
    trim: true,
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },
  time: {
    type: String,
    required: [true, 'Time is required']
  },
  seats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: 1,
    max: 8
  },
  availableSeats: {
    type: Number,
    min: 0
  },

  // ===========================
  // FARE & PRICING
  // ===========================
  fare: {
    type: Number,
    required: [true, 'Fare is required'],
    min: 0
  },
  fareMode: {
    type: String,
    enum: ['fixed', 'per_km'],
    default: 'fixed'
  },
  perKmRate: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDistance: {
    type: Number,
    default: 0,
    min: 0
  },
  estimatedDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  tollIncluded: {
    type: Boolean,
    default: false
  },
  negotiableFare: {
    type: Boolean,
    default: false
  },

  // ===========================
  // VEHICLE DETAILS
  // ===========================
  vehicle: {
    type: {
      type: String,
      enum: ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Bike'],
      required: true
    },
    model: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: ''
    },
    number: {
      type: String,
      required: true
    },
    acAvailable: {
      type: Boolean,
      default: true
    },
    luggageSpace: {
      type: String,
      enum: ['Small', 'Medium', 'Large', 'None'],
      default: 'Medium'
    }
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    trim: true,
    uppercase: true
  },

  // ===========================
  // DRIVER INFO (EMBEDDED) - Changed from 'driver' to 'driverInfo'
  // ===========================
  driverInfo: {
    name: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    photoURL: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', '', 'Male', 'Female', 'Other'],
      default: ''
    },
    age: {
      type: Number,
      min: 18,
      max: 100,
      default: null
    },
    drivingLicenseNumber: {
      type: String,
      default: ''
    },
    emergencyContact: {
      type: String,
      default: ''
    },
    emergencyContactName: {
      type: String,
      default: ''
    },
    verified: {
      type: Boolean,
      default: false
    }
  },

  // ===========================
  // ROUTE & LOCATION
  // ===========================
  waypoints: [{
    location: {
      type: String,
      required: true
    },
    distanceFromStart: {
      type: Number,
      default: 0
    },
    coordinates: {
      lat: Number,
      lng: Number
    },
    matched: {
      type: Boolean,
      default: false
    }
  }],
  routeCoordinates: [{
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  }],
  routePolyline: {
    type: String,
    default: null
  },
  routeMapURL: {
    type: String,
    default: ''
  },
  allowPartialRoute: {
    type: Boolean,
    default: true
  },
  maxDetourAllowed: {
    type: Number,
    default: 5,
    min: 0
  },

  // ===========================
  // RIDE PREFERENCES
  // ===========================
  preferences: {
    smokingAllowed: {
      type: Boolean,
      default: false
    },
    musicAllowed: {
      type: Boolean,
      default: true
    },
    petFriendly: {
      type: Boolean,
      default: false
    },
    luggageAllowed: {
      type: Boolean,
      default: true
    },
    womenOnly: {
      type: Boolean,
      default: false
    },
    talkative: {
      type: Boolean,
      default: true
    },
    childSeatAvailable: {
      type: Boolean,
      default: false
    },
    pickupFlexibility: {
      type: Boolean,
      default: true
    }
  },

  // ===========================
  // STATUS & ACTIVITY
  // ===========================
  rideStatus: {
    type: String,
    enum: ['active', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // ===========================
  // ADDITIONAL INFORMATION
  // ===========================
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  pickupInstructions: {
    type: String,
    trim: true,
    maxlength: 300,
    default: ''
  },
  dropInstructions: {
    type: String,
    trim: true,
    maxlength: 300,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  phoneNumber: {
    type: String,
    trim: true,
    required: [true, 'Phone number is required']
  },

  // ===========================
  // RECURRING RIDES
  // ===========================
  recurringRide: {
    type: Boolean,
    default: false
  },
// In your Ride model schema, update recurringDays:

recurringDays: [{
  type: String,
  enum: [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]
}],

  // ===========================
  // SAFETY & TRACKING
  // ===========================
  liveLocationSharing: {
    type: Boolean,
    default: false
  },

  // ===========================
  // BOOKINGS
  // ===========================
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],

  // ===========================
  // RATINGS
  // ===========================
  ratingSummary: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0,
    min: 0
  },

  // ===========================
  // CANCELLATION
  // ===========================
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null
  },

  // ===========================
  // METADATA
  // ===========================
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  verified: {
    type: Boolean,
    default: false,
    index: true
  },

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
rideSchema.index({ start: 1, end: 1, date: 1 });
rideSchema.index({ driverId: 1, createdAt: -1 });
rideSchema.index({ driver: 1, createdAt: -1 });
rideSchema.index({ postedBy: 1, createdAt: -1 });
rideSchema.index({ rideStatus: 1, isActive: 1 });
rideSchema.index({ date: 1, time: 1 });
rideSchema.index({ 'vehicle.type': 1 });
rideSchema.index({ featured: 1, verified: 1 });

// ===========================
// VIRTUAL FIELDS
// ===========================
rideSchema.virtual('driverDetails', {
  ref: 'User',
  localField: 'driver',
  foreignField: '_id',
  justOne: true
});

rideSchema.virtual('bookingDetails', {
  ref: 'Booking',
  localField: 'bookings',
  foreignField: '_id'
});

// ===========================
// INSTANCE METHODS
// ===========================

rideSchema.methods.calculateSegmentFare = function(pickupLocation, dropLocation) {
  try {
    if (this.fareMode === 'per_km' && this.perKmRate > 0) {
      const pickupDist = this.getDistanceForLocation(pickupLocation);
      const dropDist = this.getDistanceForLocation(dropLocation);
      
      if (pickupDist !== null && dropDist !== null) {
        const segmentDistance = Math.abs(dropDist - pickupDist);
        const segmentFare = segmentDistance * this.perKmRate;
        
        return {
          baseFare: segmentFare,
          totalFare: segmentFare,
          travelDistance: segmentDistance
        };
      }
    }
    
    return {
      baseFare: this.fare,
      totalFare: this.fare,
      travelDistance: this.totalDistance || 0
    };
  } catch (error) {
    console.error('❌ Error calculating segment fare:', error);
    return {
      baseFare: this.fare,
      totalFare: this.fare,
      travelDistance: this.totalDistance || 0
    };
  }
};

rideSchema.methods.getDistanceForLocation = function(location) {
  const locationLower = location.toLowerCase().trim();
  
  if (this.start.toLowerCase().includes(locationLower) || 
      locationLower.includes(this.start.toLowerCase())) {
    return 0;
  }
  
  if (this.end.toLowerCase().includes(locationLower) || 
      locationLower.includes(this.end.toLowerCase())) {
    return this.totalDistance || 0;
  }
  
  if (this.waypoints && this.waypoints.length > 0) {
    for (const waypoint of this.waypoints) {
      const wpLocation = waypoint.location.toLowerCase();
      if (wpLocation.includes(locationLower) || locationLower.includes(wpLocation)) {
        return waypoint.distanceFromStart || 0;
      }
    }
  }
  
  return null;
};

rideSchema.methods.getAvailableSeatsForSegment = function(pickupDist, dropDist) {
  return this.availableSeats !== undefined ? this.availableSeats : this.seats;
};

rideSchema.methods.incrementViewCount = function() {
  this.viewCount = (this.viewCount || 0) + 1;
  return this.save();
};

rideSchema.methods.updateAvailableSeats = function() {
  let bookedSeats = 0;
  
  if (this.bookings && this.bookings.length > 0) {
    this.bookings.forEach(booking => {
      if (booking.status === 'confirmed' || booking.status === 'pending') {
        bookedSeats += booking.seatsBooked || 0;
      }
    });
  }
  
  this.availableSeats = Math.max(0, this.seats - bookedSeats);
  return this.availableSeats;
};

// ===========================
// STATIC METHODS
// ===========================

rideSchema.statics.getActiveRides = function(filters = {}) {
  const query = {
    isActive: true,
    rideStatus: 'active',
    date: { $gte: new Date() }
  };
  
  if (filters.start) {
    query.start = new RegExp(filters.start, 'i');
  }
  
  if (filters.end) {
    query.end = new RegExp(filters.end, 'i');
  }
  
  return this.find(query)
    .populate('driver', 'name email phone avatar ratings')
    .sort({ date: 1, time: 1 });
};

rideSchema.statics.getDriverRides = function(driverId, filters = {}) {
  const query = {
    $or: [
      { driver: driverId },
      { driverId },
      { postedBy: driverId }
    ]
  };
  
  if (filters.status) {
    query.rideStatus = filters.status;
  }
  
  return this.find(query)
    .populate('bookings')
    .sort({ createdAt: -1 });
};

// ===========================
// PRE-SAVE MIDDLEWARE
// ===========================
rideSchema.pre('save', function(next) {
  if (this.isNew && this.availableSeats === undefined) {
    this.availableSeats = this.seats;
  }
  
  // Sync all driver reference fields
  if (this.isModified('driver')) {
    if (!this.driverId) this.driverId = this.driver;
    if (!this.postedBy) this.postedBy = this.driver;
  }
  
  if (this.isModified('driverId')) {
    if (!this.driver) this.driver = this.driverId;
    if (!this.postedBy) this.postedBy = this.driverId;
  }
  
  if (this.isModified('postedBy')) {
    if (!this.driver) this.driver = this.postedBy;
    if (!this.driverId) this.driverId = this.postedBy;
  }
  
  next();
});


rideSchema.methods.canBook = function(requestedSeats) {
  // Calculate current available seats
  const currentAvailable = this.availableSeats || this.seats;
  
  // Check if enough seats are available
  return currentAvailable >= requestedSeats;
};

// ===========================
// POST-SAVE MIDDLEWARE
// ===========================
rideSchema.post('save', function(doc) {
  console.log('✅ Ride saved:', doc._id);
});

// ===========================
// EXPORT MODEL
// ===========================
const Ride = mongoose.model('Ride', rideSchema);

module.exports = Ride;