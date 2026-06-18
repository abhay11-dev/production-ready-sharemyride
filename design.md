# ShareMyRide — Master Design System & UI Reference
> **Version 1.0 · June 2026**
> Hand this document to every developer, designer, or AI assistant at the start of any new session.
> This is the single source of truth for all UI/UX decisions across the platform.

---

## 0. Product Identity

| Property | Value |
|---|---|
| Product name | ShareMyRide |
| Type | Community carpooling marketplace (NOT Uber-style) |
| Audience | Indian commuters, daily travelers, cost-conscious riders |
| Tone | Trustworthy · Friendly · Modern · Community-driven |
| Brand promise | Share the road. Save money. Build community. |

---

## 1. Color System

> **CRITICAL: Never introduce new brand colors without updating this document. The blue-green palette is the identity.**

### Primary Palette (Tailwind classes — use exactly as written)

| Role | Tailwind | Hex | Usage |
|---|---|---|---|
| Primary Dark | `blue-700` | #1d4ed8 | Header bg, primary CTAs, text on dark |
| Primary | `blue-600` | #2563eb | Buttons, links, active states, ride cards |
| Primary Light | `blue-500` | #3b82f6 | Hover states, icons, chips |
| Accent | `green-600` | #16a34a | Driver CTAs, success, offer-ride button |
| Accent Light | `green-500` | #22c55e | Success states, verified badges |
| Warning | `amber-500` | #f59e0b | Rating stars, warnings |
| Danger | `red-500` | #ef4444 | Errors, cancellation, delete actions |
| Pending | `orange-500` | #f97316 | Low-seat warnings, pending status |
| Purple | `purple-600` | #9333ea | View details, booking status (secondary) |

### Neutral Palette

| Role | Tailwind | Usage |
|---|---|---|
| Page bg | `gray-50` | Default page background |
| Card bg | `white` | All cards, modals, forms |
| Dark footer | `gray-950` | Footer only — dark anchor |
| Borders | `gray-100`, `gray-200` | Card borders, dividers |
| Body text | `gray-900`, `gray-800` | Headlines, labels |
| Secondary text | `gray-600`, `gray-500` | Descriptions, hints |
| Muted text | `gray-400` | Placeholder, meta, counts |

### Gradient Patterns (do not change)

```
Header/Navbar:    bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500
Hero sections:    bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500
CTA section:      bg-gradient-to-r from-blue-700 via-blue-600 to-green-600
Page backgrounds: bg-gradient-to-br from-blue-50 via-white to-green-50
Card accents:     bg-gradient-to-br from-blue-50 to-indigo-50
Driver earn card: bg-gradient-to-br from-green-50 to-emerald-50
```

---

## 2. Typography

> Use system fonts. No external font imports needed — Tailwind's default stack is correct.

### Scale

| Element | Classes | Notes |
|---|---|---|
| Page hero H1 | `text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight` | Landing, hero sections |
| Section H2 | `text-xl sm:text-2xl font-bold text-gray-900` | Section headings |
| Card H3 | `text-base font-bold text-gray-900` | Card titles |
| Body | `text-sm text-gray-600 leading-relaxed` | Descriptions, paragraphs |
| Label | `text-sm font-semibold text-gray-700` | Form labels |
| Eyebrow | `text-xs font-semibold uppercase tracking-widest text-blue-600` | Section category tags |
| Meta / caption | `text-xs text-gray-400` | Timestamps, counts, hints |
| Price | `text-xl font-black text-blue-600` | Ride cards, fare display |

### Rules
- **Never use `font-light`** anywhere in the platform
- Bold headings only — minimum `font-semibold` for any heading element
- Line height: use `leading-relaxed` for body, `leading-tight` for headings
- Letter spacing: `tracking-tight` on large headings, `tracking-widest` on eyebrows only

---

## 3. Spacing System

> Built on Tailwind's 4px base unit. Stick to these values.

| Context | Value | Tailwind |
|---|---|---|
| Section vertical padding | 48–64px | `py-12 sm:py-16` |
| Card padding | 16–20px | `p-4 sm:p-5` |
| Card padding (expanded) | 20–24px | `p-5 sm:p-6` |
| Form field gap | 16–20px | `gap-4 sm:gap-5` |
| Grid gap | 12–16px | `gap-3 sm:gap-4` |
| Button padding | `px-4 py-2.5` (sm), `px-6 py-3` (md), `px-8 py-3.5` (lg) | |
| Section inner max-width | `max-w-7xl mx-auto` | All page sections |
| Form max-width | `max-w-2xl mx-auto` | Post ride, settings forms |

---

## 4. Border Radius

| Element | Class |
|---|---|
| Cards | `rounded-2xl` |
| Buttons | `rounded-xl` |
| Inputs / selects | `rounded-xl` |
| Pills / badges | `rounded-full` |
| Icon containers | `rounded-xl` (square) or `rounded-full` (circle) |
| Modals | `rounded-2xl` |
| Tooltips | `rounded-xl` |

---

## 5. Shadow System

| Level | Class | Usage |
|---|---|---|
| Subtle | `shadow-sm` | Input focus rings, subtle depth |
| Card | `shadow-md` | Default card shadow |
| Elevated | `shadow-lg` | Hovered cards, dropdowns |
| Modal | `shadow-2xl` | Modals, sidebars, popovers |
| Hero | `shadow-2xl shadow-blue-900/30` | Hero search box, CTAs on dark bg |

---

## 6. Component Library

### 6.1 Buttons

```
PRIMARY (blue):
  bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-150

SECONDARY (green — driver actions):
  bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold text-sm

GHOST (dark backgrounds):
  border border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-xl font-semibold text-sm

WHITE ON DARK:
  bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold

DANGER:
  bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm

SUBTLE / OUTLINE:
  border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-semibold text-sm
```

**Rules:**
- Always include `transition-all duration-150` or `transition-colors`
- Loading states: show spinner + "…" text, disable with `disabled:opacity-50 disabled:cursor-not-allowed`
- Never use `scale` on buttons unless it's a primary marketing CTA

### 6.2 Form Inputs

```
DEFAULT:
  border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400 w-full

ERROR STATE:
  border-red-400 bg-red-50 (swap the border + background only)

TEXTAREA:
  Same as input + resize-none

SELECT:
  Same as input + bg-white appearance-none (add chevron icon absolutely positioned)
```

**Field wrapper pattern:**
```jsx
<Field label="Label" required hint="Optional helper" error={errors.field}>
  <input ... />
</Field>
```

### 6.3 Toggle Switch

```
Container: flex items-center justify-between gap-3 py-2.5 cursor-pointer
Track: w-11 h-6 rounded-full (blue-600 when on, gray-200 when off)
Thumb: absolute w-5 h-5 bg-white rounded-full shadow (translate-x-5 on, translate-x-0 off)
```

### 6.4 Cards

**Standard ride card pattern:**
- White bg, `rounded-2xl`, `border border-gray-100`, `shadow-md hover:shadow-lg`
- Route displayed with `blue-500` dot (start) + dashed line + `green-500` dot (end)
- Price: `text-xl font-black text-blue-600` top-right
- Driver: avatar (initials fallback) + name + verified badge + rating
- Seats pill: `bg-green-50 text-green-700` (available) / `bg-orange-50 text-orange-600` (1 left)
- Date/time: `text-xs text-gray-400`

**Stat card pattern:**
- Colored bg (`blue-50`, `green-50`, `purple-50`, `amber-50`)
- Matching border (`border-blue-100` etc.)
- Large number: `text-xl sm:text-2xl font-bold [color]-600`
- Label: `text-xs text-gray-500`

### 6.5 Status Badges / Pills

```
Active:      bg-green-100 text-green-700 · animate-pulse dot
Pending:     bg-yellow-100 text-yellow-800
Confirmed:   bg-blue-100 text-blue-800
Cancelled:   bg-gray-100 text-gray-700
Rejected:    bg-red-100 text-red-700
Completed:   bg-purple-100 text-purple-700
Fully booked: bg-orange-100 text-orange-700
```

Always use: `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold`

### 6.6 Verified Badge

```jsx
<svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
  // checkmark shield — use the same SVG everywhere
</svg>
```

### 6.7 Section Eyebrow

```jsx
<p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">
  Category label
</p>
```

Always precedes a section `<h2>`.

### 6.8 Loading States

- **Full page:** centered spinner `w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin`
- **Skeleton cards:** `animate-pulse` with `bg-gray-200` rectangles matching card shape
- **Button loading:** spinner icon + "…" text, button disabled
- **Inline loading:** small `w-4 h-4` spinner inline with text

### 6.9 Empty States

Pattern:
```
Icon container: w-12 h-12 bg-[color]-50 rounded-full flex items-center justify-center mx-auto mb-3
Icon: w-6 h-6 text-[color]-400
Heading: font-semibold text-gray-800 text-base mb-1
Description: text-sm text-gray-500 mb-4
CTA: inline-flex button (primary or ghost)
```

### 6.10 Toast Notifications

Use `react-hot-toast` with these styles:
```
SUCCESS: background #10B981, color #fff, fontWeight 600, padding 16px, borderRadius 12px
ERROR:   background #EF4444, color #fff, fontWeight 600, padding 16px, borderRadius 12px
INFO:    default toast with icon
LOADING: default with custom message
```

Position: `top-center` for all critical actions.

Confirmation toasts (delete, cancel):
- Custom JSX inside toast
- White background, border, 2 action buttons
- Duration: `Infinity` (user must act)

---

## 7. Layout Patterns

### 7.1 Page Structure

Every page follows this shell:
```
<Header /> (fixed, z-50, h-16 spacer below)
<main>
  [Page hero or header strip] — optional
  [Content sections]
</main>
<Footer />
```

### 7.2 Section Structure

```
<section className="py-12 sm:py-16 bg-[color]">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    [eyebrow + heading block — max-w-lg for left-aligned sections]
    [content grid]
  </div>
</section>
```

### 7.3 Content Grids

| Columns | Classes |
|---|---|
| 4-col ride feed | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4` |
| 3-col features | `grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6` |
| 4-col how-it-works | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6` |
| 2-col forms | `grid grid-cols-2 gap-4` |
| Stats strip | `grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-gray-100` |

### 7.4 Dashboard Layout (Logged-in)

```
Hero strip (blue gradient, pb-16)
  ↓
Content area (-mt-8 to overlap hero)
  Quick action cards (grid 2-col mobile, 4-col desktop)
  Upsell banner (conditional)
  Platform stats strip
  Live ride feed
```

### 7.5 Page Background Patterns

| Page | Background |
|---|---|
| Home / landing | `bg-white` (sections alternate white / `gray-50`) |
| Post a ride | `bg-gradient-to-br from-blue-50 via-white to-green-50` |
| Search rides | `bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50` |
| My bookings | `bg-gradient-to-br from-blue-50 via-purple-50 to-green-50` |
| Upcoming rides | `bg-white` (container `max-w-7xl`) |
| Profile | `bg-gray-50` |
| Auth pages | `bg-gradient-to-br from-blue-50 via-white to-green-50` |
| Admin | `bg-gray-100` (sidebar layout) |

---

## 8. Navigation (Header)

### Desktop
- Fixed, `z-50`, shrinks from `h-16` → `h-14` on scroll with `backdrop-blur-md`
- Logo: car icon + "ShareMyRide" — clickable, links to `/`
- Nav links: `text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2`
- Active route: `bg-white/20 text-white`
- Right actions: NotificationDropdown + user avatar + Sign out / Sign in + Get started

### Mobile Sidebar
- Hamburger opens slide-in panel from **right** at `z-[70]`
- Backdrop: `z-[60]` `bg-black/50 backdrop-blur-sm`
- Panel width: `w-72`
- Has: logo header, user block (avatar + name + email), grouped nav links, bottom CTA
- Auto-closes on: route change, backdrop click, `Escape` key, scroll
- Body scroll locked while open

### Auth-conditional items
- Always visible: Find a Ride, Offer a Ride
- Logged-in only: My Trips, Bookings, Ride Requests, Profile
- Logged-out: Sign in, Get started (CTA style)

---

## 9. Footer

- Background: `bg-gray-950` (dark — intentionally contrasts with blue header)
- 5-column grid: Brand + Product + Company + Support + Legal
- Brand column: logo, tagline, social icons
- Social icons: `w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700`
- Bottom bar: copyright left · Privacy + Terms + "Made with 🚗 in India" right
- All links use React Router `<Link>` not `<a href>`
- **Brand logo in footer is clickable** → triggers BrandAnimation overlay

---

## 10. Forms

### Multi-step forms (e.g. Post a Ride)

Use wizard pattern with:
1. Step progress bar (top of card, visual indicator)
2. Per-step validation (validate on "Continue" click, not on blur)
3. Error display: inline red message below field + toast for first error
4. Step count: "Step N of 5" label

### Single forms (auth, search)
- Standard single-page layout
- Real-time validation acceptable on submit only
- Success: toast + redirect or scroll
- Error: inline field errors + error toast

### Auto-fill rules
- `phoneNumber` → auto-filled from `user.phone` if available
- Vehicle details → NOT auto-filled (drivers have multiple vehicles)
- Date minimum → always `today` (never allow past dates)

---

## 11. Ride Cards

### Public ride card (search feed, home page)
```
Route: start → end (blue/green dots + dashed line)
Vehicle subtitle: Color · Model · Type (e.g. White Honda City · Sedan)
Price: ₹X per seat (top right, large + bold)
Driver: avatar + first name + verified badge + rating
Seats: pill badge (green = 2+ left, orange = 1 left)
Date/time: xs gray text
```

### Driver's posted ride card (Post Ride page)
```
Header strip: blue gradient + date/time + status pill + delete button
Route: same pattern
Stats grid: Total seats / Booked / Available / Max earn (4 cells)
Booking requests: yellow "pending" + green "confirmed" + "Manage →" link
Expand toggle: "View full details" / "Hide details"
Expanded: PaymentBreakdownCard + Vehicle + Contact + Preferences + Notes
```

---

## 12. Payment & Fare Display

### Revenue model (NEVER change without updating this doc)
- Platform fee: **8% of base fare** (deducted from driver)
- GST on platform fee: **18% of the 8%**
- Passenger service fee: **₹10 fixed per seat**
- GST on service fee: **₹1.80 (18% of ₹10)**
- Driver receives: `base fare - platform fee - GST on platform fee`
- Passenger pays: `base fare + ₹11.80`

### Fare display rules
- Always show driver what they'll receive (after deductions) — not the gross fare
- Show full breakdown on hover (tooltip) and in expanded ride card
- Use `PaymentCalculator.calculateDriverEarnings(baseFare)` — never recompute inline
- Use `PaymentBreakdownCard` component for full breakdowns
- Currency format: `₹` prefix, no decimal for round numbers in small UI, 2 decimal in detailed views

---

## 13. Trust & Safety Indicators

These must appear consistently wherever driver/rider is shown:

| Signal | When to show | Component |
|---|---|---|
| Blue verified checkmark | `isDriverVerified === true` | Shield SVG, `text-blue-500` |
| Star rating | `ratingSummary > 0` | Amber star + number |
| Trip count | `totalRidesAsDriver > 0` | "· 34 trips" text |
| Verified Driver label | Driver verification approved | Green pill badge |

---

## 14. Hero Sections

### Landing page hero (logged out)
```
Full-bleed blue gradient section
Eyebrow pill → H1 (2-line max) → subheading → inline search form → secondary CTA text
Stats bar (blue-800/40 bg, 4 stats) attached to bottom of hero
```

### Dashboard hero (logged in)
```
Blue gradient strip (shorter, pb-16)
Left: avatar + greeting + date → Right: Find a ride + Offer a ride buttons
Content floats up with -mt-8
```

### Section heroes (search, post ride, bookings)
```
White/gradient bg page
Centered H1 + subtitle (no graphic hero)
max-w-3xl mx-auto text-center
```

---

## 15. Animation & Interaction

### Transitions
- Default: `transition-all duration-150` or `transition-colors`
- Cards on hover: `hover:shadow-lg` (no scale on data-heavy cards)
- Buttons on marketing pages: `hover:scale-105` acceptable
- Modals/sidebars: CSS transform `translate-x` or `translateY`, 300ms ease-out
- Page-level loading: spinner only (no skeleton for page-level, skeleton for card-level)

### BrandAnimation (Footer logo click)
- Triggers on: footer logo click + "Made with 🚗 in India" click
- Shows: dark blurred overlay + animated SVG road scene + car driving + brand name + tagline
- Dismisses on: click / any keypress / scroll / auto after 6s
- Never blocks navigation or user flow

---

## 16. Responsive Breakpoints

Always mobile-first. Use these patterns:

| Context | Mobile | Tablet (sm) | Desktop (lg) |
|---|---|---|---|
| Ride feed grid | 1 col | 2 col | 4 col |
| Stats strip | 2×2 grid | 4-col row | 4-col row with dividers |
| Hero text | `text-3xl` | `text-4xl` | `text-5xl` |
| Sidebar | Slide-in panel | — | Not shown |
| CTA buttons | Full width stacked | Side by side | Side by side |
| Card padding | `p-4` | `p-5` | `p-6` |
| Section padding | `py-12 px-4` | `py-16 px-6` | `py-16 px-8` |

---

## 17. Page-by-Page Design Guide

### Home (Public landing)
Sections in order:
1. Hero — search form + stats bar
2. Live ride feed (gray-50 bg)
3. Value props — 3 cards (white bg)
4. How it works — 4 steps (gray-50 bg)
5. CTA section (blue-green gradient)

### Home (Logged-in dashboard)
Sections in order:
1. Dashboard hero strip (blue gradient, greeting)
2. Quick action cards (4 cards, -mt-8 overlap)
3. Driver upsell banner (conditional)
4. Platform stats strip
5. Live ride feed

### Post a Ride
- 5-step wizard in a `max-w-2xl` centered card
- Step 1: Route + stops + partial route toggle
- Step 2: Date + time + seats stepper + fare + fare breakdown preview
- Step 3: Vehicle details + contact + pickup address
- Step 4: Preferences + notes
- Step 5: Full ride preview card + summary checklist + publish
- Below form: Driver's posted rides (ride management cards)

### Search Rides
- Map (Leaflet) full-width at top
- Search form with from/to/date + advanced filters toggle
- Results: "Connected Routes" section + "Other Rides" section
- Route-matched rides get green "Connected Route" badge

### My Bookings
- Stats strip (6 counts: total / pending / accepted / paid / rejected / cancelled)
- Filter tabs (6 options)
- Booking cards: driver info + route + fare breakdown + status message + action buttons

### Upcoming Rides
- Passenger tab + Driver tab
- Cards: day label + role badge + route + contact info + payment details + Call + Receipt

---

## 18. Admin Dashboard

> Build when needed — follow these patterns:

- Layout: fixed left sidebar (240px) + main content area
- Sidebar bg: `gray-900` with `blue-600` active items
- Main bg: `gray-100`
- Top bar: white, shadow-sm, breadcrumb + user avatar
- Stat cards: white bg, `rounded-2xl`, colored top border accent (`border-t-4 border-blue-500`)
- Tables: white bg, `rounded-2xl`, `divide-y divide-gray-100`
- Charts: use recharts, blue/green palette, no unnecessary legends
- All admin actions use the same toast pattern as main app

---

## 19. Email Templates

> For transactional emails (booking confirmations, receipts):

- Max width: 600px centered
- Header: blue gradient, white ShareMyRide logo + text
- Body: white bg, `font-family: system-ui, sans-serif`
- CTA buttons: blue-600, 16px radius, bold white text
- Footer: gray-100 bg, muted text, unsubscribe link
- No custom fonts — system stack only for email deliverability

---

## 20. Legal Pages (Terms, Privacy)

- Tab switcher at top: "Terms of Service" + "Privacy Policy"
- White card, `rounded-2xl`, `shadow-lg`, `max-w-4xl mx-auto`
- Section headings: `text-2xl font-bold text-gray-900`
- Body: `text-gray-700 leading-relaxed`
- Lists: `list-disc pl-6 space-y-2`
- Contact box: `bg-gray-50 p-4 rounded-lg`

---

## 21. Help Centre / FAQ Pages

- Search bar at top (same input style as main app)
- Category cards: icon + title + count (3-col grid)
- Article list: white cards, chevron right, tag pills
- Article detail: same typography as legal pages
- Breadcrumb: `text-xs text-gray-500` with `>` separators

---

## 22. Blog Pages

- Listing: 3-col card grid (image + tag + title + excerpt + author + date)
- Article: `max-w-2xl mx-auto`, large hero image, `prose` body
- Author block: avatar + name + bio at bottom
- Related posts: 3-col grid

---

## 23. Key Anti-Patterns (Never do these)

1. **Never** use multiple different gradient directions in the same section
2. **Never** mix blue header gradient with a different-colored section immediately below without a clear break
3. **Never** use `hover:scale-105` on data-heavy cards (ride cards, booking cards) — it causes layout shift
4. **Never** use `font-light` anywhere
5. **Never** use `absolute` positioned dropdowns inside `overflow-hidden` containers
6. **Never** put earnings/money numbers inside red — always green for what driver earns
7. **Never** show platform fee deduction in red to drivers without showing their net first
8. **Never** create a new background color pattern for a new page — pick from Section 7 patterns
9. **Never** use `localStorage` or `sessionStorage` for access tokens — in-memory only (see `useAuth`)
10. **Never** call the payment calculator inline — always use `PaymentCalculator` class methods
11. **Never** hardcode ride data in components — always fetch from API
12. **Never** use `<a href>` for internal navigation — always `<Link to>`
13. **Never** use apostrophes inside single-quoted JS strings (use double quotes or escape)
14. **Never** add a `console.log` in production — remove all debug logs before shipping

---

## 24. File Architecture Reference

```
frontend/src/
├── pages/
│   ├── Home/Home.jsx              ← Dual-mode (public landing + logged-in dashboard)
│   ├── RidePost/RidePost.jsx      ← Post + manage driver's rides
│   ├── RideSearch/RideSearch.jsx  ← Search with map + filters
│   ├── Bookings/MyBookings.jsx    ← Passenger booking management
│   ├── UpcomingRides/             ← Confirmed upcoming trips
│   ├── Profile/                   ← User profile + settings
│   └── Auth/                      ← Login, Signup, ForgotPassword
├── components/
│   ├── Header/Header.jsx          ← Fixed navbar + mobile sidebar
│   ├── Footer/Footer.jsx          ← Dark footer + brand animation trigger
│   ├── BrandAnimation/BrandAnimation.jsx ← Animated car overlay
│   ├── ride/
│   │   ├── RideForm.jsx           ← 5-step wizard form
│   │   └── RideCard.jsx           ← Search result ride card
│   ├── PaymentBreakdownCard.jsx   ← Driver/passenger fare breakdown
│   └── NotificationDropdown.jsx   ← Bell icon + notification list
├── hooks/
│   └── useAuth.jsx                ← Auth state, in-memory token, session restore
├── services/
│   ├── rideService.js             ← All /api/rides/* calls
│   ├── bookingService.js          ← All /api/bookings/* calls
│   └── paymentService.js          ← Razorpay integration
├── utils/
│   └── paymentCalculator.js       ← Platform fee calculations (DO NOT MODIFY)
└── config/
    └── api.js                     ← Axios instance, base URL, interceptors
```

---

## 25. API Quick Reference

| Endpoint | Auth | Used in |
|---|---|---|
| `GET /api/stats/home` | Public | Home (both views) |
| `GET /api/rides/featured?limit=8` | Public | Home ride feed |
| `GET /api/rides/search?start=&end=&date=` | Public | RideSearch |
| `POST /api/rides` | `requireVerifiedDriver` | RideForm submit |
| `GET /api/rides/my` | Protected | RidePost page |
| `DELETE /api/rides/:id` | Protected (owner) | RidePost delete |
| `POST /api/bookings` | Protected | RideCard "Book" |
| `GET /api/bookings/my` | Protected | MyBookings |
| `GET /api/bookings/driver` | Protected | UpcomingRides (driver tab) |
| `PATCH /api/bookings/:id/status` | Protected | Notification requests |
| `GET /api/auth/profile` | Protected | useAuth session restore |
| `POST /api/auth/refresh-token` | Cookie | useAuth silent refresh |

---

## 26. Session & State Management

### Auth state (`useAuth`)
```
user         → localStorage (non-sensitive fields, restored on mount)
accessToken  → in-memory variable `_accessToken` (15 min TTL)
refreshToken → HttpOnly Secure cookie (7 day TTL, rotated)
```

### On page load
1. `silentRefresh()` called → gets new access token from cookie
2. `GET /api/auth/profile` called → fresh user object stored
3. If cookie invalid → clear user, show public view

### Key derived states
```
isAuthenticated = !!user && !!getAccessToken()
isDriverVerified = user?.isDriverVerified === true
canPostRide = user?.role === 'driver' && user?.isDriverVerified === true
```

---

## 27. Changelog

| Date | Version | Change |
|---|---|---|
| June 2026 | 1.0 | Initial design system created |
| June 2026 | 1.0 | Header redesigned — slide-in right sidebar |
| June 2026 | 1.0 | Home redesigned — dual-mode, dynamic API |
| June 2026 | 1.0 | Footer redesigned — dark theme + brand animation |
| June 2026 | 1.0 | BrandAnimation component added |
| June 2026 | 1.0 | RideForm redesigned — 5-step wizard |
| June 2026 | 1.0 | RidePost redesigned — production-grade card management |

---

*This document is the single source of truth. All future UI work must reference and update this document. Do not ship a new screen without checking it against this guide.*