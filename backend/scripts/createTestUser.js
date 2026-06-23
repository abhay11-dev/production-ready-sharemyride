const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'sharemyride.contact@gmail.com';
    const password = 'ShareMyRide@11';
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email });

    if (user) {
      user.password = hashedPassword;
      user.emailVerified = true;
      user.verificationStatus = 'verified';
      await user.save();
      console.log('Test user updated successfully.');
    } else {
      user = new User({
        name: 'Test Admin',
        email,
        password: hashedPassword,
        phone: '9999999999',
        emailVerified: true,
        accountStatus: 'ACTIVE',
      });
      await user.save();
      console.log('Test user created successfully.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
};

createTestUser();
