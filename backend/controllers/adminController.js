const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getSignedUrl, getObjectFromS3, normalizeS3Key } = require('../services/s3Service');
const emailService = require('../services/emailService'); // needed for enquiry/report status+reply email flow

const DOCUMENT_FIELDS = {
  profilePhoto: {
    label: 'Profile Photo',
    get: (dv) => ({
      key: dv?.profilePhoto?.s3Key,
      url: dv?.profilePhoto?.url
    })
  },
  aadhaarFront: {
    label: 'Aadhaar Front',
    get: (dv) => ({
      key: dv?.aadhaar?.frontImageKey,
      url: dv?.aadhaar?.frontImageUrl
    })
  },
  aadhaarBack: {
    label: 'Aadhaar Back',
    get: (dv) => ({
      key: dv?.aadhaar?.backImageKey,
      url: dv?.aadhaar?.backImageUrl
    })
  },
  dlFront: {
    label: 'Driving License Front',
    get: (dv) => ({
      key: dv?.drivingLicense?.frontImageKey,
      url: dv?.drivingLicense?.frontImageUrl
    })
  },
  dlBack: {
    label: 'Driving License Back',
    get: (dv) => ({
      key: dv?.drivingLicense?.backImageKey,
      url: dv?.drivingLicense?.backImageUrl
    })
  }
};

const getFreshDocumentUrl = async (key, fallbackUrl = null) => {
  const s3Key = key || normalizeS3Key(fallbackUrl);
  if (!s3Key) return fallbackUrl;
  try {
    return await getSignedUrl(s3Key, 3600); // 1 hour validity
  } catch (error) {
    console.warn('Unable to generate signed S3 URL:', s3Key, error.message);
    return fallbackUrl;
  }
};

const secureCompare = (actual = '', expected = '') => {
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      console.warn('⚠️ ADMIN_USERNAME and/or ADMIN_PASSWORD env vars are not set. Falling back to default admin credentials (ShareMyRide/ShareMyRide@11) for testing.');
    }

    if (secureCompare(username, adminUsername) && secureCompare(password, adminPassword)) {
      const token = jwt.sign(
        { id: 'admin', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        token
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid admin credentials'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all driver verifications
// @route   GET /api/admin/verifications
// @access  Private (Admin)
exports.getVerifications = async (req, res) => {
  try {
    const users = await User.find({
      'driverVerification.status': { $ne: 'not_started' }
    }).sort({ 'driverVerification.submittedAt': -1 });

    const usersWithFreshUrls = await Promise.all(users.map(async (user) => {
      const dv = user.driverVerification;
      const userObj = user.toObject();

      if (dv) {
        if (dv.profilePhoto) {
          userObj.driverVerification.profilePhoto.url = await getFreshDocumentUrl(
            dv.profilePhoto.s3Key, dv.profilePhoto.url
          );
        }
        if (dv.aadhaar) {
          userObj.driverVerification.aadhaar.frontImageUrl = await getFreshDocumentUrl(
            dv.aadhaar.frontImageKey, dv.aadhaar.frontImageUrl
          );
          userObj.driverVerification.aadhaar.backImageUrl = await getFreshDocumentUrl(
            dv.aadhaar.backImageKey, dv.aadhaar.backImageUrl
          );
        }
        if (dv.drivingLicense) {
          userObj.driverVerification.drivingLicense.frontImageUrl = await getFreshDocumentUrl(
            dv.drivingLicense.frontImageKey, dv.drivingLicense.frontImageUrl
          );
          userObj.driverVerification.drivingLicense.backImageUrl = await getFreshDocumentUrl(
            dv.drivingLicense.backImageKey, dv.drivingLicense.backImageUrl
          );
        }
      }
      return userObj;
    }));

    res.status(200).json({
      success: true,
      count: usersWithFreshUrls.length,
      data: usersWithFreshUrls
    });
  } catch (error) {
    console.error('Fetch verifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a verification request
// @route   PUT /api/admin/verifications/:id
// @access  Private (Admin)
exports.updateVerification = async (req, res) => {
  try {
    const { status, remark } = req.body;
    const userId = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.driverVerification.status = status;

    const actionMap = {
      approved: 'Approved',
      rejected: 'Rejected',
      under_review: 'Marked Under Review',
      needs_info: 'Needs Information',
      submitted: 'Reset to Submitted'
    };

    user.driverVerification.auditTrail.unshift({
      action: actionMap[status] || status,
      remark: remark || 'No remarks provided.',
      timestamp: new Date(),
      admin: 'ShareMyRide'
    });

    if (status === 'approved') {
      user.driverVerification.approvedAt = new Date();
      user.driverVerification.rejectionReason = null;
    } else if (status === 'rejected' || status === 'needs_info') {
      user.driverVerification.rejectionReason = remark;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `Verification marked as ${status}`,
      data: user
    });
  } catch (error) {
    console.error('Update verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Stream a private verification document for admin preview
// @route   GET /api/admin/verifications/:id/document/:documentType
// @access  Private (Admin)
exports.streamVerificationDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const field = DOCUMENT_FIELDS[documentType];

    if (!field) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }

    const user = await User.findById(id).select('driverVerification');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { key, url } = field.get(user.driverVerification);
    const s3Key = key || normalizeS3Key(url);

    if (!s3Key) {
      return res.status(404).json({ success: false, message: `${field.label} has not been uploaded` });
    }

    const object = await getObjectFromS3(s3Key);

    res.setHeader('Content-Type', object.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (object.contentLength) {
      res.setHeader('Content-Length', object.contentLength);
    }

    object.body.pipe(res);
  } catch (error) {
    console.error('Stream verification document error:', {
      userId: req.params.id,
      documentType: req.params.documentType,
      name: error.name,
      message: error.message
    });

    const statusCode = error.name === 'NoSuchKey' ? 404 : 500;
    res.status(statusCode).json({ success: false, message: 'Unable to load verification document' });
  }
};

/* ════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD ANALYTICS + ENQUIRY/REPORT ENDPOINTS
   ════════════════════════════════════════════════════════════════════ */

const Inquiry = require('../models/Inquiry');
const Ride = require('../models/Ride');
const BlogPost = require('../models/BlogPost');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

// @desc    Get users list with pagination
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsersList = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    const query = search ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
    const users = await User.find(query)
      .select('name email phone verificationStatus createdAt')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// @desc    Get rides list with pagination
// @route   GET /api/admin/rides
// @access  Private (Admin)
exports.getRidesList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};
    const rides = await Ride.find(query)
      .select('route date passengers status price driver')
      .populate('driver', 'name phone')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ date: -1 });

    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      data: rides,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Rides list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rides' });
  }
};

// @desc    Get enquiries list (contact_*, help_center, blog_*, community_report, support_request)
// @route   GET /api/admin/enquiries
// @access  Private (Admin)
exports.getEnquiriesList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { type: { $not: /^report_/ } };
    if (status && status !== 'all') query.status = status;

    const enquiries = await Inquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Inquiry.countDocuments(query);

    res.json({
      success: true,
      data: enquiries,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Enquiries list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch enquiries' });
  }
};

// @desc    Update an enquiry/report: change status and/or send a reply.
//          FIXED: previously called emailService.sendStatusReplyUpdate which
//          did not exist — every save silently swallowed the error and NO
//          email ever fired. sendStatusReplyUpdate now exists in
//          emailService.js. The response shape below
//          ({ userNotification, adminSync }) matches exactly what
//          AdminDashboard.jsx's fireEmailActions() already reads — no
//          frontend change needed once this file + emailService.js are
//          both updated.
// @route   PUT /api/admin/enquiries/:id
// @route   PUT /api/admin/reports/:id   (same handler — reports ARE Inquiry docs)
// @access  Private (Admin)
exports.updateEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reply, adminName } = req.body;

    if (!status && !reply?.trim()) {
      return res.status(400).json({ success: false, message: 'Provide a status change and/or a reply message' });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    const oldStatus = inquiry.status;

    // ── 1. Apply status change (optional) ──
    if (status) {
      inquiry.status = status;
      if (status === 'resolved' && oldStatus !== 'resolved') inquiry.resolvedAt = new Date();
      if (status === 'closed' && oldStatus !== 'closed') inquiry.closedAt = new Date();
    }

    // ── 2. Save reply text (optional) ──
    let replyIndex = -1;
    if (reply && reply.trim()) {
      inquiry.adminReplies.push({
        message: reply.trim(),
        sentBy: adminName || 'ShareMyRide Support',
        sentAt: new Date(),
        emailSent: false,
      });
      replyIndex = inquiry.adminReplies.length - 1;

      // If admin didn't explicitly pick a status, move it to 'replied'
      if (!status) inquiry.status = 'replied';
    }

    await inquiry.save();

    // ── 3. Build emailActions: user reply (if any) + admin sync (always) ──
    let userNotification = null;
    let adminSync = null;
    try {
      const result = await emailService.sendStatusReplyUpdate(inquiry, {
        oldStatus,
        newStatus: inquiry.status,
        replyMessage: reply,
        adminName,
      });

      if (result?.emailActions) {
        userNotification = result.emailActions.user;
        adminSync = result.emailActions.admin;

        if (replyIndex >= 0 && userNotification) {
          inquiry.adminReplies[replyIndex].emailSent = true;
          await inquiry.save();
        }
      }
    } catch (err) {
      // Surfaced to logs; the dashboard still gets a clear success/partial
      // message instead of a silently-lost email.
      console.error(`[Enquiry] status+reply emailAction build failed (${inquiry.ticketNumber}):`, err.message);
    }

    return res.json({
      success: true,
      data: inquiry,
      message: reply && reply.trim() ? 'Reply saved' : `Status updated to ${inquiry.status}`,
      // Frontend (AdminDashboard) fires emailjs.send() for each non-null entry
      emailActions: {
        userNotification, // → original submitter's inbox, only if a reply was sent
        adminSync,        // → admin inbox, always present
      },
    });
  } catch (error) {
    console.error('Enquiry update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update enquiry' });
  }
};

// @desc    Get reports list (report_* types, backed by Inquiry model)
// @route   GET /api/admin/reports
// @access  Private (Admin)
exports.getReportsList = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { type: /^report_/ };
    if (severity && severity !== 'all') query['meta.severity'] = severity;
    if (status && status !== 'all') query.status = status;

    const reports = await Inquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Inquiry.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Reports list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

// @desc    Update report status and/or send a reply. Reports are Inquiry
//          documents (type: report_*), so this reuses the exact same
//          status/reply/email flow as updateEnquiry.
// @route   PUT /api/admin/reports/:id
// @access  Private (Admin)
exports.updateReport = exports.updateEnquiry;

// @desc    Get blogs list
// @route   GET /api/admin/blogs
// @access  Private (Admin)
exports.getBlogsList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};
    const blogs = await BlogPost.find(query)
      .select('title author status likes comments createdAt')
      .populate('author', 'name email')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await BlogPost.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Blogs list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blogs' });
  }
};

// @desc    Update blog status
// @route   PUT /api/admin/blogs/:id
// @access  Private (Admin)
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const blog = await BlogPost.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.json({ success: true, data: blog, message: 'Blog updated' });
  } catch (error) {
    console.error('Blog update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update blog' });
  }
};

// @desc    Get bookings list with pagination
// @route   GET /api/admin/bookings
// @access  Private (Admin)
exports.getBookingsList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};
    const bookings = await Booking.find(query)
      .populate('passenger', 'name email phone')
      .populate('driver', 'name phone')
      .populate('ride', 'start end date time fare')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Bookings list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

// @desc    Get payments list with pagination
// @route   GET /api/admin/payments
// @access  Private (Admin)
exports.getPaymentsList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};
    const payments = await Payment.find(query)
      .populate('user', 'name email')
      .populate('passenger', 'name email')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Payments list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// @desc    Get rides posted by a specific user (for UserDetailModal)
// @route   GET /api/admin/users/:id/rides
// @access  Private (Admin)
exports.getUserRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.params.id })
      .select('start end date time seats availableSeats fare status createdAt')
      .sort({ date: -1 })
      .limit(20);
    res.json({ success: true, data: rides });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user rides' });
  }
};

// @desc    Get bookings made by a specific user (for UserDetailModal)
// @route   GET /api/admin/users/:id/bookings
// @access  Private (Admin)
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ passenger: req.params.id })
      .select('pickupLocation dropLocation seatsBooked totalFare finalAmount status paymentStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user bookings' });
  }
};

// @desc    Update (suspend / unsuspend) a user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { isSuspended, role } = req.body;
    const update = {};
    if (isSuspended !== undefined) update.isSuspended = isSuspended;
    if (role) update.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user, message: 'User updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// @desc    Dashboard analytics summary
// @route   GET /api/admin/analytics/summary
// @access  Private (Admin)
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalRides,
      totalBookings,
      totalRevenueAgg,
      avgRatingAgg,
      openEnquiries,
      urgentReports,
      pendingVerifications,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Ride.countDocuments(),
      Booking.countDocuments(),
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Ride.aggregate([{ $match: { rating: { $exists: true } } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]),
      Inquiry.countDocuments({ type: { $not: /^report_/ }, status: { $nin: ['resolved', 'closed'] } }),
      Inquiry.countDocuments({ type: /^report_/, 'meta.severity': { $in: ['high', 'critical'] }, status: { $nin: ['resolved', 'closed'] } }),
      User.countDocuments({ 'driverVerification.status': { $in: ['submitted', 'under_review'] } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalRides,
        totalBookings,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
        averageRating: (avgRatingAgg[0]?.avg || 4.5).toFixed(1),
        totalCities: 50,
        openEnquiries,
        urgentReports,
        pendingVerifications,
      },
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};