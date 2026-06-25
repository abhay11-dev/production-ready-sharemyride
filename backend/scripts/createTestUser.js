const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const now = () => new Date();

const testUsers = [
  {
    name: process.env.TEST_USER_NAME || 'Test ShareMyRide Driver',
    email: process.env.TEST_USER_EMAIL || 'sharemyride.contact@gmail.com',
    password: process.env.TEST_USER_PASSWORD || 'ShareMyRide@11',
    phone: process.env.TEST_USER_PHONE || '9999999999',
    aadhaarMasked: 'XXXX-XXXX-1111',
    licenseNumber: 'DL01TEST1111'
  },
  {
    name: process.env.TEST_USER_2_NAME || 'Functional Test Driver',
    email: process.env.TEST_USER_2_EMAIL || 'sharemyride.functional@gmail.com',
    password: process.env.TEST_USER_2_PASSWORD || 'ShareMyRide@11',
    phone: process.env.TEST_USER_2_PHONE || '9999999998',
    aadhaarMasked: 'XXXX-XXXX-2222',
    licenseNumber: 'DL01TEST2222'
  }
];

const applyVerifiedDriverState = (user, seed) => {
  const verifiedAt = now();

  user.name = seed.name;
  user.email = seed.email.trim().toLowerCase();
  user.password = seed.password;
  user.phone = seed.phone;
  user.role = 'driver';
  user.emailVerified = true;
  user.accountStatus = 'ACTIVE';
  user.isActive = true;
  user.isDriverVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  user.emailVerificationAttempts = 0;
  user.lastEmailVerificationAttempt = null;
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  user.driverVerification = {
    profilePhoto: {
      url: null,
      s3Key: null,
      uploadedAt: verifiedAt,
      verified: true
    },
    aadhaar: {
      number: null,
      numberMasked: seed.aadhaarMasked,
      frontImageUrl: null,
      frontImageKey: null,
      backImageUrl: null,
      backImageKey: null,
      uploadedAt: verifiedAt,
      verified: true,
      verifiedAt
    },
    drivingLicense: {
      number: seed.licenseNumber,
      expiryDate: new Date('2035-12-31T00:00:00.000Z'),
      frontImageUrl: null,
      frontImageKey: null,
      backImageUrl: null,
      backImageKey: null,
      uploadedAt: verifiedAt,
      verified: true,
      verifiedAt
    },
    status: 'approved',
    rejectionReason: null,
    submittedAt: verifiedAt,
    approvedAt: verifiedAt,
    reviewedBy: null,
    auditTrail: [{
      action: 'approved',
      remark: 'Seeded verified driver account for functional testing',
      timestamp: verifiedAt,
      admin: 'seed-script'
    }]
  };
  user.drivingLicense = {
    number: seed.licenseNumber,
    expiryDate: new Date('2035-12-31T00:00:00.000Z'),
    verified: true
  };
};

const upsertTestUser = async (seed) => {
  const email = seed.email.trim().toLowerCase();
  let user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockoutUntil');
  const isNew = !user;

  if (!user) {
    user = new User({ email, password: seed.password });
  }

  applyVerifiedDriverState(user, { ...seed, email });
  await user.save();

  console.log(`${isNew ? 'Created' : 'Updated'} verified test driver: ${email}`);
};

const createTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const seed of testUsers) {
      await upsertTestUser(seed);
    }

    console.log('Test credentials are ready for functional testing.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
};

createTestUsers();
