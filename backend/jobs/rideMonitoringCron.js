// jobs/rideMonitoringCron.js

const cron = require('node-cron');
const RideJourney = require('../models/RideJourney');
const rideMonitoringService = require('../services/rideMonitoringService');

function initMonitoringCron() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        try {
            console.log('🔄 Running ride monitoring background check...');
            // Find all active journeys
            const activeJourneys = await RideJourney.find({ stage: { $in: ['started', 'boarding', 'active'] } });
            
            for (const journey of activeJourneys) {
                // If the driver hasn't pinged in 10 minutes, trigger a safety check
                const lastDriverPing = journey.monitoring?.lastDriverPing?.at;
                const now = Date.now();
                
                if (lastDriverPing) {
                    const timeSincePing = now - new Date(lastDriverPing).getTime();
                    const TEN_MINUTES_MS = 10 * 60 * 1000;
                    
                    if (timeSincePing > TEN_MINUTES_MS) {
                        // Create a pending safety check due to lost signal
                        if (!journey.monitoring.pendingCheckIn) {
                            console.log(`⚠️ Lost signal detected for journey ${journey._id}. Triggering safety check.`);
                            journey.monitoring.pendingCheckIn = {
                                triggeredAt: new Date(),
                                reason: 'lost_signal',
                                requiresResponseFrom: 'driver'
                            };
                            journey.safetyStatus = 'alert';
                            journey.timeline.push({
                                event: 'safety_check_triggered',
                                actorRole: 'system',
                                message: 'Signal lost for over 10 minutes',
                                at: new Date()
                            });
                            await journey.save();
                            
                            // Emit socket event to admin and ride
                            const { emitToRide, emitToAdmins } = require('../services/socket');
                            const payload = {
                                rideId: journey.ride.toString(),
                                message: 'GPS signal lost for an extended period. Please confirm you are safe.',
                                reason: 'lost_signal',
                                timestamp: new Date()
                            };
                            emitToRide(journey.ride.toString(), 'ride:safety_check', payload);
                            emitToAdmins('ride:safety_check_triggered', payload);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in ride monitoring cron job:', error);
        }
    });
    
    console.log('⏰ Ride monitoring cron job initialized');
}

module.exports = initMonitoringCron;
