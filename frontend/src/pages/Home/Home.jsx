import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num) {
  if (!num || num === 0) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatRating(r) {
  return r ? r.toFixed(1) : '0.0';
}

// ─── Mock ride feed (replace with real API call when ready) ───────────────────
const MOCK_RIDES = [
  { id: 1, from: 'Bengaluru', to: 'Mysuru', date: 'Today, 6:30 AM', seats: 2, price: 350, driver: 'Rahul M.', rating: 4.9, reviews: 47, verified: true, vehicle: 'Swift Dzire · White' },
  { id: 2, from: 'Pune', to: 'Mumbai', date: 'Today, 8:00 AM', seats: 3, price: 280, driver: 'Priya S.', rating: 4.8, reviews: 31, verified: true, vehicle: 'Honda City · Silver' },
  { id: 3, from: 'Delhi', to: 'Agra', date: 'Tomorrow, 7:00 AM', seats: 1, price: 420, driver: 'Amit K.', rating: 4.7, reviews: 58, verified: false, vehicle: 'Innova Crysta · Grey' },
  { id: 4, from: 'Chennai', to: 'Pondicherry', date: 'Tomorrow, 9:30 AM', seats: 2, price: 300, driver: 'Divya R.', rating: 5.0, reviews: 22, verified: true, vehicle: 'Maruti Ertiga · Blue' },
];

const TESTIMONIALS = [
  { name: 'Sneha T.', city: 'Bengaluru', text: 'Saved ₹800 on my weekly Mysuru commute. The drivers are always verified and punctual.', rating: 5, trips: 34 },
  { name: 'Vikram N.', city: 'Pune', text: 'Posted my first ride and found 3 passengers in under 10 minutes. Offset my entire fuel cost.', rating: 5, trips: 12 },
  { name: 'Ananya R.', city: 'Delhi', text: "The community here is genuinely friendly. I've made two regular carpool partners.", rating: 5, trips: 28 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ value, label, color, loading }) {
  return (
    <div className="flex flex-col items-center">
      {loading ? (
        <div className="animate-pulse w-12 h-6 bg-white/30 rounded mb-1" />
      ) : (
        <span className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</span>
      )}
      <span className="text-xs text-gray-500 font-medium mt-0.5">{label}</span>
    </div>
  );
}

function RideCard({ ride }) {
  return (
    <Link
      to={`/ride/${ride.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        {/* Route */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="font-semibold text-gray-900 text-sm truncate">{ride.from}</span>
            </div>
            <div className="ml-1 border-l-2 border-dashed border-gray-200 h-4 my-0.5 ml-[3px]" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="font-semibold text-gray-900 text-sm truncate">{ride.to}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-blue-600">₹{ride.price}</div>
            <div className="text-xs text-gray-400">per seat</div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {ride.driver.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-gray-800 truncate">{ride.driver}</span>
                {ride.verified && (
                  <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs text-gray-500">{ride.rating} · {ride.reviews} trips</span>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ride.seats === 1 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
              }`}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              {ride.seats} {ride.seats === 1 ? 'seat left' : 'seats'}
            </div>
            <div className="text-xs text-gray-400 mt-1">{ride.date}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TestimonialCard({ t }) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
      <div className="flex gap-0.5 mb-3">
        {[...Array(t.rating)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {t.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{t.name}</p>
          <p className="text-xs text-gray-500">{t.city} · {t.trips} trips</p>
        </div>
      </div>
    </div>
  );
}

// ─── Logged-in Dashboard View ─────────────────────────────────────────────────

function LoggedInDashboard({ user, stats }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard hero strip */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                {user?.name?.split(' ')[0] || 'Traveller'} 👋
              </h1>
              <p className="text-blue-200 text-sm mt-1">Where are you headed today?</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                to="/ride/search"
                className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find a ride
              </Link>
              <Link
                to="/ride/post"
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-400 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Offer a ride
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        {/* Quick action cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Upcoming Trips', to: '/upcoming-rides', icon: '📅', color: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
            { label: 'My Bookings', to: '/bookings/my-bookings', icon: '🎫', color: 'bg-green-50 border-green-100', text: 'text-green-700' },
            { label: 'Ride Requests', to: '/notifications', icon: '🔔', color: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
            { label: 'My Profile', to: '/profile', icon: '👤', color: 'bg-purple-50 border-purple-100', text: 'text-purple-700' },
          ].map(card => (
            <Link
              key={card.label}
              to={card.to}
              className={`${card.color} border rounded-2xl p-4 sm:p-5 flex flex-col items-start gap-2 hover:shadow-md transition-all duration-150 group`}
            >
              <span className="text-2xl">{card.icon}</span>
              <span className={`text-xs sm:text-sm font-semibold ${card.text}`}>{card.label}</span>
            </Link>
          ))}
        </div>

        {/* Platform stats */}
        {(stats.totalUsers > 0 || stats.totalRides > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-gray-100">
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatNumber(stats.totalUsers)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Community members</div>
            </div>
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{formatNumber(stats.totalRides)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Rides completed</div>
            </div>
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{formatNumber(stats.totalCities)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Cities active</div>
            </div>
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-bold text-amber-500 flex items-center justify-center gap-1">
                {formatRating(stats.averageRating)}
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Avg. driver rating</div>
            </div>
          </div>
        )}

        {/* Ride feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Rides leaving soon</h2>
            <Link to="/ride/search" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {MOCK_RIDES.map(ride => <RideCard key={ride.id} ride={ride} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Public Landing Page (logged out) ────────────────────────────────────────

function PublicLanding({ stats }) {
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-green-500/10 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 sm:pt-16 sm:pb-14 lg:pt-20">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-blue-100 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Community-driven carpooling · India
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
              Your next trip is{' '}
              <span className="text-green-300">already on its way.</span>
            </h1>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              Connect with verified drivers and passengers going your way. Share the cost, halve the traffic.
            </p>

            {/* Inline quick-search */}
            <div className="bg-white rounded-2xl p-2 shadow-2xl shadow-blue-900/30 flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Leaving from…"
                    value={searchFrom}
                    onChange={e => setSearchFrom(e.target.value)}
                    className="flex-1 bg-transparent text-gray-900 text-sm placeholder-gray-400 outline-none min-w-0"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m0 0l-7-7m7 7l-7 7" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Going to…"
                    value={searchTo}
                    onChange={e => setSearchTo(e.target.value)}
                    className="flex-1 bg-transparent text-gray-900 text-sm placeholder-gray-400 outline-none min-w-0"
                  />
                </div>
              </div>
              <Link
                to={`/ride/search?from=${encodeURIComponent(searchFrom)}&to=${encodeURIComponent(searchTo)}`}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </Link>
            </div>

            {/* Offer ride CTA */}
            <p className="mt-4 text-blue-200 text-sm">
              Driving somewhere?{' '}
              <Link to="/ride/post" className="text-white font-semibold underline underline-offset-2 hover:text-green-300 transition-colors">
                Offer seats and earn back fuel costs →
              </Link>
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative bg-blue-800/40 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-6 sm:gap-10 flex-nowrap">
                <StatPill value={formatNumber(stats.totalUsers || 12400)} label="Members" color="text-white" loading={stats.loading} />
                <div className="w-px h-8 bg-white/15" />
                <StatPill value={formatNumber(stats.totalRides || 8900)} label="Rides shared" color="text-white" loading={stats.loading} />
                <div className="w-px h-8 bg-white/15" />
                <StatPill value={formatNumber(stats.totalCities || 42)} label="Cities active" color="text-white" loading={stats.loading} />
                <div className="w-px h-8 bg-white/15" />
                <StatPill value={`${formatRating(stats.averageRating || 4.8)}★`} label="Avg. rating" color="text-amber-300" loading={stats.loading} />
              </div>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0 text-blue-200 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live data
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE RIDES FEED ── */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-1">Available now</p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Rides leaving soon</h2>
            </div>
            <Link
              to="/ride/search"
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 flex-shrink-0"
            >
              Browse all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {MOCK_RIDES.map(ride => <RideCard key={ride.id} ride={ride} />)}
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/ride/search"
              className="inline-flex items-center gap-2 border border-blue-200 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              See all available rides
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mb-10 sm:mb-12">
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">Why ShareMyRide</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Built for real commuters, not just tourists</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                bg: 'bg-blue-50',
                title: 'Verified drivers',
                desc: "Every driver is phone-verified with a visible rating history. You know who you're riding with before you book.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                bg: 'bg-green-50',
                title: 'Split costs fairly',
                desc: 'Drivers set a per-seat price to cover fuel. Passengers pay a fraction of solo travel. No one profits — everyone saves.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                bg: 'bg-purple-50',
                title: 'Fewer cars on the road',
                desc: 'Every shared ride removes at least one extra car. Collectively, this community has already prevented thousands of solo trips.',
              },
            ].map(v => (
              <div key={v.title} className="flex gap-4 p-5 sm:p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150">
                <div className={`${v.bg} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{v.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mb-10 sm:mb-12">
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">Simple by design</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">From sign-up to departure in minutes</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up free. Verify your phone. Done in under 2 minutes.' },
              { step: '02', title: 'Search or post a ride', desc: 'Browse live rides or list your own route with available seats and your price.' },
              { step: '03', title: 'Request or accept', desc: "Passengers send a request. Drivers approve. Both get each other's contact." },
              { step: '04', title: 'Travel and rate', desc: 'Share the road. After arrival, rate the experience to build community trust.' },
            ].map((s, i) => (
              <div key={s.step} className="relative bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
                <div className="text-4xl font-black text-gray-100 mb-3 leading-none">{s.step}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 z-10 -translate-y-1/2">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mb-10 sm:mb-12">
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">Real stories</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Trusted by daily commuters across India</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {TESTIMONIALS.map(t => <TestimonialCard key={t.name} t={t} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-700 via-blue-600 to-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to share your next ride?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base mb-8 max-w-lg mx-auto">
            Join {stats.totalUsers > 0 ? formatNumber(stats.totalUsers) : '12,000+'} members already saving money and reducing traffic together.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-blue-50 hover:shadow-lg transition-all duration-150"
            >
              Create free account
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to="/ride/search"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white/10 px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Browse rides — no account needed
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

// ─── Main Home Component ──────────────────────────────────────────────────────

function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRides: 0,
    totalCities: 0,
    averageRating: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats/home');
        const d = res.data?.data || res.data;
        setStats({
          totalUsers: d.totalUsers || 0,
          totalRides: d.totalRides || 0,
          totalCities: d.totalCities || 0,
          averageRating: d.averageRating || 0,
          loading: false,
        });
      } catch {
        setStats(s => ({ ...s, loading: false }));
      }
    };
    fetchStats();
  }, []);

  if (user) return <LoggedInDashboard user={user} stats={stats} />;
  return <PublicLanding stats={stats} />;
}

export default Home;