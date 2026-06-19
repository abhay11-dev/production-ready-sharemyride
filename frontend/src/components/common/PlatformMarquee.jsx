import React, { useMemo } from 'react';

/**
 * Professional business-focused animated marquee/banner
 * Displays marketing messages about trust, savings, community, safety, and ride-sharing
 * with subtle car-travel animation effect
 */
export default function PlatformMarquee({ stats }) {
  const messages = useMemo(() => [
    { icon: '🛡️', text: 'Verified drivers, safe rides — every trip audited by the platform' },
    { icon: '💰', text: `Join ${stats?.totalUsers ? `${stats.totalUsers.toLocaleString('en-IN')} members` : 'millions'} saving up to 60% on commute costs` },
    { icon: '🌍', text: `Active across ${stats?.totalCities || 'major'} Indian cities · expanding daily` },
    { icon: '⭐', text: `Rated ${stats?.averageRating?.toFixed(1) || '4.8'}/5 by passengers · trusted by the community` },
    { icon: '🚗', text: 'Every shared ride removes one car from the road · cleaner air, better cities' },
    { icon: '🤝', text: 'Real commuters, real connections · build your trusted circle' },
  ], [stats]);

  // Repeat messages for seamless loop
  const repeatedMessages = useMemo(() => [...messages, ...messages], [messages]);

  return (
    <div className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 py-3 overflow-hidden relative">
      {/* Animated gradient background effect */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      </div>

      {/* Marquee container */}
      <div className="relative overflow-hidden">
        <div className="flex gap-8">
          {/* First set of messages */}
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {repeatedMessages.map((msg, idx) => (
              <div
                key={`first-${idx}`}
                className="flex items-center gap-2 px-4 py-1 text-sm font-medium text-white/90 hover:text-white transition-colors flex-shrink-0"
              >
                <span className="text-lg">{msg.icon}</span>
                <span>{msg.text}</span>
                <span className="text-white/30 mx-2">•</span>
              </div>
            ))}
          </div>

          {/* Seamless loop - second set */}
          <div className="flex gap-8 animate-marquee whitespace-nowrap" style={{ animationDelay: '0s' }}>
            {repeatedMessages.map((msg, idx) => (
              <div
                key={`second-${idx}`}
                className="flex items-center gap-2 px-4 py-1 text-sm font-medium text-white/90 hover:text-white transition-colors flex-shrink-0"
              >
                <span className="text-lg">{msg.icon}</span>
                <span>{msg.text}</span>
                <span className="text-white/30 mx-2">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Car animation indicator (subtle, bottom-left) */}
      <div className="absolute bottom-1 left-4 flex items-center gap-1 text-white/40 text-xs pointer-events-none">
        <svg className="w-3 h-3 animate-bounce" style={{ animationDelay: '0s' }} fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
        </svg>
      </div>

      {/* Gradient fade effect at edges */}
      <div className="absolute top-0 left-0 w-12 h-full bg-gradient-to-r from-blue-700 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-blue-500 to-transparent pointer-events-none" />

      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: marquee 60s linear infinite;
        }

        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
