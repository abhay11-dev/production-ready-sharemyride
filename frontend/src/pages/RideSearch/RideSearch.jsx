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
import Icon from '../../components/ui/Icon';

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
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', eyebrow: 'text-amber-600' },
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
        <Icon name="Frown" size="lg" className="text-red-400" />
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
          <Icon name="Plus" size="sm" />
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
        <Icon name="Search" size="lg" className="text-blue-400" />
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

  // Results — Smart Search tiers (Milestone 1: 7-tier ranking collapsed into
  // 4 display buckets so the existing UI sections stay unchanged)
  //   exactRides       <- matchTier 1-2 (exact match, same destination)
  //   nearbyRides      <- matchTier 3-5 (same state / nearby pickup / nearby drop)
  //   onWayRides       <- matchTier 6   (partial route match)
  //   negotiableRides  <- matchTier 7   (negotiation possible, last resort)
  const [exactRides, setExactRides] = useState([]);
  const [onWayRides, setOnWayRides] = useState([]);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [negotiableRides, setNegotiableRides] = useState([]);
  const [allRides, setAllRides] = useState([]); // all combined for map
  const [searchMeta, setSearchMeta] = useState(null); // pagination + tier counts from backend

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

  // ── Categorize results into display buckets ───────────────────────────────
  // Prefers the new `matchTier` (1-7, Smart Search Milestone 1). Falls back
  // to the legacy `matchType` string for any older cached response shape.
  function categorizeResults(results) {
    const exact = [];
    const onWay = [];
    const nearby = [];
    const negotiable = [];

    results.forEach(ride => {
      const tier = ride.matchTier;
      if (typeof tier === 'number') {
        if (tier <= 2) exact.push(ride);
        else if (tier >= 3 && tier <= 5) nearby.push(ride);
        else if (tier === 6) onWay.push(ride);
        else negotiable.push(ride);
        return;
      }
      // Legacy fallback (no matchTier present)
      const mt = ride.matchType;
      if (mt === 'exact' || mt === 'on_route') {
        exact.push(ride);
      } else if (mt === 'partial' || mt === 'waypoint' || mt === 'nearby_route') {
        onWay.push(ride);
      } else if (mt === 'negotiation') {
        negotiable.push(ride);
      } else {
        nearby.push(ride);
      }
    });

    return { exact, onWay, nearby, negotiable };
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
    setExactRides([]); setOnWayRides([]); setNearbyRides([]); setNegotiableRides([]); setAllRides([]);
    setRideRoutes([]);
    setSearchMeta(null);

    const loadingId = silent ? null : toast.loading('Searching rides…', {
      style: { background: '#2563eb', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
    });

    try {
      const { rides: results, meta } = await searchRides(
        normalizeIndiaLocation(start),
        normalizeIndiaLocation(end),
        date || null,
        {
          pickupLat: startPlace?.lat,
          pickupLng: startPlace?.lng || startPlace?.lon,
          destLat: endPlace?.lat,
          destLng: endPlace?.lng || endPlace?.lon,
          // Same-state tier (Milestone 1) — pass through state hints when
          // the Geoapify autocomplete supplied them
          originState: startPlace?.state,
          destState: endPlace?.state,
        }
      );

      if (loadingId) toast.dismiss(loadingId);

      if (!results?.length) {
        if (!silent) toast.error(`No rides found from ${start} to ${end}`, { id: 'no-results' });
        setIsLoading(false);
        return;
      }

      const filtered = applyFilters(results);
      const { exact, onWay, nearby, negotiable } = categorizeResults(filtered);

      setExactRides(exact);
      setOnWayRides(onWay);
      setNearbyRides(nearby);
      setNegotiableRides(negotiable);
      setAllRides(filtered);
      setSearchMeta(meta || null);

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
                <Icon name="Search" size="sm" className="text-blue-600" />
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
                  <Icon name="ChevronDown" size="xs" className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
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
                    <Icon name="Loader2" size="sm" className="animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Icon name="Search" size="sm" />
                    Search Rides
                  </>
                )}
              </button>

              {hasSearched && (
                <div className="mt-3 text-center">
                  <button type="button" onClick={handleClear}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors">
                    <Icon name="X" size="xs" />
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
                    <Icon name="CheckCircle" size="sm" />
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
                      <Icon name="CheckCircle" size="xs" />
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

          {/* ── TIER 4: Negotiation-possible rides (Smart Search Milestone 1) ── */}
          {!isLoading && negotiableRides.length > 0 && (
            <div className="mb-8">
              <SectionHeader
                eyebrow="Worth asking"
                title="Fare is negotiable on these rides"
                subtitle={`${negotiableRides.length} ride${negotiableRides.length !== 1 ? 's' : ''} don't match your route directly, but the driver accepts fare/pickup/drop negotiation`}
                badge="Negotiable"
                badgeColor="amber"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {negotiableRides.map(ride => (
                  <div
                    key={ride._id}
                    id={`ride-card-${ride._id}`}
                    className={`relative transition-all duration-200 ${selectedRideId === ride._id ? 'ring-2 ring-amber-400 ring-offset-2 rounded-2xl' : ''}`}
                  >
                    <div className="absolute -top-2.5 -right-1 z-10 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      Negotiable
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

              <p className="text-xs text-gray-400 text-center mt-4">
                💬 These rides don't cover your route today — chat with the driver to see if they can accommodate you.
              </p>
            </div>
          )}

          {/* Pagination footer (Smart Search Milestone 1) */}
          {!isLoading && searchMeta?.totalPages > 1 && (
            <p className="text-xs text-gray-400 text-center mt-2 mb-4">
              Showing page {searchMeta.page} of {searchMeta.totalPages} ({searchMeta.total} total matching rides)
            </p>
          )}
        </div>

        {/* Trust strip */}
        {!isLoading && !hasSearched && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {[
              { icon: 'Shield', text: 'Verified drivers', color: 'text-blue-500' },
              { icon: 'MapPin', text: 'City to village coverage', color: 'text-green-500' },
              { icon: 'Star', text: 'Rated community', color: 'text-amber-500' },
              { icon: 'IndianRupee', text: 'Split fuel costs', color: 'text-green-600' },
              { icon: 'Compass', text: 'Smart route matching', color: 'text-blue-600' },
              { icon: 'Home', text: 'Locality-level search', color: 'text-purple-500' },
              { icon: 'Zap', text: 'Instant booking', color: 'text-yellow-500' },
            ].map(p => (
              <span key={p.text} className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
                <Icon name={p.icon} size="xs" className={p.color} /> {p.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}