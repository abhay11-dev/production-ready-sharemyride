require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Ride = require('../models/Ride');

const verifyAndClean = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in the .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Remove all rides (demo rides)
    console.log('🗑️  Removing any existing rides...');
    const rideResult = await Ride.deleteMany({});
    console.log(`✅ Deleted ${rideResult.deletedCount} rides from the database.`);

    // 2. Verify driver
    const email = 'sharemyride.contact@gmail.com';
    console.log(`🔍 Looking up user with email: ${email}`);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User with email ${email} not found. Please create the account first.`);
      process.exit(1);
    }

    console.log('🔧 Updating user to be a verified driver...');
    // Update both isDriverVerified and role just in case
    user.isDriverVerified = true;
    if (user.role !== 'driver') {
        user.role = 'driver'; // Though typically 'user' could also be verified, let's set it if needed, or just leave role. Setting role is safer if they have distinct roles.
    }
    // Set a phone number if missing, as posting a ride might require it
    if (!user.phone) {
        user.phone = '9999999999';
        user.isPhoneVerified = true;
    }
    
    await user.save();

    console.log(`✅ Success! ${email} is now a verified driver.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
};

verifyAndClean();
