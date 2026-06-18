# ShareMyRide — Project Reference Guide
> Hand this file to any new Claude session to instantly understand the full-stack architecture, data shapes, and design decisions already made.

---

## 1. Project Overview

| Property | Value |
|---|---|
| App name | ShareMyRide |
| Type | Community-driven carpooling marketplace (NOT Uber-style) |
| Stack | React + Vite (frontend) · Node.js/Express + MongoDB/Mongoose (backend) |
| Hosting | Render (full-stack monorepo) · Vercel (frontend preview) |
| Brand colors | Blue-600→Blue-700 (primary) · Green-500→Green-600 (accent) · Keep these, never change |
| UI library | Tailwind CSS (no component library — raw Tailwind only) |
| Auth | JWT access token (15 min, in-memory) + HttpOnly refresh cookie (7 days, rotated) |

---

## 2. Repository Structure

```
/
├── backend/
│   ├── server.js               ← Express entry, all routes registered here
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── rideController.js
│   │   └── statsController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Ride.js
│   │   └── Booking.js
│   ├── routes/
│   │   ├── authRoutes.js       ← /api/auth
│   │   ├── rideRoutes.js       ← /api/rides
│   │   ├── statsRoutes.js      ← /api/stats
│   │   ├── bookingRoutes.js    ← /api/bookings
│   │   └── ...
│   └── middleware/
│       └── auth.js             ← protect, optionalAuth, requireVerifiedDriver
└── frontend/
    └── src/
        ├── pages/
        │   └── Home/Home.jsx   ← redesigned (see Section 6)
        ├── components/
        │   ├── Header/Header.jsx   ← redesigned (see Section 7)
        │   └── Footer/Footer.jsx   ← redesigned (see Section 8)
        ├── hooks/
        │   └── useAuth.jsx     ← central auth state
        └── config/
            └── api.js          ← axios instance, base URL from VITE_API_URL
```

---

## 3. API Endpoints Reference

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup` | Public | `{name, email, password}` → `{success, user, verificationPending}` |
| POST | `/login` | Public | `{email, password}` → `{success, token, user}` |
| POST | `/logout` | Public | Clears refresh cookie |
| POST | `/refresh-token` | Cookie | Rotates access token → `{success, token}` |
| GET | `/profile` | Protected | Returns current user object |
| PUT | `/profile` | Protected | Update `name, phone, avatar, gender, dateOfBirth, emergencyContact` |

### Rides — `/api/rides`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search` | Public | `?start=&end=&date=&minSeats=&maxFare=&vehicleType=&acAvailable=` |
| GET | `/featured` | Public | `?limit=10` — rides where `featured=true OR verified=true` |
| GET | `/my` | Protected | Driver's own rides `?status=active` |
| GET | `/:id` | Protected | Single ride with populated driver + bookings |
| POST | `/` | `requireVerifiedDriver` | Create new ride |
| PUT | `/:id` | Protected (owner) | Update ride fields |
| PATCH | `/:id/status` | Protected (owner) | `{rideStatus: 'active'|'in_progress'|'completed'|'cancelled'}` |
| DELETE | `/:id` | Protected (owner) | Cancel ride |
| GET | `/:id/bookings` | Protected (owner) | Driver view of bookings |
| POST | `/:id/view` | Protected | Increment viewCount |

### Stats — `/api/stats`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/home` | Public | `→ {success, data: {totalUsers, totalRides, totalCities, averageRating}}` |
| GET | `/detailed` | Admin | Full breakdown |
| GET | `/period` | Protected | `?period=day|week|month|year` |

### Bookings — `/api/bookings`
> Ask for bookingRoutes.js + bookingController.js if needed

---

## 4. Data Models — Key Fields

### User
```js
{
  _id, name, email, role,           // role: 'user' | 'driver' | 'admin'
  phone, avatar, gender, dateOfBirth,
  isDriverVerified,                  // boolean — shortcut synced from driverVerification.status
  driverVerification: {
    status,                          // 'not_started'|'pending'|'submitted'|'approved'|'rejected'
    profilePhoto: { url },
    aadhaar: { numberMasked, verified },
    drivingLicense: { number, verified }
  },
  ratingSummary,                     // 0-5 float
  totalRatings,
  totalRidesAsDriver,
  totalRidesAsPassenger,
  accountStatus,                     // 'PENDING_VERIFICATION'|'ACTIVE'|'SUSPENDED'
  emailVerified,
  createdAt
}
```

### Ride
```js
{
  _id, start, end, date, time,
  seats, availableSeats,             // availableSeats is the live count
  fare,                              // base per-seat price set by driver
  fareMode,                          // 'fixed' | 'per_km'
  perKmRate, totalDistance, estimatedDuration,
  vehicle: { type, model, color, number, acAvailable, luggageSpace },
  vehicleNumber,
  driverInfo: { name, phone, photoURL, gender, verified },
  driver,                            // ObjectId ref → User
  driverId,                          // same as driver (legacy duplicate)
  postedBy,                          // same as driver
  preferences: { smokingAllowed, musicAllowed, petFriendly, womenOnly, luggageAllowed },
  waypoints: [{ location, distanceFromStart }],
  rideStatus,                        // 'active'|'in_progress'|'completed'|'cancelled'|'expired'
  isActive, featured, verified,
  bookings: [ObjectId],              // ref → Booking
  ratingSummary, totalRatings,
  viewCount,
  // Search-time virtual fields added by searchRides controller:
  matchType,                         // 'exact'|'partial'|'on_route'
  segmentFare,                       // calculated fare for passenger's specific segment
  segmentDistance
}
```

### Booking
```js
{
  _id,
  ride,                // ObjectId → Ride
  passenger,           // ObjectId → User
  driver,              // ObjectId → User
  seatsBooked,
  pickupLocation, dropLocation,
  baseFare, passengerServiceFee, passengerServiceFeeGST, totalFare, finalAmount,
  status,              // 'pending'|'accepted'|'rejected'|'cancelled'|'completed'|'no_show'
  paymentStatus,       // 'pending'|'processing'|'completed'|'failed'|'refunded'
  paymentMethod,       // 'cash'|'upi'|'card'|...
  driverRating, passengerRating,
  // segment fields:
  matchType, segmentFare, userSearchDistance
}
```

---

## 5. Frontend Auth Hook — `useAuth()`

```js
// Import
import { useAuth } from '../../hooks/useAuth.jsx';

// Returns
const {
  user,            // null | User object (non-sensitive fields only, from localStorage + API)
  isLoading,       // true while silently refreshing session on mount
  isAuthenticated, // !!user && !!accessToken (in-memory)
  login,           // async (credentials) → { success, user } | { success:false, error, status }
  signup,          // async (details) → { success, data } | { success:false, error }
  logout,          // async (callApi=true) → clears token + localStorage
  silentRefresh,   // async () → refreshes access token via cookie
} = useAuth();
```

**Token storage:**
- Access token → module-level variable `_accessToken` (never localStorage)
- Refresh token → HttpOnly cookie `/api/auth` path (set by backend)
- User object → `localStorage.getItem('user')` (non-sensitive fields only)

**On mount:** calls `silentRefresh()` → if cookie valid, gets new access token + fresh profile → sets `user`. If cookie invalid/missing, clears user → shows public view.

---

## 6. Home.jsx — Architecture

**File:** `frontend/src/pages/Home/Home.jsx`

### Dual-mode rendering
```
useAuth().user exists?
  YES → <LoggedInDashboard>   (personalized, shows quick actions + stats + feed)
  NO  → <PublicLanding>       (marketing + live ride feed + CTA)
```

### Data fetching
```js
// Stats — always fetched, public
GET /api/stats/home
→ { success, data: { totalUsers, totalRides, totalCities, averageRating } }

// Ride feed — public, deferred until authLoading=false
GET /api/rides/featured?limit=8
// Fallback if empty:
GET /api/rides/search?start=&end=&limit=8
→ { success, count, data: [Ride] }
```

### Key sub-components
| Component | Purpose |
|---|---|
| `RideCard` | Displays a single ride. Reads: `ride.start/end/date/time/fare/segmentFare/availableSeats/driverId/driverInfo/vehicle` |
| `SkeletonCard` | Animated placeholder shown while `ridesLoading=true` |
| `EmptyRideFeed` | Shown when `rides.length === 0` — prompts user to offer a ride |
| `StatItem` | Single stat number + label in hero stats bar |
| `LoggedInDashboard` | Auth-gated view: greeting, quick actions, driver upsell, stats strip, ride feed |
| `PublicLanding` | Public view: hero + search form + ride feed + value props + how it works + CTA |

### Driver upsell logic
```js
// Show "Become a driver" banner only when:
!user?.isDriverVerified && user?.role !== 'driver'
// Links to /driver-verification
```

### Search form (PublicLanding)
- Controlled inputs: `searchFrom`, `searchTo`
- On submit: `navigate('/ride/search?start=...&end=...')`
- Matches what `rideController.searchRides` expects as query params

---

## 7. Header.jsx — Architecture

**File:** `frontend/src/components/Header/Header.jsx`

### Key behaviours
- **Fixed** (`position: fixed, top-0, z-50`) with `h-16` spacer div below
- **Scroll shrink**: `h-16` → `h-14` + `backdrop-blur` when `scrollY > 8`
- **Route change**: auto-closes mobile sidebar via `useEffect([location.pathname])`
- **Body scroll lock**: `document.body.style.overflow = 'hidden'` when sidebar open
- **Click outside**: `useRef(sidebarRef)` + `mousedown` listener closes sidebar
- **Active route**: highlighted with `bg-white/20` on desktop, blue dot + `bg-blue-50` on sidebar

### Mobile sidebar
- Slides in from **right** (`translate-x-0` / `translate-x-full`)
- `z-[70]` panel, `z-[60]` backdrop
- Width: `w-72`
- Has user avatar block (when logged in), grouped nav sections, bottom CTA with Sign in / Get started / Sign out

### Auth-conditional nav items
```
Always visible:  Find a Ride · Offer a Ride
Logged-in only:  My Trips · Bookings · Ride Requests · Profile
Desktop right:   NotificationDropdown · user avatar → /profile · Sign out OR Sign in + Get started
```

### Imports needed
```js
import { useAuth } from '../../hooks/useAuth.jsx';
import NotificationDropdown from '../NotificationDropdown.jsx';
```

---

## 8. Footer.jsx — Architecture

**File:** `frontend/src/components/Footer/Footer.jsx`

- Background: `bg-gray-950` (dark, NOT the blue gradient — intentional to anchor page bottom)
- 5-column grid: Brand col (2 on mobile) + Product + Company + Support + Legal
- Social icons: Twitter/X, Instagram, LinkedIn — compact `w-8 h-8` icon buttons
- Bottom bar: copyright left · Privacy + Terms links + "Made in India 🇮🇳" right
- All links use React Router `<Link to="...">` (not `<a href>`)
- Legal links both point to `/terms-and-privacy` (existing TermsAndPrivacy page)

---

## 9. Design System

### Colors (Tailwind classes — do NOT change)
| Role | Class |
|---|---|
| Primary | `blue-600`, `blue-700` |
| Accent / CTA | `green-500`, `green-600` |
| Verified badge | `blue-500` |
| Rating star | `amber-400`, `amber-500` |
| Warning / low seats | `orange-600` |
| Dark footer | `gray-950` |
| Page background | `gray-50` |

### Typography scale
| Use | Classes |
|---|---|
| Page hero | `text-3xl sm:text-4xl lg:text-5xl font-extrabold` |
| Section heading | `text-xl sm:text-2xl font-bold` |
| Card title | `text-sm font-semibold` |
| Body | `text-sm leading-relaxed text-gray-600` |
| Meta / label | `text-xs text-gray-500` |
| Eyebrow | `text-xs font-semibold uppercase tracking-widest text-blue-600` |

### Spacing rhythm
- Section vertical: `py-12 sm:py-16`
- Card padding: `p-4 sm:p-5` or `p-5 sm:p-6`
- Grid gap: `gap-3 sm:gap-4`
- Border radius: `rounded-2xl` (cards) · `rounded-xl` (buttons, inputs)

### Button hierarchy
| Level | Style |
|---|---|
| Primary | `bg-blue-600 text-white hover:bg-blue-700` |
| Secondary / driver | `bg-green-500 text-white hover:bg-green-400` |
| Ghost | `border border-white/30 text-white hover:bg-white/10` |
| White on dark | `bg-white text-blue-700 hover:bg-blue-50` |
| Subtle | `bg-gray-100 text-gray-700 hover:bg-gray-200` |

---

## 10. Key Business Rules

1. **Anyone can search and browse rides** — no auth required
2. **Any user can request a ride** — needs account
3. **Only verified drivers** (`isDriverVerified=true` OR `driverVerification.status='approved'`) can post rides — enforced by `requireVerifiedDriver` middleware on `POST /api/rides`
4. **Fare = cost sharing, not profit** — drivers set price to cover fuel
5. **Driver verification flow**: submit Aadhaar + DL docs → admin review → `status: 'approved'` → can post rides
6. **Ratings**: after completed ride, driver rates passenger + passenger rates driver
7. **Booking flow**: passenger requests → driver accepts/rejects → both get contact info

---

## 11. Environment Variables

### Backend (`.env`)
```
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
FRONTEND_URL=https://...
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NODE_ENV=production
```

### Frontend (`.env`)
```
VITE_API_URL=https://<backend-url>/api
```

---

## 12. Known Patterns & Gotchas

| Issue | Solution |
|---|---|
| Ride model has `driver`, `driverId`, `postedBy` all pointing to same user | Always read `ride.driverId \|\| ride.driver` in frontend |
| `driverInfo` is embedded in Ride (not populated) | Use `ride.driverInfo.name` for display name, `ride.driverId.ratingSummary` for rating |
| Stats `/home` returns `{ success, data: { ... } }` — extract `res.data?.data` | Already handled in Home.jsx |
| Featured rides endpoint may return empty if no rides are marked `featured=true` | Home.jsx falls back to `/rides/search` with empty params |
| Access token is in-memory — lost on hard refresh | `useAuth` re-runs `silentRefresh()` on every mount to restore from cookie |
| Mobile hamburger was a dropdown (blocked page content) | Rebuilt as slide-in sidebar from right (`z-[70]`) with backdrop |
| Apostrophes in JSX string literals cause esbuild parse errors | Use double-quoted strings `"it's"` or escape `\'` — never curly quotes |
| `useAuth().isLoading` is `true` during session restore | Home.jsx shows full-page spinner while `authLoading=true`, then renders correct view |

---

## 13. Files Changed in This Redesign

| File | Status | What changed |
|---|---|---|
| `frontend/src/components/Header/Header.jsx` | ✅ Replaced | Fixed mobile hamburger → slide-in right sidebar, fixed header with scroll shrink, active route highlighting, auth-conditional nav |
| `frontend/src/pages/Home/Home.jsx` | ✅ Replaced | Full rewrite: dual-mode (logged-in dashboard vs public landing), dynamic stats from `/api/stats/home`, dynamic ride feed from `/api/rides/featured`, skeleton loaders, empty states, no hardcoded data |
| `frontend/src/components/Footer/Footer.jsx` | ✅ Replaced | Dark footer (`gray-950`), 5-column grid, React Router links, social icons, "Made in India" |

---

## 14. Next Steps / TODO

- [ ] `bookingRoutes.js` + `bookingController.js` — share these if working on booking flow
- [ ] Add `useAuth.isAuthenticated` guard on `POST /ride/post` frontend route
- [ ] Ride search page — wire `?start=` and `?end=` URL params from hero search form
- [ ] Driver verification page (`/driver-verification`) — currently linked but page may not exist
- [ ] Upcoming rides page (`/upcoming-rides`) — fetch from `GET /api/rides/my?status=active` + joined bookings
- [ ] NotificationDropdown — share file if it needs redesign
- [ ] Rating model — not shared yet, needed if building rating UI