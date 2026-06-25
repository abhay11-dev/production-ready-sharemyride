// src/pages/RideSearch/RideSearch.jsx
// Complete Search Ride page matching Home.jsx design system exactly.
// Map: mapcn (MapLibre) via RideMap component — replaces LeafletRideMap.
// Hero: bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500, pb-14.
// Content: -mt-8 overlap, bg-gray-50, max-w-7xl.
// Install mapcn first: npx shadcn@latest add @mapcn/map

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import RideCard from '../../components/ride/RideCard';
import RideMap from '../../components/map/RideMap';
import { searchRides } from '../../services/rideService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// ─── Skeleton card matching Home.jsx ─────────────────────────────────────────
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

// ─── Empty results state ──────────────────────────────────────────────────────
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
        No rides from <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> at the moment.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          Try a new search
        </button>
        <Link
          to="/ride/post"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post a ride this route
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
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function RideSearch() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Search inputs ─────────────────────────────────────────────────────────
  const [start, setStart] = useState(searchParams.get('start') || '');
  const [end,   setEnd]   = useState(searchParams.get('end')   || '');
  const [date,  setDate]  = useState(searchParams.get('date')  || '');

  // ── Results ───────────────────────────────────────────────────────────────
  const [rides, setRides]               = useState([]);
  const [connectedRides, setConnected]  = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [hasSearched, setHasSearched]   = useState(false);

  // ── Map state ─────────────────────────────────────────────────────────────
  const [startMarker, setStartMarker]   = useState(null);
  const [endMarker, setEndMarker]       = useState(null);
  const [rideRoutes, setRideRoutes]     = useState([]);
  const [selectedRideId, setSelected]   = useState(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [showFilters, setShowFilters]   = useState(false);
  const [minSeats, setMinSeats]         = useState('');
  const [maxFare, setMaxFare]           = useState('');
  const [vehicleType, setVehicleType]   = useState('');
  const [acOnly, setAcOnly]             = useState(false);
  const [womenOnly, setWomenOnly]       = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Auto-search if URL has params
  useEffect(() => {
    if (searchParams.get('start') && searchParams.get('end')) {
      handleSearch();
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []); // eslint-disable-line

  const applyFilters = useCallback((list) => {
    return list.filter(ride => {
      const seats = ride.availableSeats ?? ride.seats;
      if (minSeats && seats < parseInt(minSeats)) return false;
      if (maxFare  && (ride.segmentFare || ride.fare) > parseFloat(maxFare)) return false;
      if (vehicleType && ride.vehicle?.type !== vehicleType) return false;
      if (acOnly && !ride.vehicle?.acAvailable) return false;
      if (womenOnly && !ride.preferences?.womenOnly) return false;
      if (verifiedOnly && !(ride.driverInfo?.verified || ride.driverId?.isDriverVerified)) return false;
      return true;
    });
  }, [minSeats, maxFare, vehicleType, acOnly, womenOnly, verifiedOnly]);

  const activeFilterCount = [minSeats, maxFare, vehicleType, acOnly, womenOnly, verifiedOnly].filter(Boolean).length;

  const handleSearch = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!start.trim() || !end.trim()) {
      toast.error('Enter both origin and destination');
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
    setRides([]);
    setConnected([]);
    setRideRoutes([]);

    const loadingId = toast.loading('Searching rides…', {
      style: { background: '#2563eb', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
    });

    try {
      const results = await searchRides(start.trim(), end.trim(), date || null);
      toast.dismiss(loadingId);

      if (!results?.length) {
        toast.error(`No rides found from ${start} to ${end}`, { id: 'no-results' });
        return;
      }

      const filtered = applyFilters(results);
      const connected = filtered.filter(r => r.matchType === 'on_route');
      const others    = filtered.filter(r => r.matchType !== 'on_route');

      setRides(filtered);
      setConnected(connected);

      // Build map routes — green for connected, blue for others
      const routes = [
        ...connected.filter(r => r.routeCoordinates?.length).map(r => ({
          id: r._id,
          path: r.routeCoordinates,
          color: '#10B981', // green-500
        })),
        ...others.filter(r => r.routeCoordinates?.length).map(r => ({
          id: r._id,
          path: r.routeCoordinates,
          color: '#2563eb', // blue-600
        })),
      ];
      setRideRoutes(routes);

      // Set map markers from first connected ride
      if (connected[0]?.pickupCoordinates) {
        setStartMarker(connected[0].pickupCoordinates);
        setEndMarker(connected[0].dropCoordinates);
      } else if (filtered[0]?.routeCoordinates?.length) {
        const first = filtered[0].routeCoordinates;
        setStartMarker(first[0]);
        setEndMarker(first[first.length - 1]);
      }

      if (connected.length > 0) {
        toast.success(`${connected.length} ride${connected.length !== 1 ? 's' : ''} cover your route!`, {
          icon: '🎯',
          style: { background: '#10B981', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
        });
      } else {
        toast.success(`${filtered.length} ride${filtered.length !== 1 ? 's' : ''} found`, {
          style: { background: '#10B981', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
        });
      }

      // Scroll results into view on mobile
      setTimeout(() => {
        document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);

    } catch (err) {
      toast.dismiss(loadingId);
      toast.error(err?.response?.data?.message || 'Search failed. Please try again.', {
        style: { background: '#EF4444', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setStart(''); setEnd(''); setDate('');
    setRides([]); setConnected([]); setRideRoutes([]);
    setStartMarker(null); setEndMarker(null);
    setHasSearched(false); setSelected(null);
    setMinSeats(''); setMaxFare(''); setVehicleType('');
    setAcOnly(false); setWomenOnly(false); setVerifiedOnly(false);
    setShowFilters(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const otherRides = rides.filter(r => !connectedRides.find(c => c._id === r._id));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero strip — identical to Home.jsx LoggedInDashboard ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-5 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-blue-200 text-xs font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1.5" />
                Smart route matching · India
              </p>
              <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">Find a Ride</h1>
              <p className="text-blue-200 text-xs sm:text-sm mt-1">Search rides going your way · smart route overlap matching</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/ride/post"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Offer a ride
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content — -mt-8 overlap ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">

        {/* ── Search card ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden mb-5">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* From */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="text"
                      value={start}
                      onChange={e => setStart(e.target.value)}
                      placeholder="Origin city or area"
                      disabled={isLoading}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* To */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="text"
                      value={end}
                      onChange={e => setEnd(e.target.value)}
                      placeholder="Destination city or area"
                      disabled={isLoading}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date <span className="text-gray-300 font-normal">(optional)</span></label>
                  <input
                    type="date"
                    value={date}
                    min={today}
                    onChange={e => setDate(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Advanced filters toggle */}
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
                    <FilterToggle checked={acOnly}       onChange={setAcOnly}       label="AC only" />
                    <FilterToggle checked={womenOnly}    onChange={setWomenOnly}    label="Women only rides" />
                    <FilterToggle checked={verifiedOnly} onChange={setVerifiedOnly} label="Verified drivers only" />

                    {activeFilterCount > 0 && (
                      <button type="button" onClick={() => { setMinSeats(''); setMaxFare(''); setVehicleType(''); setAcOnly(false); setWomenOnly(false); setVerifiedOnly(false); }}
                        className="text-xs text-red-600 font-semibold hover:text-red-700 self-end">
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

        {/* ── Map — always visible, synced with results ───────────────── */}
        <div className="mb-5">
          <RideMap
            rides={rides}
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

        {/* ── Results ─────────────────────────────────────────────────── */}
        <div id="search-results">

          {/* Loading skeletons */}
          {isLoading && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-1">Searching</p>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Finding rides…</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </div>
          )}

          {/* No results */}
          {!isLoading && hasSearched && rides.length === 0 && (
            <EmptyResults start={start} end={end} onClear={handleClear} />
          )}

          {/* Pre-search */}
          {!isLoading && !hasSearched && <SearchPrompt />}

          {/* Connected routes section */}
          {!isLoading && connectedRides.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-1">Best matches</p>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Rides covering your route</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{connectedRides.length} ride{connectedRides.length !== 1 ? 's' : ''} pass through your journey</p>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Route match
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {connectedRides.map(ride => (
                  <div
                    key={ride._id}
                    id={`ride-card-${ride._id}`}
                    className={`transition-all duration-200 ${selectedRideId === ride._id ? 'ring-2 ring-blue-500 ring-offset-2 rounded-2xl' : ''}`}
                  >
                    <div className="relative">
                      {/* Connected badge */}
                      <div className="absolute -top-2 -right-2 z-10 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Route match
                      </div>
                      <RideCard
                        ride={ride}
                        onBookingSuccess={() => handleSearch()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other rides section */}
          {!isLoading && otherRides.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-1">
                    {connectedRides.length > 0 ? 'More options' : 'Available rides'}
                  </p>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    {connectedRides.length > 0 ? 'Other rides on similar routes' : 'Rides available'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">{otherRides.length} ride{otherRides.length !== 1 ? 's' : ''} found</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {otherRides.map(ride => (
                  <div
                    key={ride._id}
                    id={`ride-card-${ride._id}`}
                    className={`transition-all duration-200 ${selectedRideId === ride._id ? 'ring-2 ring-blue-500 ring-offset-2 rounded-2xl' : ''}`}
                  >
                    <RideCard ride={ride} onBookingSuccess={() => handleSearch()} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Trust strip at bottom ──────────────────────────────────────── */}
        {!isLoading && !hasSearched && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {[
              { icon: '🛡️', text: 'Verified drivers only' },
              { icon: '⭐', text: 'Rated community' },
              { icon: '💸', text: 'Split fuel costs' },
              { icon: '🎯', text: 'Smart route matching' },
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

export default RideSearch;