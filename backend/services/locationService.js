const axios = require('axios');
const { buildLocationMatchKey, levenshteinDistance } = require('./utils/locationNormalize.js');

const normalizeMatchText = (value) => {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/[,_-]/g, ' ')
    .replace(/[\s]+/g, ' ')
    .trim();
};

const scoreLocationMatch = (normalizedText, normalizedQuery) => {
  if (!normalizedQuery) return 100;
  if (!normalizedText) return 0;
  if (normalizedText === normalizedQuery) return 100;
  if (normalizedText.startsWith(normalizedQuery)) return 95;
  if (normalizedText.includes(` ${normalizedQuery}`)) return 85;
  if (normalizedText.includes(normalizedQuery)) return 75;

  const tokens = normalizedText.split(' ');
  for (const token of tokens) {
    if (token.startsWith(normalizedQuery)) return 70;
    if (normalizedQuery.startsWith(token)) return 65;
    const distance = levenshteinDistance(token, normalizedQuery);
    if (distance <= 1 && Math.abs(token.length - normalizedQuery.length) <= 1) return 65;
    if (distance <= 2 && normalizedQuery.length >= 4) return 50;
  }

  if (normalizedText.startsWith(normalizedQuery.slice(0, 2))) return 55;
  return 0;
};

class LocationService {
  getCategoryIcon(type, category) {
    const t = (type || '').toLowerCase();
    const c = (category || '').toLowerCase();
    
    if (c === 'aeroway' || t.includes('airport')) return 'Plane';
    if (c === 'railway' || t.includes('station')) return 'TrainFront';
    if (c === 'highway' && t === 'bus_stop') return 'Bus';
    if (c === 'amenity' && t === 'hospital') return 'Hospital';
    if (c === 'amenity' && (t === 'university' || t === 'school' || t === 'college')) return 'GraduationCap';
    if (c === 'tourism' && t === 'hotel') return 'Bed';
    if (c === 'shop' || c === 'commercial') return 'ShoppingBag';
    if (c === 'amenity' && (t === 'restaurant' || t === 'cafe' || t === 'fast_food')) return 'Utensils';
    if (c === 'place' && (t === 'city' || t === 'town' || t === 'municipality')) return 'Building2';
    if (c === 'place' && (t === 'suburb' || t === 'neighbourhood' || t === 'village')) return 'Home';
    if (c === 'highway') return 'MapPin';
    if (c === 'tourism' && t === 'museum') return 'Landmark';
    return 'MapPin';
  }

  async searchLocation(query) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'jsonv2',
          addressdetails: 1,
          limit: 20,
          countrycodes: 'in' // Limit to India to align with previous app config
        },
        headers: {
          'User-Agent': 'ShareMyRide/1.0 (sharemyride.contact@gmail.com)'
        }
      });

      const normalizedQuery = buildLocationMatchKey(query);
      const seenPlaceIds = new Set();

      const scored = response.data
        .map((item, index) => {
          const city = item.address?.city || item.address?.town || item.address?.village || '';
          const state = item.address?.state || '';
          const country = item.address?.country || 'India';
          const displayType = item.type ? item.type.replace(/_/g, ' ') : '';
          const name = item.name || item.display_name.split(',')[0] || item.display_name;
          const label = item.display_name || name;
          const normalizedName = buildLocationMatchKey(name);
          const normalizedLabel = buildLocationMatchKey(label);
          const score = Math.max(
            scoreLocationMatch(normalizedName, normalizedQuery),
            scoreLocationMatch(normalizedLabel, normalizedQuery)
          );

          return {
            id: item.place_id ? item.place_id.toString() : `${name}-${index}`,
            placeId: item.place_id ? item.place_id.toString() : `${name}-${index}`,
            label,
            name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            formatted: label,
            city,
            state,
            country,
            _secondary: label,
            _icon: this.getCategoryIcon(item.type, item.category),
            _type: displayType,
            score,
            originalIndex: index,
          };
        })
        .filter(item => item.latitude && item.longitude)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.originalIndex - b.originalIndex;
        });

      const unique = [];
      for (const item of scored) {
        if (seenPlaceIds.has(item.placeId)) continue;
        seenPlaceIds.add(item.placeId);
        unique.push(item);
        if (unique.length >= 10) break;
      }

      return unique.map(({ normalizedName, normalizedLabel, score, originalIndex, ...rest }) => rest);
    } catch (error) {
      console.error('Nominatim API Error:', error.message);
      throw new Error('Failed to fetch location data');
    }
  }
}

module.exports = new LocationService();
