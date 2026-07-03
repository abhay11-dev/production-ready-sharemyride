/**
 * scripts/seedTestUsers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensures both test accounts exist in MongoDB with ALL verifications approved:
 *   - emailVerified: true
 *   - accountStatus: ACTIVE
 *   - isDriverVerified: true
 *   - driverVerification.status: approved
 *
 * Run once: node scripts/seedTestUsers.js
 * Safe to re-run — uses upsert.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const TEST_USERS = [
  {
    email: process.env.TEST_USER_EMAIL,
    password: process.env.TEST_USER_PASSWORD,
    name: 'Test User One',
  },
  {
    email: process.env.TEST_USER_2_EMAIL,
    password: process.env.TEST_USER_2_PASSWORD,
    name: 'Test User Two',
  },
].filter((u) => u.email && u.password);

const APPROVED_DRIVER_VERIFICATION = {
  profilePhoto: { url: null, s3Key: null, uploadedAt: null, verified: true },
  aadhaar: { numberMasked: 'XXXX-XXXX-0000', frontImageUrl: null, backImageUrl: null, verified: true, verifiedAt: new Date() },
  drivingLicense: { number: 'TEST0000000000', expiryDate: new Date('2035-12-31'), frontImageUrl: null, backImageUrl: null, verified: true, verifiedAt: new Date() },
  status: 'approved',
  approvedAt: new Date(),
  auditTrail: [{ action: 'auto-approved', remark: 'Test account seed', timestamp: new Date(), admin: 'system' }],
};

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  for (const testUser of TEST_USERS) {
    const email = testUser.email.toLowerCase().trim();
    const existing = await User.findOne({ email }).select('+password');

    if (existing) {
      // Update all verification fields, leaving password as-is if already set
      const updates = {
        emailVerified: true,
        accountStatus: 'ACTIVE',
        isDriverVerified: true,
        isActive: true,
        lockoutUntil: null,
        failedLoginAttempts: 0,
        driverVerification: APPROVED_DRIVER_VERIFICATION,
      };
      await User.findByIdAndUpdate(existing._id, { $set: updates }, { runValidators: false });
      console.log(`✅ Updated existing test user: ${email}`);
    } else {
      // Create fresh — let the pre-save hook hash the password
      await User.create({
        name: testUser.name,
        email,
        password: testUser.password,   // pre-save hook will bcrypt this
        emailVerified: true,
        accountStatus: 'ACTIVE',
        isDriverVerified: true,
        isActive: true,
        driverVerification: APPROVED_DRIVER_VERIFICATION,
        role: 'driver',
      });
      console.log(`✅ Created new test user: ${email}`);
    }
  }

  await mongoose.disconnect();
  console.log('✅ Done — test users seeded successfully.');
}

run().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
