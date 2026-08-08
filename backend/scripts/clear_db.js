require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

const clearDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in the .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    // Confirm with user in terminal (optional, but since they want a script, maybe add a prompt or just run it directly. I'll just run it directly since it's a dev script they are explicitly asking for.)
    console.log('⚠️  Dropping the entire database to clear all data (users, rides, bookings, etc.)...');
    await mongoose.connection.db.dropDatabase();
    
    console.log('✅ Database dropped successfully! It is now fresh for the final build and testing.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
