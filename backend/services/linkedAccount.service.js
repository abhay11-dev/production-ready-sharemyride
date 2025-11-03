const { razorpayInstance } = require('../config/razorpay.config');

class LinkedAccountService {
  /**
   * Create a linked account for a driver
   * Call this when a driver completes onboarding/KYC
   * 
   * @param {Object} driverData - Driver details from your database
   * @returns {Promise<Object>} Linked account details
   */
  async createLinkedAccount(driverData) {
    try {
      const linkedAccount = await razorpayInstance.accounts.create({
        email: driverData.email,
        phone: driverData.phone,
        type: 'route',
        legal_business_name: driverData.fullName,
        business_type: 'individual', // or 'partnership', 'proprietorship' based on driver type
        contact_name: driverData.fullName,
        profile: {
          category: 'transportation',
          subcategory: 'ride_sharing',
          addresses: {
            registered: {
              street1: driverData.address?.street1 || '',
              street2: driverData.address?.street2 || '',
              city: driverData.address?.city || '',
              state: driverData.address?.state || '',
              postal_code: driverData.address?.postalCode || '',
              country: 'IN'
            }
          }
        },
        legal_info: {
          pan: driverData.panNumber, // Required for Route
          gst: driverData.gstNumber || undefined // Optional
        }
      });

      // Save linkedAccount.id to your driver database
      // e.g., await Driver.update({ razorpayAccountId: linkedAccount.id }, { where: { id: driverData.id } });

      return {
        success: true,
        accountId: linkedAccount.id,
        data: linkedAccount
      };
    } catch (error) {
      console.error('Error creating linked account:', error);
      throw new Error(`Failed to create linked account: ${error.message}`);
    }
  }

  /**
   * Fetch linked account details
   * Use this to check account status
   */
  async getLinkedAccount(accountId) {
    try {
      const account = await razorpayInstance.accounts.fetch(accountId);
      return {
        success: true,
        data: account
      };
    } catch (error) {
      console.error('Error fetching linked account:', error);
      throw new Error(`Failed to fetch linked account: ${error.message}`);
    }
  }

  /**
   * Add bank account to linked account
   * Required for transferring funds to driver
   */
  async addBankAccount(accountId, bankDetails) {
    try {
      const stakeholder = await razorpayInstance.stakeholders.create(accountId, {
        name: bankDetails.accountHolderName,
        email: bankDetails.email,
        addresses: {
          residential: {
            street: bankDetails.address?.street || '',
            city: bankDetails.address?.city || '',
            state: bankDetails.address?.state || '',
            postal_code: bankDetails.address?.postalCode || '',
            country: 'IN'
          }
        },
        kyc: {
          pan: bankDetails.panNumber
        },
        notes: {
          driver_id: bankDetails.driverId
        }
      });

      // Add bank account details
      const bankAccount = await razorpayInstance.accounts.edit(accountId, {
        bank_account: {
          ifsc_code: bankDetails.ifscCode,
          account_number: bankDetails.accountNumber,
          beneficiary_name: bankDetails.accountHolderName
        }
      });

      return {
        success: true,
        stakeholderId: stakeholder.id,
        data: bankAccount
      };
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw new Error(`Failed to add bank account: ${error.message}`);
    }
  }
}

module.exports = new LinkedAccountService();