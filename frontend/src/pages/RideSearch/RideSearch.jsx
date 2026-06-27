// src/pages/RideSearch/RideSearch.jsx
// Complete Search Ride page.
// Search: LocationAutocomplete for India-complete typeahead
// Map: RideMap (MapLibre / OLA Maps) with route hover, nearby + on-the-way rides
// Results: exact-route matches (green), on-the-way matches, nearby rides (gray)
// First-ride free banner + per-ride offer badge

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import RideCard from '../../components/ride/RideCard';
import RideMap from '../../components/map/RideMap';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';
import { searchRides } from '../../services/rideService';
import { getMyBookings } from '../../services/bookingService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const clampDateInput = (value) => {
  if (!value) return '';
  const [year = '', month = '', day = ''] = value.split('-');
  return [year.slice(0, 4), month.slice(0, 2), day.slice(0, 2)]
    .filter(Boolean)
    .join('-');
};

const isValidRideDate = (value, minDate) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (value < minDate) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const normalizeIndiaLocation = (value) => {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return /\bindia\b/i.test(cleaned) ? cleaned : `${cleaned}, India`;
};

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-1">
          <div className="w-2 h-2 rounded-full bg-gray-200" />
          <div className="w-px h-5 bg-gray-200" />
          <div className="w-2 h-2 rounded-full bg-gray-200" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-14 h-8 bg-gray-200 rounded ml-3" />
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
        <div className="w-7 h-7 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-2.5 bg-gray-200 rounded w-16" />
        </div>
        <div className="w-16 h-5 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

// ─── Filter toggle ────────────────────────────────────────────────────────────
function FilterToggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, subtitle, badge, badgeColor = 'blue', count }) {
  const colors = {
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', eyebrow: 'text-green-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', eyebrow: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', eyebrow: 'text-purple-600' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', eyebrow: 'text-gray-400' },
  };
  const c = colors[badgeColor] || colors.blue;

  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${c.eyebrow}`}>{eyebrow}</p>
        <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Empty results ────────────────────────────────────────────────────────────
function EmptyResults({ start, end, onClear }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="font-semibold text-gray-800 text-base mb-1">No rides found</p>
      <p className="text-sm text-gray-500 mb-5">
        No rides from <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> right now.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button onClick={onClear}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          Try a new search
        </button>
        <Link to="/ride/post"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post a ride on this route
        </Link>
      </div>
    </div>
  );
}

// ─── Pre-search placeholder ───────────────────────────────────────────────────
function SearchPrompt() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="font-semibold text-gray-800 text-base mb-1">Search for available rides</p>
      <p className="text-sm text-gray-500">Enter your origin and destination above to find rides going your way.</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function RideSearch() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchCardRef = useRef(null);
  const startRef = useRef(null);

  // Search inputs
  const [start, setStart] = useState(searchParams.get('start') || '');
  const [end, setEnd] = useState(searchParams.get('end') || '');
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [startPlace, setStartPlace] = useState(null);
  const [endPlace, setEndPlace] = useState(null);

  // Results — three tiers
  const [exactRides, setExactRides] = useState([]); // matchType === 'exact' or 'on_route'
  const [onWayRides, setOnWayRides] = useState([]); // partial overlap
  const [nearbyRides, setNearbyRides] = useState([]); // same city/region but different route
  const [allRides, setAllRides] = useState([]); // all combined for map

  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFirstRideFree, setIsFirstRideFree] = useState(false);

  // Map state
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);
  const [rideRoutes, setRideRoutes] = useState([]);
  const [selectedRideId, setSelected] = useState(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minSeats, setMinSeats] = useState('');
  const [maxFare, setMaxFare] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [acOnly, setAcOnly] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Auto-search from URL params
  useEffect(() => {
    if (searchParams.get('start') && searchParams.get('end')) {
      handleSearch();
    }
    window.setTimeout(() => {
      searchCardRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check first-ride-free eligibility
  useEffect(() => {
    let active = true;
    async function checkEligibility() {
      if (!user) { setIsFirstRideFree(false); return; }
      if (Number(user.totalRidesAsPassenger) > 0) { setIsFirstRideFree(false); return; }
      try {
        const bookings = await getMyBookings({ limit: 1 });
        if (active) setIsFirstRideFree(bookings.length === 0);
      } catch {
        if (active) setIsFirstRideFree(false);
      }
    }
    checkEligibility();
    return () => { active = false; };
  }, [user]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const applyFilters = useCallback((list) => {
    return list.filter(ride => {
      const seats = ride.availableSeats ?? ride.seats;
      if (minSeats && seats < parseInt(minSeats)) return false;
      if (maxFare && (ride.segmentFare || ride.fare) > parseFloat(maxFare)) return false;
      if (vehicleType && ride.vehicle?.type !== vehicleType) return false;
      if (acOnly && !ride.vehicle?.acAvailable) return false;
      if (womenOnly && !ride.preferences?.womenOnly) return false;
      if (verifiedOnly && !(ride.driverInfo?.verified || ride.driverId?.isDriverVerified)) return false;
      return true;
    });
  }, [minSeats, maxFare, vehicleType, acOnly, womenOnly, verifiedOnly]);

  const activeFilterCount = [minSeats, maxFare, vehicleType, acOnly, womenOnly, verifiedOnly].filter(Boolean).length;

  // ── Categorize results into three tiers ───────────────────────────────────
  function categorizeResults(results) {
    const exact = [];
    const onWay = [];
    const nearby = [];

    results.forEach(ride => {
      const mt = ride.matchType;
      if (mt === 'exact' || mt === 'on_route') {
        exact.push(ride);
      } else if (mt === 'partial' || mt === 'waypoint' || mt === 'nearby_route') {
        onWay.push(ride);
      } else {
        // Fallback: if ride has routeCoordinates that overlap our region → onWay, else nearby
        nearby.push(ride);
      }
    });

    return { exact, onWay, nearby };
  }

  // ── Build map data from rides ─────────────────────────────────────────────
  function buildMapData(all, connectedIds) {
    const routes = all
      .filter(r => r.routeCoordinates?.length >= 2)
      .map(r => ({
        id: r._id,
        path: r.routeCoordinates,
        color: connectedIds.has(r._id) ? '#16a34a' : '#2563eb',
      }));
    return routes;
  }

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (e, options = {}) => {
    if (e?.preventDefault) e.preventDefault();
    const silent = options.silent === true;

    if (!start.trim() || !end.trim()) {
      toast.error('Enter both origin and destination');
      return;
    }
    if (!isValidRideDate(date, today)) {
      toast.error('Enter a valid ride date');
      return;
    }
    if (!user) {
      toast.error('Sign in to search rides', {
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setExactRides([]); setOnWayRides([]); setNearbyRides([]); setAllRides([]);
    setRideRoutes([]);

    const loadingId = silent ? null : toast.loading('Searching rides…', {
      style: { background: '#2563eb', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
    });

    try {
      const results = await searchRides(
        normalizeIndiaLocation(start),
        normalizeIndiaLocation(end),
        date || null,
      );

      if (loadingId) toast.dismiss(loadingId);

      if (!results?.length) {
        if (!silent) toast.error(`No rides found from ${start} to ${end}`, { id: 'no-results' });
        setIsLoading(false);
        return;
      }

      const filtered = applyFilters(results);
      const { exact, onWay, nearby } = categorizeResults(filtered);

      setExactRides(exact);
      setOnWayRides(onWay);
      setNearbyRides(nearby);
      setAllRides(filtered);

      const connectedIds = new Set(exact.map(r => r._id));
      setRideRoutes(buildMapData(filtered, connectedIds));

      // Set map markers
      if (startPlace?.lat) {
        setStartMarker({ lat: startPlace.lat, lng: startPlace.lng });
      } else if (exact[0]?.pickupCoordinates) {
        setStartMarker(exact[0].pickupCoordinates);
      } else if (filtered[0]?.routeCoordinates?.length) {
        setStartMarker(filtered[0].routeCoordinates[0]);
      }

      if (endPlace?.lat) {
        setEndMarker({ lat: endPlace.lat, lng: endPlace.lng });
      } else if (exact[0]?.dropCoordinates) {
        setEndMarker(exact[0].dropCoordinates);
      } else if (filtered[0]?.routeCoordinates?.length) {
        const rc = filtered[0].routeCoordinates;
        setEndMarker(rc[rc.length - 1]);
      }

      if (!silent) {
        const total = filtered.length;
        if (exact.length > 0) {
          toast.success(`${exact.length} ride${exact.length !== 1 ? 's' : ''} cover your exact route!`, {
            icon: '🎯',
            style: { background: '#16a34a', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
          });
        } else {
          toast.success(`${total} ride${total !== 1 ? 's' : ''} found`, {
            style: { background: '#16a34a', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
          });
        }
        setTimeout(() => {
          document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
      }

    } catch (err) {
      if (loadingId) toast.dismiss(loadingId);
      if (!silent) toast.error(err?.response?.data?.message || 'Search failed. Please try again.', {
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setStart(''); setEnd(''); setDate('');
    setStartPlace(null); setEndPlace(null);
    setExactRides([]); setOnWayRides([]); setNearbyRides([]); setAllRides([]);
    setRideRoutes([]); setStartMarker(null); setEndMarker(null);
    setHasSearched(false); setSelected(null);
    setMinSeats(''); setMaxFare(''); setVehicleType('');
    setAcOnly(false); setWomenOnly(false); setVerifiedOnly(false);
    setShowFilters(false);
    window.setTimeout(() => {
      searchCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const connectedRides = exactRides; // for map highlighting

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-6 pb-8 sm:pt-8 sm:pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-blue-200 text-xs font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1.5" />
                Smart route matching · India
              </p>
              <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">Find a Ride</h1>
              <p className="text-blue-200 text-xs sm:text-sm mt-1">
                City to city · village to town · street to office — search any Indian location
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 pb-16">

        {/* Search card */}
        <div
          id="search"
          ref={searchCardRef}
          className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden mb-5 scroll-mt-4"
        >
          <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-400" />
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest">Search</p>
                <h2 className="text-base font-bold text-gray-900 leading-tight">Where are you going?</h2>
              </div>
            </div>

            <form onSubmit={handleSearch} noValidate>
              {/* First-ride-free banner */}
              {isFirstRideFree && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-sm font-bold text-green-800">🎁 Your first booking is fee-free</p>
                  <p className="mt-0.5 text-xs text-green-700">Platform fee waived on your first ride. You pay fare + GST only.</p>
                </div>
              )}

              {/* Location inputs with autocomplete */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* From */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                  <LocationAutocomplete
                    icon="origin"
                    value={start}
                    onChange={(val) => setStart(val)}
                    onPlaceSelect={(place) => {
                      setStart(place.address || start);
                      setStartPlace(place);
                    }}
                    placeholder="Origin city, area, village…"
                    disabled={isLoading}
                    inputRef={startRef}
                  />
                </div>

                {/* To */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                  <LocationAutocomplete
                    icon="destination"
                    value={end}
                    onChange={(val) => setEnd(val)}
                    onPlaceSelect={(place) => {
                      setEnd(place.address || end);
                      setEndPlace(place);
                    }}
                    placeholder="Destination city, area, village…"
                    disabled={isLoading}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Date <span className="text-gray-300 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={today}
                    max="9999-12-31"
                    onChange={e => setDate(clampDateInput(e.target.value))}
                    disabled={isLoading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowFilters(f => !f)}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-700"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {showFilters && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Min seats</label>
                      <input type="number" min="1" max="8" value={minSeats} onChange={e => setMinSeats(e.target.value)} placeholder="Any"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Max fare (₹)</label>
                      <input type="number" min="0" value={maxFare} onChange={e => setMaxFare(e.target.value)} placeholder="Any"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Vehicle type</label>
                      <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Any</option>
                        {['Hatchback', 'Sedan', 'SUV', 'MUV', 'Bike'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <FilterToggle checked={acOnly} onChange={setAcOnly} label="AC only" />
                    <FilterToggle checked={womenOnly} onChange={setWomenOnly} label="Women only rides" />
                    <FilterToggle checked={verifiedOnly} onChange={setVerifiedOnly} label="Verified drivers only" />

                    {activeFilterCount > 0 && (
                      <button type="button"
                        onClick={() => { setMinSeats(''); setMaxFare(''); setVehicleType(''); setAcOnly(false); setWomenOnly(false); setVerifiedOnly(false); }}
                        className="text-xs text-red-600 font-semibold hover:text-red-700 self-end col-span-full sm:col-auto">
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !start.trim() || !end.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Rides
                  </>
                )}
              </button>

              {hasSearched && (
                <div className="mt-3 text-center">
                  <button type="button" onClick={handleClear}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear search
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Map */}
        <div className="mb-5">
          <RideMap
            rides={allRides}
            connectedRides={connectedRides}
            rideRoutes={rideRoutes}
            startMarker={startMarker}
            endMarker={endMarker}
            selectedRideId={selectedRideId}
            onRideClick={(ride) => {
              setSelected(ride._id);
              document.getElementById(`ride-card-${ride._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            hasSearched={hasSearched}
          />
        </div>

        {/* Results */}
        <div id="search-results">

          {/* Skeletons */}
          {isLoading && (
            <div>
              <SectionHeader eyebrow="Searching" title="Finding rides…" badgeColor="blue" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </div>
          )}

          {/* Empty */}
          {!isLoading && hasSearched && allRides.length === 0 && (
            <EmptyResults start={start} end={end} onClear={handleClear} />
          )}

          {/* Pre-search */}
          {!isLoading && !hasSearched && <SearchPrompt />}

          {/* ── TIER 1: Exact / on-route matches ── */}
          {!isLoading && exactRides.length > 0 && (
            <div className="mb-8">
              <SectionHeader
                eyebrow="Best matches"
                title="Rides covering your route"
                subtitle={`${exactRides.length} ride${exactRides.length !== 1 ? 's' : ''} pass through your entire journey`}
                badge={
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Route match
                  </span>
                }
                badgeColor="green"
              />

              <div className="space-y-3 sm:space-y-4">
                {exactRides.map((ride, idx) => (
                  <div
                    key={ride._id}
                    id={`ride-card-${ride._id}`}
                    className={`relative transition-all duration-200 ${selectedRideId === ride._id ? 'ring-2 ring-green-500 ring-offset-2 rounded-2xl' : ''}`}
                  >
                    {/* Match badge */}
                    <div className="absolute -top-2.5 -right-1 z-10 bg-green-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      #{idx + 1} Route match
                    </div>
                    <RideCard
                      ride={ride}
                      isFirstRideFree={isFirstRideFree}
                      onBookingSuccess={() => {
                        setIsFirstRideFree(false);
                        handleSearch(null, { silent: true });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TIER 2: On-the-way / partial overlap rides ── */}
          {!isLoading && onWayRides.length > 0 && (
            <div className="mb-8">
              <SectionHeader
                eyebrow="On your way"
                title="Rides passing through your region"
                subtitle={`${onWayRides.length} ride${onWayRides.length !== 1 ? 's' : ''} with partial route overlap — you may be able to join`}
                badge="On the way"
                badgeColor="purple"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {onWayRides.map(ride => (
                  <div
                    key={ride._id}
                    id={`ride-card-${ride._id}`}
                    className={`relative transition-all duration-200 ${selectedRideId === ride._id ? 'ring-2 ring-purple-400 ring-offset-2 rounded-2xl' : ''}`}
                  >
                    {/* On-the-way badge */}
                    <div className="absolute -top-2.5 -right-1 z-10 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      On the way
                    </div>
                    <RideCard
                      ride={ride}
                      isFirstRideFree={isFirstRideFree}
                      onBookingSuccess={() => {
                        setIsFirstRideFree(false);
                        handleSearch(null, { silent: true });
                      }}
                    />
                  </div>
                ))}
              </div>

              {onWayRides.length > 0 && (
                <p className="text-xs text-gray-400 text-center mt-4">
                  💡 Contact the driver to confirm they can accommodate your specific pickup and drop-off points.
                </p>
              )}
            </div>
          )}

          {/* ── TIER 3: Nearby rides ── */}
          {!isLoading && nearbyRides.length > 0 && (
            <div className="mb-8">
              <SectionHeader
                eyebrow="Nearby"
                title="Other rides in this area"
                subtitle={`${nearbyRides.length} ride${nearbyRides.length !== 1 ? 's' : ''} in the same region — routes may differ`}
                badge="Nearby"
                badgeColor="gray"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {nearbyRides.map(ride => (
                  <div
                    key={ride._id}
                    id={`ride-card-${ride._id}`}
                    className={`relative transition-all duration-200 ${selectedRideId === ride._id ? 'ring-2 ring-gray-400 ring-offset-2 rounded-2xl' : ''}`}
                  >
                    <RideCard
                      ride={ride}
                      isFirstRideFree={isFirstRideFree}
                      onBookingSuccess={() => {
                        setIsFirstRideFree(false);
                        handleSearch(null, { silent: true });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trust strip */}
        {!isLoading && !hasSearched && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {[
              { icon: '🛡️', text: 'Verified drivers' },
              { icon: '📍', text: 'City to village coverage' },
              { icon: '⭐', text: 'Rated community' },
              { icon: '💸', text: 'Split fuel costs' },
              { icon: '🎯', text: 'Smart route matching' },
              { icon: '🏘️', text: 'Locality-level search' },
              { icon: '⚡', text: 'Instant booking' },
            ].map(p => (
              <span key={p.text} className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
                {p.icon} {p.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}