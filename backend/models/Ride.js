const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    driverId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    start: { 
      type: String, 
      required: true,
      trim: true
    },
    end: { 
      type: String, 
      required: true,
      trim: true
    },
    date: { 
      type: Date, 
      required: true 
    },
    time: { 
      type: String, 
      required: true 
    },
    seats: { 
      type: Number, 
      required: true,
      min: 0, // ✅ Changed from 1 to 0
      max: 8
    },
    fare: { 
      type: Number, 
      required: true,
      min: 0
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster search queries
rideSchema.index({ start: 1, end: 1, date: 1 });
rideSchema.index({ driverId: 1 });

module.exports = mongoose.model('Ride', rideSchema);