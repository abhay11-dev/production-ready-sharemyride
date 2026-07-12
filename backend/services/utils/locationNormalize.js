// services/utils/locationNormalize.js
// Same helper type mapping used by frontend location normalization.

const ALIAS_GROUPS = [
  ['bangalore', 'bengaluru'],
  ['bombay', 'mumbai'],
  ['calcutta', 'kolkata'],
  ['trivandrum', 'thiruvananthapuram'],
  ['mysore', 'mysuru'],
  ['mangalore', 'mangaluru'],
  ['allahabad', 'prayagraj'],
  ['gurgaon', 'gurugram'],
];

const ALIAS_TO_CANONICAL = {};
for (const group of ALIAS_GROUPS) {
  const canonical = group[group.length - 1];
  for (const variant of group) {
    ALIAS_TO_CANONICAL[variant] = canonical;
  }
}

const MAJOR_LOCATIONS = [
  'mumbai', 'delhi', 'bengaluru', 'hyderabad', 'ahmedabad', 'chennai',
  'kolkata', 'surat', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur',
  'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna', 'vadodara',
  'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
  'rajkot', 'varanasi', 'srinagar', 'amritsar', 'allahabad', 'prayagraj',
  'ranchi', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur',
  'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh', 'thiruvananthapuram',
  'mysuru', 'mysore', 'mangaluru', 'mangalore', 'noida', 'gurugram', 'gurgaon',
  'bhubaneswar', 'dehradun', 'shimla', 'panaji', 'imphal', 'shillong',
  'aizawl', 'kohima', 'itanagar', 'gangtok', 'agartala', 'puducherry',
];

const KNOWN_LOCATIONS = new Set([
  ...MAJOR_LOCATIONS,
  ...Object.keys(ALIAS_TO_CANONICAL),
  ...Object.values(ALIAS_TO_CANONICAL),
]);

const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,
        prevRow[j] + 1,
        prevRow[j - 1] + cost
      );
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
};

const distanceBudgetFor = (len) => (len <= 5 ? 1 : len <= 9 ? 2 : 3);

const normalizeMatchText = (value) => {
  const text = String(value || '').toLowerCase();
  return text
    .replace(/[-_]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const correctTypos = (normalizedText, dictionary = KNOWN_LOCATIONS) => {
  if (!normalizedText) return normalizedText;
  const tokens = normalizedText.split(' ');

  return tokens.map((token) => {
    if (token.length < 4 || dictionary.has(token)) return token;

    let bestMatch = null;
    let bestDistance = Infinity;
    let ambiguous = false;

    for (const known of dictionary) {
      const distance = levenshteinDistance(token, known);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = known;
        ambiguous = false;
      } else if (distance === bestDistance && known !== bestMatch) {
        ambiguous = true;
      }
    }

    const budget = distanceBudgetFor(token.length);
    if (bestMatch && bestDistance > 0 && bestDistance <= budget && !ambiguous) {
      return bestMatch;
    }
    return token;
  }).join(' ');
};

const applyAliases = (normalizedText) => {
  if (!normalizedText) return normalizedText;
  return normalizedText
    .split(' ')
    .map((token) => ALIAS_TO_CANONICAL[token] || token)
    .join(' ');
};

const buildLocationMatchKey = (value) => {
  const normalized = normalizeMatchText(value);
  const typoCorrected = correctTypos(normalized);
  return applyAliases(typoCorrected);
};

module.exports = {
  normalizeMatchText,
  correctTypos,
  applyAliases,
  buildLocationMatchKey,
  levenshteinDistance,
  ALIAS_TO_CANONICAL,
  ALIAS_GROUPS,
  KNOWN_LOCATIONS,
};