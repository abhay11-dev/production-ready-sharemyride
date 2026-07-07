const axios = require('axios');

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
          limit: 10,
          countrycodes: 'in' // Limit to India to align with previous app config
        },
        headers: {
          'User-Agent': 'ShareMyRide/1.0 (sharemyride.contact@gmail.com)'
        }
      });

      return response.data.map(item => {
        const city = item.address?.city || item.address?.town || item.address?.village || '';
        const state = item.address?.state || '';
        const country = item.address?.country || 'India';
        
        // Extract type for display
        const displayType = item.type ? item.type.replace(/_/g, ' ') : '';
        
        return {
          id: item.place_id.toString(),
          placeId: item.place_id.toString(), // Kept for backwards compatibility on frontend
          label: item.display_name,
          name: item.name || item.display_name.split(',')[0],
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          formatted: item.display_name,
          city,
          state,
          country,
          _secondary: item.display_name, // secondary text for UI
          _icon: this.getCategoryIcon(item.type, item.category),
          _type: displayType
        };
      });
    } catch (error) {
      console.error('Nominatim API Error:', error.message);
      throw new Error('Failed to fetch location data');
    }
  }
}

module.exports = new LocationService();
