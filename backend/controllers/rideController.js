const Ride = require('../models/Ride');

// Post a new ride (driver)
exports.postRide = async (req, res) => {
  const { start, end, date, time, seats, fare, phoneNumber, address, vehicleNumber } = req.body;

  if (!start || !end || !date || !time || !seats || !fare || !phoneNumber || !address || !vehicleNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const ride = new Ride({
      driverId: req.user._id,
      start,
      end,
      date,
      time,
      seats,
      fare,
      phoneNumber,
      address,
      vehicleNumber: vehicleNumber.toUpperCase(),
    });

    await ride.save();
    
    const populatedRide = await Ride.findById(ride._id).populate('driverId', 'name email');
    res.status(201).json(populatedRide);
  } catch (error) {
    console.error('Ride creation error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Search rides by start and end location
exports.searchRides = async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ message: 'Start and end locations are required' });
  }

  try {
    const rides = await Ride.find({
      start: { $regex: start, $options: 'i' },
      end: { $regex: end, $options: 'i' },
      isActive: true,
      date: { $gte: new Date() }
    }).populate('driverId', 'name email').sort({ date: 1, time: 1 });

    res.json(rides);
  } catch (error) {
    console.error('Search rides error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get rides by driver
exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driverId: req.user._id })
      .populate('driverId', 'name email')
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (error) {
    console.error('Get my rides error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete/Cancel a ride
exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this ride' });
    }

    await Ride.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ride deleted successfully' });
  } catch (error) {
    console.error('Delete ride error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('driverId', 'name email');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    res.json(ride);
  } catch (error) {
    console.error('Get ride error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update ride
exports.updateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { start, end, date, time, seats, fare, phoneNumber, address, vehicleNumber, isActive } = req.body;

    if (start) ride.start = start;
    if (end) ride.end = end;
    if (date) ride.date = date;
    if (time) ride.time = time;
    if (seats) ride.seats = seats;
    if (fare) ride.fare = fare;
    if (phoneNumber) ride.phoneNumber = phoneNumber;
    if (address) ride.address = address;
    if (vehicleNumber) ride.vehicleNumber = vehicleNumber.toUpperCase();
    if (typeof isActive !== 'undefined') ride.isActive = isActive;

    const updatedRide = await ride.save();
    const populatedRide = await Ride.findById(updatedRide._id).populate('driverId', 'name email');

    res.json(populatedRide);
  } catch (error) {
    console.error('Update ride error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};