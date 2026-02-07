const { verifyWebhookSignature } = require('../config/razorpay.config');
const Transaction = require('../models/Transaction');
const Ride = require('../models/Ride');
const Payout = require('../models/Payout');
const User = require('../models/User');
const mongoose = require('mongoose');

class WebhookController {
  /**
   * POST /api/webhooks/razorpay
   * Handle Razorpay webhooks
   * IMPORTANT: This must be publicly accessible (configure on Razorpay Dashboard)
   */
  async handleWebhook(req, res) {
    const startTime = Date.now();
    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`[${webhookId}] Webhook received at ${new Date().toISOString()}`);
      
      const webhookSignature = req.headers['x-razorpay-signature'];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error(`[${webhookId}] Webhook secret not configured`);
        return res.status(500).json({
          success: false,
          message: 'Webhook not configured'
        });
      }

      // Verify webhook signature
      const isValid = verifyWebhookSignature(
        JSON.stringify(req.body),
        webhookSignature,
        webhookSecret
      );

      if (!isValid) {
        console.error(`[${webhookId}] Invalid webhook signature`);
        await this.logWebhookEvent({
          webhookId,
          event: 'signature_verification_failed',
          status: 'failed',
          error: 'Invalid signature'
        });
        
        return res.status(400).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      const event = req.body.event;
      const payload = req.body.payload;

      console.log(`[${webhookId}] Event: ${event}`);
      console.log(`[${webhookId}] Payload:`, JSON.stringify(payload, null, 2));

      // Log webhook event
      await this.logWebhookEvent({
        webhookId,
        event,
        payload,
        status: 'processing'
      });

      // Handle different webhook events
      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload, webhookId);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload, webhookId);
          break;

        case 'payment.authorized':
          await this.handlePaymentAuthorized(payload, webhookId);
          break;

        case 'order.paid':
          await this.handleOrderPaid(payload, webhookId);
          break;

        case 'refund.created':
          await this.handleRefundCreated(payload, webhookId);
          break;

        case 'refund.processed':
          await this.handleRefundProcessed(payload, webhookId);
          break;

        case 'transfer.processed':
          await this.handleTransferProcessed(payload, webhookId);
          break;

        case 'transfer.failed':
          await this.handleTransferFailed(payload, webhookId);
          break;

        case 'transfer.reversed':
          await this.handleTransferReversed(payload, webhookId);
          break;

        case 'payout.processed':
          await this.handlePayoutProcessed(payload, webhookId);
          break;

        case 'payout.failed':
          await this.handlePayoutFailed(payload, webhookId);
          break;

        case 'payout.reversed':
          await this.handlePayoutReversed(payload, webhookId);
          break;

        default:
          console.log(`[${webhookId}] Unhandled webhook event: ${event}`);
          await this.logWebhookEvent({
            webhookId,
            event,
            status: 'unhandled'
          });
      }

      const processingTime = Date.now() - startTime;
      console.log(`[${webhookId}] Webhook processed successfully in ${processingTime}ms`);

      // Update webhook log
      await this.logWebhookEvent({
        webhookId,
        event,
        status: 'success',
        processingTime
      });

      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ 
        success: true,
        webhookId,
        processingTime 
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[${webhookId}] Webhook handling error:`, error);
      
      await this.logWebhookEvent({
        webhookId,
        event: req.body?.event || 'unknown',
        status: 'error',
        error: error.message,
        stack: error.stack,
        processingTime
      });

      // Still return 200 to prevent Razorpay from retrying
      res.status(200).json({ 
        success: false,
        webhookId,
        error: 'Processing failed'
      });
    }
  }

  /**
   * Handle payment.captured event
   * Update transaction and booking status
   */
  async handlePaymentCaptured(payload, webhookId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = payload.payment.entity;
      const paymentId = payment.id;
      const orderId = payment.order_id;
      const amount = payment.amount / 100; // Convert from paise to rupees

      console.log(`[${webhookId}] Payment captured: ${paymentId} for order: ${orderId}`);

      // Find transaction by order ID
      const transaction = await Transaction.findOne({ 
        razorpayOrderId: orderId 
      }).session(session);

      if (!transaction) {
        console.error(`[${webhookId}] Transaction not found for order: ${orderId}`);
        await session.abortTransaction();
        return;
      }

      // Check if already processed
      if (transaction.paymentStatus === 'captured') {
        console.log(`[${webhookId}] Payment already captured for transaction: ${transaction._id}`);
        await session.abortTransaction();
        return;
      }

      // Update transaction
      transaction.razorpayPaymentId = paymentId;
      transaction.paymentStatus = 'captured';
      transaction.paymentCapturedAt = new Date();
      transaction.paymentMethod = payment.method || 'unknown';
      await transaction.save({ session });

      console.log(`[${webhookId}] Transaction updated: ${transaction._id}`);

      // Update booking in ride
      const ride = await Ride.findById(transaction.rideId).session(session);

      if (!ride) {
        console.error(`[${webhookId}] Ride not found: ${transaction.rideId}`);
        await session.abortTransaction();
        return;
      }

      const booking = ride.bookings.id(transaction.bookingId);

      if (!booking) {
        console.error(`[${webhookId}] Booking not found: ${transaction.bookingId}`);
        await session.abortTransaction();
        return;
      }

      // Update booking status
      booking.paymentStatus = 'paid';
      booking.paymentMode = payment.method || 'online';
      booking.status = 'confirmed';

      await ride.save({ session });

      console.log(`[${webhookId}] Booking confirmed: ${booking._id} in ride: ${ride._id}`);

      // Auto-create payout if enabled
      if (process.env.AUTO_PAYOUT_ENABLED === 'true') {
        try {
          const payout = new Payout({
            rideId: ride._id,
            bookingId: booking._id,
            transactionId: transaction._id,
            driverId: ride.driverId,
            passengerId: transaction.passengerId,
            amount: transaction.driverNetAmount,
            status: 'pending',
            payoutMode: 'IMPS',
            scheduledAt: new Date()
          });

          await payout.save({ session });
          console.log(`[${webhookId}] Payout scheduled: ${payout._id}`);
        } catch (payoutError) {
          console.error(`[${webhookId}] Payout creation failed:`, payoutError);
          // Don't abort transaction for payout errors
        }
      }

      await session.commitTransaction();
      console.log(`[${webhookId}] Payment capture completed successfully`);

      // Send notifications (don't wait)
      this.sendNotifications({
        type: 'payment_captured',
        rideId: ride._id,
        bookingId: booking._id,
        transactionId: transaction._id,
        passengerId: transaction.passengerId,
        driverId: ride.driverId,
        amount
      }).catch(err => console.error('Notification error:', err));

    } catch (error) {
      await session.abortTransaction();
      console.error(`[${webhookId}] Error handling payment.captured:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle payment.failed event
   */
  async handlePaymentFailed(payload, webhookId) {
    try {
      const payment = payload.payment.entity;
      const paymentId = payment.id;
      const orderId = payment.order_id;
      const errorCode = payment.error_code;
      const errorDescription = payment.error_description;

      console.log(`[${webhookId}] Payment failed: ${paymentId} for order: ${orderId}`);
      console.log(`[${webhookId}] Error: ${errorCode} - ${errorDescription}`);

      // Find transaction
      const transaction = await Transaction.findOne({ 
        razorpayOrderId: orderId 
      });

      if (!transaction) {
        console.error(`[${webhookId}] Transaction not found for order: ${orderId}`);
        return;
      }

      // Update transaction
      transaction.paymentStatus = 'failed';
      transaction.metadata = {
        ...transaction.metadata,
        failureReason: errorDescription,
        failureCode: errorCode,
        failedAt: new Date()
      };
      await transaction.save();

      // Update booking status
      const ride = await Ride.findById(transaction.rideId);
      if (ride) {
        const booking = ride.bookings.id(transaction.bookingId);
        if (booking) {
          booking.paymentStatus = 'pending';
          booking.status = 'pending';
          await ride.save();
        }
      }

      console.log(`[${webhookId}] Payment failure recorded`);

      // Send notification to passenger
      this.sendNotifications({
        type: 'payment_failed',
        transactionId: transaction._id,
        passengerId: transaction.passengerId,
        errorDescription
      }).catch(err => console.error('Notification error:', err));

    } catch (error) {
      console.error(`[${webhookId}] Error handling payment.failed:`, error);
      throw error;
    }
  }

  /**
   * Handle payment.authorized event
   */
  async handlePaymentAuthorized(payload, webhookId) {
    try {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      console.log(`[${webhookId}] Payment authorized: ${payment.id}`);

      const transaction = await Transaction.findOne({ 
        razorpayOrderId: orderId 
      });

      if (transaction) {
        transaction.paymentStatus = 'authorized';
        await transaction.save();
      }

    } catch (error) {
      console.error(`[${webhookId}] Error handling payment.authorized:`, error);
    }
  }

  /**
   * Handle order.paid event
   */
  async handleOrderPaid(payload, webhookId) {
    try {
      const order = payload.order.entity;
      console.log(`[${webhookId}] Order paid: ${order.id}`);
      
      // This event fires when an order is fully paid
      // Usually handled by payment.captured, but can be used for verification
      
    } catch (error) {
      console.error(`[${webhookId}] Error handling order.paid:`, error);
    }
  }

  /**
   * Handle refund.created event
   */
  async handleRefundCreated(payload, webhookId) {
    try {
      const refund = payload.refund.entity;
      const paymentId = refund.payment_id;
      const amount = refund.amount / 100;

      console.log(`[${webhookId}] Refund created: ${refund.id} for payment: ${paymentId}`);

      const transaction = await Transaction.findOne({ 
        razorpayPaymentId: paymentId 
      });

      if (transaction) {
        transaction.paymentStatus = 'refund_initiated';
        transaction.metadata = {
          ...transaction.metadata,
          refundId: refund.id,
          refundAmount: amount,
          refundInitiatedAt: new Date()
        };
        await transaction.save();
      }

    } catch (error) {
      console.error(`[${webhookId}] Error handling refund.created:`, error);
    }
  }

  /**
   * Handle refund.processed event
   */
  async handleRefundProcessed(payload, webhookId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const refund = payload.refund.entity;
      const paymentId = refund.payment_id;
      const amount = refund.amount / 100;

      console.log(`[${webhookId}] Refund processed: ${refund.id}`);

      const transaction = await Transaction.findOne({ 
        razorpayPaymentId: paymentId 
      }).session(session);

      if (!transaction) {
        console.error(`[${webhookId}] Transaction not found for payment: ${paymentId}`);
        await session.abortTransaction();
        return;
      }

      // Update transaction
      transaction.paymentStatus = 'refunded';
      transaction.metadata = {
        ...transaction.metadata,
        refundProcessedAt: new Date()
      };
      await transaction.save({ session });

      // Update booking
      const ride = await Ride.findById(transaction.rideId).session(session);
      if (ride) {
        const booking = ride.bookings.id(transaction.bookingId);
        if (booking) {
          booking.paymentStatus = 'refunded';
          booking.status = 'cancelled';
          await ride.save({ session });
        }
      }

      await session.commitTransaction();
      console.log(`[${webhookId}] Refund processed successfully`);

      // Send notifications
      this.sendNotifications({
        type: 'refund_processed',
        transactionId: transaction._id,
        passengerId: transaction.passengerId,
        amount
      }).catch(err => console.error('Notification error:', err));

    } catch (error) {
      await session.abortTransaction();
      console.error(`[${webhookId}] Error handling refund.processed:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle payout.processed event (RazorpayX)
   */
  async handlePayoutProcessed(payload, webhookId) {
    try {
      const payout = payload.payout.entity;
      const payoutId = payout.id;
      const amount = payout.amount / 100;
      const fundAccountId = payout.fund_account_id;

      console.log(`[${webhookId}] Payout processed: ${payoutId}, Amount: ${amount}`);

      // Find payout record
      const payoutRecord = await Payout.findOne({ 
        razorpayxPayoutId: payoutId 
      });

      if (!payoutRecord) {
        console.error(`[${webhookId}] Payout record not found: ${payoutId}`);
        return;
      }

      // Update payout status
      payoutRecord.status = 'completed';
      payoutRecord.processedAt = new Date();
      payoutRecord.razorpayxResponse = payout;
      await payoutRecord.save();

      // Update transaction payout status
      if (payoutRecord.transactionId) {
        const transaction = await Transaction.findById(payoutRecord.transactionId);
        if (transaction) {
          transaction.payoutStatus = 'completed';
          await transaction.save();
        }
      }

      console.log(`[${webhookId}] Payout completed successfully`);

      // Send notification to driver
      this.sendNotifications({
        type: 'payout_completed',
        driverId: payoutRecord.driverId,
        amount,
        payoutId: payoutRecord._id
      }).catch(err => console.error('Notification error:', err));

    } catch (error) {
      console.error(`[${webhookId}] Error handling payout.processed:`, error);
      throw error;
    }
  }

  /**
   * Handle payout.failed event
   */
  async handlePayoutFailed(payload, webhookId) {
    try {
      const payout = payload.payout.entity;
      const payoutId = payout.id;
      const failureReason = payout.failure_reason;

      console.error(`[${webhookId}] Payout failed: ${payoutId}`);
      console.error(`[${webhookId}] Reason: ${failureReason}`);

      const payoutRecord = await Payout.findOne({ 
        razorpayxPayoutId: payoutId 
      });

      if (!payoutRecord) {
        console.error(`[${webhookId}] Payout record not found: ${payoutId}`);
        return;
      }

      // Update payout status
      payoutRecord.status = 'failed';
      payoutRecord.failureReason = failureReason;
      payoutRecord.failedAt = new Date();
      payoutRecord.razorpayxResponse = payout;
      await payoutRecord.save();

      // Update transaction
      if (payoutRecord.transactionId) {
        const transaction = await Transaction.findById(payoutRecord.transactionId);
        if (transaction) {
          transaction.payoutStatus = 'failed';
          await transaction.save();
        }
      }

      // Send alert to admin
      this.sendAdminAlert({
        type: 'payout_failed',
        payoutId: payoutRecord._id,
        driverId: payoutRecord.driverId,
        amount: payoutRecord.amount,
        reason: failureReason
      }).catch(err => console.error('Admin alert error:', err));

      // Send notification to driver
      this.sendNotifications({
        type: 'payout_failed',
        driverId: payoutRecord.driverId,
        payoutId: payoutRecord._id,
        reason: failureReason
      }).catch(err => console.error('Notification error:', err));

    } catch (error) {
      console.error(`[${webhookId}] Error handling payout.failed:`, error);
      throw error;
    }
  }

  /**
   * Handle payout.reversed event
   */
  async handlePayoutReversed(payload, webhookId) {
    try {
      const payout = payload.payout.entity;
      const payoutId = payout.id;

      console.log(`[${webhookId}] Payout reversed: ${payoutId}`);

      const payoutRecord = await Payout.findOne({ 
        razorpayxPayoutId: payoutId 
      });

      if (payoutRecord) {
        payoutRecord.status = 'reversed';
        payoutRecord.reversedAt = new Date();
        payoutRecord.razorpayxResponse = payout;
        await payoutRecord.save();

        // Update transaction
        if (payoutRecord.transactionId) {
          const transaction = await Transaction.findById(payoutRecord.transactionId);
          if (transaction) {
            transaction.payoutStatus = 'reversed';
            await transaction.save();
          }
        }
      }

      // Send admin alert
      this.sendAdminAlert({
        type: 'payout_reversed',
        payoutId: payoutRecord._id,
        driverId: payoutRecord.driverId
      }).catch(err => console.error('Admin alert error:', err));

    } catch (error) {
      console.error(`[${webhookId}] Error handling payout.reversed:`, error);
      throw error;
    }
  }

  /**
   * Handle transfer.processed event (Route transfers)
   */
  async handleTransferProcessed(payload, webhookId) {
    try {
      const transfer = payload.transfer.entity;
      const transferId = transfer.id;
      const amount = transfer.amount / 100;

      console.log(`[${webhookId}] Transfer processed: ${transferId}, Amount: ${amount}`);

      // Similar to payout processing but for route transfers
      // Implementation depends on your transfer tracking model

    } catch (error) {
      console.error(`[${webhookId}] Error handling transfer.processed:`, error);
    }
  }

  /**
   * Handle transfer.failed event
   */
  async handleTransferFailed(payload, webhookId) {
    try {
      const transfer = payload.transfer.entity;
      const transferId = transfer.id;

      console.error(`[${webhookId}] Transfer failed: ${transferId}`);

      // Alert admin for manual intervention
      this.sendAdminAlert({
        type: 'transfer_failed',
        transferId,
        transfer
      }).catch(err => console.error('Admin alert error:', err));

    } catch (error) {
      console.error(`[${webhookId}] Error handling transfer.failed:`, error);
    }
  }

  /**
   * Handle transfer.reversed event
   */
  async handleTransferReversed(payload, webhookId) {
    try {
      const transfer = payload.transfer.entity;
      const transferId = transfer.id;

      console.log(`[${webhookId}] Transfer reversed: ${transferId}`);

      // Handle transfer reversal logic

    } catch (error) {
      console.error(`[${webhookId}] Error handling transfer.reversed:`, error);
    }
  }

  /**
   * Log webhook events for debugging and audit trail
   */
  async logWebhookEvent(data) {
    try {
      // Store in database or logging service
      // For now, just console log
      console.log('Webhook Event Log:', {
        webhookId: data.webhookId,
        event: data.event,
        status: data.status,
        timestamp: new Date().toISOString(),
        processingTime: data.processingTime
      });

      // Optional: Save to WebhookLog model
      // const WebhookLog = require('../models/WebhookLog');
      // await WebhookLog.create(data);

    } catch (error) {
      console.error('Error logging webhook event:', error);
    }
  }

  /**
   * Send notifications to users
   */
  async sendNotifications(data) {
    try {
      // Implement your notification logic here
      // - Email notifications
      // - Push notifications
      // - SMS notifications
      console.log('Sending notification:', data);

      // Example: Send email
      // const emailService = require('../services/emailService');
      // await emailService.sendPaymentConfirmation(data);

    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }

  /**
   * Send alerts to admin
   */
  async sendAdminAlert(data) {
    try {
      // Implement admin alert logic
      // - Email to admin
      // - Slack notification
      // - SMS alert
      console.log('Admin Alert:', data);

      // Example: Send Slack notification
      // const slackService = require('../services/slackService');
      // await slackService.sendAlert(data);

    } catch (error) {
      console.error('Error sending admin alert:', error);
      throw error;
    }
  }
}

module.exports = new WebhookController();