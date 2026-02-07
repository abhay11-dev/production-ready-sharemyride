// test-razorpay.js
require('dotenv').config();
const Razorpay = require('razorpay');

console.log('=== RAZORPAY CONNECTION TEST ===\n');

// Show what we're working with
console.log('📋 Loaded Credentials:');
console.log('KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('SECRET:', process.env.RAZORPAY_KEY_SECRET ? 
  `${process.env.RAZORPAY_KEY_SECRET.substring(0, 4)}****${process.env.RAZORPAY_KEY_SECRET.slice(-4)}` : 
  '❌ NOT SET');
console.log('KEY_ID Length:', process.env.RAZORPAY_KEY_ID?.length);
console.log('SECRET Length:', process.env.RAZORPAY_KEY_SECRET?.length);
console.log();

// Check for common issues
console.log('🔍 Checking for common issues:');
const keyId = process.env.RAZORPAY_KEY_ID;
const secret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !secret) {
  console.error('❌ Missing credentials in .env file!');
  process.exit(1);
}

if (keyId.includes(' ') || secret.includes(' ')) {
  console.error('❌ Credentials contain spaces!');
  console.log('   Remove any spaces from .env file');
}

if (keyId.startsWith('"') || keyId.startsWith("'")) {
  console.error('❌ KEY_ID has quotes!');
  console.log('   Remove quotes from .env file');
}

if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
  console.error('❌ KEY_ID format looks wrong!');
  console.log('   Should start with rzp_test_ or rzp_live_');
}

console.log('✅ Basic validation passed\n');

// Create instance
const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: secret
});

console.log('🚀 Attempting to create test order...\n');

// Test the connection
razorpay.orders.create({
  amount: 100,
  currency: 'INR',
  receipt: 'test_' + Date.now(),
  notes: {
    test: 'connection_test',
    timestamp: new Date().toISOString()
  }
})
.then(order => {
  console.log('✅✅✅ SUCCESS! ✅✅✅');
  console.log('Razorpay is configured correctly!\n');
  console.log('📝 Test Order Details:');
  console.log('   Order ID:', order.id);
  console.log('   Amount:', order.amount, 'paise (₹' + (order.amount/100) + ')');
  console.log('   Currency:', order.currency);
  console.log('   Status:', order.status);
  console.log('   Receipt:', order.receipt);
  console.log('\n✅ Your Razorpay credentials are VALID and WORKING!\n');
  process.exit(0);
})
.catch(error => {
  console.error('❌❌❌ FAILED! ❌❌❌\n');
  console.error('Error Details:');
  console.error('   HTTP Status:', error.statusCode);
  console.error('   Error Code:', error.error?.code);
  console.error('   Description:', error.error?.description);
  console.error('   Message:', error.message);
  
  console.log('\n📋 Full Error Object:');
  console.error(JSON.stringify(error, null, 2));
  
  console.log('\n\n🔧 TROUBLESHOOTING STEPS:\n');
  
  if (error.statusCode === 401) {
    console.log('❌ 401 Unauthorized - Your credentials are INVALID\n');
    console.log('Solutions:');
    console.log('1. Go to https://dashboard.razorpay.com/app/keys');
    console.log('2. Make sure you\'re in TEST MODE (toggle at top)');
    console.log('3. Click "Regenerate Test Key"');
    console.log('4. Copy BOTH Key ID and Key Secret');
    console.log('5. Update your .env file (no quotes, no spaces)');
    console.log('6. Make sure Key ID and Secret are from the SAME pair');
    console.log('7. Restart your server after updating .env\n');
  } else if (error.statusCode === 400) {
    console.log('❌ 400 Bad Request - Request format issue\n');
  } else if (error.statusCode === 500) {
    console.log('❌ 500 Server Error - Razorpay service issue\n');
  }
  
  console.log('Current .env values:');
  console.log('RAZORPAY_KEY_ID=' + keyId);
  console.log('RAZORPAY_KEY_SECRET=' + secret?.substring(0, 8) + '...\n');
  
  process.exit(1);
});