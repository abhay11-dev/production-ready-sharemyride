// services/utils/locationNormalize.js
//
// Step 5 of the Smart Search Ranking work — normalization, aliases, and
// typo tolerance for free-text location matching (audit findings #11-13).
//
// Scope/intent, so future sessions don't have to re-derive it:
//   - This module is for MATCHING two location strings against each other
//     (e.g. "did the passenger's typed pickup match this ride's stored
//     start?"), NOT for the text sent to a geocoder. Geocoding raw,
//     lightly-normalized addresses (with commas, house numbers, etc.
//     intact) generally works *better* with real-world geocoders than an
//     aggressively stripped/typo-corrected string would — so
//     `buildLocationMatchKey` here is intentionally more aggressive
//     (strips punctuation, corrects likely typos) than
//     `normalizeIndianAddress` in routeMatching.js, which stays
//     conservative and only gets alias expansion (see the integration
//     notes in that file).
//   - Typo correction only touches individual tokens ≥4 characters, and
//     only replaces a token when there's a single unambiguous
//     closest-match within the distance threshold — this is deliberately
//     conservative to avoid "correcting" a real, unusual place name into
//     the wrong nearby word.

// ─── Alias table ──────────────────────────────────────────────────────────
// Each group's LAST entry is the canonical form everything else resolves
// to. Per audit finding #11: Bangalore↔Bengaluru, Bombay↔Mumbai,
// Calcutta↔Kolkata, Trivandrum↔Thiruvananthapuram. Structured as an array
// of groups so adding a new alias pair later is a one-line change.
//
// Also includes Mysore↔Mysuru, Mangalore↔Mangaluru, and
// Allahabad↔Prayagraj — same category of official-renamed-city pairs as
// the four originally named in the findings; added for consistency since
// all six old/new spellings were already sitting in MAJOR_LOCATIONS below
// (used for typo correction) without being cross-resolved as aliases.
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

// ─── Typo-correction dictionary ──────────────────────────────────────────
// Curated, not exhaustive — major Indian metros/state capitals plus every
// alias variant above (both old and canonical forms, so a typo of either
// "bangalore" or "bengaluru" can still be corrected before alias
// resolution runs). Extend this list as real search-typo patterns show up
// in production; it does not need to be complete to be useful.
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

// ─── Levenshtein distance (standard DP, no external deps) ────────────────
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
        currRow[j - 1] + 1,      // insertion
        prevRow[j] + 1,          // deletion
        prevRow[j - 1] + cost    // substitution
      );
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
};

// Distance budget scales gently with word length — short words need to be
// near-exact to avoid false corrections, longer words can tolerate a
// slightly bigger typo (e.g. "banglore" -> "bangalore", distance 1).
const distanceBudgetFor = (len) => (len <= 5 ? 1 : len <= 9 ? 2 : 3);

// ─── Text normalization ───────────────────────────────────────────────────
// Strips hyphens/punctuation and collapses whitespace before matching.
// (audit finding #13 — previously only whitespace trimming existed).
const normalizeMatchText = (value) => {
  const text = String(value || '').toLowerCase();
  return text
    .replace(/[-_]/g, ' ')       // hyphens/underscores -> space
    .replace(/[^\w\s]/g, ' ')   // strip remaining punctuation (commas, periods, etc.)
    .replace(/\s+/g, ' ')
    .trim();
};

// Corrects individual tokens against the known-locations dictionary when
// there's a single unambiguous closest match within the distance budget.
// Tokens under 4 characters are left alone (too easy to false-positive on:
// e.g. "pune" vs a 3-letter typo of something else entirely).
const correctTypos = (normalizedText, dictionary = KNOWN_LOCATIONS) => {
  if (!normalizedText) return normalizedText;
  const tokens = normalizedText.split(' ');

  const corrected = tokens.map((token) => {
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
  });

  return corrected.join(' ');
};

// Resolves alias variants to their canonical form, token by token.
const applyAliases = (normalizedText) => {
  if (!normalizedText) return normalizedText;
  return normalizedText
    .split(' ')
    .map((token) => ALIAS_TO_CANONICAL[token] || token)
    .join(' ');
};

// ─── Public entry point ───────────────────────────────────────────────────
// Full pipeline: normalize punctuation/whitespace -> correct likely typos
// -> resolve aliases to canonical form. Typo correction runs before alias
// resolution so "banglore" (typo of bangalore) gets corrected to
// "bangalore" first, then resolved to the canonical "bengaluru".
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