/**
 * LocationAutocomplete.jsx
 * Core reusable autocomplete component — now powered by our custom backend Nominatim endpoint
 */

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from 'react';
import api from '../../config/api';
import Icon from '../ui/Icon';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEBOUNCE_MS = 300; // As requested
const MIN_QUERY_LENGTH = 2; // As requested

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
    return <Icon name="Search" size="sm" className="text-gray-400" />;
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
            <Icon name="X" size="xs" className="text-gray-500" strokeWidth={2.5} />
        </button>
    );
}

// ─── Suggestion row ───────────────────────────────────────────────────────────
function SuggestionRow({ suggestion, query, isActive, isResolving, onSelect, onMouseEnter }) {
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
            <Icon name={suggestion._icon || 'MapPin'} size="sm" className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                    <HighlightMatch text={suggestion.name} query={query} />
                </p>
                {suggestion._secondary && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{suggestion._secondary}</p>
                )}
            </div>
            {isResolving ? (
                <Icon name="Loader2" size="sm" className="text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
            ) : suggestion._type && (
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
    const containerRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Expose focus() to parent
    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        clear: () => handleClear(),
    }));

    // Sync display when value changes externally
    useEffect(() => {
        if (typeof value === 'string') {
            setQuery(value);
            setHasSelected(false);
        } else if (value?.name) {
            setQuery(value.name);
            setHasSelected(true);
        } else {
            setQuery('');
            setHasSelected(false);
        }
    }, [value]);

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
        if (!text || text.length < MIN_QUERY_LENGTH) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        setApiError(null);

        // Cancel previous request if typing quickly
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const response = await api.get('/location/search', {
                params: { q: text },
                signal: abortControllerRef.current.signal
            });

            const uniqueParsed = [];
            const seenIds = new Set();

            for (const item of response.data) {
                const itemId = item.placeId || item.id || item.name;
                if (!itemId || seenIds.has(itemId)) continue;
                seenIds.add(itemId);
                uniqueParsed.push(item);
            }

            setSuggestions(uniqueParsed);
            setIsOpen(uniqueParsed.length > 0);
            setActiveIndex(-1);
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                setApiError('Could not load suggestions. Check your connection.');
                setSuggestions([]);
                setIsOpen(false);
            }
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
            clearTimeout(debounceTimer.current);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
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
        setActiveIndex(-1);

        // Directly pass suggestion as our new backend provides latitude/longitude in the search response
        onChange(suggestion);
    }, [onChange]);

    // ── Clear ─────────────────────────────────────────────────────────────────
    const handleClear = () => {
        setQuery('');
        setHasSelected(false);
        setSuggestions([]);
        setIsOpen(false);
        onChange(null);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
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
                        <Icon name="Loader2" size="sm" className="text-blue-500 animate-spin" />
                    )}
                    {query && !isLoading && !disabled && (
                        <ClearButton onClear={handleClear} />
                    )}
                    {hasSelected && value && !isLoading && !disabled && (
                        <span title="Location confirmed" className="text-green-500">
                            <Icon name="CheckCircle" size="sm" />
                        </span>
                    )}
                </div>
            </div>

            {/* Error message */}
            {error && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <Icon name="AlertCircle" size="xs" />
                    {error}
                </p>
            )}

            {/* API / load error */}
            {apiError && !error && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <Icon name="AlertTriangle" size="xs" />
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
                                    isResolving={false}
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
                            Search by OpenStreetMap
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default LocationAutocomplete;