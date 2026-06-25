// controllers/statsController.js
const User = require('../models/User');
const Ride = require('../models/Ride');
const Rating = require('../models/Rating');
const Inquiry = require('../models/Inquiry');
const BlogPost = require('../models/BlogPost');
const AuditLog = require('../models/AuditLogs');

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
      verifiedDrivers,
      totalRides,
      uniqueCities,
      averageRatingData
    ] = await Promise.all([
      // Total registered users (not blocked)
      User.countDocuments({ isBlocked: { $ne: true } }),

      // Verified drivers currently eligible to post rides
      User.countDocuments({ isBlocked: { $ne: true }, isDriverVerified: true }),

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
      verifiedDrivers,
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
        verifiedDrivers: 0,
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


/**
 * Get comprehensive founder-level analytics (Admin only)
 * Powers the full Founder Dashboard with all business intelligence metrics
 */
exports.getFounderAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      // Platform KPIs
      totalUsers,
      verifiedDrivers,
      pendingVerifications,
      activeRides,
      completedRides,
      
      // Inquiries
      totalInquiries,
      openInquiries,
      inProgressInquiries,
      resolvedInquiries,
      recentInquiries,

      // Blogs
      publishedBlogs,
      pendingBlogs,
      blogEngagement,

      // Growth – last 30 days
      newUsers30d,
      newRides30d,
      newInquiries30d,

      // Growth – last 7 days
      newUsers7d,
      newRides7d,

      // Top routes
      topRoutes,

      // Inquiry breakdown by type
      inquiryByType,

      // User growth by day (last 30d)
      userGrowth,

      // Recent audit logs
      recentAuditLogs,

      // Verification stats
      verificationStats,

      // Average rating
      avgRating
    ] = await Promise.all([
      User.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ isDriverVerified: true }),
      User.countDocuments({ 'driverVerification.status': { $in: ['submitted', 'under_review'] } }),
      Ride.countDocuments({ rideStatus: 'active' }),
      Ride.countDocuments({ rideStatus: 'completed' }),

      Inquiry.countDocuments({}),
      Inquiry.countDocuments({ status: 'open' }),
      Inquiry.countDocuments({ status: 'in_progress' }),
      Inquiry.countDocuments({ status: 'resolved' }),
      Inquiry.find({}).sort({ createdAt: -1 }).limit(5).select('name email subject inquiryType status ticketId createdAt'),

      BlogPost.countDocuments({ status: 'published' }),
      BlogPost.countDocuments({ status: 'pending_review' }),
      BlogPost.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, totalLikes: { $sum: '$likeCount' }, totalViews: { $sum: '$viewCount' }, totalComments: { $sum: '$commentCount' } } }
      ]),

      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Ride.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Inquiry.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),

      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Ride.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),

      Ride.aggregate([
        { $match: { rideStatus: { $in: ['active', 'completed'] } } },
        { $group: { _id: { from: '$origin.city', to: '$destination.city' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, route: { $concat: ['$_id.from', ' → ', '$_id.to'] }, count: 1 } }
      ]),

      Inquiry.aggregate([
        { $group: { _id: '$inquiryType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      AuditLog.find({}).sort({ createdAt: -1 }).limit(20).select('actorEmail actorRole action resource resourceRef note createdAt'),

      User.aggregate([
        { $group: { _id: '$driverVerification.status', count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } }
      ]),

      Rating.aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } }
      ])
    ]);

    const blog = blogEngagement[0] || { totalLikes: 0, totalViews: 0, totalComments: 0 };
    const rating = avgRating[0] || { avg: 0, total: 0 };

    res.json({
      success: true,
      data: {
        platform: {
          totalUsers,
          verifiedDrivers,
          pendingVerifications,
          activeRides,
          completedRides,
          averageRating: rating.avg ? Math.round(rating.avg * 10) / 10 : 0,
          totalRatings: rating.total
        },
        growth: {
          last7Days: { newUsers: newUsers7d, newRides: newRides7d },
          last30Days: { newUsers: newUsers30d, newRides: newRides30d, newInquiries: newInquiries30d }
        },
        inquiries: {
          total: totalInquiries,
          open: openInquiries,
          inProgress: inProgressInquiries,
          resolved: resolvedInquiries,
          recent: recentInquiries,
          byType: inquiryByType
        },
        blog: {
          published: publishedBlogs,
          pending: pendingBlogs,
          totalLikes: blog.totalLikes,
          totalViews: blog.totalViews,
          totalComments: blog.totalComments
        },
        topRoutes,
        userGrowthChart: userGrowth,
        verificationStats,
        recentAuditLogs
      }
    });

  } catch (error) {
    console.error('❌ Error fetching founder analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

module.exports = exports;