import React, { useMemo } from 'react';

/**
 * Professional business-focused animated marquee/banner
 * Displays marketing messages about trust, savings, community, safety, and ride-sharing.
 * Fixed seamless loop — single track doubled internally, one animation.
 * Mobile-first: compact height & font on xs screens.
 */
export default function PlatformMarquee({ stats }) {
  const messages = useMemo(() => [
    { icon: '🛡️', text: 'Verified drivers · safe rides · every trip audited' },
    { icon: '💰', text: `${stats?.totalUsers !== undefined && stats?.totalUsers !== null ? `${stats.totalUsers.toLocaleString('en-IN')} members` : '... members'} saving up to 60% on commutes` },
    { icon: '🌍', text: `Active across ${stats?.totalCities !== undefined && stats?.totalCities !== null ? stats.totalCities : '...'} Indian cities · expanding daily` },
    { icon: '⭐', text: `Rated ${stats?.averageRating !== undefined && stats?.averageRating !== null ? stats.averageRating.toFixed(1) : '...'}/5 · trusted by the community` },
    { icon: '🚗', text: 'Every shared ride removes one car from the road' },
    { icon: '🤝', text: 'Real commuters · real connections · build your circle' },
  ], [stats]);

  // Double the array for a seamless infinite loop with a single animation
  const track = useMemo(() => [...messages, ...messages], [messages]);

  return (
    <div
      className="w-full overflow-hidden relative"
      style={{
        background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.04) 100%)',
        }}
      />

      {/* Edge fade masks */}
      <div className="absolute top-0 left-0 h-full w-8 sm:w-16 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to right, #1d4ed8, transparent)' }} />
      <div className="absolute top-0 right-0 h-full w-8 sm:w-16 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to left, #1e40af, transparent)' }} />

      {/* Single scrolling track */}
      <div className="flex items-center py-2.5 sm:py-3" style={{ willChange: 'transform' }}>
        <div className="flex items-center gap-0 animate-marquee-smr flex-shrink-0">
          {track.map((msg, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 flex-shrink-0 px-3 sm:px-5"
            >
              <span className="text-sm sm:text-base leading-none">{msg.icon}</span>
              <span
                className="text-white/90 font-medium whitespace-nowrap"
                style={{ fontSize: 'clamp(10px, 2.5vw, 13px)' }}
              >
                {msg.text}
              </span>
              <span className="text-white/25 ml-3 sm:ml-5 text-xs select-none">◆</span>
            </div>
          ))}
        </div>
        {/* Aria-hidden duplicate to fill viewport during reset gap */}
        <div className="flex items-center gap-0 animate-marquee-smr flex-shrink-0" aria-hidden="true">
          {track.map((msg, idx) => (
            <div
              key={`b-${idx}`}
              className="flex items-center gap-1.5 flex-shrink-0 px-3 sm:px-5"
            >
              <span className="text-sm sm:text-base leading-none">{msg.icon}</span>
              <span
                className="text-white/90 font-medium whitespace-nowrap"
                style={{ fontSize: 'clamp(10px, 2.5vw, 13px)' }}
              >
                {msg.text}
              </span>
              <span className="text-white/25 ml-3 sm:ml-5 text-xs select-none">◆</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee-smr {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-smr {
          animation: marquee-smr 40s linear infinite;
        }
        @media (max-width: 640px) {
          .animate-marquee-smr {
            animation-duration: 28s;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee-smr {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
