// controllers/statsController.js
const User = require('../models/User');
const Ride = require('../models/Ride');
const Rating = require('../models/Rating');

/**
 * Get home page statistics
 * Public endpoint - no authentication required
 */
exports.getHomeStatistics = async (req, res) => {
  try {
    console.log('📊 Fetching home statistics...');

    // Run all queries in parallel for better performance
    const [
      totalUsers,
      totalRides,
      uniqueCities,
      averageRatingData
    ] = await Promise.all([
      // Total registered users (not blocked)
      User.countDocuments({ isBlocked: { $ne: true } }),

      // Total rides (all statuses except cancelled)
      Ride.countDocuments({ 
        rideStatus: { $nin: ['cancelled'] }
      }),

      // Count unique cities from rides (check both origin and destination)
      Ride.aggregate([
        {
          $facet: {
            originCities: [
              { 
                $group: { 
                  _id: '$origin.city' 
                } 
              },
              { 
                $match: { 
                  _id: { $ne: null, $ne: '', $exists: true } 
                } 
              }
            ],
            destinationCities: [
              { 
                $group: { 
                  _id: '$destination.city' 
                } 
              },
              { 
                $match: { 
                  _id: { $ne: null, $ne: '', $exists: true } 
                } 
              }
            ]
          }
        },
        {
          $project: {
            allCities: {
              $setUnion: [
                '$originCities._id',
                '$destinationCities._id'
              ]
            }
          }
        },
        {
          $project: {
            totalCities: { $size: '$allCities' }
          }
        }
      ]),

      // Calculate average rating from Rating model
      Rating.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ])
    ]);

    // Extract values
    const totalCities = uniqueCities.length > 0 && uniqueCities[0].totalCities 
      ? uniqueCities[0].totalCities 
      : 0;

    const averageRating = averageRatingData.length > 0 && averageRatingData[0].avgRating
      ? Math.round(averageRatingData[0].avgRating * 10) / 10 
      : 0;

    const stats = {
      totalUsers,
      totalRides,
      totalCities,
      averageRating
    };

    console.log('✅ Statistics calculated:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching home statistics:', error);
    
    // Return default values on error to keep home page working
    res.status(200).json({
      success: true,
      data: {
        totalUsers: 0,
        totalRides: 0,
        totalCities: 0,
        averageRating: 0
      }
    });
  }
};

/**
 * Get detailed statistics (Admin only)
 */
exports.getDetailedStatistics = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    console.log('📊 Fetching detailed statistics...');

    const [
      userStats,
      rideStats,
      bookingStats,
      ratingStats,
      recentActivity
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { 
                $cond: [{ $eq: ['$isBlocked', false] }, 1, 0] 
              }
            },
            drivers: {
              $sum: { 
                $cond: [{ $eq: ['$role', 'driver'] }, 1, 0] 
              }
            },
            passengers: {
              $sum: { 
                $cond: [{ $eq: ['$role', 'passenger'] }, 1, 0] 
              }
            }
          }
        }
      ]),

      // Ride statistics
      Ride.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { 
                $cond: [{ $eq: ['$rideStatus', 'active'] }, 1, 0] 
              }
            },
            completed: {
              $sum: { 
                $cond: [{ $eq: ['$rideStatus', 'completed'] }, 1, 0] 
              }
            },
            cancelled: {
              $sum: { 
                $cond: [{ $eq: ['$rideStatus', 'cancelled'] }, 1, 0] 
              }
            }
          }
        }
      ]),

      // Booking statistics (from ride.bookings array)
      Ride.aggregate([
        { $unwind: '$bookings' },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: { 
                $cond: [{ $eq: ['$bookings.status', 'pending'] }, 1, 0] 
              }
            },
            confirmed: {
              $sum: { 
                $cond: [{ $eq: ['$bookings.status', 'confirmed'] }, 1, 0] 
              }
            },
            completed: {
              $sum: { 
                $cond: [{ $eq: ['$bookings.status', 'completed'] }, 1, 0] 
              }
            },
            cancelled: {
              $sum: { 
                $cond: [{ $eq: ['$bookings.status', 'cancelled'] }, 1, 0] 
              }
            }
          }
        }
      ]),

      // Rating statistics
      Rating.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            average: { $avg: '$rating' },
            rating5: {
              $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
            },
            rating4: {
              $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
            },
            rating3: {
              $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
            },
            rating2: {
              $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
            },
            rating1: {
              $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
            }
          }
        }
      ]),

      // Recent activity (last 7 days)
      Promise.all([
        User.countDocuments({ 
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        }),
        Ride.countDocuments({ 
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        }),
        Rating.countDocuments({ 
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        })
      ])
    ]);

    const stats = {
      users: userStats[0] || { 
        total: 0, 
        active: 0, 
        drivers: 0, 
        passengers: 0 
      },
      rides: rideStats[0] || { 
        total: 0, 
        active: 0, 
        completed: 0, 
        cancelled: 0 
      },
      bookings: bookingStats[0] || { 
        total: 0, 
        pending: 0, 
        confirmed: 0, 
        completed: 0, 
        cancelled: 0 
      },
      ratings: ratingStats[0] || { 
        total: 0, 
        average: 0,
        rating5: 0,
        rating4: 0,
        rating3: 0,
        rating2: 0,
        rating1: 0
      },
      recentActivity: {
        newUsers: recentActivity[0],
        newRides: recentActivity[1],
        newRatings: recentActivity[2]
      }
    };

    // Round average rating
    if (stats.ratings.average) {
      stats.ratings.average = Math.round(stats.ratings.average * 10) / 10;
    }

    console.log('✅ Detailed statistics calculated');

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching detailed statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

/**
 * Get statistics for a specific time period
 */
exports.getStatsByPeriod = async (req, res) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year
    
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const [newUsers, newRides, newRatings] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Ride.countDocuments({ createdAt: { $gte: startDate } }),
      Rating.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: new Date(),
        newUsers,
        newRides,
        newRatings
      }
    });

  } catch (error) {
    console.error('❌ Error fetching period statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

module.exports = exports;