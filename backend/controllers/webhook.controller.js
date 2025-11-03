const { verifyWebhookSignature } = require('../config/razorpay.config');
const paymentService = require('../services/payment.service');

class WebhookController {
  /**
   * POST /api/webhooks/razorpay
   * Handle Razorpay webhooks
   * IMPORTANT: This must be publicly accessible (configure on Razorpay Dashboard)
   */
  async handleWebhook(req, res) {
    try {
      const webhookSignature = req.headers['x-razorpay-signature'];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      // Verify webhook signature
      const isValid = verifyWebhookSignature(
        req.body,
        webhookSignature,
        webhookSecret
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        return res.status(400).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      const event = req.body.event;
      const payload = req.body.payload;

      console.log(`Webhook received: ${event}`);

      // Handle different webhook events
      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;

        case 'transfer.processed':
          await this.handleTransferProcessed(payload);
          break;

        case 'transfer.failed':
          await this.handleTransferFailed(payload);
          break;

        case 'transfer.reversed':
          await this.handleTransferReversed(payload);
          break;

        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook handling error:', error);
      // Still return 200 to prevent Razorpay from retrying
      res.status(200).json({ success: false });
    }
  }

  /**
   * Handle payment.captured event
   * This is when you trigger the driver transfer
   */
  async handlePaymentCaptured(payload) {
    try {
      const payment = payload.payment.entity;
      const paymentId = payment.id;
      const orderId = payment.order_id;
      const notes = payment.notes;

      console.log(`Payment captured: ${paymentId} for order: ${orderId}`);

      // Extract split details from order notes
      const driverAccountId = notes.driver_account_id;
      const driverAmount = parseInt(notes.driver_amount);
      const rideId = notes.ride_id;

      if (!driverAccountId || !driverAmount || !rideId) {
        console.error('Missing transfer details in payment notes');
        return;
      }

      // Check if transfer already exists (prevent duplicate transfers)
      // const existingTransfer = await Transfer.findOne({ where: { paymentId } });
      // if (existingTransfer) {
      //   console.log(`Transfer already exists for payment: ${paymentId}`);
      //   return;
      // }

      // Update payment status in your database
      // await Payment.update({ status: 'captured', capturedAt: new Date() }, { where: { paymentId } });

      // Trigger transfer to driver
      const transferData = {
        paymentId,
        driverAccountId,
        driverAmount,
        rideId
      };

      const transferResult = await paymentService.transferToDriver(transferData);

      console.log(`Transfer initiated: ${transferResult.transferId}`);

      // Update ride status
      // await Ride.update({ status: 'payment_settled', transferId: transferResult.transferId }, { where: { id: rideId } });

      // Send notification to driver (optional)
      // await notificationService.sendDriverPaymentNotification(rideId, driverAmount);

    } catch (error) {
      console.error('Error handling payment.captured:', error);
      // Log to your monitoring system for manual intervention
      // await ErrorLog.create({ event: 'payment.captured', error: error.message, payload });
    }
  }

  /**
   * Handle payment.failed event
   */
  async handlePaymentFailed(payload) {
    try {
      const payment = payload.payment.entity;
      const paymentId = payment.id;
      const orderId = payment.order_id;

      console.log(`Payment failed: ${paymentId} for order: ${orderId}`);

      // Update payment status in your database
      // await Payment.update({ status: 'failed', failedAt: new Date() }, { where: { paymentId } });

      // Update ride status
      // const paymentRecord = await Payment.findOne({ where: { paymentId } });
      // await Ride.update({ status: 'payment_failed' }, { where: { id: paymentRecord.rideId } });

      // Notify passenger about payment failure
      // await notificationService.sendPaymentFailureNotification(orderId);

    } catch (error) {
      console.error('Error handling payment.failed:', error);
    }
  }

  /**
   * Handle transfer.processed event
   * Driver has received the money
   */
  async handleTransferProcessed(payload) {
    try {
      const transfer = payload.transfer.entity;
      const transferId = transfer.id;
      const amount = transfer.amount;

      console.log(`Transfer processed: ${transferId}, Amount: ${amount}`);

      // Update transfer status in your database
      // await Transfer.update({ status: 'processed', processedAt: new Date() }, { where: { transferId } });

      // Notify driver about successful payout
      // const transferRecord = await Transfer.findOne({ where: { transferId } });
      // await notificationService.sendDriverPayoutSuccessNotification(transferRecord.rideId, amount);

    } catch (error) {
      console.error('Error handling transfer.processed:', error);
    }
  }

  /**
   * Handle transfer.failed event
   * Transfer to driver failed - needs manual intervention
   */
  async handleTransferFailed(payload) {
    try {
      const transfer = payload.transfer.entity;
      const transferId = transfer.id;

      console.error(`Transfer failed: ${transferId}`);

      // Update transfer status in your database
      // await Transfer.update({ status: 'failed', failedAt: new Date() }, { where: { transferId } });

      // Alert admin for manual intervention
      // await alertService.sendAdminAlert('Transfer Failed', { transferId, transfer });

      // Notify driver about payout issue
      // const transferRecord = await Transfer.findOne({ where: { transferId } });
      // await notificationService.sendDriverPayoutFailureNotification(transferRecord.rideId);

    } catch (error) {
      console.error('Error handling transfer.failed:', error);
    }
  }

  /**
   * Handle transfer.reversed event
   * Transfer was reversed - refund scenario
   */
  async handleTransferReversed(payload) {
    try {
      const transfer = payload.transfer.entity;
      const transferId = transfer.id;

      console.log(`Transfer reversed: ${transferId}`);

      // Update transfer status in your database
      // await Transfer.update({ status: 'reversed', reversedAt: new Date() }, { where: { transferId } });

      // Handle refund logic if needed
      // const transferRecord = await Transfer.findOne({ where: { transferId } });
      // await Ride.update({ status: 'refunded' }, { where: { id: transferRecord.rideId } });

    } catch (error) {
      console.error('Error handling transfer.reversed:', error);
    }
  }
}

module.exports = new WebhookController();