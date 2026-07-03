/**
 * scripts/resetTestUserPasswords.js
 * Reset test user passwords so pre-save bcrypt hook hashes them correctly.
 * Run once to fix double-hashed passwords from initial seed.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const TEST_USERS = [
  { email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD },
  { email: process.env.TEST_USER_2_EMAIL, password: process.env.TEST_USER_2_PASSWORD },
].filter((u) => u.email && u.password);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  for (const { email, password } of TEST_USERS) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      console.log(`⚠️  User not found: ${email}`);
      continue;
    }
    // Setting password triggers pre-save bcrypt hook
    user.password = password;
    user.emailVerified = true;
    user.accountStatus = 'ACTIVE';
    user.isDriverVerified = true;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();
    console.log(`✅ Password reset for: ${email}`);
  }

  await mongoose.disconnect();
  console.log('✅ Done.');
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
