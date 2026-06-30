/**
 * One-off fix: drops the stale `ticketId_1` unique index left over from an
 * earlier schema version. `ticketId` is now a virtual (derived from
 * `ticketNumber`) and was never meant to be a real indexed field — Mongo
 * still enforcing uniqueness on it causes every 2nd+ inquiry to fail with
 * E11000 duplicate key error (ticketId: null).
 *
 * Run once: node scripts/dropStaleTicketIdIndex.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const collection = mongoose.connection.collection('inquiries');

  const indexes = await collection.indexes();
  console.log('Current indexes:', indexes.map(i => i.name));

  const staleIndex = indexes.find(i => i.name === 'ticketId_1');

  if (!staleIndex) {
    console.log('ℹ️  No ticketId_1 index found — nothing to drop. (Maybe already fixed?)');
  } else {
    await collection.dropIndex('ticketId_1');
    console.log('✅ Dropped stale index: ticketId_1');
  }

  // Sanity check: ticketNumber_1 should exist and be unique (this is the real one)
  const refreshed = await collection.indexes();
  console.log('Remaining indexes:', refreshed.map(i => i.name));

  await mongoose.disconnect();
  console.log('✅ Done. You can delete this script now.');
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});