/**
 * utils/googlePlaces.js
 * Centralized utility for Google Places Autocomplete + Place Details.
 * Replaces utils/geoapify.js.
 *
 * Uses the legacy `google.maps.places.AutocompleteService` +
 * `PlacesService` client libraries (per the migration plan's recommendation
 * to prototype with the mature, well-documented legacy API first, since it
 * has better coverage for India-wide village/POI-level results). Both
 * return data mapped into the same unified location object shape the rest
 * of the app already expects, so swapping to `AutocompleteSuggestion`
 * later is a drop-in change confined to this file.
 *
 * Requires `window.google.maps.places` to already be loaded — this file
 * never injects the <script> tag itself. See contexts/GoogleMapsContext.jsx,
 * which loads the SDK once at the app root via useJsApiLoader.
 */

// ── Result caches ────────────────────────────────────────────────────────────
// Predictions cache: keyed by normalized query text. Shared across every
// LocationAutocomplete instance (From / To / each waypoint) on the page —
// mirrors the shared cache pattern from the old geoapify.js util.
const predictionsCache = new Map();

// Place-details cache: keyed by placeId. Details for a given place don't
// change within a session, so this is safe to reuse aggressively — e.g. if
// a passenger picks the same city in both the From and To field.
const detailsCache = new Map();

const CACHE_MAX_ENTRIES = 200;

const normalizeQueryKey = (text) => text.trim().toLowerCase();

function setCache(map, key, value) {
    // Simple FIFO eviction so this can't grow unbounded on a long session.
    if (map.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = map.keys().next().value;
        map.delete(oldestKey);
    }
    map.set(key, value);
}

// ── Session token lifecycle ──────────────────────────────────────────────────
// A session token groups the whole "type → select" sequence into ONE billed
// session (all prediction requests + the one details call), instead of
// billing every keystroke and the details call separately. The caller
// (LocationAutocomplete.jsx) creates one token per typing session — on the
// first keystroke after a selection or clear — and passes it to every
// getSuggestions() call, then to the single fetchPlaceDetails() call, after
// which it's discarded. This is the single biggest cost lever in the whole
// migration — skipping it means every keystroke *and* every detail fetch
// bills as its own separate request.
export function createSessionToken() {
    if (!window.google?.maps?.places) return null;
    return new window.google.maps.places.AutocompleteSessionToken();
}

// ── Shared AutocompleteService / PlacesService singletons ──────────────────
let _autocompleteService = null;
let _placesService = null;

function getAutocompleteService() {
    if (!window.google?.maps?.places) return null;
    if (!_autocompleteService) {
        _autocompleteService = new window.google.maps.places.AutocompleteService();
    }
    return _autocompleteService;
}

function getPlacesService() {
    if (!window.google?.maps?.places) return null;
    if (!_placesService) {
        // PlacesService requires a Map instance or a DOM node — a detached
        // div works fine since it's never attached to the document or rendered.
        _placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
    return _placesService;
}

export function isGoogleMapsReady() {
    return !!window.google?.maps?.places;
}

// ── Category icon mapper (Google's types[] taxonomy) ────────────────────────
// Google's granularity differs from Geoapify's — e.g. `lodging` not `hotel`,
// `transit_station` not `railway`. Re-tune this list against real Google
// type strings if you see obviously-wrong icons during testing.
export function getCategoryIcon(types = [], name = '') {
    const t = (types || []).join(' ').toLowerCase();
    const n = (name || '').toLowerCase();

    if (t.includes('airport') || n.includes('airport')) return 'Plane';
    if (t.includes('train_station') || t.includes('transit_station') || t.includes('subway_station') || n.includes('railway') || n.includes('station')) return 'TrainFront';
    if (t.includes('bus_station') || n.includes('bus stop') || n.includes('bus stand')) return 'Bus';
    if (t.includes('hospital') || t.includes('doctor') || n.includes('hospital')) return 'Hospital';
    if (t.includes('university') || t.includes('school')) return 'GraduationCap';
    if (t.includes('lodging') || n.includes('hotel') || n.includes('inn')) return 'Bed';
    if (t.includes('shopping_mall') || t.includes('store') || t.includes('supermarket')) return 'ShoppingBag';
    if (t.includes('restaurant') || t.includes('food') || t.includes('cafe')) return 'Utensils';
    if (t.includes('locality') && !t.includes('sublocality')) return 'Building2';
    if (t.includes('sublocality') || t.includes('neighborhood')) return 'Home';
    if (t.includes('route')) return 'MapPin';
    if (t.includes('tourist_attraction') || t.includes('museum')) return 'Landmark';
    return 'MapPin';
}

// ── Parse a raw AutocompleteService prediction → unified shape ──────────────
// NOTE: predictions do NOT include coordinates (unlike Geoapify's combined
// autocomplete response). latitude/longitude stay null until
// fetchPlaceDetails() resolves on selection. See LocationAutocomplete.jsx's
// handleSelect for how the two are merged into the final object.
export function parseGooglePrediction(prediction) {
    const main = prediction.structured_formatting?.main_text || prediction.description;
    const secondary = prediction.structured_formatting?.secondary_text || '';
    const types = prediction.types || [];

    return {
        name: main,
        formatted: prediction.description,
        latitude: null,
        longitude: null,
        placeId: prediction.place_id || '',
        city: '',
        state: '',
        country: 'India',
        // Keep secondary for display — same _secondary/_icon/_type pattern
        // LocationAutocomplete.jsx already renders.
        _secondary: secondary,
        _icon: getCategoryIcon(types, main),
        _type: types[0] || '',
    };
}

// ── Extract city/state/country from address_components ─────────────────────
// Google's Place Details response uses address_components (array of
// { long_name, short_name, types[] }), not flat fields like Geoapify's
// city/state. This pulls the same fields the rest of the app expects.
function extractAddressComponents(components = []) {
    const find = (type) => components.find(c => c.types.includes(type))?.long_name || '';
    const city = find('locality') || find('administrative_area_level_2') || find('sublocality') || '';
    const state = find('administrative_area_level_1') || '';
    const country = find('country') || 'India';
    return { city, state, country };
}

// ── Get autocomplete predictions ─────────────────────────────────────────────
// componentRestrictions: { country: 'in' } is the equivalent of Geoapify's
// filter=countrycode:in.
export function getSuggestions(text, sessionToken) {
    return new Promise((resolve, reject) => {
        const cacheKey = normalizeQueryKey(text);
        const cached = predictionsCache.get(cacheKey);
        if (cached) {
            resolve(cached);
            return;
        }

        const service = getAutocompleteService();
        if (!service) {
            reject(new Error('Google Maps has not finished loading yet.'));
            return;
        }

        service.getPlacePredictions(
            {
                input: text,
                sessionToken: sessionToken || undefined,
                componentRestrictions: { country: 'in' },
            },
            (predictions, status) => {
                const places = window.google.maps.places;
                if (status === places.PlacesServiceStatus.ZERO_RESULTS) {
                    setCache(predictionsCache, cacheKey, []);
                    resolve([]);
                    return;
                }
                if (status !== places.PlacesServiceStatus.OK || !predictions) {
                    reject(new Error(`Places autocomplete error: ${status}`));
                    return;
                }
                setCache(predictionsCache, cacheKey, predictions);
                resolve(predictions);
            }
        );
    });
}

// ── Get place details (resolves lat/lng + address components) ──────────────
// Uses the same sessionToken passed to getSuggestions() for this typing
// sequence, then the caller should discard the token — this is what closes
// out the billed session as exactly one unit.
export function fetchPlaceDetails(placeId, sessionToken) {
    return new Promise((resolve, reject) => {
        const cached = detailsCache.get(placeId);
        if (cached) {
            resolve(cached);
            return;
        }

        const service = getPlacesService();
        if (!service) {
            reject(new Error('Google Maps has not finished loading yet.'));
            return;
        }

        service.getDetails(
            {
                placeId,
                sessionToken: sessionToken || undefined,
                fields: ['name', 'formatted_address', 'geometry', 'address_components', 'types'],
            },
            (place, status) => {
                const places = window.google.maps.places;
                if (status !== places.PlacesServiceStatus.OK || !place) {
                    reject(new Error(`Place details error: ${status}`));
                    return;
                }

                const { city, state, country } = extractAddressComponents(place.address_components);
                const result = {
                    latitude: place.geometry?.location?.lat?.() ?? null,
                    longitude: place.geometry?.location?.lng?.() ?? null,
                    formatted: place.formatted_address || '',
                    city,
                    state,
                    country,
                    _icon: getCategoryIcon(place.types, place.name),
                    _type: (place.types && place.types[0]) || '',
                };
                setCache(detailsCache, placeId, result);
                resolve(result);
            }
        );
    });
}