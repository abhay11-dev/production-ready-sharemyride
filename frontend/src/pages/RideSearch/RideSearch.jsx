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
import { searchRides, getRideById } from '../../services/rideService';
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
  const text = typeof value === 'string' ? value : value?.formatted || value?.name || '';
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return /\bindia\b/i.test(cleaned) ? cleaned : `${cleaned}, India`;
};

const normalizeLocationInput = (value) => {
  if (typeof value === 'string') return value;
  return value?.formatted || value?.name || '';
};

const extractLocationCoordinates = (place) => {
  if (!place || typeof place !== 'object') return null;
  const lat = place.lat ?? place.latitude ?? place.location?.lat ?? place.location?.latitude ?? null;
  const lng = place.lng ?? place.longitude ?? place.location?.lng ?? place.location?.longitude ?? null;
  if (lat == null || lng == null) return null;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
  return { lat: parsedLat, lng: parsedLng };
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
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
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
function EmptyResults({ start, end, onClear, onBrowseAll }) {
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
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1">
          Try a new search
        </button>
        <button onClick={() => onBrowseAll?.()}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1">
          <Icon name="Globe" size="sm" />
          Browse all rides across India
        </button>
      </div>
    </div>
  );
}

// ─── Pre-search placeholder ───────────────────────────────────────────────────
function SearchPrompt({ onBrowseAll }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon name="Search" size="lg" className="text-blue-400" />
      </div>
      <p className="font-semibold text-gray-800 text-base mb-1">Search for available rides</p>
      <p className="text-sm text-gray-500 mb-5">Enter your origin and destination above to find rides going your way.</p>
      <button
        type="button"
        onClick={() => onBrowseAll?.()}
        className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1"
      >
        <Icon name="Globe" size="sm" />
        Browse all rides across India
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function RideSearch() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchCardRef = useRef(null);
  const startRef = useRef(null);

  // Search inputs
  const [start, setStart] = useState(searchParams.get('start') || '');
  const [end, setEnd] = useState(searchParams.get('end') || '');
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [startPlace, setStartPlace] = useState(null);
  const [endPlace, setEndPlace] = useState(null);

  // Results — Smart Search tiers (Step 3: 12 backend match tiers collapsed
  // into 4 display buckets, per the Ranking Spec's real tier order)
  //   exactRides       <- matchTier 1-3  (exact both / exact dest / exact pickup)
  //   onWayRides       <- matchTier 12   (connector — route-verified or heuristic)
  //   nearbyRides      <- matchTier 4-9  (state-region match, then radius match)
  //   negotiableRides  <- matchTier 11   (negotiable fare, last resort)
  const [exactRides, setExactRides] = useState([]);
  const [onWayRides, setOnWayRides] = useState([]);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [negotiableRides, setNegotiableRides] = useState([]);
  const [allRides, setAllRides] = useState([]); // all combined for map
  const [searchMeta, setSearchMeta] = useState(null); // pagination + tier counts from backend

  // Step 4 — catch-all section ("See all rides across India"). Deliberately
  // separate state from the 4 ranked buckets above: never merged into
  // exact/onWay/nearby/negotiable, and only fetched when the user opts in
  // by clicking the reveal button (searchMeta.catchAllAvailableCount tells
  // us up front whether that button is worth showing).
  const [catchAllRides, setCatchAllRides] = useState([]);
  const [catchAllMeta, setCatchAllMeta] = useState(null);
  const [showCatchAll, setShowCatchAll] = useState(false);
  const [catchAllLoading, setCatchAllLoading] = useState(false);

  const [globalRides, setGlobalRides] = useState([]);
  const [globalMeta, setGlobalMeta] = useState(null);
  const [showGlobalRides, setShowGlobalRides] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFirstRideFree, setIsFirstRideFree] = useState(false);

  // Map state
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);
  const [rideRoutes, setRideRoutes] = useState([]);
  const [selectedRideId, setSelected] = useState(searchParams.get('selectedRideId') || null);

  const selectRide = useCallback((rideId) => {
    setSelected(rideId);
    const params = new URLSearchParams(searchParams);
    if (rideId) {
      params.set('selectedRideId', rideId);
    } else {
      params.delete('selectedRideId');
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

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
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    if (startParam && endParam) {
      // Check for a snapshot from Home so we can show the same list instantly
      try {
        const snapRaw = sessionStorage.getItem('SMR_home_rides_snapshot');
        if (snapRaw) {
          const snap = JSON.parse(snapRaw);
          if (snap && Array.isArray(snap.rides) && snap.rides.length > 0) {
            const ridesList = snap.rides;
            const selected = searchParams.get('selectedRideId');
            const matchesParams = () => {
              if (selected) return ridesList.some(r => r._id === selected);
              const first = ridesList[0];
              return first && first.start === startParam && first.end === endParam;
            };
            if (matchesParams()) {
              setExactRides(ridesList);
              setOnWayRides([]);
              setNearbyRides([]);
              setNegotiableRides([]);
              setAllRides(ridesList);
              setSearchMeta(null);
              setHasSearched(true);
              const connectedIds = new Set(ridesList.map(r => r._id));
              setRideRoutes(buildMapData(ridesList, connectedIds));
              const first = ridesList[0];
              setStartMarker(first?.pickupCoordinates || first?.routeCoordinates?.[0] || null);
              setEndMarker(first?.dropCoordinates || first?.routeCoordinates?.[first?.routeCoordinates?.length - 1] || null);
              sessionStorage.removeItem('SMR_home_rides_snapshot');
              return;
            }
          }
        }
      } catch (err) {
        // Fall back to normal search
        console.warn('[RideSearch] failed to restore snapshot', err);
      }

      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRideId || isLoading) return;
    const timeout = setTimeout(() => {
      const el = document.getElementById(`ride-card-${selectedRideId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 180);
    return () => clearTimeout(timeout);
  }, [selectedRideId, isLoading, allRides.length, globalRides.length, catchAllRides.length, showGlobalRides, showCatchAll]);

  useEffect(() => {
    let active = true;
    async function loadSelectedRide() {
      if (!selectedRideId) return;
      if (allRides.some(r => r._id === selectedRideId)) return;
      setIsLoading(true);
      try {
        const ride = await getRideById(selectedRideId);
        if (!active || !ride) return;
        setExactRides([ride]);
        setOnWayRides([]);
        setNearbyRides([]);
        setNegotiableRides([]);
        setAllRides([ride]);
        setSearchMeta(null);
        setHasSearched(true);
        setRideRoutes(buildMapData([ride], new Set([ride._id])));
        setStartMarker(ride.pickupCoordinates || ride.routeCoordinates?.[0] || null);
        setEndMarker(ride.dropCoordinates || ride.routeCoordinates?.[ride.routeCoordinates?.length - 1] || null);
      } catch (error) {
        console.warn('[RideSearch] Could not load selected ride:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadSelectedRide();
    return () => { active = false; };
  }, [selectedRideId, allRides, isLoading]);

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
  // Backend tier table (Ranking Spec — Final, as rebuilt in Step 2 of the
  // Smart Search Ranking work — see PROGRESS.md for the full old→new tier
  // renumbering history):
  //   1  exact          — pickup exact AND destination exact
  //   2  exact_dest     — destination exact, pickup different
  //   3  exact_pickup   — pickup exact, destination different
  //   4  both_state     — origin state AND destination state both match
  //   5  dest_state     — destination state matches only
  //   6  pickup_state   — pickup state matches only
  //   7  both_near      — pickup AND destination both within radius
  //   8  dest_near      — destination within radius only
  //   9  pickup_near    — pickup within radius only
  //   11 negotiation    — last-resort, negotiable fare only
  //   12 connector     — on the driver's route (route-verified or heuristic)
  //
  // UI buckets group these 11 backend tiers into the 4 sections the page
  // already renders:
  //   exact (1-3)  → "Rides covering your route" (best matches)
  //   onWay (4)    → "Rides passing through your region" (connector)
  //   nearby (5-10)→ "Other rides in this area" (region/radius match)
  //   negotiable (11) → "Fare is negotiable on these rides" (last resort)
  //
  // Prefers the numeric `matchTier` (Step 2+). Falls back to the legacy
  // `matchType` string for any older cached response shape (e.g. a stale
  // service-worker cache from before this rebuild).
  function categorizeResults(results) {
    const exact = [];
    const onWay = [];
    const nearby = [];
    const negotiable = [];

    results.forEach(ride => {
      const tier = ride.matchTier;
      if (typeof tier === 'number') {
        if (tier >= 1 && tier <= 3) exact.push(ride);
        else if (tier === 12) onWay.push(ride);
        else if (tier >= 4 && tier <= 9) nearby.push(ride);
        else if (tier === 11) negotiable.push(ride);
        else nearby.push(ride);
        return;
      }
      // Legacy fallback (no matchTier present — pre-Step-2 cached response)
      const mt = ride.matchType;
      if (mt === 'exact' || mt === 'exact_dest' || mt === 'exact_pickup' || mt === 'exact_reversed' || mt === 'on_route') {
        exact.push(ride);
      } else if (mt === 'connector' || mt === 'partial' || mt === 'waypoint' || mt === 'nearby_route') {
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

    const startText = normalizeLocationInput(start);
    const endText = normalizeLocationInput(end);
    if (!startText.trim() || !endText.trim()) {
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
    setCatchAllRides([]); setCatchAllMeta(null); setShowCatchAll(false);

    const loadingId = silent ? null : toast.loading('Searching rides…', {
      style: { background: '#2563eb', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '16px' },
    });

    try {
      const startCoords = extractLocationCoordinates(startPlace);
      const endCoords = extractLocationCoordinates(endPlace);
      const { rides: results, meta } = await searchRides(
        normalizeIndiaLocation(start),
        normalizeIndiaLocation(end),
        date || null,
        {
          pickupLat: startCoords?.lat,
          pickupLng: startCoords?.lng,
          destLat: endCoords?.lat,
          destLng: endCoords?.lng,
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
      if (startCoords) {
        setStartMarker(startCoords);
      } else if (exact[0]?.pickupCoordinates) {
        setStartMarker(exact[0].pickupCoordinates);
      } else if (filtered[0]?.routeCoordinates?.length) {
        setStartMarker(filtered[0].routeCoordinates[0]);
      }

      if (endCoords) {
        setEndMarker(endCoords);
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

  // ── Step 4: load the catch-all ("See all rides across India") section ────
  // Deliberately a separate network call from handleSearch, only fired when
  // the user opts in — never bundled into the ranked search automatically.
  //
  // ⚠️ Integration note: this assumes `rideService.searchRides()` passes the
  // API response's `catchAll` field through untouched (alongside the
  // `rides`/`meta` fields it already returns). If `rideService.js` only
  // destructures `{ data: rides, meta }` from the response and drops other
  // top-level keys, `response.catchAll` below will come back `undefined`
  // and this will no-op with a console warning rather than fail silently.
  // That's a one-line fix in `rideService.js` if needed — flagged here
  // since that file wasn't available to update directly in this pass.
  const handleLoadCatchAll = async (targetPage = 1) => {
    setCatchAllLoading(true);
    setShowGlobalRides(false);
    try {
      const startCoords = extractLocationCoordinates(startPlace);
      const endCoords = extractLocationCoordinates(endPlace);
      const response = await searchRides(
        normalizeIndiaLocation(start),
        normalizeIndiaLocation(end),
        date || null,
        {
          pickupLat: startCoords?.lat,
          pickupLng: startCoords?.lng,
          destLat: endCoords?.lat,
          destLng: endCoords?.lng,
          originState: startPlace?.state,
          destState: endPlace?.state,
          includeCatchAll: 'true',
          catchAllPage: targetPage,
        }
      );

      const catchAll = response?.catchAll;
      if (!catchAll) {
        console.warn(
          '[RideSearch] Expected `catchAll` on the search response but got none — ' +
          'rideService.searchRides() likely needs to pass that field through from the API response.'
        );
        toast.error("Couldn't load rides across India right now.");
        return;
      }

      setCatchAllRides(prev => (targetPage === 1 ? catchAll.data : [...prev, ...catchAll.data]));
      setCatchAllMeta(catchAll.meta);
      setShowCatchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load rides across India right now.");
    } finally {
      setCatchAllLoading(false);
    }
  };

  const handleLoadGlobalRides = async (targetPage = 1) => {
    setGlobalLoading(true);
    setHasSearched(true);
    setShowCatchAll(false);
    setCatchAllRides([]);
    setCatchAllMeta(null);
    setShowGlobalRides(false);
    setSearchMeta(null);

    try {
      const response = await searchRides('', '', null, {
        globalAllRides: 'true',
        page: targetPage,
        limit: 20,
      });

      const { rides: data, meta } = response;
      setGlobalRides(prev => (targetPage === 1 ? data : [...prev, ...data]));
      setAllRides(prev => (targetPage === 1 ? data : [...prev, ...data]));
      setGlobalMeta(meta);
      setShowGlobalRides(true);

      setTimeout(() => {
        document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load all rides right now.");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleClear = () => {
    setStart(''); setEnd(''); setDate('');
    setStartPlace(null); setEndPlace(null);
    setExactRides([]); setOnWayRides([]); setNearbyRides([]); setNegotiableRides([]); setAllRides([]);
    setRideRoutes([]); setStartMarker(null); setEndMarker(null);
    setSearchMeta(null);
    setCatchAllRides([]); setCatchAllMeta(null); setShowCatchAll(false); setCatchAllLoading(false);
    setGlobalRides([]); setGlobalMeta(null); setShowGlobalRides(false); setGlobalLoading(false);
    setHasSearched(false);
    setSelected(null);
    setMinSeats(''); setMaxFare(''); setVehicleType('');
    setAcOnly(false); setWomenOnly(false); setVerifiedOnly(false);
    setShowFilters(false);
    const params = new URLSearchParams(searchParams);
    params.delete('selectedRideId');
    setSearchParams(params, { replace: true });
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
                    onChange={(val) => {
                      setStart(typeof val === 'string' ? val : val?.name || '');
                      setStartPlace(typeof val === 'string' ? null : val);
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
                    onChange={(val) => {
                      setEnd(typeof val === 'string' ? val : val?.name || '');
                      setEndPlace(typeof val === 'string' ? null : val);
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
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 rounded"
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
                        className="text-xs text-red-600 font-semibold hover:text-red-700 self-end col-span-full sm:col-auto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 rounded">
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !normalizeLocationInput(start).trim() || !normalizeLocationInput(end).trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1"
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

              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => handleLoadGlobalRides(1)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1"
                >
                  <Icon name="Globe" size="sm" />
                  Browse all rides across India
                </button>
              </div>

              {hasSearched && (
                <div className="mt-3 text-center">
                  <button type="button" onClick={handleClear}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1">
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
              selectRide(ride._id);
              document.getElementById(`ride-card-${ride._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            hasSearched={hasSearched}
          />
        </div>

        {/* Results */}
        <div id="search-results">
          {selectedRideId && (
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">Selected ride</p>
                <p className="text-sm font-semibold text-gray-900">We’ve prefilled the route and opened the matching ride for you.</p>
              </div>
              <button
                type="button"
                onClick={() => selectRide(null)}
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                View all rides
              </button>
            </div>
          )}

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
          {!isLoading && hasSearched && allRides.length === 0 && !showGlobalRides && (
            <EmptyResults start={start} end={end} onClear={handleClear} onBrowseAll={handleLoadGlobalRides} />
          )}

          {/* Pre-search */}
          {!isLoading && !hasSearched && <SearchPrompt onBrowseAll={handleLoadGlobalRides} />}

          {/* ── TIER 1-3: Exact matches ── */}
          {!isLoading && !showGlobalRides && exactRides.length > 0 && (
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

          {/* ── TIER 12: Connector — on-the-way rides ── */}
          {!isLoading && !showGlobalRides && onWayRides.length > 0 && (
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
                      autoOpenDetails={ride._id === selectedRideId}
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

          {/* ── TIER 4-9: Nearby (region + radius) rides ── */}
          {!isLoading && !showGlobalRides && nearbyRides.length > 0 && (
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

          {/* ── TIER 11: Negotiation-possible rides (last resort) ── */}
          {!isLoading && !showGlobalRides && negotiableRides.length > 0 && (
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
                      autoOpenDetails={ride._id === selectedRideId}
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

          {/* ── Step 4: tier-10 catch-all — "See all rides across India" ──
              Deliberately its own section, visually separated with a divider,
              never mixed into the ranked exact/onWay/nearby/negotiable
              buckets above. Reveal-on-click: nothing here is fetched until
              the user asks for it. */}
          {!isLoading && hasSearched && !showCatchAll && (searchMeta?.catchAllAvailableCount ?? 0) > 0 && (
            <div className="mb-8 pt-6 border-t border-dashed border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-3">
                Not finding what you need? There {searchMeta.catchAllAvailableCount === 1 ? 'is' : 'are'}{' '}
                <span className="font-semibold text-gray-700">{searchMeta.catchAllAvailableCount}</span>{' '}
                more ride{searchMeta.catchAllAvailableCount !== 1 ? 's' : ''} active across India right now.
              </p>
              <button
                type="button"
                onClick={() => handleLoadCatchAll(1)}
                disabled={catchAllLoading}
                className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1"
              >
                {catchAllLoading ? (
                  <Icon name="Loader2" size="sm" className="animate-spin" />
                ) : (
                  <Icon name="Globe" size="sm" />
                )}
                See all rides across India
              </button>
            </div>
          )}

          {!isLoading && showCatchAll && (
            <div className="mb-8 pt-6 border-t border-dashed border-gray-200">
              <SectionHeader
                eyebrow="Everywhere else"
                title="All rides across India"
                subtitle={`${catchAllMeta?.total ?? catchAllRides.length} active ride${(catchAllMeta?.total ?? catchAllRides.length) !== 1 ? 's' : ''} — not matched to your route, shown separately`}
                badge="Unfiltered"
                badgeColor="gray"
              />

              {catchAllRides.length === 0 && !catchAllLoading && (
                <p className="text-sm text-gray-400 text-center py-6">No other active rides right now.</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {catchAllRides.map(ride => (
                  <div key={ride._id} id={`ride-card-${ride._id}`} className={`relative transition-all duration-200 ${selectedRideId === ride._id ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-2xl' : ''}`}>
                    <RideCard
                      ride={ride}
                      isFirstRideFree={isFirstRideFree}
                      autoOpenDetails={ride._id === selectedRideId}
                      onBookingSuccess={() => {
                        setIsFirstRideFree(false);
                        handleSearch(null, { silent: true });
                      }}
                    />
                  </div>
                ))}
              </div>

              {catchAllMeta && catchAllMeta.page < catchAllMeta.totalPages && (
                <div className="text-center mt-5">
                  <button
                    type="button"
                    onClick={() => handleLoadCatchAll(catchAllMeta.page + 1)}
                    disabled={catchAllLoading}
                    className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1"
                  >
                    {catchAllLoading ? <Icon name="Loader2" size="sm" className="animate-spin" /> : null}
                    Load more
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowCatchAll(false)}
                className="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 rounded"
              >
                Hide this section
              </button>
            </div>
          )}

          {!isLoading && showGlobalRides && (
            <div className="mb-8 pt-6 border-t border-dashed border-gray-200">
              <SectionHeader
                eyebrow="Global browse"
                title="All active rides across India"
                subtitle={`${globalMeta?.total ?? globalRides.length} active ride${(globalMeta?.total ?? globalRides.length) !== 1 ? 's' : ''}`}
                badge="Global"
                badgeColor="blue"
              />

              {globalRides.length === 0 && !globalLoading && (
                <p className="text-sm text-gray-400 text-center py-6">No active rides available right now.</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {globalRides.map(ride => (
                  <div key={ride._id} id={`ride-card-${ride._id}`} className={`relative transition-all duration-200 ${selectedRideId === ride._id ? 'ring-2 ring-blue-500 ring-offset-2 rounded-2xl' : ''}`}>
                    <RideCard
                      ride={ride}
                      isFirstRideFree={isFirstRideFree}
                      autoOpenDetails={ride._id === selectedRideId}
                      onBookingSuccess={() => {
                        setIsFirstRideFree(false);
                        handleSearch(null, { silent: true });
                      }}
                    />
                  </div>
                ))}
              </div>

              {globalMeta && globalMeta.page < globalMeta.totalPages && (
                <div className="text-center mt-5">
                  <button
                    type="button"
                    onClick={() => handleLoadGlobalRides(globalMeta.page + 1)}
                    disabled={globalLoading}
                    className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1"
                  >
                    {globalLoading ? <Icon name="Loader2" size="sm" className="animate-spin" /> : null}
                    Load more rides
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGlobalRides(false)}
                className="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 rounded"
              >
                Hide this section
              </button>
            </div>
          )}

          {/* Pagination footer (Smart Search Milestone 1) */}
          {!isLoading && !showGlobalRides && searchMeta?.totalPages > 1 && (
            <p className="text-xs text-gray-400 text-center mt-2 mb-4">
              Showing page {searchMeta.page} of {searchMeta.totalPages} ({searchMeta.total} total matching rides)
            </p>
          )}
          {!isLoading && showGlobalRides && globalMeta?.totalPages > 1 && (
            <p className="text-xs text-gray-400 text-center mt-2 mb-4">
              Showing page {globalMeta.page} of {globalMeta.totalPages} ({globalMeta.total} total rides)
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