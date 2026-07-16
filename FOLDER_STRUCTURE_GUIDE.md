# ShareMyRide — Folder Structure Guide

> **Last updated:** 2026-07-16  
> Complete reference for every folder and key file in the project, including all recent features (Chat/Negotiation UX, Google OAuth, Payments, Location, Admin, Safety, etc.)

---

## Root Level

| Path | Purpose |
|------|---------|
| `backend/` | Node.js/Express API server |
| `frontend/` | React/Vite frontend application |
| `README.md` | Project overview and local setup |
| `package.json` | Root workspace config |
| `FOLDER_STRUCTURE_GUIDE.md` | This file — project map and reference |
| `BACKEND_SETUP_GUIDE.md` | Backend environment and startup guide |
| `EMAIL_SETUP_GUIDE.md` | Email service (EmailJS / SMTP) setup |
| `ENV_QUICK_REFERENCE.md` | All environment variable keys and descriptions |
| `IMPLEMENTATION_STATUS.md` | Feature completion status tracker |
| `PRODUCTION_READY_CHECKLIST.md` | Pre-deployment production checklist |
| `PRODUCTION_SETUP.md` | Render / cloud deployment notes |
| `QUICK_REFERENCE.md` | Short developer cheatsheet |
| `SESSION_SUMMARY.md` | Rolling session progress notes |
| `SHAREMYRIDE_COMPLETE_GUIDE.md` | End-to-end platform guide |
| `UI.MD` | UI design decisions and component notes |

---

## Backend (`backend/`)

### Entry Point
- `backend/server.js` — Express app bootstrap, middleware registration, route mounting, Socket.IO init
- `backend/package.json` — Backend dependencies
- `backend/vercel.json` — Vercel serverless deployment config
- `backend/test.js` — Ad-hoc backend test script
- `backend/test-ocrm.js` — OCR/moderation test script

### `backend/config/`
Configuration loaders and integration setup.
- `db.js` — MongoDB connection via Mongoose
- `cloudinary.js` — Cloudinary image upload config
- `razorpay.js` — Razorpay payment gateway init

### `backend/controllers/`
One controller per domain — receives HTTP request, calls service/model, returns response.

| File | Handles |
|------|---------|
| `authController.js` | Register, login, Google OAuth, email verify, password reset, token refresh |
| `bookingController.js` | Create, view, cancel, and manage ride bookings |
| `chatController.js` | Conversations, messages, conversation summary (AI) |
| `negotiationController.js` | ✨ Initiate, accept, reject, counter, cancel, finalize negotiation → booking (seat-cap override enabled) |
| `rideController.js` | Post ride, search rides, update, delete, seat management |
| `userController.js` | Profile view/update, saved vehicle, avatar upload, role management |
| `paymentController.js` (`payment.controller.js`) | Razorpay order creation, payment verification |
| `webhookController.js` | Razorpay webhook handler |
| `ratingController.js` | Submit and fetch driver/passenger ratings |
| `rideLifecycleController.js` | Start/end ride journey, status transitions |
| `liveTrackingController.js` | Real-time location ping ingestion |
| `locationController.js` | Location search, geocoding utilities |
| `emergencyController.js` | SOS alerts, emergency contact notifications |
| `trustedContactsController.js` | Add/remove trusted emergency contacts |
| `moderationController.js` | Content flags, admin review queue |
| `payoutController.js` | Driver payout processing |
| `statsController.js` | Admin platform statistics |
| `driverVerificationController.js` | Document upload and KYC status |
| `blogController.js` | Blog post CRUD |
| `inquiryController.js` | Contact/inquiry form handling |

### `backend/models/`
Mongoose schemas — each maps to a MongoDB collection.

| File | Collection |
|------|-----------|
| `User.js` | Users (drivers + passengers, googleId, authProvider, savedVehicle) |
| `Ride.js` | Ride postings (route, seats, fare, stops, preferences) |
| `Booking.js` | Confirmed bookings (negotiated flag, negotiationId, fare breakdown) |
| `Negotiation.js` | Negotiation sessions (proposals, terms, status, finalized booking ref) |
| `Conversation.js` | Chat conversation threads (linked ride, negotiation, participants) |
| `Message.js` | ✨ Individual chat messages (restored correct schema) |
| `Payment.js` | Payment records (Razorpay order, status, amounts) |
| `Payout.js` | Driver payout records |
| `Rating.js` | Ratings and reviews |
| `RideJourney.js` | Active journey tracking sessions |
| `LocationPing.js` | Real-time GPS ping records during a journey |
| `Transaction.js` | Platform transaction ledger |
| `ModerationFlag.js` | Content moderation report records |
| `SafetyReport.js` | Safety incident reports |
| `RideReport.js` | Ride-specific issue reports |

### `backend/routes/`
Express route definitions — each file mounts under a prefix in `server.js`.

| File | API Prefix |
|------|-----------|
| `authRoutes.js` | `/api/auth` |
| `rideRoutes.js` | `/api/rides` |
| `bookingRoutes.js` | `/api/bookings` |
| `negotiationRoutes.js` | `/api/negotiations` |
| `chatRoutes.js` | `/api/chat` |
| `userRoutes.js` | `/api/users` |
| `paymentRoutes.js` | `/api/payments` |
| `webhookRoutes.js` | `/api/webhooks` |
| `ratingRoutes.js` | `/api/ratings` |
| `rideLifecycleRoutes.js` | `/api/rides/lifecycle` |
| `locationRoutes.js` | `/api/location` |
| `emergencyRoutes.js` | `/api/emergency` |
| `trustedContactsRoutes.js` | `/api/trusted-contacts` |
| `moderationRoutes.js` | `/api/moderation` |
| `payoutRoutes.js` | `/api/payouts` |
| `statsRoutes.js` | `/api/stats` |
| `adminRoutes.js` | `/api/admin` |
| `driverVerificationRoutes.js` | `/api/driver-verification` |
| `blogRoutes.js` | `/api/blog` |
| `inquiryRoutes.js` | `/api/inquiries` |
| `receiptRoutes.js` / `receipts.js` | `/api/receipts` |
| `testRoutes.js` | `/api/test` (dev only) |

### `backend/services/`
Business logic layer — called by controllers, not directly by routes.

| File | Responsibility |
|------|---------------|
| `socket.js` | Socket.IO server — room management, real-time messaging, typing events, negotiation broadcasts |
| `emailService.js` | Transactional email (verification, booking confirmation, OTP) |
| `businessEmailService.js` | Business-facing emails (reports, alerts) |
| `emailjsServerClient.js` | EmailJS client wrapper for server-side sending |
| `auditService.js` | Structured audit log for sensitive actions |
| `commissionService.js` | Platform fee + GST calculation (3% fee, 5% GST) |
| `payment.service.js` | Razorpay order lifecycle (create, verify, refund) |
| `payoutService.js` | Driver payout processing logic |
| `emergencyService.js` | SOS alert dispatch, trusted contact notification |
| `liveTrackingService.js` | GPS ping stream processing |
| `locationService.js` | Geocoding and location normalization |
| `moderationService.js` | Auto-flag, human review queue |
| `rideLifecycleService.js` | Ride status machine (draft → active → started → ended) |
| `rideMonitoringService.js` | Background ride health checks |
| `s3Service.js` | AWS S3 file uploads (documents, photos) |
| `linkedAccount.service.js` | Google OAuth account linking/merging |
| `pdfReceiptService.js` | Generate PDF receipts for completed bookings |
| `receiptGenerator.js` | Receipt data assembly helper |
| `jobs/rideReminderScheduler.js` | Cron: sends ride reminder emails before departure |
| `jobs/rideDataRetentionScheduler.js` | Cron: archives/purges old ride data |
| `utils/googleMaps.js` | Google Maps Distance Matrix API wrapper |
| `utils/locationNormalize.js` | Standardize city/address strings |
| `utils/logger.js` | Winston/console structured logger |
| `utils/regionGraph.js` | City-region graph for route matching |
| `utils/routeMatching.js` | Fuzzy route overlap detection for search |

### `backend/middleware/`
Express middleware applied to routes.
- `authMiddleware.js` — JWT verify, attach `req.user`
- `uploadMiddleware.js` — Multer file upload handler
- `adminMiddleware.js` — Role-check guard for admin-only routes

### `backend/utils/`
Miscellaneous backend helpers.
- `testBypass.js` — Dev-only auth bypass for testing

### `backend/scripts/`
One-time database maintenance and seeding scripts.
- `seedTestUsers.js` — Create test driver + passenger accounts
- `createTestUser.js` — Quick single test user creation
- `resetTestUserPasswords.js` — Reset test account passwords
- `addLockoutFields.js` — Migration: add account lockout fields to users
- `dropStaleTicketIdIndex.js` — Migration: remove legacy index

---

## Frontend (`frontend/`)

### Entry Points
- `frontend/index.html` — HTML shell
- `frontend/vite.config.js` — Vite build config
- `frontend/package.json` — Frontend dependencies
- `frontend/.env` — Frontend environment variables (`VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, etc.)
- `frontend/src/main.jsx` — React app mount, `GoogleOAuthProvider` wrapper
- `frontend/src/App.jsx` — Root component with router

### `frontend/src/config/`
- `api.js` — Axios instance with base URL + auth token interceptor
- `googleMaps.js` — Google Maps JS API loader config

### `frontend/src/routes/`
- `AppRoutes.jsx` — React Router v6 route tree, protected route wrappers

### `frontend/src/pages/`
Feature-level page components — each maps to a URL route.

#### Auth (`pages/Auth/`)
| File | Route |
|------|-------|
| `Login.jsx` | `/login` — Email/password + Google OAuth sign-in |
| `Signup.jsx` | `/signup` — Registration with Google OAuth option |
| `ForgotPassword.jsx` | `/forgot-password` |
| `VerifyEmail.jsx` | `/verify-email/:token` |
| `VerificationPending.jsx` | `/verification-pending` |

#### Home (`pages/Home/`)
- `Home.jsx` — Landing page (hero, search bar, ride cards, role dashboards). ✨ Fixed: `useNavigate` in `LoggedInDashboard` for `RideCard` navigation.

#### Chat (`pages/Chat/`)
- `ChatThread.jsx` — ✨ **Full chat + negotiation UX** (compact pinned negotiation banner, Yes/No auto-reply buttons, "Negotiation Done - Book Ride" button, "End" negotiation button, always-visible composer, `cancelNegotiation` import)

#### Inbox (`pages/Inbox/`)
- `Inbox.jsx` — Conversation list (all chats grouped by ride)

#### RideSearch (`pages/RideSearch/`)
- `RideSearch.jsx` — Search results with map and list view

#### RidePost (`pages/RidePost/`)
- `RidePost.jsx` — Post a new ride (driver flow)

#### Profile (`pages/Profile/`)
- `Profile.jsx` — User profile, avatar, saved vehicle, driver verification

#### Bookings (`pages/bookings/`)
- `MyBookings.jsx` — Passenger booking list with status/payment filters
- `DriverBookings.jsx` — Driver view of passenger requests

#### Rides (`pages/rides/`)
- `UpcomingRides.jsx` — Upcoming scheduled rides for logged-in user
- `NegotiationActions.jsx` — Trigger page for initiating a negotiation from a ride card

#### Driver (`pages/driver/`)
- `DriverUpcomingRides.jsx` — Driver-specific upcoming ride management

#### Admin (`pages/Admin/`)
- `AdminDashboard` + modals: `BookingDetailModal.jsx`, `RideDetailModal.jsx`, `UserDetailModal.jsx`, `RequestDetailsModal.jsx`

#### Payment
- `PaymentSetupForm.jsx` — Payment info entry
- `PaymentSuccess.jsx` — Post-payment confirmation page
- `PaymentFailed.jsx` — Payment failure handling page

#### Misc Pages
- `NotificationsPage.jsx` — Full notification history
- `DriverRideRequests.jsx` — Incoming ride requests for drivers

#### Footer Static Pages (`pages/FooterNavlinks/`)
About, Blog, ContactUs, Cookies, FAQ, Guidelines, HelpCenter, HowItWorks, PrivacyPolicy, Report, TermsAndConditions, TermsOfService

---

### `frontend/src/components/`
Reusable UI pieces — imported into pages.

#### `components/ui/`
- `Icon.jsx` — ✨ Centralized Lucide icon wrapper (name, size, className props). Used everywhere instead of raw emoji or SVGs.
- `map.jsx` / `map.tsx` — MapCN map component

#### `components/common/`
- `Header.jsx` — App header with nav, notification bell, messages bell
- `Footer.jsx` — Site-wide footer with links
- `HeroSection.jsx` — Landing hero banner
- `LocationAutocomplete.jsx` — Reusable location search input with suggestions
- `PickupLocationInput.jsx` / `DestinationLocationInput.jsx` — Specialized location inputs
- `PlatformMarquee.jsx` — Scrolling partner/feature ticker
- `OtpInput.jsx` — OTP digit input group
- `LoginRequiredSpeechToast.jsx` — Prompt toast for unauthenticated actions
- `RecentTicketsPanel.jsx` — Recent booking tickets sidebar

#### `components/ride/`
- `RideCard.jsx` — Ride listing card (fare display, seats, negotiation CTA)
- `RideForm.jsx` — Ride creation form (vehicle autofill, stops, preferences, pricing)
- `BookingModal.jsx` — Passenger booking confirmation modal with payment breakdown
- `BookingNotificationBadge.jsx` — Unread booking alert badge
- `EmergencySOSButton.jsx` — In-ride SOS trigger button
- `RideJourneyPanel.jsx` — Active journey info panel (live tracking, ETA)

#### `components/chat/`
- `MessageBubble.jsx` — Individual message render (own/other, system, timestamps)
- `NegotiationPanel.jsx` — Standalone negotiation panel component (also embedded in ChatThread)

#### `components/map/`
- `LeafletRideMap.jsx` — OpenStreetMap route visualization (Leaflet)
- `RideMap.jsx` — Google Maps ride route display
- `SearchMap.jsx` — Search results map with markers
- `MessagesBell.jsx` — Header unread message count badge

#### `components/admin/`
- `AdminEmergencyPanel.jsx` — Admin real-time SOS feed

#### `components/settings/`
- `TrustedContactsManager.jsx` — Add/edit/remove emergency contacts

#### Other Components
- `BrandAnimation/BrandAnimation.jsx` — Animated logo/brand sequence
- `NotificationDropdown.jsx` — Header notification popover
- `PaymentBreakdownCard.jsx` — Itemized fare + fee + GST card
- `PaymentCheckout.jsx` — Razorpay checkout integration component

---

### `frontend/src/hooks/`
Custom React hooks — encapsulate side effects and shared state.

| File | Purpose |
|------|---------|
| `useAuth.jsx` | Auth context: current user, login, logout, token management |
| `useChat.js` | Chat messages state, send, load-more, socket binding |
| `useChatSocket.js` | Socket.IO room join/leave, incoming message handler |
| `useRideJourney.js` | Active journey state and status transitions |
| `useLiveRideLocations.js` | Real-time driver location stream for passengers |
| `useLocationReporter.js` | Driver GPS ping sender during active journey |
| `useEmergency.js` | SOS trigger, alert state |
| `useSafetyCheckIn.js` | Periodic safety check-in prompts |
| `useAdminEmergencyFeed.js` | Admin socket feed for live SOS events |
| `useLoginRequired.js` | Gate hook: redirect unauthenticated users |

---

### `frontend/src/services/`
API integration modules — all HTTP calls go through these.

| File | Covers |
|------|--------|
| `authService.js` | Login, signup, Google OAuth (`googleLogin`), token refresh |
| `rideService.js` | Post, search, fetch, update, delete rides |
| `bookingService.js` | Create booking, cancel, fetch driver/passenger bookings |
| `negotiationService.js` | ✨ Initiate, accept, reject, counter, **cancel**, finalize negotiations |
| `chatService.js` | Conversation list, thread messages, conversation summary |
| `userService.js` | Profile fetch/update, avatar upload |
| `paymentService.js` | Razorpay order create, verify |
| `adminService.js` | Admin dashboard data, user/booking management |
| `rideLifecycleService.js` | Start/end journey API calls |
| `liveTrackingService.js` | GPS ping submission |
| `emergencyService.js` | SOS alert API |
| `trustedContactsService.js` | Trusted contact CRUD |
| `driverVerificationService.js` | Document upload, KYC status |
| `invoiceService.js` | Fetch booking invoice |
| `receiptService.js` | Download/view PDF receipts |
| `socketClient.js` | Socket.IO client instance factory |
| `toastService.jsx` | ✨ Centralized premium toast notifications (success, error, info, warning with Lucide icons) |
| `fonts/notoSansFonts.js` | Font embedding for PDF generation |

---

### `frontend/src/utils/`
Pure helper functions — no React, no API calls.

| File | Purpose |
|------|---------|
| `negotiationActions.js` | Build canned message text for Accept/Decline/Counter responses |
| `paymentCalculator.js` | ✨ Centralized fare math: base fare, 3% platform fee (first-ride waiver), 5% GST |
| `paymentCalculator.test.js` | Unit tests for payment math |
| `locationNormalize.js` | Standardize location strings for display and comparison |
| `mapUtils.js` | Coordinate helpers, distance calculation, map bounds |
| `geoapify.js` | Geoapify geocoding API wrapper |
| `googlePlaces.js` | Google Places Autocomplete helper |
| `ticketStorage.js` | LocalStorage helpers for recent booking ticket IDs |

---

## Key Architectural Patterns

### Negotiation Flow (✨ Updated)
```
Passenger initiates → negotiationController.initiateNegotiation
  → No seat cap hard block (emergency overbooking allowed)
  → Conversation auto-created and linked
  → Socket broadcast to driver

Driver sees compact banner in ChatThread (pinned above composer)
  → Yes (accept) / No (decline) → auto-sends canned reply via socket
  → Counter → modal → prefills composer

On Accept:
  → Driver clicks "Negotiation Done - Book Ride"
  → finalizeNegotiation → creates Booking
  → ride.availableSeats decremented (clamped to 0 min)
  → System message posted to conversation
  → Socket emits negotiation:finalized to passenger
  → Both sides see "Booking confirmed 🎉"
```

### Payment Calculation (Centralized)
```
paymentCalculator.js (frontend) ↔ commissionService.js (backend)
  Base fare → platform fee (3%, waived if firstRide) → GST (5%) → total
```

### Auth Flow
```
Email/Password: POST /api/auth/login → JWT → stored in localStorage
Google OAuth: @react-oauth/google → googleLogin() → POST /api/auth/google → JWT
```

### Real-time (Socket.IO)
```
socketClient.js (frontend) ↔ socket.js (backend)
  Rooms: conversation:<id>, user:<id>
  Events: message:send, message:new, typing:start, typing:stop,
          negotiation:updated, negotiation:finalized, location:ping
```

---

## Mental Model Quick Guide

| Task | Where to go |
|------|------------|
| Add a new API endpoint | `backend/routes/` + `backend/controllers/` |
| Change database schema | `backend/models/` |
| Add background job | `backend/services/jobs/` |
| Add a new page/screen | `frontend/src/pages/` + register in `AppRoutes.jsx` |
| Add a reusable UI component | `frontend/src/components/` |
| Add API call from frontend | `frontend/src/services/` |
| Add shared state/side effect | `frontend/src/hooks/` |
| Add a pure helper function | `frontend/src/utils/` |
| Change fare calculation | `frontend/src/utils/paymentCalculator.js` + `backend/services/commissionService.js` |
| Change chat/negotiation UX | `frontend/src/pages/Chat/ChatThread.jsx` |
| Change negotiation business rules | `backend/controllers/negotiationController.js` |
