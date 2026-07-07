/**
 * utils/geoapify.js
 * Centralized utility for Geoapify API calls.
 */

const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const GEOAPIFY_AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';

if (!API_KEY) {
    console.error('CRITICAL: VITE_GEOAPIFY_API_KEY is missing from environment variables. Location search will not work.');
}

export const getGeoapifyKey = () => {
    const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (!key) {
        console.error('CRITICAL: VITE_GEOAPIFY_API_KEY is undefined at runtime.');
        return null;
    }
    // Defensive trim — guards against a stray quote/whitespace slipping into
    // the env value from certain shells/CI secret managers.
    return key.trim();
};

// Module-level cache shared by every LocationAutocomplete instance on the
// page (From / To / each waypoint). Keeps repeated or overlapping queries
// (e.g. typing "Delhi" in both the From and To field) from hitting the
// network twice, and survives across a component's re-renders.
const resultCache = new Map();
const CACHE_MAX_ENTRIES = 200;

const normalizeQueryKey = (text) => text.trim().toLowerCase();

const setCache = (key, value) => {
    // Simple FIFO eviction so this can't grow unbounded on a long session.
    if (resultCache.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = resultCache.keys().next().value;
        resultCache.delete(oldestKey);
    }
    resultCache.set(key, value);
};

export const getCachedLocationResult = (text) => {
    if (!text) return null;
    return resultCache.get(normalizeQueryKey(text)) || null;
};

export const searchLocations = async (query, abortSignal) => {
    const key = getGeoapifyKey();
    if (!key) {
        throw new Error('API key is missing.');
    }

    const cacheKey = normalizeQueryKey(query);
    const cached = resultCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
        text: query,
        apiKey: key,
        filter: 'countrycode:in',
        bias: 'countrycode:in',
        limit: '15',
        format: 'json',
        lang: 'en'
    });

    const url = `${GEOAPIFY_AUTOCOMPLETE_URL}?${params.toString()}`;

    try {
        const response = await fetch(url, { signal: abortSignal });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[Geoapify API Error]', {
                url,
                status: response.status,
                body: errorBody,
                apiKeyLength: key.length,
                envExists: !!import.meta.env.VITE_GEOAPIFY_API_KEY
            });
            throw new Error(`Geoapify error: ${response.status}`);
        }

        const data = await response.json();
        setCache(cacheKey, data);
        return data;
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('[Geoapify Fetch Exception]', {
                url,
                error: error.message,
                apiKeyLength: key.length,
                envExists: !!import.meta.env.VITE_GEOAPIFY_API_KEY
            });
        }
        throw error;
    }
};