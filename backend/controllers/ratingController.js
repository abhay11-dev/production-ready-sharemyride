const Rating = require('../models/Rating');
const User = require('../models/User');

// @desc    Submit or update a rating
// @route   POST /api/ratings/submit
// @access  Private
exports.submitRating = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const userId = req.user._id;

    // Validation
    if (!rating) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required'
      });
    }

    // Validate rating value
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5'
      });
    }

    // Validate feedback length
    if (feedback && feedback.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Feedback must be less than 500 characters'
      });
    }

    // Check if user has already submitted a rating
    const existingRating = await Rating.findOne({ userId });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.feedback = feedback?.trim() || '';
      existingRating.updatedAt = Date.now();
      
      await existingRating.save();

      return res.status(200).json({
        success: true,
        message: 'Rating updated successfully',
        data: {
          rating: existingRating
        }
      });
    }

    // Create new rating
    const newRating = await Rating.create({
      userId,
      rating,
      feedback: feedback?.trim() || ''
    });

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        rating: newRating
      }
    });

  } catch (error) {
    console.error('❌ Submit rating error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a rating'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit rating. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's own rating
// @route   GET /api/ratings/user/my-rating
// @access  Private
exports.getMyRating = async (req, res) => {
  try {
    const userId = req.user._id;

    const rating = await Rating.findOne({ userId }).select('-__v');

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'No rating found',
        data: {
          rating: null
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        rating: {
          rating: rating.rating,
          feedback: rating.feedback,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Get my rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all ratings (Admin only)
// @route   GET /api/ratings/all
// @access  Private/Admin
exports.getAllRatings = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get filter parameters
    const filter = {};
    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating);
    }

    // Get ratings with user details
    const ratings = await Rating.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const totalRatings = await Rating.countDocuments(filter);

    // Calculate statistics
    const stats = await Rating.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        ratings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRatings / limit),
          totalRatings,
          limit
        },
        statistics: stats[0] || {
          averageRating: 0,
          totalRatings: 0,
          rating5: 0,
          rating4: 0,
          rating3: 0,
          rating2: 0,
          rating1: 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Get all ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get rating statistics
// @route   GET /api/ratings/stats
// @access  Public
exports.getRatingStats = async (req, res) => {
  try {
    const stats = await Rating.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    const statistics = stats[0] || {
      averageRating: 0,
      totalRatings: 0,
      rating5: 0,
      rating4: 0,
      rating3: 0,
      rating2: 0,
      rating1: 0
    };

    res.status(200).json({
      success: true,
      data: {
        averageRating: Math.round(statistics.averageRating * 10) / 10, // Round to 1 decimal
        totalRatings: statistics.totalRatings,
        distribution: {
          5: statistics.rating5,
          4: statistics.rating4,
          3: statistics.rating3,
          2: statistics.rating2,
          1: statistics.rating1
        }
      }
    });

  } catch (error) {
    console.error('❌ Get rating stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete a rating (Admin only or own rating)
// @route   DELETE /api/ratings/:id
// @access  Private
exports.deleteRating = async (req, res) => {
  try {
    const ratingId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Check if user is admin or owner of the rating
    if (userRole !== 'admin' && rating.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this rating'
      });
    }

    await rating.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Rating deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;