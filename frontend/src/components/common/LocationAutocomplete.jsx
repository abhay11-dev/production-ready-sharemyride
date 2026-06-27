// src/components/common/LocationAutocomplete.jsx
//
// Industry-grade Indian location autocomplete — city, village, street, landmark, PG level.
// API: OLA Maps Places Autocomplete + Place Details
//       → https://maps.olakrutrim.com/docs/places-api
//
// Features
//  • Debounced autocomplete (220ms) — no flicker, no rate-limit burn
//  • Prefix-match ranking: "ab" → all "ab*" results first, then fallback broader
//  • India-biased (location=20.5937,78.9629&radius=2000000 covers entire India)
//  • Session tokens — OLA bills per session, not per keystroke
//  • Keyboard navigation (↑ ↓ Enter Esc)
//  • Accessible (role=combobox, aria-activedescendant, aria-expanded)
//  • Place detail resolution → { address, lat, lng, placeId, types[] }
//  • Error fallback: if OLA fails → graceful "type to search" experience
//  • Zero external deps beyond React
//
// Environment variable required:
//   VITE_OLA_MAPS_API_KEY=your_key_here
//
// Usage:
//   <LocationAutocomplete
//     value={start}
//     onChange={setStart}
//     onPlaceSelect={(place) => setStartPlace(place)}  // { address, lat, lng }
//     placeholder="e.g. Phagwara, Punjab"
//     icon="origin"   // "origin" | "destination" | "waypoint"
//     error={errors.start}
//     disabled={false}
//     inputRef={startInputRef}
//   />

import React, {
    useState, useEffect, useRef, useCallback, useId,
} from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
const OLA_KEY = import.meta.env.VITE_OLA_MAPS_API_KEY || '';
const AUTOCOMPLETE = 'https://api.olamaps.io/places/v1/autocomplete';
const PLACE_DETAIL = 'https://api.olamaps.io/places/v1/details';
const DEBOUNCE_MS = 220;
const MIN_CHARS = 2;
// India center + radius covers J&K to Kanyakumari, Gujarat to Arunachal
const INDIA_BIAS = 'location=20.5937,78.9629&radius=2000000';

// ─── Category icons — show next to each suggestion ───────────────────────────
function typeIcon(types = []) {
    if (!types.length) return '📍';
    const t = types[0];
    if (/airport/.test(t)) return '✈️';
    if (/train|railway/.test(t)) return '🚂';
    if (/bus/.test(t)) return '🚌';
    if (/hospital|clinic/.test(t)) return '🏥';
    if (/school|university|college/.test(t)) return '🎓';
    if (/hotel|lodging/.test(t)) return '🏨';
    if (/restaurant|food/.test(t)) return '🍽️';
    if (/mall|shopping/.test(t)) return '🛍️';
    if (/park|garden/.test(t)) return '🌳';
    if (/temple|church|mosque|religious/.test(t)) return '🛕';
    if (/locality|sublocality/.test(t)) return '🏘️';
    if (/administrative_area/.test(t)) return '🏙️';
    if (/route|street/.test(t)) return '🛣️';
    if (/premise|establishment/.test(t)) return '🏢';
    return '📍';
}

// ─── Secondary line — shows city + state if available ────────────────────────
function secondaryLine(prediction) {
    const terms = prediction.terms || [];
    // terms: [main, area, city, state, country] — take last 2 before "India"
    const noIndia = terms.filter(t => !/^india$/i.test(t.value));
    if (noIndia.length >= 2) {
        return noIndia.slice(-2).map(t => t.value).join(', ');
    }
    return prediction.structured_formatting?.secondary_text || '';
}

// ─── Highlight matched text ───────────────────────────────────────────────────
function HighlightMatch({ text = '', query = '' }) {
    if (!query.trim() || !text) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, idx)}
            <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5 not-italic font-semibold">
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </span>
    );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <svg
            className="animate-spin w-4 h-4 text-blue-400"
            fill="none" viewBox="0 0 24 24"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

// ─── Origin / destination / waypoint pin icons ────────────────────────────────
function InputIcon({ type }) {
    if (type === 'origin') {
        return (
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        );
    }
    if (type === 'destination') {
        return (
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        );
    }
    // waypoint
    return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
    );
}

// ─── Session token — reuse per session, reset after selection ─────────────────
let _sessionToken = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
function newSession() { _sessionToken = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2); }

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function LocationAutocomplete({
    value = '',
    onChange,
    onPlaceSelect,
    placeholder = 'Search location in India…',
    icon = 'origin',
    error,
    disabled = false,
    inputRef: externalRef,
    className = '',
    label,
    required,
    hint,
}) {
    const uid = useId();
    const internalRef = useRef(null);
    const inputEl = externalRef || internalRef;
    const dropdownRef = useRef(null);
    const debounceTimer = useRef(null);

    const [query, setQuery] = useState(value);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [selectedPlace, setSelected] = useState(null); // confirmed place

    // Sync external value → internal query when parent resets
    useEffect(() => {
        if (value !== query) setQuery(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // ── Fetch predictions ─────────────────────────────────────────────────────
    const fetchPredictions = useCallback(async (input) => {
        if (!input || input.length < MIN_CHARS) {
            setPredictions([]);
            setOpen(false);
            return;
        }

        if (!OLA_KEY) {
            // No key: show a graceful no-op (user can still type freeform)
            setPredictions([]);
            return;
        }

        setLoading(true);
        try {
            const url =
                `${AUTOCOMPLETE}` +
                `?input=${encodeURIComponent(input)}` +
                `&${INDIA_BIAS}` +
                `&sessiontoken=${_sessionToken}` +
                `&language=en` +
                `&api_key=${OLA_KEY}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.predictions?.length) {
                // Sort: prefix matches first, then rest
                const lc = input.toLowerCase();
                const sorted = [...data.predictions].sort((a, b) => {
                    const aMain = (a.structured_formatting?.main_text || a.description || '').toLowerCase();
                    const bMain = (b.structured_formatting?.main_text || b.description || '').toLowerCase();
                    const aStarts = aMain.startsWith(lc) ? 0 : 1;
                    const bStarts = bMain.startsWith(lc) ? 0 : 1;
                    return aStarts - bStarts;
                });
                setPredictions(sorted.slice(0, 8)); // cap at 8
                setOpen(true);
                setActiveIdx(-1);
            } else {
                setPredictions([]);
                setOpen(false);
            }
        } catch {
            setPredictions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Input change — debounced ───────────────────────────────────────────────
    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        onChange?.(val);
        setSelected(null); // clear confirmed selection
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchPredictions(val), DEBOUNCE_MS);
    };

    // ── Resolve place details (lat/lng) ───────────────────────────────────────
    const resolvePlaceDetail = useCallback(async (placeId, description) => {
        if (!OLA_KEY || !placeId) {
            // No detail API — return address only
            onPlaceSelect?.({ address: description, lat: null, lng: null, placeId: null });
            return;
        }
        try {
            const url =
                `${PLACE_DETAIL}` +
                `?place_id=${placeId}` +
                `&sessiontoken=${_sessionToken}` +
                `&api_key=${OLA_KEY}`;

            const res = await fetch(url);
            const data = await res.json();
            const loc = data.result?.geometry?.location;
            onPlaceSelect?.({
                address: data.result?.formatted_address || description,
                lat: loc?.lat ?? null,
                lng: loc?.lng ?? null,
                placeId,
                types: data.result?.types || [],
            });
        } catch {
            onPlaceSelect?.({ address: description, lat: null, lng: null, placeId });
        } finally {
            newSession(); // start fresh billing session after selection
        }
    }, [onPlaceSelect]);

    // ── Select a prediction ───────────────────────────────────────────────────
    const selectPrediction = useCallback((pred) => {
        const text = pred.description || pred.structured_formatting?.main_text || '';
        setQuery(text);
        onChange?.(text);
        setSelected(pred);
        setPredictions([]);
        setOpen(false);
        setActiveIdx(-1);
        resolvePlaceDetail(pred.place_id, text);
    }, [onChange, resolvePlaceDetail]);

    // ── Keyboard navigation ───────────────────────────────────────────────────
    const handleKeyDown = (e) => {
        if (!open || !predictions.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, predictions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIdx >= 0 && predictions[activeIdx]) {
                selectPrediction(predictions[activeIdx]);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
            setActiveIdx(-1);
        }
    };

    // ── Scroll active item into view ──────────────────────────────────────────
    useEffect(() => {
        if (activeIdx < 0 || !dropdownRef.current) return;
        const item = dropdownRef.current.querySelector(`[data-idx="${activeIdx}"]`);
        item?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    // ── Close on outside click ────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (
                !dropdownRef.current?.contains(e.target) &&
                !inputEl.current?.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [inputEl]);

    // ── Input border/bg classes ───────────────────────────────────────────────
    const inputBorder = error
        ? 'border-red-400 bg-red-50 focus:ring-red-400'
        : 'border-gray-300 bg-white focus:ring-blue-500 focus:border-blue-500';

    const listboxId = `${uid}-listbox`;

    return (
        <div className={`relative ${className}`}>
            {/* Label */}
            {label && (
                <label
                    htmlFor={uid}
                    className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}

            {/* Input wrapper */}
            <div className="relative">
                {/* Leading icon */}
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <InputIcon type={icon} />
                </span>

                <input
                    id={uid}
                    ref={inputEl}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    role="combobox"
                    aria-expanded={open}
                    aria-autocomplete="list"
                    aria-controls={listboxId}
                    aria-activedescendant={activeIdx >= 0 ? `${uid}-opt-${activeIdx}` : undefined}
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (predictions.length) setOpen(true);
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={[
                        'w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border',
                        'outline-none transition-all placeholder-gray-400',
                        'focus:ring-2',
                        inputBorder,
                        disabled ? 'opacity-50 cursor-not-allowed' : '',
                    ].join(' ')}
                />

                {/* Trailing: spinner or check */}
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {loading ? (
                        <Spinner />
                    ) : selectedPlace ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : null}
                </span>
            </div>

            {/* Hint / error */}
            {hint && !error && (
                <p className="text-xs text-gray-400 mt-1">{hint}</p>
            )}
            {error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <span>⚠</span>{error}
                </p>
            )}

            {/* Dropdown */}
            {open && predictions.length > 0 && (
                <ul
                    id={listboxId}
                    ref={dropdownRef}
                    role="listbox"
                    aria-label="Location suggestions"
                    className={[
                        'absolute z-50 left-0 right-0 mt-1.5',
                        'bg-white border border-gray-200 rounded-2xl shadow-xl',
                        'max-h-72 overflow-y-auto',
                        'py-1.5',
                    ].join(' ')}
                >
                    {predictions.map((pred, idx) => {
                        const mainText = pred.structured_formatting?.main_text || pred.description || '';
                        const secondary = secondaryLine(pred);
                        const types = pred.types || [];
                        const isActive = idx === activeIdx;

                        return (
                            <li
                                key={pred.place_id || idx}
                                id={`${uid}-opt-${idx}`}
                                data-idx={idx}
                                role="option"
                                aria-selected={isActive}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // keep focus on input
                                    selectPrediction(pred);
                                }}
                                onMouseEnter={() => setActiveIdx(idx)}
                                className={[
                                    'flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors select-none',
                                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50',
                                ].join(' ')}
                            >
                                {/* Category icon */}
                                <span className="text-base flex-shrink-0 mt-0.5" aria-hidden>
                                    {typeIcon(types)}
                                </span>

                                {/* Text block */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                                        <HighlightMatch text={mainText} query={query} />
                                    </p>
                                    {secondary && (
                                        <p className="text-xs text-gray-400 truncate mt-0.5">
                                            {secondary}
                                        </p>
                                    )}
                                </div>

                                {/* Type badge */}
                                {types[0] && (
                                    <span className="flex-shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5 hidden sm:block">
                                        {types[0].replace(/_/g, ' ')}
                                    </span>
                                )}
                            </li>
                        );
                    })}

                    {/* Powered by OLA */}
                    <li className="px-4 py-2 border-t border-gray-100 mt-1">
                        <p className="text-[10px] text-gray-300 text-right font-medium">
                            Powered by OLA Maps
                        </p>
                    </li>
                </ul>
            )}

            {/* No results with key present (after debounce) */}
            {open && !loading && query.length >= MIN_CHARS && predictions.length === 0 && OLA_KEY && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 text-center">
                    <p className="text-sm text-gray-400">No places found for "{query}"</p>
                    <p className="text-xs text-gray-300 mt-0.5">Try a broader term or check spelling</p>
                </div>
            )}
        </div>
    );
}