// services/payoutService.js
const Payout = require('../models/Payout');
const Transaction = require('../models/Transaction');
const DriverBankAccount = require('../models/DriverBankAccount');
const { razorpayPayout } = require('../config/razorpay');

/**
 * Create RazorpayX Contact for Driver
 * This is a one-time setup per driver
 */
const createRazorpayContact = async (driver) => {
  try {
    const contact = await razorpayPayout.contacts.create({
      name: driver.name,
      email: driver.email,
      contact: driver.phone,
      type: 'vendor', // or 'employee'
      reference_id: driver._id.toString(),
      notes: {
        driverId: driver._id.toString(),
        role: 'driver'
      }
    });
    
    return contact;
  } catch (error) {
    console.error('Error creating Razorpay contact:', error);
    throw error;
  }
};

/**
 * Create RazorpayX Fund Account for Driver's Bank Account
 */
const createRazorpayFundAccount = async (contactId, bankDetails) => {
  try {
    const fundAccount = await razorpayPayout.fundAccount.create({
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name: bankDetails.accountHolderName,
        ifsc: bankDetails.ifscCode,
        account_number: bankDetails.accountNumber
      }
    });
    
    return fundAccount;
  } catch (error) {
    console.error('Error creating fund account:', error);
    throw error;
  }
};

/**
 * Setup driver for payouts (one-time)
 * Creates contact and fund account in RazorpayX
 */
const setupDriverForPayouts = async (driverId) => {
  try {
    // Get driver details
    const User = require('../models/User');
    const driver = await User.findById(driverId);
    
    if (!driver) {
      throw new Error('Driver not found');
    }
    
    // Get bank account
    let bankAccount = await DriverBankAccount.findOne({ driverId });
    
    if (!bankAccount) {
      throw new Error('Driver bank account not found');
    }
    
    // Create contact if not exists
    if (!bankAccount.razorpayxContactId) {
      const contact = await createRazorpayContact(driver);
      bankAccount.razorpayxContactId = contact.id;
      await bankAccount.save();
    }
    
    // Create fund account if not exists
    if (!bankAccount.razorpayxFundAccountId) {
      const fundAccount = await createRazorpayFundAccount(
        bankAccount.razorpayxContactId,
        {
          accountHolderName: bankAccount.accountHolderName,
          ifscCode: bankAccount.ifscCode,
          accountNumber: bankAccount.accountNumber
        }
      );
      
      bankAccount.razorpayxFundAccountId = fundAccount.id;
      bankAccount.isVerified = true;
      bankAccount.verifiedAt = new Date();
      bankAccount.verificationMethod = 'razorpayx';
      await bankAccount.save();
    }
    
    return bankAccount;
    
  } catch (error) {
    console.error('Error setting up driver for payouts:', error);
    throw error;
  }
};

/**
 * Create payout to driver
 * This is called automatically after ride completion
 */
const createDriverPayout = async (transactionId, mode = 'IMPS') => {
  try {
    // Get transaction
    const transaction = await Transaction.findById(transactionId)
      .populate('driverId')
      .populate('bookingId');
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.paymentStatus !== 'captured') {
      throw new Error('Payment not captured yet');
    }
    
    if (transaction.payoutStatus === 'completed') {
      throw new Error('Payout already completed');
    }
    
    // Get driver bank account
    const bankAccount = await DriverBankAccount.findOne({
      driverId: transaction.driverId._id,
      isActive: true,
      isVerified: true
    });
    
    if (!bankAccount) {
      throw new Error('Driver bank account not found or not verified');
    }
    
    // Ensure driver is setup for payouts
    if (!bankAccount.razorpayxFundAccountId) {
      await setupDriverForPayouts(transaction.driverId._id);
      // Refetch bank account
      const updatedBankAccount = await DriverBankAccount.findOne({
        driverId: transaction.driverId._id
      });
      bankAccount.razorpayxFundAccountId = updatedBankAccount.razorpayxFundAccountId;
    }
    
    // Calculate payout amount (in paise)
    const payoutAmountInPaise = Math.round(transaction.driverNetAmount * 100);
    
    // Create payout in RazorpayX
    const razorpayxPayout = await razorpayPayout.payouts.create({
      account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
      fund_account_id: bankAccount.razorpayxFundAccountId,
      amount: payoutAmountInPaise,
      currency: 'INR',
      mode: mode, // NEFT, RTGS, IMPS, UPI
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: `txn_${transaction._id.toString()}`,
      narration: `Payout for Booking ${transaction.bookingId._id}`,
      notes: {
        transactionId: transaction._id.toString(),
        bookingId: transaction.bookingId._id.toString(),
        driverId: transaction.driverId._id.toString()
      }
    });
    
    // Create payout record in database
    const payout = new Payout({
      transactionId: transaction._id,
      driverId: transaction.driverId._id,
      bookingId: transaction.bookingId._id,
      amount: transaction.driverNetAmount,
      razorpayxPayoutId: razorpayxPayout.id,
      razorpayxFundAccountId: bankAccount.razorpayxFundAccountId,
      razorpayxContactId: bankAccount.razorpayxContactId,
      bankAccountNumber: bankAccount.accountNumber,
      bankIfscCode: bankAccount.ifscCode,
      bankAccountHolderName: bankAccount.accountHolderName,
      status: razorpayxPayout.status,
      mode: mode,
      initiatedAt: new Date()
    });
    
    await payout.save();
    
    // Update transaction
    transaction.payoutStatus = 'processing';
    transaction.payoutInitiatedAt = new Date();
    await transaction.save();
    
    // Update bank account last used
    bankAccount.lastUsedAt = new Date();
    await bankAccount.save();
    
    return {
      payout,
      razorpayxPayout
    };
    
  } catch (error) {
    console.error('Error creating payout:', error);
    
    // If payout creation failed, update transaction
    if (transactionId) {
      const transaction = await Transaction.findById(transactionId);
      if (transaction) {
        transaction.payoutStatus = 'failed';
        await transaction.save();
      }
    }
    
    throw error;
  }
};

/**
 * Process pending payouts
 * This can be called by a cron job
 */
const processPendingPayouts = async () => {
  try {
    // Find all transactions with pending payouts
    const pendingTransactions = await Transaction.find({
      paymentStatus: 'captured',
      payoutStatus: 'pending',
      // Optional: Only process after ride is completed
      // 'bookingId.status': 'completed'
    }).limit(50); // Process in batches
    
    const results = [];
    
    for (const transaction of pendingTransactions) {
      try {
        const result = await createDriverPayout(transaction._id);
        results.push({
          transactionId: transaction._id,
          success: true,
          payoutId: result.payout._id
        });
      } catch (error) {
        results.push({
          transactionId: transaction._id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Error processing pending payouts:', error);
    throw error;
  }
};

/**
 * Retry failed payout
 */
const retryFailedPayout = async (payoutId) => {
  try {
    const payout = await Payout.findById(payoutId);
    
    if (!payout) {
      throw new Error('Payout not found');
    }
    
    if (payout.status !== 'failed') {
      throw new Error('Can only retry failed payouts');
    }
    
    if (payout.retryCount >= payout.maxRetries) {
      throw new Error('Maximum retry attempts reached');
    }
    
    // Create new payout
    const newPayout = await createDriverPayout(payout.transactionId);
    
    // Update old payout retry count
    payout.retryCount += 1;
    payout.nextRetryAt = null;
    await payout.save();
    
    return newPayout;
    
  } catch (error) {
    console.error('Error retrying payout:', error);
    throw error;
  }
};

/**
 * Get payout status from RazorpayX
 */
const getPayoutStatus = async (razorpayxPayoutId) => {
  try {
    const payout = await razorpayPayout.payouts.fetch(razorpayxPayoutId);
    return payout;
  } catch (error) {
    console.error('Error fetching payout status:', error);
    throw error;
  }
};

module.exports = {
  setupDriverForPayouts,
  createDriverPayout,
  processPendingPayouts,
  retryFailedPayout,
  getPayoutStatus,
  createRazorpayContact,
  createRazorpayFundAccount
};