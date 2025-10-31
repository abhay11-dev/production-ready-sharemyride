const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send payment receipt to passenger
 */
exports.sendPaymentReceipt = async (transaction, booking, passenger, driver) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: passenger.email,
    subject: '✅ Payment Receipt - RideShare',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .total-row { background: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 20px; font-weight: bold; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Payment Successful!</h1>
          <p>Thank you for your payment</p>
        </div>
        
        <div class="content">
          <h2>Hi ${passenger.name},</h2>
          <p>Your payment has been successfully processed. Here are your booking details:</p>
          
          <div class="box">
            <h3>🚗 Ride Details</h3>
            <div class="row">
              <span><strong>From:</strong></span>
              <span>${booking.pickupLocation}</span>
            </div>
            <div class="row">
              <span><strong>To:</strong></span>
              <span>${booking.dropLocation}</span>
            </div>
            <div class="row">
              <span><strong>Date:</strong></span>
              <span>${new Date(booking.rideId.date).toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span><strong>Time:</strong></span>
              <span>${booking.rideId.time}</span>
            </div>
            <div class="row">
              <span><strong>Seats:</strong></span>
              <span>${booking.seatsBooked}</span>
            </div>
          </div>
          
          <div class="box">
            <h3>💰 Payment Breakdown</h3>
            <div class="row">
              <span>Base Fare:</span>
              <span>₹${booking.baseFare.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Platform Fee:</span>
              <span>₹${booking.platformFee.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>GST:</span>
              <span>₹${booking.gst.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <div class="row" style="border: none;">
                <span>Total Paid:</span>
                <span style="color: #3B82F6;">₹${booking.totalFare.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div class="box">
            <h3>👤 Driver Information</h3>
            <div class="row">
              <span>Name:</span>
              <span>${driver.name}</span>
            </div>
            <div class="row">
              <span>Phone:</span>
              <span>${driver.phone || booking.rideId.phoneNumber}</span>
            </div>
            <div class="row">
              <span>Vehicle:</span>
              <span>${booking.rideId.vehicleNumber}</span>
            </div>
          </div>
          
          <div class="box">
            <h3>📄 Transaction Details</h3>
            <div class="row">
              <span>Transaction ID:</span>
              <span style="font-size: 12px;">${transaction._id}</span>
            </div>
            <div class="row">
              <span>Payment ID:</span>
              <span style="font-size: 12px;">${transaction.razorpayPaymentId}</span>
            </div>
            <div class="row">
              <span>Date & Time:</span>
              <span>${new Date(transaction.paymentCapturedAt).toLocaleString()}</span>
            </div>
            <div class="row">
              <span>Payment Method:</span>
              <span style="text-transform: capitalize;">${transaction.paymentMethod}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/my-bookings" class="button">View My Bookings</a>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-left: 4px solid #3B82F6; border-radius: 4px;">
            <strong>Important:</strong> Please be ready at the pickup location 10 minutes before the scheduled time. 
            The driver will contact you if needed.
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>© 2025 RideShare. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Receipt email sent to passenger:', passenger.email);
    return true;
  } catch (error) {
    console.error('❌ Error sending receipt email:', error.message);
    return false;
  }
};

/**
 * Send payment notification to driver
 */
exports.sendDriverPaymentNotification = async (transaction, booking, passenger, driver) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: driver.email,
    subject: '💰 Payment Received - RideShare',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .earnings-box { background: #d1fae5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .earnings { font-size: 32px; font-weight: bold; color: #10B981; margin: 10px 0; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 Payment Received!</h1>
          <p>Your passenger has completed the payment</p>
        </div>
        
        <div class="content">
          <h2>Hi ${driver.name},</h2>
          <p>Great news! Payment for booking <strong>#${booking._id.toString().slice(-8)}</strong> has been received.</p>
          
          <div class="earnings-box">
            <p style="margin: 0; color: #065f46; font-weight: 600;">Your Earnings</p>
            <div class="earnings">₹${transaction.driverNetAmount.toFixed(2)}</div>
            <p style="margin: 0; color: #065f46; font-size: 14px;">
              (After ₹${transaction.baseCommissionAmount.toFixed(2)} platform fee + ₹${transaction.gstAmount.toFixed(2)} GST)
            </p>
          </div>
          
          <div class="box">
            <h3>🚗 Ride Details</h3>
            <div class="row">
              <span>From:</span>
              <span>${booking.pickupLocation}</span>
            </div>
            <div class="row">
              <span>To:</span>
              <span>${booking.dropLocation}</span>
            </div>
            <div class="row">
              <span>Date:</span>
              <span>${new Date(booking.rideId.date).toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span>Time:</span>
              <span>${booking.rideId.time}</span>
            </div>
            <div class="row">
              <span>Seats:</span>
              <span>${booking.seatsBooked}</span>
            </div>
          </div>
          
          <div class="box">
            <h3>👤 Passenger Information</h3>
            <div class="row">
              <span>Name:</span>
              <span>${passenger.name}</span>
            </div>
            <div class="row">
              <span>Phone:</span>
              <span>${passenger.phone || 'Not provided'}</span>
            </div>
            <div class="row">
              <span>Email:</span>
              <span>${passenger.email}</span>
            </div>
          </div>
          
          <div class="box">
            <h3>💳 Payment Breakdown</h3>
            <div class="row">
              <span>Total Fare:</span>
              <span>₹${transaction.totalAmount.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Platform Commission (10%):</span>
              <span>- ₹${transaction.baseCommissionAmount.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>GST (18% on commission):</span>
              <span>- ₹${transaction.gstAmount.toFixed(2)}</span>
            </div>
            <div style="background: #d1fae5; font-weight: bold; border: none; margin-top: 10px; padding: 15px; border-radius: 6px; display: flex; justify-content: space-between;">
              <span>Your Net Earnings:</span>
              <span style="color: #10B981; font-size: 18px;">₹${transaction.driverNetAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/upcoming-rides" class="button">View My Rides</a>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <strong>⚠️ Reminder:</strong> Please be at the pickup location on time and contact your passenger if needed.
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>© 2025 RideShare. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Payment notification sent to driver:', driver.email);
    return true;
  } catch (error) {
    console.error('❌ Error sending driver notification:', error.message);
    return false;
  }
};

/**
 * Send ride reminder (1 day before)
 */
exports.sendRideReminder = async (booking, user, userType) => {
  const isDriver = userType === 'driver';
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `🔔 Ride Reminder - Tomorrow at ${booking.rideId.time}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .time-box { background: #fef3c7; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .time { font-size: 36px; font-weight: bold; color: #D97706; }
          .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔔 Ride Reminder</h1>
          <p>Your ride is scheduled for tomorrow!</p>
        </div>
        
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <p>${isDriver ? 'You have a ride scheduled for tomorrow.' : 'Your ride is scheduled for tomorrow!'}</p>
          
          <div class="time-box">
            <p style="margin: 0; color: #92400e; font-weight: 600;">Tomorrow at</p>
            <div class="time">${booking.rideId.time}</div>
          </div>
          
          <div class="box">
            <h3>🚗 Ride Details</h3>
            <p><strong>From:</strong> ${booking.pickupLocation}</p>
            <p><strong>To:</strong> ${booking.dropLocation}</p>
            <p><strong>Date:</strong> ${new Date(booking.rideId.date).toLocaleDateString()}</p>
            <p><strong>Seats:</strong> ${booking.seatsBooked}</p>
            ${isDriver ? 
              `<p><strong>Passenger:</strong> ${booking.passengerId.name} (${booking.passengerId.phone || booking.passengerId.email})</p>` : 
              `<p><strong>Driver:</strong> ${booking.rideId.driverId.name} (${booking.rideId.phoneNumber})</p>`
            }
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/upcoming-rides" class="button">View Details</a>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-left: 4px solid #3B82F6; border-radius: 4px;">
            <strong>💡 Tip:</strong> ${isDriver ? 
              'Contact your passenger to confirm pickup details.' : 
              'Make sure you\'re ready 10 minutes before the scheduled time.'
            }
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Ride reminder sent to ${userType}:`, user.email);
    return true;
  } catch (error) {
    console.error('❌ Error sending ride reminder:', error.message);
    return false;
  }
};

module.exports = exports;