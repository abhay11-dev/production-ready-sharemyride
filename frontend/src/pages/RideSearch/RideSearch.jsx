import React, { useState } from 'react';
import RideCard from '../../components/ride/RideCard';
import { searchRides } from '../../services/rideService';

function RideSearch() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [rides, setRides] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchSuggestion, setSearchSuggestion] = useState('');

  // Normalize text for better matching (lowercase, remove extra spaces, handle common typos)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s]/g, ''); // Remove special characters
  };

  // Calculate similarity between two strings (Levenshtein distance approximation)
  const calculateSimilarity = (str1, str2) => {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Simple character overlap check
    const set1 = new Set(s1.split(''));
    const set2 = new Set(s2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  };

  // Fuzzy match rides based on start and end locations
  const fuzzyMatchRides = (allRides, searchStart, searchEnd) => {
    return allRides.map(ride => {
      const startSimilarity = calculateSimilarity(ride.start, searchStart);
      const endSimilarity = calculateSimilarity(ride.end, searchEnd);
      const avgSimilarity = (startSimilarity + endSimilarity) / 2;
      
      return {
        ...ride,
        matchScore: avgSimilarity
      };
    })
    .filter(ride => ride.matchScore > 0.4) // Keep rides with >40% match
    .sort((a, b) => b.matchScore - a.matchScore); // Sort by best match first
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setHasSearched(true);
    setSearchSuggestion('');
    
    try {
      // First try exact search
      const results = await searchRides(start, end);
      
      if (results && results.length > 0) {
        // Apply fuzzy matching to results
        const fuzzyResults = fuzzyMatchRides(results, start, end);
        setRides(fuzzyResults);
        
        // Show suggestion if best match isn't perfect
        if (fuzzyResults.length > 0 && fuzzyResults[0].matchScore < 0.95) {
          setSearchSuggestion(`Showing results similar to "${start}" → "${end}"`);
        }
      } else {
        // If no results, try broader search by splitting search terms
        const startWords = normalizeText(start).split(' ');
        const endWords = normalizeText(end).split(' ');
        
        // Try searching with individual words
        let broadResults = [];
        for (const word of startWords) {
          if (word.length > 2) {
            try {
              const partialResults = await searchRides(word, end);
              if (partialResults) broadResults = [...broadResults, ...partialResults];
            } catch (err) {
              // Continue to next word
            }
          }
        }
        
        if (broadResults.length > 0) {
          const uniqueResults = Array.from(new Set(broadResults.map(r => r._id)))
            .map(id => broadResults.find(r => r._id === id));
          const fuzzyResults = fuzzyMatchRides(uniqueResults, start, end);
          setRides(fuzzyResults);
          setSearchSuggestion(`No exact matches found. Showing similar rides.`);
        } else {
          setRides([]);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Search failed. Please try different locations.');
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setStart('');
    setEnd('');
    setRides([]);
    setHasSearched(false);
    setError('');
    setSearchSuggestion('');
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-blue-50 to-purple-50 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Search Rides</h2>
            <p className="text-gray-600 text-base sm:text-lg">Find the perfect ride for your journey</p>
          </div>

          <form onSubmit={handleSearch} className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 md:p-8 mb-8 sm:mb-10">
            <div className="flex flex-col md:flex-row gap-4">
              
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  From
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Starting location (e.g., Ludhiana, Delhi)"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full border border-gray-300 pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Don't worry about spelling - we'll find the best matches!</p>
              </div>

              <div className="hidden md:flex items-end pb-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  To
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Destination (e.g., Chandigarh, Mumbai)"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full border border-gray-300 pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Case insensitive search - type freely!</p>
              </div>

              <div className="flex items-end gap-2">
  <button
    type="submit"
    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 sm:px-10 py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base
               hover:from-blue-700 hover:to-blue-600 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200
               disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none "
    disabled={isLoading}
  >
    {isLoading ? (
      <>
        <svg
          className="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span className="hidden sm:inline">Searching...</span>
        <span className="sm:hidden">...</span>
      </>
    ) : (
      <>
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span>Search</span>
      </>
    )}
  </button>


                {hasSearched && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="md:hidden p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    disabled={isLoading}
                    title="Clear search"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {hasSearched && (
              <div className="hidden md:flex justify-center mt-4">
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors duration-200"
                  disabled={isLoading}
                >
                  Clear search
                </button>
              </div>
            )}
          </form>

          {searchSuggestion && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl mb-6 sm:mb-8 flex items-start sm:items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 sm:mt-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-sm sm:text-base">{searchSuggestion}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl mb-6 sm:mb-8 flex items-start sm:items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 sm:mt-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-sm sm:text-base">{error}</span>
            </div>
          )}

          {hasSearched && (
            <>
              {rides.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Available Rides
                    </h3>
                    <span className="bg-blue-100 text-blue-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm w-fit">
                      {rides.length} {rides.length === 1 ? 'ride' : 'rides'} found
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-3 sm:space-y-4">
                {rides.map((ride, index) => (
                  <div key={ride._id || ride.id || index} className="relative">
                    <RideCard ride={ride} />
                    {ride.matchScore && ride.matchScore < 0.9 && ride.matchScore >= 0.7 && (
                      <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold">
                        Similar Match
                      </div>
                    )}
                    {ride.matchScore && ride.matchScore >= 0.9 && (
                      <div className="absolute top-2 left-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                        ✓ Perfect Match
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!isLoading && rides.length === 0 && (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">No rides found</h3>
                  <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                    We couldn't find any rides matching your search.
                  </p>
                  <div className="space-y-2 text-xs sm:text-sm text-gray-500">
                    <p>✓ Try using different city names</p>
                    <p>✓ Check your spelling (we're pretty flexible though!)</p>
                    <p>✓ Try nearby cities or broader locations</p>
                    <p>✓ Check back later for new rides</p>
                  </div>
                </div>
              )}
            </>
          )}

          {!hasSearched && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">Ready to find your ride?</h3>
              <p className="text-gray-600 text-sm sm:text-base mb-4">
                Enter your starting point and destination above to search for available rides.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-green-800 font-semibold mb-2">🎯 Smart Search Features:</p>
                <div className="space-y-1 text-xs text-green-700">
                  <p>✓ Case insensitive - type in any case</p>
                  <p>✓ Flexible spelling - small typos are okay</p>
                  <p>✓ Partial matches - finds similar locations</p>
                  <p>✓ Smart suggestions - best matches first</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RideSearch;