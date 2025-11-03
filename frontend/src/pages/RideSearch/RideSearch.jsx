import React, { useState } from 'react';
import RideCard from '../../components/ride/RideCard';
import { searchRides } from '../../services/rideService';
import toast from 'react-hot-toast';

function RideSearch() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  };

  const calculateSimilarity = (str1, str2) => {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    const set1 = new Set(s1.split(''));
    const set2 = new Set(s2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  };

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
    .filter(ride => ride.matchScore > 0.4)
    .sort((a, b) => b.matchScore - a.matchScore);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);
    
    // Show searching toast
    const searchingToast = toast.loading(
      `🔍 Searching rides from ${start} to ${end}...`,
      {
        position: 'top-center',
        style: {
          background: '#3B82F6',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      }
    );
    
    try {
      const results = await searchRides(start, end);
      
      if (results && results.length > 0) {
        const fuzzyResults = fuzzyMatchRides(results, start, end);
        setRides(fuzzyResults);
        
        // Dismiss searching toast and show success
        toast.dismiss(searchingToast);
        
        if (fuzzyResults.length > 0 && fuzzyResults[0].matchScore < 0.95) {
          toast.success(
            `Found ${fuzzyResults.length} similar ${fuzzyResults.length === 1 ? 'ride' : 'rides'}!`,
            {
              duration: 3000,
              position: 'top-center',
              icon: '✨',
              style: {
                background: '#10B981',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
                borderRadius: '12px',
              },
            }
          );
        } else {
          toast.success(
            ` Found ${fuzzyResults.length} perfect ${fuzzyResults.length === 1 ? 'match' : 'matches'}!`,
            {
              duration: 3000,
              position: 'top-center',
              style: {
                background: '#10B981',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
                borderRadius: '12px',
              },
            }
          );
        }
      } else {
        // Try broader search
        const startWords = normalizeText(start).split(' ');
        
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
          
          toast.dismiss(searchingToast);
          toast(
            `Found ${fuzzyResults.length} similar ${fuzzyResults.length === 1 ? 'ride' : 'rides'}`,
            {
              duration: 3000,
              position: 'top-center',
              icon: '💡',
              style: {
                background: '#F59E0B',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
                borderRadius: '12px',
              },
            }
          );
        } else {
          setRides([]);
          toast.dismiss(searchingToast);
          toast.error(
            `No rides found from ${start} to ${end}`,
            {
              duration: 4000,
              position: 'top-center',
              style: {
                background: '#EF4444',
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
                borderRadius: '12px',
              },
            }
          );
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.dismiss(searchingToast);
      const errorMessage = err.response?.data?.message || 'Search failed. Please try different locations.';
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      });
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
    
    toast.success('Search cleared', {
      duration: 2000,
      position: 'top-center',
      icon: '🔄',
      style: {
        background: '#6B7280',
        color: '#fff',
        fontWeight: '600',
        padding: '12px 16px',
        borderRadius: '12px',
      },
    });
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-blue-50 to-purple-50 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Search Rides</h2>
            <p className="text-gray-600 text-base sm:text-lg">Find the perfect ride for your journey</p>
          </div>

          <form onSubmit={handleSearch} className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 mb-8 sm:mb-10">
            
            {/* Input Fields and Button Row */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-end">
              
              {/* From Input */}
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
                    placeholder="Starting location"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full border border-gray-300 pl-10 sm:pl-12 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Arrow Icon */}
              <div className="hidden md:flex items-center justify-center pb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              {/* To Input */}
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
                    placeholder="Destination"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full border border-gray-300 pl-10 sm:pl-12 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Search Button */}
              <div className="md:w-auto">
                <button
                  type="submit"
                  className="w-full md:w-auto cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold text-sm sm:text-base
                             hover:from-blue-700 hover:to-blue-600 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200
                             disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none whitespace-nowrap"
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
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
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
              </div>
            </div>

            {/* Helper Text Row */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mt-2">
              <div className="flex-1">
                <p className="text-xs text-gray-500">Don't worry about spelling - we'll find the best matches!</p>
              </div>
              <div className="hidden md:block w-6"></div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Case insensitive search - type freely!</p>
              </div>
              <div className="md:w-auto md:min-w-[120px]"></div>
            </div>

            {/* Clear Search Button */}
            {hasSearched && (
              <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors duration-200"
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear search
                </button>
              </div>
            )}
          </form>

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
                  <p>✓ Case insensitive - type in any case </p>
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