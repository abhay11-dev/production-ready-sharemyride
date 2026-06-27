/**
 * LocationAutocomplete.jsx
 * Core reusable autocomplete component powered by Geoapify.
 * Covers: cities, towns, villages, roads, bus stops, railway stations,
 * airports, colleges, hospitals, hotels, shops, businesses, landmarks, POIs.
 *
 * Usage:
 *   <LocationAutocomplete
 *     value={location}          // { name, latitude, longitude, formatted, placeId, city, state, country }
 *     onChange={setLocation}    // receives full location object on select
 *     placeholder="Enter pickup"
 *     label="Pickup"
 *     icon="pickup"             // "pickup" | "destination" | "search"
 *     error={errorMsg}
 *     disabled={false}
 *     autoFocus={false}
 *   />
 */

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const GEOAPIFY_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 10;

// Types that cover the full range of Indian location types requested
const RESULT_TYPES = [
    'city', 'town', 'village', 'locality', 'suburb', 'district',
    'street', 'amenity', 'building', 'postcode',
].join(',');

// ─── Category icon mapper ─────────────────────────────────────────────────────
function getCategoryIcon(result) {
    const cat = (result.properties?.categories || []).join(' ').toLowerCase();
    const type = (result.properties?.result_type || '').toLowerCase();
    const name = (result.properties?.name || '').toLowerCase();

    if (cat.includes('airport') || name.includes('airport')) return '✈️';
    if (cat.includes('railway') || cat.includes('train') || name.includes('railway') || name.includes('station')) return '🚉';
    if (cat.includes('bus') || name.includes('bus stop') || name.includes('bus stand')) return '🚌';
    if (cat.includes('hospital') || cat.includes('clinic') || name.includes('hospital')) return '🏥';
    if (cat.includes('college') || cat.includes('university') || cat.includes('school')) return '🎓';
    if (cat.includes('hotel') || name.includes('hotel') || name.includes('inn')) return '🏨';
    if (cat.includes('shop') || cat.includes('mall') || cat.includes('market')) return '🛍️';
    if (cat.includes('restaurant') || cat.includes('food')) return '🍽️';
    if (type === 'city' || type === 'town') return '🏙️';
    if (type === 'village' || type === 'locality' || type === 'suburb') return '🏘️';
    if (type === 'street') return '🛣️';
    if (cat.includes('tourism') || cat.includes('attraction')) return '🏛️';
    return '📍';
}

// ─── Parse Geoapify feature → unified location object ─────────────────────────
function parseFeature(feature) {
    const p = feature.properties || {};
    const parts = [];
    if (p.name) parts.push(p.name);
    if (p.street && p.name !== p.street) parts.push(p.street);
    if (p.suburb && !parts.some(x => x === p.suburb)) parts.push(p.suburb);
    if (p.city && !parts.some(x => x === p.city)) parts.push(p.city);
    if (p.state) parts.push(p.state);

    const displayName = parts.length ? parts.join(', ') : (p.formatted || 'Unknown location');

    return {
        name: displayName,
        formatted: p.formatted || displayName,
        latitude: feature.geometry?.coordinates?.[1] ?? null,
        longitude: feature.geometry?.coordinates?.[0] ?? null,
        placeId: p.place_id || '',
        city: p.city || p.town || p.village || '',
        state: p.state || '',
        country: p.country || 'India',
        // Keep secondary for display
        _secondary: [p.city, p.state].filter(Boolean).join(', '),
        _icon: getCategoryIcon(feature),
        _type: p.result_type || '',
    };
}

// ─── Highlight matching text ──────────────────────────────────────────────────
function HighlightMatch({ text, query }) {
    if (!query || !text) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, idx)}
            <mark className="bg-blue-100 text-blue-800 font-semibold rounded-sm">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </span>
    );
}

// ─── Pickup / Destination / Search icons ─────────────────────────────────────
function InputIcon({ type }) {
    if (type === 'pickup') return (
        <span className="flex items-center justify-center w-5 h-5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-blue-300 shadow-sm" />
        </span>
    );
    if (type === 'destination') return (
        <span className="flex items-center justify-center w-5 h-5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500 border-2 border-green-300 shadow-sm" />
        </span>
    );
    // search
    return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

// ─── Clear button ─────────────────────────────────────────────────────────────
function ClearButton({ onClear }) {
    return (
        <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={onClear}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex-shrink-0"
            aria-label="Clear"
        >
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    );
}

// ─── Suggestion row ───────────────────────────────────────────────────────────
function SuggestionRow({ suggestion, query, isActive, onSelect, onMouseEnter }) {
    return (
        <li
            role="option"
            aria-selected={isActive}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={onMouseEnter}
            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-100
        ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
        >
            <span className="text-base flex-shrink-0 mt-0.5 select-none">{suggestion._icon}</span>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                    <HighlightMatch text={suggestion.name} query={query} />
                </p>
                {suggestion._secondary && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{suggestion._secondary}</p>
                )}
            </div>
            {suggestion._type && (
                <span className="flex-shrink-0 mt-0.5 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                    {suggestion._type}
                </span>
            )}
        </li>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const LocationAutocomplete = forwardRef(function LocationAutocomplete(
    {
        value,
        onChange,
        placeholder = 'Search location…',
        label,
        icon = 'search',
        error,
        disabled = false,
        autoFocus = false,
        className = '',
        inputClassName = '',
        required = false,
        id,
    },
    ref
) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [apiError, setApiError] = useState(null);
    const [hasSelected, setHasSelected] = useState(false);

    const inputRef = useRef(null);
    const listRef = useRef(null);
    const debounceTimer = useRef(null);
    const abortController = useRef(null);
    const containerRef = useRef(null);

    // Expose focus() to parent
    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        clear: () => handleClear(),
    }));

    // Sync display when value changes externally
    useEffect(() => {
        if (value?.name) {
            setQuery(value.name);
            setHasSelected(true);
        } else {
            setQuery('');
            setHasSelected(false);
        }
    }, [value?.placeId]);

    // Click-outside to close
    useEffect(() => {
        function handleOutsideClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setActiveIndex(-1);
                // If user typed but didn't select, reset to previous value
                if (!hasSelected && value?.name) {
                    setQuery(value.name);
                }
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [hasSelected, value?.name]);

    // ── Fetch suggestions ─────────────────────────────────────────────────────
    const fetchSuggestions = useCallback(async (text) => {
        if (!text || text.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        // Cancel previous request
        if (abortController.current) abortController.current.abort();
        abortController.current = new AbortController();

        setIsLoading(true);
        setApiError(null);

        try {
            const params = new URLSearchParams({
                text,
                apiKey: API_KEY,
                filter: 'countrycode:in',
                limit: String(MAX_RESULTS),
                type: RESULT_TYPES,
                lang: 'en',
                format: 'geojson',
            });

            const res = await fetch(`${GEOAPIFY_URL}?${params}`, {
                signal: abortController.current.signal,
            });

            if (!res.ok) throw new Error(`Geoapify error: ${res.status}`);

            const data = await res.json();
            const features = data?.features || [];
            const parsed = features.map(parseFeature);
            setSuggestions(parsed);
            setIsOpen(parsed.length > 0);
            setActiveIndex(-1);
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('[LocationAutocomplete] Fetch error:', err);
            setApiError('Could not load suggestions. Check your connection.');
            setSuggestions([]);
            setIsOpen(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Input change ──────────────────────────────────────────────────────────
    const handleInputChange = (e) => {
        const text = e.target.value;
        setQuery(text);
        setHasSelected(false);

        // If cleared, notify parent
        if (!text) {
            onChange(null);
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        // Debounce
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchSuggestions(text), DEBOUNCE_MS);
    };

    // ── Select suggestion ─────────────────────────────────────────────────────
    const handleSelect = useCallback((suggestion) => {
        setQuery(suggestion.name);
        setHasSelected(true);
        setIsOpen(false);
        setSuggestions([]);
        setActiveIndex(-1);
        onChange(suggestion);
    }, [onChange]);

    // ── Clear ─────────────────────────────────────────────────────────────────
    const handleClear = () => {
        setQuery('');
        setHasSelected(false);
        setSuggestions([]);
        setIsOpen(false);
        onChange(null);
        inputRef.current?.focus();
    };

    // ── Keyboard navigation ───────────────────────────────────────────────────
    const handleKeyDown = (e) => {
        if (!isOpen && e.key !== 'Escape') return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(i => {
                    const next = i < suggestions.length - 1 ? i + 1 : 0;
                    scrollActiveIntoView(next);
                    return next;
                });
                break;

            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(i => {
                    const next = i > 0 ? i - 1 : suggestions.length - 1;
                    scrollActiveIntoView(next);
                    return next;
                });
                break;

            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && suggestions[activeIndex]) {
                    handleSelect(suggestions[activeIndex]);
                }
                break;

            case 'Escape':
                setIsOpen(false);
                setActiveIndex(-1);
                inputRef.current?.blur();
                break;

            case 'Tab':
                setIsOpen(false);
                setActiveIndex(-1);
                break;

            default:
                break;
        }
    };

    const scrollActiveIntoView = (index) => {
        if (!listRef.current) return;
        const items = listRef.current.querySelectorAll('[role="option"]');
        items[index]?.scrollIntoView({ block: 'nearest' });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const inputId = id || `loc-autocomplete-${Math.random().toString(36).slice(2)}`;
    const listId = `${inputId}-list`;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Label */}
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
                >
                    {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}

            {/* Input wrapper */}
            <div
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 bg-gray-50
          transition-all duration-150
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
          ${error
                        ? 'border-red-300 focus-within:border-red-400 focus-within:bg-white'
                        : isOpen || (hasSelected && value)
                            ? 'border-blue-400 bg-white shadow-sm shadow-blue-100'
                            : 'border-gray-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-sm focus-within:shadow-blue-100'
                    }
          ${inputClassName}
        `}
            >
                {/* Left icon */}
                <span className="flex-shrink-0">
                    <InputIcon type={icon} />
                </span>

                {/* Text input */}
                <input
                    ref={inputRef}
                    id={inputId}
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? listId : undefined}
                    aria-activedescendant={activeIndex >= 0 ? `${listId}-item-${activeIndex}` : undefined}
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0 && !hasSelected) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    required={required}
                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none min-w-0
            disabled:cursor-not-allowed"
                />

                {/* Right: spinner | clear */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isLoading && (
                        <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    {query && !isLoading && !disabled && (
                        <ClearButton onClear={handleClear} />
                    )}
                    {hasSelected && value && !isLoading && !disabled && (
                        <span title="Location confirmed" className="text-green-500">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </span>
                    )}
                </div>
            </div>

            {/* Error message */}
            {error && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}

            {/* API error */}
            {apiError && !error && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {apiError}
                </p>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute left-0 right-0 top-full mt-1.5 z-50
            bg-white rounded-xl border border-gray-200 shadow-xl shadow-gray-200/60
            overflow-hidden"
                    style={{ maxHeight: '320px' }}
                >
                    {/* Scrollable list */}
                    <ul
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        aria-label="Location suggestions"
                        className="overflow-y-auto divide-y divide-gray-50"
                        style={{ maxHeight: '280px' }}
                    >
                        {suggestions.length === 0 && !isLoading ? (
                            <li className="px-4 py-8 text-center">
                                <p className="text-sm text-gray-500">No locations found for "{query}"</p>
                                <p className="text-xs text-gray-400 mt-1">Try a nearby landmark or city name</p>
                            </li>
                        ) : (
                            suggestions.map((s, i) => (
                                <SuggestionRow
                                    key={s.placeId || i}
                                    suggestion={s}
                                    query={query}
                                    isActive={i === activeIndex}
                                    onSelect={handleSelect}
                                    onMouseEnter={() => setActiveIndex(i)}
                                />
                            ))
                        )}
                    </ul>

                    {/* Footer hint */}
                    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                            ↑↓ navigate · Enter select · Esc close
                        </span>
                        <span className="text-[10px] text-gray-400">
                            Powered by Geoapify
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default LocationAutocomplete;