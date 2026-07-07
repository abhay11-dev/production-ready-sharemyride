// jobs/rideReminderScheduler.js
//
// Runs every 10 minutes. For every booking that is accepted + paid and whose
// ride hasn't happened yet, checks whether the 1-day / 6-hour / 1-hour
// reminder is now due and hasn't already been sent, and if so emails BOTH
// the passenger and the driver, then marks that stage as sent on the
// booking so it's never sent twice.
//
// REQUIRES a schema addition on Booking (see models/Booking.js patch notes
// delivered alongside this file) — a `reminders` sub-object to persist
// which stages have already fired.
//
// Start this once, from your server entrypoint (server.js / app.js):
//   const { startRideReminderScheduler } = require('./jobs/rideReminderScheduler');
//   startRideReminderScheduler();

const cron = require('node-cron');
const moment = require('moment');
const Booking = require('../models/Booking');
const { buildRideReminderPayload, REMINDER_STAGES } = require('../services/emailService');
const { sendServerEmail } = require('../services/emailjsServerClient');

const REMINDER_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_RIDE_REMINDER;

// Most lead-time first. If the cron was down and multiple stages are overdue
// at once, they all fire in the same pass (catch-up) rather than being lost.
const STAGE_ORDER = ['oneDay', 'sixHour', 'oneHour'];

async function checkAndSendReminders() {
    const cid = Date.now().toString(36);
    let sentCount = 0;
    let checkedCount = 0;

    try {
        const bookings = await Booking.find({
            status: 'accepted',
            paymentStatus: 'completed',
            'reminders.allSent': { $ne: true },
        })
            .populate({
                path: 'ride',
                select: 'date time vehicleModel vehicleNumber phoneNumber driverId',
                populate: { path: 'driverId', select: 'name email phone' },
            })
            .populate('passenger', 'name email phone')
            .populate('driver', 'name email phone');

        for (const booking of bookings) {
            if (!booking.ride) continue;
            checkedCount++;

            const rideDateTime = moment(
                `${moment(booking.ride.date).format('YYYY-MM-DD')} ${booking.ride.time}`,
                'YYYY-MM-DD HH:mm'
            );
            const hoursUntil = rideDateTime.diff(moment(), 'hours', true);

            // Ride already happened (more than 30 min in the past) — nothing to remind about.
            if (hoursUntil < -0.5) continue;

            if (!booking.reminders) booking.reminders = {};

            const driverUser = booking.ride.driverId || booking.driver;
            const passengerUser = booking.passenger;
            if (!driverUser || !passengerUser) {
                console.warn(`[ReminderCron ${cid}] Skipping booking ${booking._id} — missing driver or passenger record`);
                continue;
            }

            for (const stageKey of STAGE_ORDER) {
                const stageMeta = REMINDER_STAGES[stageKey];
                const alreadySent = booking.reminders?.[stageKey]?.sent;
                if (alreadySent) continue;
                if (hoursUntil > stageMeta.hoursBefore) continue; // not due yet

                try {
                    await sendServerEmail(
                        REMINDER_TEMPLATE_ID,
                        buildRideReminderPayload(stageKey, booking, booking.ride, passengerUser, 'passenger', driverUser)
                    );
                    await sendServerEmail(
                        REMINDER_TEMPLATE_ID,
                        buildRideReminderPayload(stageKey, booking, booking.ride, driverUser, 'driver', passengerUser)
                    );

                    booking.reminders[stageKey] = { sent: true, sentAt: new Date() };
                    if (stageKey === 'oneHour') booking.reminders.allSent = true;
                    await booking.save();

                    sentCount++;
                    console.log(`[ReminderCron ${cid}] Sent "${stageKey}" reminder for booking ${booking._id}`);
                } catch (sendErr) {
                    console.error(
                        `[ReminderCron ${cid}] Failed to send "${stageKey}" reminder for booking ${booking._id}:`,
                        sendErr.message
                    );
                    // Deliberately NOT marking as sent — next run (10 min later) retries.
                }
            }
        }

        if (checkedCount > 0 || sentCount > 0) {
            console.log(`[ReminderCron ${cid}] Checked ${checkedCount} booking(s), sent ${sentCount} reminder stage(s).`);
        }
    } catch (error) {
        console.error(`[ReminderCron ${cid}] Job failed:`, error.message);
    }

    return { checkedCount, sentCount };
}

function startRideReminderScheduler() {
    if (!process.env.EMAILJS_TEMPLATE_RIDE_REMINDER) {
        console.warn(
            '⚠️  EMAILJS_TEMPLATE_RIDE_REMINDER is not set — ride reminder scheduler will start but every send will fail. Set it in your backend .env.'
        );
    }
    cron.schedule('*/10 * * * *', checkAndSendReminders);
    console.log('📬 Ride reminder scheduler started — checking every 10 minutes.');
}

module.exports = { startRideReminderScheduler, checkAndSendReminders };