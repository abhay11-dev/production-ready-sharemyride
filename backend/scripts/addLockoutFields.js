// scripts/addLockoutFields.js
// One-time migration: adds failedLoginAttempts and lockoutUntil to all
// existing User documents that were created before these fields existed.
//
// Run once:  node scripts/addLockoutFields.js
// Safe to re-run: $setOnInsert / $set only adds if field is missing.

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const result = await mongoose.connection.collection('users').updateMany(
    {
      // Only target documents that are missing the new fields
      $or: [
        { failedLoginAttempts: { $exists: false } },
        { lockoutUntil:        { $exists: false } },
        { lastLogin:           { $exists: false } }
      ]
    },
    {
      $set: {
        failedLoginAttempts: 0,
        lockoutUntil:        null,
        lastLogin:           null
      }
    }
  );

  console.log(`Migration complete. Modified ${result.modifiedCount} documents.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});