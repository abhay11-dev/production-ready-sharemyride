const { razorpayInstance, verifyPaymentSignature } = require('../config/razorpay.config');

class PaymentService {
  /**
   * Create Razorpay order for a ride
   * Call this when ride ends and payment is initiated
   * 
   * @param {Object} rideData - Contains rideId, totalAmount, driverAccountId
   * @param {Object} splitAmounts - Your calculated split: { driverAmount, platformFee, gstAmount }
   * @returns {Promise<Object>} Order details to send to frontend
   */
  async createRideOrder(rideData, splitAmounts) {
    try {
      const { rideId, totalAmount, driverAccountId, passengerDetails } = rideData;
      const { driverAmount, platformFee, gstAmount } = splitAmounts;

      // Validate amounts (all should be in paise)
      const calculatedTotal = driverAmount + platformFee + gstAmount;
      if (calculatedTotal !== totalAmount) {
        throw new Error('Split amounts do not match total amount');
      }

      // Create Razorpay order
      const order = await razorpayInstance.orders.create({
        amount: totalAmount, // Total amount in paise
        currency: 'INR',
        receipt: `ride_${rideId}`,
        notes: {
          ride_id: rideId,
          driver_account_id: driverAccountId,
          driver_amount: driverAmount,
          platform_fee: platformFee,
          gst_amount: gstAmount,
          passenger_id: passengerDetails.id,
          payment_type: 'ride_payment'
        }
      });

      // Save order details to your database for reference
      // e.g., await Payment.create({ orderId: order.id, rideId, status: 'created', ... });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Send to frontend for Checkout
        receipt: order.receipt
      };
    } catch (error) {
      console.error('Error creating ride order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Verify payment after Razorpay Checkout success
   * Call this from your frontend callback
   * 
   * @param {Object} paymentData - Response from Razorpay Checkout
   * @returns {Promise<Object>} Verification result
   */
  async verifyRidePayment(paymentData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

      // Verify signature
      const isValid = verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        throw new Error('Invalid payment signature');
      }

      // Fetch payment details from Razorpay
      const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);

      // Update payment status in your database
      // e.g., await Payment.update({ status: 'captured', paymentId: razorpay_payment_id }, { where: { orderId: razorpay_order_id } });

      return {
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: payment.status,
        amount: payment.amount
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Transfer driver amount to linked account
   * Call this AFTER payment is captured (via webhook confirmation)
   * 
   * @param {Object} transferData - Contains paymentId, driverAccountId, driverAmount
   * @returns {Promise<Object>} Transfer details
   */
  async transferToDriver(transferData) {
    try {
      const { paymentId, driverAccountId, driverAmount, rideId } = transferData;

      // Create transfer to driver's linked account
      const transfer = await razorpayInstance.payments.transfer(paymentId, {
        transfers: [
          {
            account: driverAccountId, // Driver's linked account ID
            amount: driverAmount, // Driver's share in paise
            currency: 'INR',
            notes: {
              ride_id: rideId,
              transfer_type: 'driver_payout'
            },
            linked_account_notes: [
              `Ride payment for ride #${rideId}`
            ],
            on_hold: 0, // Set to 1 if you want to hold payment temporarily
            on_hold_until: null // Unix timestamp if on_hold is 1
          }
        ]
      });

      // Update transfer status in your database
      // e.g., await Transfer.create({ transferId: transfer.items[0].id, rideId, driverAccountId, amount: driverAmount, status: 'processed' });

      return {
        success: true,
        transferId: transfer.items[0].id,
        amount: transfer.items[0].amount,
        status: transfer.items[0].status,
        recipient: transfer.items[0].recipient
      };
    } catch (error) {
      console.error('Error transferring to driver:', error);
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Get payment details
   * Use for checking payment status
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await razorpayInstance.payments.fetch(paymentId);
      return {
        success: true,
        data: payment
      };
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Get transfer details
   * Use for checking transfer status
   */
  async getTransferDetails(transferId) {
    try {
      const transfer = await razorpayInstance.transfers.fetch(transferId);
      return {
        success: true,
        data: transfer
      };
    } catch (error) {
      console.error('Error fetching transfer:', error);
      throw new Error(`Failed to fetch transfer: ${error.message}`);
    }
  }
}

module.exports = new PaymentService();