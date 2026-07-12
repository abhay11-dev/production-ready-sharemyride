const normalizeRegionKey = (region) => String(region || '').toLowerCase().trim();

const STATE_ADJACENCY = {
  'andhra pradesh': ['telangana', 'tamil nadu', 'karnataka', 'odisha'],
  'arunachal pradesh': ['assam', 'nagaland'],
  'assam': ['arunachal pradesh', 'nagaland', 'manipur', 'mizoram', 'meghalaya', 'sikkim', 'west bengal'],
  'bihar': ['uttar pradesh', 'jharkhand', 'west bengal'],
  'chhattisgarh': ['madhya pradesh', 'maharashtra', 'telangana', 'odisha', 'jharkhand', 'uttar pradesh'],
  'goa': ['maharashtra', 'karnataka'],
  'gujarat': ['rajasthan', 'madhya pradesh', 'maharashtra', 'dadra and nagar haveli and daman and diu'],
  'haryana': ['punjab', 'rajasthan', 'uttar pradesh', 'delhi'],
  'himachal pradesh': ['jammu and kashmir', 'punjab', 'haryana', 'uttarakhand'],
  'jharkhand': ['bihar', 'west bengal', 'odisha', 'chhattisgarh'],
  'karnataka': ['goa', 'maharashtra', 'telangana', 'andhra pradesh', 'tamil nadu', 'kerala'],
  'kerala': ['karnataka', 'tamil nadu'],
  'madhya pradesh': ['rajasthan', 'uttar pradesh', 'chhattisgarh', 'maharashtra', 'gujarat'],
  'maharashtra': ['gujarat', 'madhya pradesh', 'chhattisgarh', 'telangana', 'karnataka', 'goa'],
  'odisha': ['chhattisgarh', 'jharkhand', 'west bengal', 'andhra pradesh'],
  'punjab': ['jammu and kashmir', 'himachal pradesh', 'haryana', 'rajasthan'],
  'rajasthan': ['punjab', 'haryana', 'uttar pradesh', 'madhya pradesh', 'gujarat', 'delhi'],
  'sikkim': ['west bengal', 'assam'],
  'tamil nadu': ['kerala', 'karnataka', 'andhra pradesh'],
  'telangana': ['maharashtra', 'chhattisgarh', 'odisha', 'andhra pradesh', 'karnataka'],
  'tripura': ['assam', 'meghalaya'],
  'uttar pradesh': ['uttarakhand', 'himachal pradesh', 'haryana', 'rajasthan', 'madhya pradesh', 'chhattisgarh', 'bihar', 'jharkhand', 'delhi'],
  'uttarakhand': ['himachal pradesh', 'uttar pradesh'],
  'west bengal': ['bihar', 'jharkhand', 'odisha', 'sikkim', 'assam'],
  'jammu and kashmir': ['himachal pradesh', 'punjab', 'ladakh'],
  'ladakh': ['jammu and kashmir', 'himachal pradesh', 'uttarakhand'],
  'delhi': ['haryana', 'uttar pradesh', 'rajasthan'],
  'dadra and nagar haveli and daman and diu': ['gujarat', 'maharashtra'],
  'chandigarh': ['punjab', 'haryana'],
  'puducherry': ['tamil nadu'],
  'andaman and nicobar islands': [],
  'lakshadweep': [],
};

const STATE_CENTROIDS = {
  'andhra pradesh': { lat: 15.9129, lng: 79.7400 },
  'arunachal pradesh': { lat: 28.2180, lng: 94.7278 },
  'assam': { lat: 26.2006, lng: 92.9376 },
  'bihar': { lat: 25.0961, lng: 85.3131 },
  'chhattisgarh': { lat: 21.2951, lng: 81.8282 },
  'goa': { lat: 15.4297, lng: 73.9070 },
  'gujarat': { lat: 22.2587, lng: 71.1924 },
  'haryana': { lat: 29.0588, lng: 76.0856 },
  'himachal pradesh': { lat: 31.1048, lng: 77.1734 },
  'jharkhand': { lat: 23.6102, lng: 85.2799 },
  'karnataka': { lat: 15.3173, lng: 75.7139 },
  'kerala': { lat: 10.8505, lng: 76.2711 },
  'madhya pradesh': { lat: 22.9734, lng: 78.6569 },
  'maharashtra': { lat: 19.7515, lng: 75.7139 },
  'odisha': { lat: 20.9517, lng: 85.0985 },
  'punjab': { lat: 31.1471, lng: 75.3412 },
  'rajasthan': { lat: 27.0238, lng: 74.2179 },
  'sikkim': { lat: 27.5330, lng: 88.5122 },
  'tamil nadu': { lat: 11.1271, lng: 78.6569 },
  'telangana': { lat: 18.1124, lng: 79.0193 },
  'tripura': { lat: 23.9408, lng: 91.9882 },
  'uttar pradesh': { lat: 26.8467, lng: 80.9462 },
  'uttarakhand': { lat: 30.0668, lng: 79.0193 },
  'west bengal': { lat: 22.9868, lng: 87.8550 },
  'jammu and kashmir': { lat: 33.7782, lng: 76.5762 },
  'ladakh': { lat: 34.2268, lng: 77.5619 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'dadra and nagar haveli and daman and diu': { lat: 20.1809, lng: 73.0169 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'puducherry': { lat: 11.9416, lng: 79.8083 },
  'andaman and nicobar islands': { lat: 11.7401, lng: 92.6586 },
  'lakshadweep': { lat: 10.5679, lng: 72.6369 },
};

const calculateDistanceKm = (pointA, pointB) => {
  if (!pointA || !pointB || pointA.lat == null || pointA.lng == null || pointB.lat == null || pointB.lng == null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLon = toRad(pointB.lng - pointA.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pointA.lat)) * Math.cos(toRad(pointB.lat)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getNeighbors = (region) => STATE_ADJACENCY[normalizeRegionKey(region)] || [];

const isNeighboringRegion = (regionA, regionB) => {
  const a = normalizeRegionKey(regionA);
  const b = normalizeRegionKey(regionB);
  if (!a || !b || a === b) return false;
  return getNeighbors(a).includes(b) || getNeighbors(b).includes(a);
};

const shortestPathCache = new Map();

const findShortestRegionPath = (fromRegion, toRegion) => {
  const source = normalizeRegionKey(fromRegion);
  const target = normalizeRegionKey(toRegion);
  if (!source || !target) return null;
  if (source === target) return [source];

  const cacheKey = `${source}|${target}`;
  if (shortestPathCache.has(cacheKey)) return shortestPathCache.get(cacheKey);

  const nodes = Object.keys(STATE_ADJACENCY);
  const distances = new Map(nodes.map((node) => [node, Infinity]));
  const previous = new Map();
  const visited = new Set();

  distances.set(source, 0);

  while (visited.size < nodes.length) {
    const current = nodes.reduce((best, node) => {
      if (visited.has(node)) return best;
      const distance = distances.get(node);
      if (distance === undefined || distance === Infinity) return best;
      return !best || distance < best.distance ? { node, distance } : best;
    }, null);

    if (!current) break;
    const { node: currentNode } = current;
    if (currentNode === target) break;

    visited.add(currentNode);
    const currentDistance = distances.get(currentNode);
    const neighbors = getNeighbors(currentNode);

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const centroidA = STATE_CENTROIDS[currentNode];
      const centroidB = STATE_CENTROIDS[neighbor];
      const edgeWeight = centroidA && centroidB
        ? calculateDistanceKm(centroidA, centroidB)
        : 1;
      const alt = currentDistance + edgeWeight;
      if (alt < distances.get(neighbor)) {
        distances.set(neighbor, alt);
        previous.set(neighbor, currentNode);
      }
    }
  }

  if (!previous.has(target)) {
    shortestPathCache.set(cacheKey, null);
    return null;
  }

  const path = [];
  let current = target;
  while (current) {
    path.unshift(current);
    current = previous.get(current);
  }

  shortestPathCache.set(cacheKey, path);
  return path;
};

module.exports = {
  findShortestRegionPath,
  isNeighboringRegion,
  normalizeRegionKey,
};
