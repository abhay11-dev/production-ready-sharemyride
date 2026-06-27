# ShareMyRide — Complete Platform & Admin Portal Build Guide

> **One file to rule them all.** Full platform architecture, every data model, all API routes, auth system, payment flow, admin portal build spec, UI patterns, and how every piece connects. Read this before touching any code.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Repository Structure](#2-repository-structure)
3. [Tech Stack & Dependencies](#3-tech-stack--dependencies)
4. [Environment Variables](#4-environment-variables)
5. [Database — MongoDB Models](#5-database--mongodb-models)
6. [Backend Architecture](#6-backend-architecture)
7. [Authentication System](#7-authentication-system)
8. [API Routes — Complete Map](#8-api-routes--complete-map)
9. [Business Logic & Payment Flow](#9-business-logic--payment-flow)
10. [Frontend Architecture](#10-frontend-architecture)
11. [UI Design System](#11-ui-design-system)
12. [Page-by-Page Frontend Reference](#12-page-by-page-frontend-reference)
13. [Admin Portal — Complete Build Guide](#13-admin-portal--complete-build-guide)
14. [Adding New Files to the Admin (Step-by-Step)](#14-adding-new-files-to-the-admin-step-by-step)
15. [Email & Notification System](#15-email--notification-system)
16. [AWS S3 — File Upload System](#16-aws-s3--file-upload-system)
17. [Driver Verification Flow](#17-driver-verification-flow)
18. [Ride Matching Algorithm](#18-ride-matching-algorithm)
19. [Deployment](#19-deployment)
20. [Common Bugs & Gotchas](#20-common-bugs--gotchas)

---

## 1. Platform Overview

**ShareMyRide** is an Indian community carpooling platform. Drivers post rides with available seats; passengers search, book, and pay. It is not a taxi service — drivers split fuel costs, not earn profit.

### Core user flows

```
PASSENGER                              DRIVER
─────────                              ──────
Sign up → Verify email                 Sign up → Verify email
Search rides by route/date             Complete driver verification (KYC)
  (results visible without auth)         Upload: profile photo, Aadhaar (F+B), DL (F+B)
View ride details (auth required)        Admin reviews → Approves
Book ride → Pay via Razorpay           Post ride (start, end, date, seats, fare)
Driver accepts/rejects                 See incoming booking requests
Ride happens                           Accept/reject requests
Both rate each other                   Ride happens → Earnings tracked
                                       Request payout to bank/UPI
```

### What the admin does
- Review KYC documents and approve/reject driver applications
- Monitor all platform data: users, rides, bookings, payments
- Handle enquiries (support tickets), safety reports, blog moderation
- View platform analytics: revenue, users, rides, cities

---

## 2. Repository Structure

```
production-ready-sharemyride/
├── backend/
│   ├── server.js                    ← Express app entry point
│   ├── config/
│   │   ├── db.js                    ← Mongoose connect
│   │   ├── razorpay.js              ← Razorpay SDK instance
│   │   └── resend.js                ← Resend email client
│   ├── controllers/
│   │   ├── adminController.js       ← All admin business logic
│   │   ├── authController.js        ← Signup/login/refresh/reset
│   │   ├── rideController.js        ← Post/search/manage rides
│   │   ├── bookingController.js     ← Create/manage bookings
│   │   ├── statsController.js       ← Public + admin analytics
│   │   ├── userController.js        ← Profile management
│   │   ├── blogController.js        ← Blog CRUD
│   │   ├── inquiryController.js     ← Contact/support submissions
│   │   ├── ratingController.js      ← Star ratings
│   │   ├── payment.controller.js    ← Razorpay order creation
│   │   ├── payoutController.js      ← Driver payout requests
│   │   ├── driverVerificationController.js ← KYC upload/status
│   │   └── webhook.controller.js    ← Razorpay webhooks
│   ├── middleware/
│   │   ├── auth.js                  ← protect + protectAdmin + authorize
│   │   ├── authMiddleware.js        ← protect + requireVerifiedDriver
│   │   └── uploadMiddleware.js      ← Multer S3 upload config
│   ├── models/
│   │   ├── User.js                  ← Main user + driverVerification sub-schema
│   │   ├── Ride.js                  ← Ride listings
│   │   ├── Booking.js               ← Bookings + fare breakdown
│   │   ├── Payment.js               ← UPI/bank payment details
│   │   ├── Payout.js                ← Driver payout requests
│   │   ├── Rating.js                ← Star ratings
│   │   ├── Inquiry.js               ← Support tickets / enquiries
│   │   ├── RideReport.js            ← Ride safety reports
│   │   ├── SafetyReport.js          ← Safety-specific reports
│   │   ├── BlogPost.js              ← Blog posts + comments
│   │   ├── Invoice.js               ← Payment invoices
│   │   ├── Transaction.js           ← Transaction records
│   │   ├── DriverBankAccount.js     ← Driver bank details
│   │   └── AuditLogs.js             ← Admin action audit trail
│   ├── routes/
│   │   ├── adminRoutes.js           ← /api/admin/*
│   │   ├── authRoutes.js            ← /api/auth/*
│   │   ├── rideRoutes.js            ← /api/rides/*
│   │   ├── bookingRoutes.js         ← /api/bookings/*
│   │   ├── paymentRoutes.js         ← /api/payments/*
│   │   ├── payoutRoutes.js          ← /api/payouts/*
│   │   ├── userRoutes.js            ← /api/users/*
│   │   ├── ratingRoutes.js          ← /api/ratings/*
│   │   ├── blogRoutes.js            ← /api/blog/*
│   │   ├── inquiryRoutes.js         ← /api/inquiries/*
│   │   ├── statsRoutes.js           ← /api/stats/*
│   │   ├── driverVerificationRoutes.js ← /api/driver-verification/*
│   │   ├── receipts.js              ← /api/receipts/*
│   │   └── webhookRoutes.js         ← /api/webhooks/*
│   ├── services/
│   │   ├── emailService.js          ← Resend transactional emails
│   │   ├── s3Service.js             ← AWS S3 upload/download/presign
│   │   ├── commissionService.js     ← Platform fee calculations
│   │   ├── payoutService.js         ← Payout processing
│   │   ├── pdfReceiptService.js     ← PDF receipt generation (PDFKit)
│   │   ├── auditService.js          ← Admin audit trail logging
│   │   └── utils/
│   │       ├── routeMatching.js     ← Haversine + segment fare calc
│   │       ├── googleMaps.js        ← Google Maps API wrapper
│   │       └── logger.js            ← Winston logger
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx                  ← Root: Router + UserProvider + Header + Footer
    │   ├── main.jsx                 ← ReactDOM.createRoot
    │   ├── routes/
    │   │   └── AppRoutes.jsx        ← All React Router routes
    │   ├── config/
    │   │   └── api.js               ← Axios instance + token refresh interceptor
    │   ├── hooks/
    │   │   └── useAuth.jsx          ← Auth state + login/logout/signup + in-memory token
    │   ├── contexts/
    │   │   └── UserContext.jsx      ← Legacy context (some pages still use this)
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── Header.jsx       ← Sticky nav + mobile sidebar
    │   │   │   ├── Footer.jsx       ← Links + social + legal
    │   │   │   ├── PlatformMarquee.jsx ← Scrolling stats ticker
    │   │   │   ├── LoginRequiredSpeechToast.jsx ← Auth-gate toast
    │   │   │   └── LocationAutocomplete.jsx ← Google Places input
    │   │   ├── ride/
    │   │   │   ├── BookingModal.jsx ← Seat selection + booking flow
    │   │   │   └── RideCard.jsx     ← Compact ride listing card
    │   │   └── PaymentCheckout.jsx  ← Razorpay checkout wrapper
    │   ├── pages/
    │   │   ├── Home/Home.jsx        ← Landing (public) + Dashboard (logged in)
    │   │   ├── Auth/
    │   │   │   ├── Login.jsx
    │   │   │   ├── Signup.jsx
    │   │   │   ├── ForgotPassword.jsx
    │   │   │   ├── VerifyEmail.jsx
    │   │   │   └── VerificationPending.jsx
    │   │   ├── RideSearch/RideSearch.jsx
    │   │   ├── RidePost/RidePost.jsx
    │   │   ├── Profile/Profile.jsx
    │   │   ├── bookings/
    │   │   │   ├── MyBookings.jsx   ← Passenger bookings
    │   │   │   └── DriverBookings.jsx
    │   │   ├── rides/
    │   │   │   └── UpcomingRides.jsx
    │   │   ├── driver/
    │   │   │   └── DriverUpcomingRides.jsx
    │   │   ├── Admin/               ← ADMIN PORTAL (isolated from main app)
    │   │   │   ├── AdminLogin.jsx
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   ├── RequestDetailsModal.jsx
    │   │   │   ├── UserDetailModal.jsx      ← NEW
    │   │   │   ├── RideDetailModal.jsx      ← NEW
    │   │   │   └── BookingDetailModal.jsx   ← NEW
    │   │   └── FooterNavlinks/
    │   │       ├── About.jsx, HowItWorks.jsx, Blog.jsx
    │   │       ├── HelpCenter.jsx, FAQ.jsx, ContactUs.jsx
    │   │       ├── Report.jsx, Guidelines.jsx
    │   │       └── TermsAndConditions.jsx
    │   ├── services/
    │   │   ├── adminService.js      ← Admin axios instance + API helpers
    │   │   ├── authService.js       ← signup/login/logout/profile
    │   │   ├── rideService.js       ← post/search/get rides
    │   │   ├── bookingService.js    ← create/get/update bookings
    │   │   ├── paymentService.js    ← Razorpay order creation
    │   │   └── userService.js       ← profile update/avatar
    │   └── utils/
    │       ├── paymentCalculator.js ← Platform fee + GST math
    │       └── mapUtils.js          ← Coordinate helpers
    └── package.json
```

---

## 3. Tech Stack & Dependencies

### Backend (Node.js / Express)
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.1.0 | HTTP server |
| mongoose | ^8.19.2 | MongoDB ODM |
| jsonwebtoken | ^9.0.2 | JWT auth (access + refresh tokens) |
| bcryptjs | ^3.0.2 | Password hashing |
| cookie-parser | ^1.4.7 | HttpOnly refresh token cookie |
| cors | ^2.8.5 | Cross-origin headers |
| multer | ^2.0.2 | Multipart file upload |
| @aws-sdk/client-s3 | 3.758.0 | S3 file storage |
| @aws-sdk/s3-request-presigner | 3.758.0 | Presigned S3 URLs |
| razorpay | ^2.9.6 | Payment gateway |
| resend | ^6.12.4 | Transactional email |
| pdfkit | ^0.17.2 | PDF receipt generation |
| nodemailer | ^7.0.10 | Email (fallback) |
| @googlemaps/google-maps-services-js | ^3.4.2 | Route distance/geocoding |
| helmet | ^8.1.0 | HTTP security headers |
| winston | ^3.18.3 | Logging |
| ical-generator | ^10.2.0 | Calendar ICS attachments |
| twilio | ^5.10.4 | SMS (OTP) |

### Frontend (React / Vite)
| Package | Purpose |
|---------|---------|
| react 18 | UI framework |
| react-router-dom v6 | Client-side routing |
| axios | HTTP client |
| react-hot-toast | Toast notifications |
| tailwindcss | Utility CSS |
| @react-google-maps/api | Google Maps component |
| leaflet + react-leaflet | Alternative maps |
| three.js (via esm.sh) | 3D car on homepage |

---

## 4. Environment Variables

### Backend `.env`
```bash
# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/sharemyride

# JWT (two secrets — one for access, one for refresh)
JWT_SECRET=your_access_token_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_token_secret_different_from_above

# Admin credentials (no fallback in production)
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_strong_admin_password

# AWS S3
AWS_ACCESS_KEY_ID=AKIAxxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=ap-south-1
S3_BUCKET_NAME=sharemyride-docs

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Resend (email)
RESEND_API_KEY=re_xxx
EMAIL_USER=noreply@sharemyride.in
EMAIL_FROM=ShareMyRide <noreply@sharemyride.in>

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaxxx

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# App
NODE_ENV=production
FRONTEND_URL=https://share-my-ride.vercel.app
PORT=5000

# Platform fees
PLATFORM_COMMISSION_PERCENT=10
GST_PERCENT=18
```

### Frontend `.env`
```bash
VITE_API_URL=https://production-ready-sharemyride.onrender.com/api
VITE_GOOGLE_MAPS_API_KEY=AIzaxxx
VITE_RAZORPAY_KEY_ID=rzp_live_xxx
```

---

## 5. Database — MongoDB Models

### User.js — The central model
```javascript
// Sub-schema embedded in User
driverVerificationSchema = {
  profilePhoto:    { url, s3Key, uploadedAt, verified }
  aadhaar:         { number, numberMasked, frontImageUrl, frontImageKey,
                     backImageUrl, backImageKey, uploadedAt, verified, verifiedAt }
  drivingLicense:  { number, expiryDate, frontImageUrl, frontImageKey,
                     backImageUrl, backImageKey, uploadedAt, verified, verifiedAt }
  status:          enum ['not_started','pending','submitted','under_review',
                        'approved','rejected','needs_info']
  rejectionReason, submittedAt, approvedAt, reviewedBy
  auditTrail:      [{ action, remark, timestamp, admin }]
}

User = {
  name, email, password (bcrypt, select:false), role (user/driver/admin)
  phone, avatar, gender, dateOfBirth
  isDriverVerified (Boolean, index)     ← set by pre-save hook when dv.status=approved
  driverVerification (embedded sub-doc above)
  drivingLicense: { number, expiryDate, verified }  ← legacy flat field
  
  // Auth & security
  emailVerified, emailVerificationToken, emailVerificationExpires
  resetPasswordToken, resetPasswordExpires, resetPasswordCode
  refreshToken (HttpOnly cookie value stored here)
  failedLoginAttempts, lockoutUntil
  lastLogin, isActive, accountStatus (ACTIVE/SUSPENDED/DELETED)
  
  // Ratings
  ratingSummary: { totalRides, totalRatings, averageRating, distribution }
  
  // Preferences
  preferences: { notifications, emailAlerts, smsAlerts }
}
```

### Ride.js — Ride listings
```javascript
Ride = {
  // References
  driver, driverId, postedBy   ← all ref User (redundant, legacy reasons)
  
  // Route
  start, end (String, indexed)
  date (Date, indexed), time (String)
  waypoints: [{ location, distanceFromStart, coordinates, matched }]
  routeCoordinates: [{ lat, lng }]
  routePolyline (encoded polyline string)
  
  // Seats & fare
  seats, availableSeats
  fare, fareMode ('fixed'|'per_km'), perKmRate
  totalDistance, estimatedDuration
  tollIncluded, negotiableFare
  
  // Vehicle
  vehicle: { type, model, color, number, acAvailable, luggageSpace }
  vehicleNumber
  
  // Embedded driver info (snapshot at post time)
  driverInfo: { name, phone, photoURL, gender, age, drivingLicenseNumber,
                emergencyContact, emergencyContactName, verified }
  
  // Status
  status ('active'|'in_progress'|'completed'|'cancelled'|'expired')
  
  // Preferences
  preferences: { noSmoking, petsAllowed, luggageAllowed, musicOnRequest, ladiesOnly }
  
  // Meta
  viewCount, bookingsCount, rating (avg), ratingsCount
  createdAt, updatedAt
}
```

### Booking.js — Booking records
```javascript
Booking = {
  // Core refs
  ride (ref Ride), passenger (ref User), driver (ref User)
  seatsBooked (1-8)
  
  // Journey
  pickupLocation, pickupCoordinates: { lat, lng }
  dropLocation, dropCoordinates: { lat, lng }
  
  // Segment matching (route-matched rides)
  matchType ('exact'|'on_route'|'nearby'|null)
  userSearchDistance (km for passenger's segment)
  perKmRate (driver's rate at booking time)
  segmentFare (calculated for passenger's segment)
  matchQuality (0-100%)
  
  // Fare breakdown
  baseFare              ← driver's fare per seat
  passengerServiceFee   ← 3% platform fee
  passengerServiceFeeGST ← 5% GST on (base+fee)
  totalFare             ← what passenger pays
  discountAmount, couponCode, couponDiscount
  finalAmount           ← after discount
  isFirstRideFree
  
  // Legacy fields (backward compat)
  platformFee, gst
  
  // Payment
  paymentStatus ('pending'|'paid'|'failed'|'refunded')
  paymentMethod, razorpayOrderId, razorpayPaymentId, razorpaySignature
  
  // Status workflow
  status ('pending'|'confirmed'|'rejected'|'cancelled'|'completed')
  
  // Notes
  passengerNotes, specialRequirements
  
  // Driver rating (after completion)
  driverRating: { rating, review, givenAt }
  passengerRating: { rating, review, givenAt }
}
```

### Payment.js — Payment details (driver's payment info)
```javascript
Payment = {  // Actually stores DRIVER'S payment receiving info
  user, userId  ← driver
  
  // UPI
  upiId, upiQrCode, isUpiVerified, upiProvider
  
  // Bank account
  accountHolderName, accountNumber, ifscCode, bankName, branchName
  accountType, isBankVerified, bankVerificationMethod
  
  // Cards (for future use)
  cards: [{ cardId, last4, expiryMonth, expiryYear, brand }]
  
  // Preferred method
  preferredPaymentMethod ('upi'|'bank'|'card')
}
```

### Inquiry.js — Support tickets
```javascript
Inquiry = {
  userId, name, email, phone
  type: enum [contact_general, contact_partnership, report_ride, 
              report_safety, report_payment, blog_submission, ...]
  subject, message
  meta: { affectedPage, stepsToReproduce, relatedRideId, severity }
  
  ticketNumber (unique, auto-generated)
  status: enum [open, in_progress, waiting_on_user, resolved, closed, 
                archived, seen, replied]
  priority: enum [low, medium, high, urgent, critical]
  assignedTo (ref User)
  internalNotes: [{ note, addedBy, addedAt }]
  adminResponse, respondedAt, respondedBy
  
  createdAt, updatedAt
}
```

### RideReport.js — Ride safety reports
```javascript
RideReport = {
  ticketId (unique)
  ride (ref Ride), booking (ref Booking)
  driver, passenger (ref User)
  reporter: { userId, role ('driver'|'passenger') }
  
  issueType: enum [wrong_route, excessive_charge, reckless_driving,
                   safety_concern, lost_item, unprofessional_conduct, ...]
  severity: enum [low, medium, high, critical]
  description (max 2000 chars)
  attachments: [{ url, uploadedAt, description }]
  
  requestedAction: enum [refund, credit, investigation, driver_warning, other]
  requestedAmount
  
  status: enum [new, acknowledged, investigating, resolved, closed]
  priority
  
  adminActions: [{ action, performedBy, notes, timestamp }]
  resolution: { type, notes, resolvedAt, resolvedBy }
}
```

### BlogPost.js — Community blog
```javascript
BlogPost = {
  title, slug, excerpt, content
  author (ref User)
  category: enum [Travel Stories, Carpooling Tips, Community Stories, 
                  Sustainability, Industry Insights]
  tags: [String]
  coverImage: { url, publicId }
  
  status: enum [draft, pending_review, published, rejected, archived]
  publishedAt, rejectedAt, rejectionNote
  
  likes: [ObjectId], likeCount
  comments: [{ author, content, likes, parentId, isFlagged, reports }]
  commentCount, viewCount, shareCount
  
  reports: [{ reportedBy, reason }]
  isFlagged, flaggedCount
}
```

### Rating.js
```javascript
Rating = {
  booking (ref Booking)
  rideId (ref Ride)
  raterId, rateeId (ref User)
  raterRole ('passenger'|'driver')
  rating (1-5)
  review (String)
  categories: { punctuality, driving, behavior, vehicle } (each 1-5)
  isAnonymous, isPublic
  createdAt
}
```

---

## 6. Backend Architecture

### server.js — Express setup
```javascript
// Middleware stack (order matters):
app.use(cors({...}))          // CORS with allowed origins list
app.use(express.json())        // Parse JSON bodies
app.use(express.urlencoded())  // Parse form data
app.use(cookieParser())        // Required for HttpOnly refresh token

// MongoDB: lazy connect (Vercel-compatible)
// connectDB() called inside each handler to reuse connection

// Routes mounted at /api/:
app.use('/api/auth',        authRoutes)
app.use('/api/rides',       rideRoutes)
app.use('/api/bookings',    bookingRoutes)
app.use('/api/payments',    paymentRoutes)
app.use('/api/payouts',     payoutRoutes)
app.use('/api/users',       userRoutes)
app.use('/api/ratings',     ratingRoutes)
app.use('/api/blog',        blogRoutes)
app.use('/api/inquiries',   inquiryRoutes)
app.use('/api/stats',       statsRoutes)
app.use('/api/admin',       adminRoutes)
app.use('/api/driver-verification', driverVerificationRoutes)
app.use('/api/receipts',    receiptRoutes)
app.use('/api/webhooks',    webhookRoutes)
```

### Two auth middleware files
The codebase has two auth files — use the right one for each route:

**`middleware/auth.js`** — used by `adminRoutes.js` and `statsRoutes.js`
- `protect` — basic JWT verify, attaches user to req
- `protectAdmin` — checks `decoded.role === 'admin'`
- `authorize(roles)` — role-based guard

**`middleware/authMiddleware.js`** — used by `rideRoutes.js`, `bookingRoutes.js`, etc.
- `protect` — stricter: checks account status, email verified, not suspended
- Returns `code: 'TOKEN_EXPIRED'` specifically for refresh flow
- `requireVerifiedDriver` — additionally checks `isDriverVerified === true`

---

## 7. Authentication System

### Token strategy
```
ACCESS TOKEN:
  - JWT, 15-minute expiry
  - Payload: { id, type: 'access' }
  - Signed with JWT_SECRET
  - Stored: in-memory (useAuth.jsx closure, never localStorage)
  - Sent: Authorization: Bearer <token> header

REFRESH TOKEN:
  - JWT, 7-day expiry
  - Payload: { id, type: 'refresh' }
  - Signed with JWT_REFRESH_SECRET (different secret)
  - Stored: HttpOnly Secure Strict-SameSite cookie (browser only)
  - Sent: automatically by browser on POST /api/auth/refresh-token
```

### Login flow
```
1. POST /api/auth/login { email, password }
2. Backend: bcrypt.compare → if locked out, reject
3. On success: generate accessToken + refreshToken
4. Set refreshToken as HttpOnly cookie
5. Return { success, token: accessToken, user: sanitizedUser }
6. Frontend (useAuth): setAccessToken(token) → in-memory
7. Persist user object to localStorage (non-sensitive)
8. Schedule silent refresh at 14 minutes
```

### Refresh flow (auto, transparent)
```
1. Any API call returns 401 { code: 'TOKEN_EXPIRED' }
2. api.js interceptor catches this
3. If already refreshing: queue the request, wait
4. POST /api/auth/refresh-token (browser sends cookie automatically)
5. Backend validates refresh JWT, returns new accessToken
6. setAccessToken(newToken) → in-memory
7. Retry all queued requests with new token
8. If refresh fails: clearAccessToken, remove localStorage user, redirect /login
```

### Admin auth (separate, simpler)
```
1. POST /api/admin/login { username, password }
2. Backend: crypto.timingSafeEqual comparison against env vars
3. Returns { success, token } (30-day JWT, role:'admin')
4. Frontend: localStorage.setItem('adminToken', token)
5. adminAxios interceptor: attaches as Bearer token
6. protectAdmin middleware: decoded.role === 'admin'
```

### Account lockout
- 5 failed attempts → locked for 15 minutes
- `failedLoginAttempts` and `lockoutUntil` fields on User
- Reset on successful login

---

## 8. API Routes — Complete Map

### Auth (`/api/auth`)
```
POST   /signup                    { name, email, password }
POST   /login                     { email, password }
POST   /logout                    Clears refresh cookie
POST   /refresh-token             Uses HttpOnly cookie → returns new accessToken
GET    /profile          [auth]   Returns sanitized user
PUT    /profile          [auth]   Update name/phone/gender/DOB/avatar
DELETE /account          [auth]   Delete account
POST   /forgot-password           { email }
POST   /verify-reset-code         { email, code }
POST   /reset-password            { email, code, newPassword }
POST   /verify-email              { token }
POST   /resend-verification-email { email }
```

### Rides (`/api/rides`)
```
GET    /search                    ?start=&end=&date=&seats=&limit=
GET    /featured                  ?limit=8 (public, no auth)
GET    /my           [auth]       ?status=active|completed|cancelled
GET    /:id          [auth]       Single ride with bookings
GET    /:id/bookings [auth]       All bookings for a ride (driver only)
POST   /:id/view     [auth]       Increment view count
PUT    /:id          [auth]       Update ride details
PATCH  /:id/status   [auth]       { status: 'cancelled'|'completed' }
DELETE /:id          [auth]       Delete ride
POST   /            [verified driver] Post new ride
```

### Bookings (`/api/bookings`)
```
POST   /             [auth]   Create booking { rideId, seatsBooked, pickupLocation, dropLocation, matchType, segmentFare, ... }
GET    /my           [auth]   Passenger's bookings ?status=&limit=&page=
GET    /driver       [auth]   Driver's incoming requests ?status=&limit=&page=
GET    /:id          [auth]   Single booking
PATCH  /:id/status   [auth]   { status: 'confirmed'|'rejected'|'cancelled'|'completed' }
POST   /:id/cancel   [auth]   { reason }
POST   /:id/payment  [auth]   { transactionId, orderId, paymentGateway }
POST   /:id/rating   [auth]   { rating, review, categories }
```

### Stats (`/api/stats`)
```
GET    /home                  Public. Returns totalUsers, verifiedDrivers, totalRides, totalCities, averageRating
GET    /detailed    [auth]    More detailed breakdown
GET    /founder     [admin]   Business intelligence analytics
```

### Admin (`/api/admin`) — ALL require protectAdmin
```
POST   /login                            { username, password }

GET    /analytics/summary                KPI metrics
GET    /users?page=&limit=&search=       User list
PUT    /users/:id                        { isSuspended?, role? }
GET    /users/:id/rides                  User's posted rides
GET    /users/:id/bookings               User's bookings

GET    /rides?page=&limit=&status=
GET    /bookings?page=&limit=&status=
GET    /payments?page=&limit=&status=

GET    /verifications                    All submitted verifications (with fresh S3 URLs)
PUT    /verifications/:id               { status, remark }
GET    /verifications/:id/document/:type Stream document as blob
       type ∈ {profilePhoto, aadhaarFront, aadhaarBack, dlFront, dlBack}

GET    /enquiries?page=&limit=&status=
PUT    /enquiries/:id                   { status }

GET    /reports?page=&limit=&severity=
PUT    /reports/:id                     { status }

GET    /blogs?page=&limit=&status=
PUT    /blogs/:id                       { status }
```

### Driver Verification (`/api/driver-verification`)
```
POST   /upload       [auth]   Upload documents (multipart: profilePhoto, aadhaarFront, aadhaarBack, dlFront, dlBack)
GET    /status       [auth]   Get own verification status
POST   /submit       [auth]   Submit for review (transitions status to 'submitted')
```

### Payments (`/api/payments`)
```
POST   /create-order  [auth]  { bookingId, amount } → Razorpay order
GET    /setup         [auth]  Get user's payment setup (UPI/bank)
POST   /setup         [auth]  Save/update payment setup
```

---

## 9. Business Logic & Payment Flow

### Fare calculation (frontend: `utils/paymentCalculator.js`)
```
PLATFORM FEE RATE:  3% of base fare
GST RATE:           5% of (base fare + platform fee)

Passenger pays:
  baseFare               = driver's set price per seat
  platformFee            = baseFare × 0.03
  GST                    = (baseFare + platformFee) × 0.05
  totalFare              = baseFare + platformFee + GST

Driver receives:
  Exactly baseFare × seatsBooked (platform charges added on top)

Example: baseFare ₹500, 1 seat
  platformFee  = ₹15
  GST          = (₹500 + ₹15) × 0.05 = ₹25.75
  totalFare    = ₹540.75
  driverEarns  = ₹500
```

### Commission breakdown (backend: `services/commissionService.js`)
```
commissionPercent = env.PLATFORM_COMMISSION_PERCENT (default 10%)
gstOnCommission   = env.GST_PERCENT (default 18%)

baseCommission    = totalFare × commRate/100
gstAmount         = baseCommission × gstRate/100
platformKeeps     = baseCommission + gstAmount
driverReceives    = totalFare - platformKeeps
```

### Segment fare (route-matched rides)
When a passenger's start/end doesn't exactly match the driver's route, the system uses Haversine distance to calculate a proportional fare:
```
segmentFare = (passenger segment distance / total route distance) × driverFare × seats
```

### Payment flow (Razorpay)
```
1. Passenger clicks "Book" → BookingModal opens
2. POST /api/bookings → creates booking with status:'pending', paymentStatus:'pending'
3. POST /api/payments/create-order → Razorpay creates order, returns { orderId, amount }
4. Frontend opens Razorpay checkout (window.Razorpay)
5. On payment success: POST /api/bookings/:id/payment { razorpayPaymentId, orderId, signature }
6. Backend: verify signature with HMAC-SHA256
7. On valid: update booking paymentStatus:'paid', notify driver via email
8. Webhook (POST /api/webhooks/razorpay) also handles payment events as backup
```

---

## 10. Frontend Architecture

### Token flow in the browser
```
useAuth.jsx:
  _accessToken (module-level variable, never hits DOM storage)
  export getAccessToken / setAccessToken / clearAccessToken

api.js (axios interceptor):
  request → getAccessToken() → add Authorization header
  response 401 TOKEN_EXPIRED → POST /auth/refresh-token → setAccessToken(new) → retry

Admin is separate:
  adminService.js → adminAxios with baseURL /api/admin
  reads localStorage.getItem('adminToken') per request
```

### State management
No Redux. State lives in:
- `useAuth` hook (global auth, user object)
- `UserContext` (legacy, wraps some pages; both exist simultaneously)
- Component-level `useState` everywhere else
- `sessionStorage` for scroll position restoration on Home page (`home_scroll_y`)

### Routing (`AppRoutes.jsx`)
```jsx
// Public
/                     → Home (shows PublicLanding or LoggedInDashboard based on auth)
/login, /signup       → PublicRoute (redirects to / if already logged in)
/forgot-password
/verify-email, /verification-pending
/about, /how-it-works, /blog, /help, /faq, /contact, /report
/guidelines, /terms

// Protected (auth required)
/ride/search          → RideSearch
/ride/post            → RidePost
/ride/:id             → single ride detail page
/profile              → Profile (with ?tab=verification for KYC)
/bookings/my-bookings → MyBookings
/driver/bookings      → DriverBookings
/upcoming-rides       → passenger upcoming
/driver/upcoming      → driver upcoming
/notifications
/payment-success, /payment-failed

// Admin (separate auth)
/admin/login          → AdminLogin
/admin/dashboard      → AdminDashboard
```

---

## 11. UI Design System

The entire app — public pages, dashboard, AND admin portal — uses this system.

### Colors
```
Primary:   blue-600 (#1d4ed8)  → buttons, links, active states
Success:   green-600 (#16a34a) → approved, confirmed, success
Warning:   amber-600 (#d97706) → pending, needs attention
Danger:    red-600  (#dc2626)  → rejected, error, critical
Info:      purple-600 (#9333ea) → under review, reviewing
Neutral:   gray-50  (#f9fafb)  → page bg
           white               → cards
           gray-900 (#111827)  → headings

Gradient header:  from-blue-700 via-blue-600 to-blue-500
Gradient CTA:     from-blue-700 via-blue-600 to-green-600
Logo gradient:    from-blue-600 to-green-600
```

### Typography
```
Display:       text-3xl–5xl font-extrabold text-white (hero headings)
Section head:  text-lg–2xl font-bold text-gray-900
Card head:     text-sm–base font-semibold text-gray-900
Label:         text-xs font-bold text-gray-400 uppercase tracking-wider
Body:          text-sm text-gray-700
Muted:         text-xs text-gray-500
Mono (IDs):    font-mono text-xs text-gray-600
```

### Components pattern
```
Page bg:       bg-gray-50 min-h-screen
Card:          bg-white rounded-2xl border border-gray-200 p-5 or p-6
Card hover:    hover:shadow-md transition-all
Table:         overflow-hidden (on wrapper), divide-y divide-gray-50 (tbody)
Table header:  bg-gray-50 border-b border-gray-200
Table cell:    px-4 py-3
Button primary: bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold
Button ghost:  border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl
Badge pill:    text-xs font-semibold px-2.5 py-0.5 rounded-full border
Input:         border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 bg-gray-50
Modal overlay: fixed inset-0 bg-black/40 backdrop-blur-sm
Slide-over:    ml-auto w-full max-w-xl bg-white h-full shadow-2xl
```

### Status badge color mapping
```
approved / completed / active / resolved / published → green
submitted / pending / confirmed / open               → blue
under_review                                          → purple
needs_info / high / warning                          → amber
rejected / cancelled / critical / failed             → red
draft / not_started / gray                           → gray
```

---

## 12. Page-by-Page Frontend Reference

### Home (`/`)

**Logged-out (PublicLanding):**
- Full-height hero with gradient bg, headline, search form (from/to)
- 3D interactive car (Three.js, desktop only) — draggable, headlights toggle, auto-spin
- PlatformMarquee ticker (stats: users, rides, cities, rating)
- Live ride feed (4-column grid, up to 8 rides)
- Prices + driver names blurred for logged-out users; hover overlay → "Sign in to unlock"
- Trust perks section, How It Works (4 steps), Final CTA

**Logged-in (LoggedInDashboard):**
- Blue gradient header with greeting + date + avatar
- Quick nav cards: Upcoming Trips, My Bookings, Ride Requests, Profile
- Driver verification prompt (if not verified)
- Stats bar: community members, rides, cities, avg rating
- "Rides leaving soon" grid (8 cards, live)

**Scroll restoration:** Uses `sessionStorage.setItem('home_scroll_y', window.scrollY)` before navigation, restored on mount.

### RideSearch (`/ride/search`)
- Route + date + filters → hits `GET /api/rides/search`
- Map view (Leaflet) alongside card list
- Route matching: shows segment fare for "on_route" matches
- Auth-gated: prices hidden, driver details blurred for logged-out
- Booking happens via `BookingModal` component

### RidePost (`/ride/post`)
- Multi-step form: route → date/time → vehicle → seats/fare → preferences
- Google Maps route preview + distance/duration calculation
- Requires `isDriverVerified === true` (protected by `requireVerifiedDriver` middleware)
- If not verified → shows CTA to complete verification

### Profile (`/profile`)
- Personal info tab: name, phone, gender, DOB, avatar
- Driver verification tab (`?tab=verification`): document upload flow
- My rides tab: driver's posted rides
- Payment settings tab: UPI/bank setup
- Ratings tab: received ratings history

### BookingModal (component, used in RideSearch and Ride detail)
- Seat count selector
- Pickup/drop location inputs
- Fare breakdown display (using PaymentCalculator)
- Razorpay checkout trigger

---

## 13. Admin Portal — Complete Build Guide

### Overview
The admin portal is completely isolated from the main app. It has its own:
- Login page (`/admin/login`)
- Auth token (`adminToken` in localStorage, separate from user token)
- Axios instance (`adminAxios` in `adminService.js`)
- Route guard (checking `adminToken` on mount)

### File locations (where to put new admin files)
```
frontend/src/pages/Admin/
├── AdminLogin.jsx           ← Login screen
├── AdminDashboard.jsx       ← Main shell (navbar + tabs + all tab components)
├── RequestDetailsModal.jsx  ← Existing: driver verification detail
├── UserDetailModal.jsx      ← NEW: full user profile slide-over
├── RideDetailModal.jsx      ← NEW: ride detail slide-over
└── BookingDetailModal.jsx   ← NEW: booking + fare detail slide-over
```

### AdminDashboard.jsx structure
```
AdminDashboard (root component)
├── State: analytics, verRequests, enquiries, reports, activeTab
├── loadCore() — loads verifications + analytics + top enquiries + top reports
├── Navbar (sticky, brand + Sign Out)
├── Tab navigation (9 tabs with active indicator + pending badge)
└── Tab content (conditional render):
    ├── OverviewTab        — KPI cards + 3 activity panels
    ├── UsersTab           — table + pagination + UserDetailModal
    ├── RidesTab           — table + pagination + RideDetailModal
    ├── BookingsTab        — table + pagination + BookingDetailModal
    ├── PaymentsTab        — table + pagination (no detail modal)
    ├── VerificationTab    — stats + search + filter + table + RequestDetailsModal
    ├── EnquiriesTab       — card list + expand + status actions
    ├── ReportsTab         — card list + severity filter + resolve action
    └── BlogsTab           — card list + publish/archive actions
```

### Shared UI components (all in AdminDashboard.jsx top section)
```jsx
// Color badge
<Badge label="Pending" color="blue" />

// Status-aware badge (auto maps status → color)
<StatusBadge status="submitted" />  → "Pending" blue

// KPI metric card
<StatCard label="Total Users" value={1234} icon="👥" color="blue" sub="registered" />

// Search input with magnifier
<SearchBar value={q} onChange={setQ} placeholder="Search…" />

// Horizontal pill filters
<FilterPills options={[{value:'all',label:'All'},{value:'active',label:'Active'}]}
             value={filter} onChange={setFilter} />

// Empty placeholder
<EmptyState message="No rides found" icon="🚗" />

// Prev/Next pagination
<Pagination page={1} total={143} limit={20} onPage={setPage} />

// Key-value row (used in modals)
<InfoRow label="Email" value="user@example.com" />
```

### Tab loading pattern (every data tab follows this)
```javascript
function UsersTab() {
  const [data, setData]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);  // for detail modal

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/admin/users', { params });
      setData(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);  // Reset to page 1 on filter change

  return (
    <div>
      {/* Table */}
      {/* Pagination */}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
```

### Slide-over modal pattern
```jsx
export default function DetailModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel: slides in from right */}
      <div className="relative ml-auto w-full max-w-xl bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Sticky header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">Title</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">✕</button>
        </div>
        
        {/* Scrollable body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* InfoRow sections */}
        </div>
        
        {/* Optional footer with actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button>Action</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
```

### adminService.js — service layer
```javascript
// Two instances:
const adminAxios = axios.create({ baseURL: `${API_URL}/admin` });
adminAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Exported helpers:
export const loginAdmin = (username, password) =>
  axios.post(`${API_URL}/admin/login`, { username, password })

export const fetchRequests = () =>
  adminAxios.get('/verifications').then(r => r.data.data)

export const updateRequestStatus = (id, status, remark) =>
  adminAxios.put(`/verifications/${id}`, { status, remark })

export const fetchVerificationDocument = (id, documentType) =>
  adminAxios.get(`/verifications/${id}/document/${documentType}`, { responseType: 'blob' })
  .then(r => ({ blob: r.data, contentType: r.headers['content-type'] || r.data.type }))
```

---

## 14. Adding New Files to the Admin (Step-by-Step)

This is the exact recipe to add any new admin feature (e.g., UserDetailModal, RideDetailModal, BookingDetailModal).

### Step 1 — Create the file

**File path:** `frontend/src/pages/Admin/UserDetailModal.jsx`

Start with the slide-over skeleton above. Add tabs for different sections of data (Info, Rides, Bookings, Verification for a user modal).

### Step 2 — Import in AdminDashboard.jsx

At the top of `AdminDashboard.jsx`, add:
```javascript
import UserDetailModal from './UserDetailModal';
import RideDetailModal from './RideDetailModal';
import BookingDetailModal from './BookingDetailModal';
```

### Step 3 — Add state in the parent tab component

In `UsersTab` (inside AdminDashboard.jsx):
```javascript
const [selected, setSelected] = useState(null);
```

In the table row:
```jsx
<tr onClick={() => setSelected(user)} className="cursor-pointer hover:bg-blue-50/40">
```

At the bottom of the tab's return:
```jsx
{selected && <UserDetailModal user={selected} onClose={() => setSelected(null)} onRefresh={load} />}
```

### Step 4 — Add backend routes (if new endpoints needed)

In `backend/controllers/adminController.js`, add the new function:
```javascript
exports.getUserRides = async (req, res) => {
  const rides = await Ride.find({ driver: req.params.id }).limit(20).sort({ date: -1 });
  res.json({ success: true, data: rides });
};
```

In `backend/routes/adminRoutes.js`:
```javascript
const { ..., getUserRides } = require('../controllers/adminController');
router.get('/users/:id/rides', protectAdmin, getUserRides);
```

### Step 5 — Call from the modal

In `UserDetailModal.jsx`:
```javascript
useEffect(() => {
  api.get(`/admin/users/${user._id}/rides`).then(r => setRides(r.data?.data || []));
}, [user._id]);
```

### Step 6 — That's it. Checklist:
- [ ] New file created in `frontend/src/pages/Admin/`
- [ ] Imported in `AdminDashboard.jsx`
- [ ] `useState(null)` for selected item in parent tab
- [ ] `onClick={() => setSelected(item)}` on table rows
- [ ] Modal rendered conditionally at bottom of tab JSX
- [ ] If new data needed: backend controller function + route added
- [ ] Route in `adminRoutes.js` with `protectAdmin` guard

---

## 15. Email & Notification System

### Service: `services/emailService.js` → Resend API

**Triggered emails:**
```
signup               → sendVerificationEmail(user)
                       Subject: "Verify your email — ShareMyRide"
                       Contains: /verify-email?token=<emailVerificationToken>

booking confirmed    → sendBookingConfirmationEmail(booking, ride, driver)
                       ICS calendar attachment included

booking accepted     → notify passenger
booking rejected     → notify passenger with reason
booking cancelled    → notify other party

ride reminder        → 24h before departure (scheduled job, if implemented)

verification update  → email when admin approves/rejects KYC
                       (called from adminController.updateVerification)

password reset       → sendPasswordResetEmail(user, code)
                       6-digit OTP, 10-minute expiry
```

**Email from:** `noreply@sharemyride.in` (env: `EMAIL_USER`)
**Library:** Resend SDK (`config/resend.js`)

### Notifications (in-app)
- `NotificationDropdown.jsx` component in Header
- Notifications stored in User model or separate Notification collection
- Polled or WebSocket (check NotificationsPage.jsx)

---

## 16. AWS S3 — File Upload System

### Service: `services/s3Service.js`

**Bucket:** `S3_BUCKET_NAME` env var
**Region:** `AWS_REGION` (recommended: `ap-south-1` for India)

**Key operations:**
```javascript
// Upload (called from driverVerificationController via multer middleware)
uploadToS3(buffer, key, contentType)  → { Location, Key }

// Get presigned URL (for verification list in admin)
getSignedUrl(key, expiresIn=3600)  → presigned URL string (1-hour validity)

// Stream object (for admin document preview)
getObjectFromS3(key)  → { body: ReadableStream, contentType, contentLength }

// Normalize S3 key from URL
normalizeS3Key(url)  → extracts key from full S3 URL
```

**Upload flow for KYC documents:**
```
1. Driver uploads file on Profile → POST /api/driver-verification/upload
2. uploadMiddleware.js: multer memory storage → passes buffer to S3
3. Key format: driver-verification/<userId>/<documentType>/<timestamp>.<ext>
4. S3 key + URL stored in User.driverVerification.*ImageKey and *.Url
5. Admin streams via backend: GET /api/admin/verifications/:id/document/:type
   → getObjectFromS3(key) → pipe(res) [never exposes S3 URL to browser]
```

**S3 bucket policy:** Private (no public access). All access via IAM role + presigned URLs.

---

## 17. Driver Verification Flow

### States
```
not_started → submitted → under_review → approved ✓
                       → rejected ✗
                       → needs_info → (driver re-submits) → submitted
```

### Frontend flow
```
1. Profile → Verification tab
2. Upload 5 documents: profilePhoto, aadhaarFront, aadhaarBack, dlFront, dlBack
3. Enter Aadhaar number + DL number + DL expiry
4. Click "Submit for Review" → POST /api/driver-verification/submit
5. Status shows "Under Review"
6. Email notification on approval/rejection
7. On approval: User.isDriverVerified = true (set by pre-save hook)
8. Can now POST /api/rides (requireVerifiedDriver passes)
```

### Admin flow
```
1. Admin Dashboard → Driver Verification tab
2. See all submissions with document progress bars
3. Click row → RequestDetailsModal opens
4. All 5 documents load as blobs (streamed via backend, never direct S3)
5. Admin can:
   - Approve → status:'approved' → isDriverVerified:true
   - Reject  → status:'rejected' + rejectionReason
   - Needs Info → status:'needs_info' + remark
   - Mark Under Review → status:'under_review'
6. Each action appends to auditTrail: [{ action, remark, timestamp, admin:'ShareMyRide' }]
```

### Document streaming security
Documents are private. The `streamVerificationDocument` endpoint:
1. Verifies admin JWT
2. Looks up User → gets s3Key
3. Calls `getObjectFromS3(s3Key)`
4. Pipes stream to response with `Content-Type` from S3 metadata
5. Sets `Cache-Control: private, max-age=300`
6. **Never** exposes raw S3 URLs or presigned URLs to the admin browser

---

## 18. Ride Matching Algorithm

### Service: `services/utils/routeMatching.js`

The platform supports "on-route" bookings where a driver going A→C can pick up a passenger going B→D if B and D fall on or near the route.

```
EXACT match:
  Passenger start = Driver start AND passenger end = Driver end
  → Full fare applies

ON_ROUTE match:
  Passenger's start and end both fall within tolerance (default 5km) of driver's route polyline
  → Segment fare = (passenger distance / total route distance) × fare × seats

NEARBY match:
  Passenger within tolerance radius of start/end but not exactly on route
  → Similar segment fare with adjustment

matchQuality: 0-100 (percentage of route overlap)
```

**Haversine distance:**
```javascript
const R = 6371; // Earth radius km
// Used for: distance between two coordinates
// Also: perpendicular distance from a point to a route segment line
```

---

## 19. Deployment

### Backend — Render.com
```
Service type: Web Service
Build command: npm install
Start command: node server.js
Environment: Production
Region: Singapore (closest to India)
Health check: GET /
```

**MongoDB:** MongoDB Atlas (M0 free or M10 paid)
- IP whitelist: `0.0.0.0/0` for Render (dynamic IPs)
- Connection string in `MONGO_URI` env var

### Frontend — Vercel
```
Framework preset: Vite
Build command: npm run build
Output directory: dist
Root directory: frontend
```

**Env vars on Vercel:**
```
VITE_API_URL=https://your-backend.onrender.com/api
VITE_GOOGLE_MAPS_API_KEY=...
VITE_RAZORPAY_KEY_ID=...
```

**Vercel routing:** `vercel.json` in backend folder handles SPA routing:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

### Full-stack on single Render service (alternative)
The backend `package.json` has a build script:
```json
"build": "npm install && npm install --prefix ../frontend && npm run build --prefix ../frontend"
```
This builds the frontend into `frontend/dist`, then Express serves it statically.

---

## 20. Common Bugs & Gotchas

### 1. Two auth middleware files
`auth.js` and `authMiddleware.js` both export `protect` but they're different:
- `authMiddleware.js` sends `code: 'TOKEN_EXPIRED'` which triggers the frontend refresh flow
- `auth.js` (admin) does NOT — admin token expired means re-login
- Mix them up and the refresh loop will break or admin routes will fail

**Fix:** admin routes always use `auth.js` → `protectAdmin`. User routes use `authMiddleware.js` → `protect`.

### 2. `loadCore` vs per-tab data
`loadCore` in the root `AdminDashboard` loads verifications + analytics summary + first 50 enquiries + reports. These feed the Overview tab and the notification badge on the Verification tab. Individual tabs (Users, Rides, Bookings, Payments) do their own paginated fetching — they don't use `loadCore` data.

### 3. S3 URL freshness in verification list
`getVerifications` regenerates presigned URLs for every document for every user on every call. With 100+ users this gets slow. The stream endpoint (`/verifications/:id/document/:type`) is preferred for document viewing — only generates one URL at a time on demand.

### 4. UserContext vs useAuth
Two parallel auth systems exist:
- `UserContext.jsx` — older, stores token in `localStorage`, used by some pages
- `useAuth.jsx` — newer, stores access token in memory, uses HttpOnly refresh cookie

Some pages import `useAuth`, some import from `UserContext`. They're mostly compatible because both write `localStorage.user`. When building new features: always use `useAuth`.

### 5. Admin token in localStorage
The `adminToken` is stored in `localStorage` (not in-memory like the user access token). This is acceptable for an admin-only internal tool. If you need higher security, switch to httpOnly cookie, but that requires backend changes to set/clear it.

### 6. `useCallback` + `useEffect` for data loading
Every tab's `load` function must be wrapped in `useCallback` with its dependencies:
```javascript
const load = useCallback(async () => { ... }, [page, filter, search]);
useEffect(() => { load(); }, [load]);
```
Without `useCallback`, `load` gets a new reference every render → infinite `useEffect` loop.

### 7. Reset page to 1 when filter changes
```javascript
useEffect(() => { setPage(1); }, [filter]);
```
Missing this means you're on page 5 and change filter → get empty results.

### 8. Document blob cleanup
In `RequestDetailsModal`, every document preview creates a blob URL via `URL.createObjectURL`. These MUST be revoked on unmount or you get memory leaks:
```javascript
return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
```

### 9. `protectAdmin` checks `decoded.role === 'admin'`
The admin JWT payload is hardcoded as `{ id: 'admin', role: 'admin' }`. There's no `User` lookup for admin requests. This means admin doesn't have a User document — don't try to do `req.user.name` in admin routes.

### 10. `requireVerifiedDriver` vs just `protect`
Ride posting requires `isDriverVerified === true`. This is checked by `requireVerifiedDriver` middleware:
```javascript
if (!user.isDriverVerified) {
  return res.status(403).json({ 
    message: 'Driver verification required',
    action: 'COMPLETE_VERIFICATION'
  });
}
```
Frontend checks for `action: 'COMPLETE_VERIFICATION'` in the error response and shows the verification prompt.

### 11. Ride model has 3 driver references
`driver`, `driverId`, `postedBy` all reference the same User. This is legacy redundancy. When querying by driver: use `{ driver: userId }` (most routes do this). When populating: `.populate('driver', 'name phone')`.

### 12. CORS in production
The `allowedOrigins` list in `server.js` includes hardcoded Vercel URLs. When you deploy to a new Vercel URL, add it to this list or set `FRONTEND_URL` env var. There's a fallback `callback(null, true)` that allows everything — remove this in production for strict security.

### 13. Booking fare sent from frontend
The booking `totalFare` is calculated in the frontend (`paymentCalculator.js`) and sent to the backend. The backend recalculates and validates it. If there's a discrepancy (e.g. due to stale price), the booking is rejected. Always use the latest ride's `fare` field for calculations.

### 14. Scroll restoration on Home
The Home page saves `window.scrollY` to `sessionStorage('home_scroll_y')` before any navigation. On mount, it reads and restores the scroll position after 80ms (to let React render first). This is why navigation from the home page feels seamless. Don't remove this pattern from Home.jsx.

### 15. Admin pending badge
The verification tab shows a blue badge count of `status === 'submitted'` verifications. This count updates when `loadCore()` is called. `loadCore` runs on mount and after any status update. If the badge isn't updating, check that `loadCore` is being awaited after `handleUpdateVerification`.

---

*Document version: June 2026*
*Codebase: production-ready-sharemyride*
*Covers: backend + frontend + admin portal*
