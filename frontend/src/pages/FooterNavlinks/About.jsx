import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

/* ─── Scroll-to-top on mount ── */
function useScrollTop() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
}

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
}

/* ─── Animated counter ── */
function Counter({ target, suffix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal(0.3);
  useEffect(() => {
    if (!visible || !target) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(decimals ? parseFloat(start.toFixed(decimals)) : Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, decimals]);
  return <span ref={ref}>{decimals ? count.toFixed(decimals) : count.toLocaleString('en-IN')}{suffix}</span>;
}

const TIMELINE = [
  { year: '2025', title: 'The Idea', desc: 'The real story began when our founder\'s father highlighted a common problem. As an aspiring software developer wanting to give back to those who provided the right to education, the founder started building the platform.' },
  { year: '2026', title: 'Business Ready', desc: 'We are now business-level ready. Our platform is polished, fully prepared for the market, and ready to connect communities by making shared mobility accessible to everyone.' }
];

const VALUES = [
  { icon: '🤝', title: 'Trust First', desc: 'Every driver is verified. Every ride is rated. Community accountability is built into the DNA of the platform.' },
  { icon: '🌿', title: 'Sustainability', desc: 'Fewer cars on the road means less congestion, fewer emissions, and a measurably smaller carbon footprint per journey.' },
  { icon: '💸', title: 'Affordability', desc: 'Cost-sharing, not profit extraction. Drivers recover fuel costs, passengers travel cheaper — everyone wins.' },
  { icon: '🏘️', title: 'Community', desc: 'Not a transactional app — a social layer for mobility. Regular commuters become trusted travel companions.' },
  { icon: '🛡️', title: 'Safety', desc: 'Emergency contacts, in-app SOS, gender preference filters, and verified identities make every seat a safe seat.' },
  { icon: '🚀', title: 'Accessibility', desc: 'From tier-1 metros to tier-3 towns, shared mobility should work everywhere — not just where Uber does.' },
];

/* ─── keyframe CSS injected once ── */
const HERO_CSS = `
  @keyframes blobPulse {
    0%, 100% { transform: scale(1);   opacity: 0.07; }
    50%       { transform: scale(1.18); opacity: 0.13; }
  }
  @keyframes laneDrift {
    0%   { transform: translateY(100vh); opacity: 0;   }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateY(-120px); opacity: 0; }
  }
  @keyframes carDrift {
    0%   { transform: translateX(-60px); opacity: 0;   }
    8%   { opacity: 0.18; }
    92%  { opacity: 0.18; }
    100% { transform: translateX(calc(100vw + 60px)); opacity: 0; }
  }
  @keyframes gridScroll {
    0%   { transform: translateY(0);   }
    100% { transform: translateY(60px); }
  }
  @keyframes glowBreath {
    0%, 100% { opacity: 0.10; transform: scale(1);    }
    50%       { opacity: 0.18; transform: scale(1.12); }
  }
  @keyframes ringExpand {
    0%   { transform: scale(0.6); opacity: 0.18; }
    100% { transform: scale(2.2); opacity: 0;   }
  }
  @keyframes dotFloat {
    0%, 100% { transform: translateY(0px);   opacity: 0.12; }
    50%       { transform: translateY(-18px); opacity: 0.22; }
  }

  .hero-blob {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%);
    animation: blobPulse linear infinite;
  }
  .hero-lane {
    position: absolute;
    bottom: -120px;
    width: 3px;
    border-radius: 2px;
    background: linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0));
    animation: laneDrift linear infinite;
  }
  .hero-car {
    position: absolute;
    left: -60px;
    border-radius: 3px;
    background: rgba(255,255,255,0.15);
    animation: carDrift linear infinite;
  }
  .hero-grid {
    position: absolute;
    inset: -60px;
    background-image:
      linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
    background-size: 52px 52px;
    animation: gridScroll 6s linear infinite;
  }
  .hero-glow {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 68%);
    animation: glowBreath ease-in-out infinite;
  }
  .hero-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.10);
    animation: ringExpand ease-out infinite;
  }
  .hero-dot {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    animation: dotFloat ease-in-out infinite;
  }
`;

function HeroBackground() {
  return (
    <>
      <style>{HERO_CSS}</style>

      {/* Scrolling grid — fills the whole section quietly */}
      <div className="hero-grid" aria-hidden="true" />

      {/* Breathing glows anchored to corners / midpoints */}
      <div className="hero-glow" aria-hidden="true" style={{ width: 500, height: 500, top: -160, right: -120, animationDuration: '8s', animationDelay: '0s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 380, height: 380, bottom: -100, left: -80, animationDuration: '10s', animationDelay: '3s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 260, height: 260, top: '42%', left: '48%', animationDuration: '12s', animationDelay: '1.5s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 180, height: 180, top: '18%', left: '22%', animationDuration: '9s', animationDelay: '5s' }} />

      {/* Expanding rings — very faint, one every few seconds */}
      <div className="hero-ring" aria-hidden="true" style={{ width: 320, height: 320, top: '30%', left: '60%', animationDuration: '7s', animationDelay: '0s' }} />
      <div className="hero-ring" aria-hidden="true" style={{ width: 240, height: 240, top: '60%', left: '20%', animationDuration: '9s', animationDelay: '3.5s' }} />
      <div className="hero-ring" aria-hidden="true" style={{ width: 200, height: 200, top: '10%', left: '75%', animationDuration: '11s', animationDelay: '6s' }} />

      {/* Floating dots scattered across full width */}
      {[
        { top: '12%', left: '5%',  d: '0s',   dur: '5s'  },
        { top: '28%', left: '15%', d: '1.2s', dur: '6s'  },
        { top: '55%', left: '8%',  d: '2.5s', dur: '7s'  },
        { top: '78%', left: '18%', d: '0.8s', dur: '5.5s'},
        { top: '90%', left: '35%', d: '3.2s', dur: '6.5s'},
        { top: '65%', left: '45%', d: '1.8s', dur: '8s'  },
        { top: '20%', left: '55%', d: '4s',   dur: '5s'  },
        { top: '42%', left: '65%', d: '0.4s', dur: '7s'  },
        { top: '75%', left: '72%', d: '2s',   dur: '6s'  },
        { top: '10%', left: '82%', d: '3.5s', dur: '9s'  },
        { top: '50%', left: '88%', d: '1s',   dur: '5.5s'},
        { top: '85%', left: '94%', d: '2.8s', dur: '7s'  },
      ].map((dot, i) => (
        <div key={i} className="hero-dot" aria-hidden="true"
          style={{ top: dot.top, left: dot.left, animationDelay: dot.d, animationDuration: dot.dur }} />
      ))}

      {/* Lane dashes — spread across full width */}
      {[
        { left: '4%',  h: 80,  dur: '7s',   d: '0s'   },
        { left: '4%',  h: 45,  dur: '7s',   d: '3.5s' },
        { left: '12%', h: 65,  dur: '9s',   d: '1.2s' },
        { left: '12%', h: 38,  dur: '9s',   d: '5.5s' },
        { left: '20%', h: 90,  dur: '8s',   d: '2.8s' },
        { left: '28%', h: 55,  dur: '10s',  d: '0.6s' },
        { left: '36%', h: 70,  dur: '7.5s', d: '4s'   },
        { left: '44%', h: 50,  dur: '11s',  d: '2s'   },
        { left: '44%', h: 88,  dur: '11s',  d: '6s'   },
        { left: '52%', h: 62,  dur: '8.5s', d: '1s'   },
        { left: '60%', h: 75,  dur: '9.5s', d: '3s'   },
        { left: '68%', h: 42,  dur: '7s',   d: '5s'   },
        { left: '68%', h: 95,  dur: '7s',   d: '1.8s' },
        { left: '76%', h: 58,  dur: '8s',   d: '4.5s' },
        { left: '84%', h: 80,  dur: '10s',  d: '0.3s' },
        { left: '92%', h: 48,  dur: '6.5s', d: '2.2s' },
        { left: '97%', h: 70,  dur: '9s',   d: '3.8s' },
      ].map((lane, i) => (
        <div key={i} className="hero-lane" aria-hidden="true"
          style={{ left: lane.left, height: lane.h, animationDuration: lane.dur, animationDelay: lane.d }} />
      ))}

      {/* Drifting car silhouettes */}
      {[
        { w: 30, h: 13, top: '15%', dur: '9s',  d: '0s'  },
        { w: 24, h: 11, top: '32%', dur: '12s', d: '2s'  },
        { w: 34, h: 14, top: '52%', dur: '10s', d: '5s'  },
        { w: 22, h: 10, top: '70%', dur: '8s',  d: '1s'  },
        { w: 28, h: 12, top: '85%', dur: '11s', d: '7s'  },
        { w: 20, h: 9,  top: '25%', dur: '14s', d: '3.5s'},
        { w: 26, h: 11, top: '60%', dur: '13s', d: '6.5s'},
      ].map((car, i) => (
        <div key={i} className="hero-car" aria-hidden="true"
          style={{ width: car.w, height: car.h, top: car.top, animationDuration: car.dur, animationDelay: car.d }} />
      ))}
    </>
  );
}

export default function About() {
  useScrollTop();
  const { user } = useAuth();

  const [stats, setStats] = useState({ totalRides: 0, totalCities: 0, totalUsers: 0, averageRating: 0, loading: true });

  useEffect(() => {
    api.get('/stats/home')
      .then(res => {
        const d = res.data?.data || res.data || {};
        setStats({
          totalRides: d.totalRides || 0,
          totalCities: d.totalCities || 0,
          totalUsers: d.totalUsers || 0,
          averageRating: d.averageRating || 0,
          loading: false,
        });
      })
      .catch(() => setStats(s => ({ ...s, loading: false })));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden min-h-screen flex flex-col justify-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <HeroBackground />
        </div>

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-6">
            Our Story
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            We built the ride-sharing<br className="hidden sm:block" />
            <span className="text-green-400"> India actually needed.</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto px-2 sm:px-0">
            Not a taxi app. Not a logistics startup. A community of people who believe that empty car seats are a problem worth solving — together.
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-9 bg-gray-200 rounded w-24 mx-auto mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-16 mx-auto" />
                </div>
              ))
            ) : (
              <>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 leading-none mb-1">
                    <Counter target={stats.totalRides} suffix="+" />
                  </div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rides Shared</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 leading-none mb-1">
                    <Counter target={stats.totalCities} suffix="+" />
                  </div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cities Connected</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 leading-none mb-1">
                    <Counter target={stats.totalUsers} suffix="+" />
                  </div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Members</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 leading-none mb-1">
                    <Counter target={stats.averageRating || 4.8} suffix="★" decimals={1} />
                  </div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avg. Rating</div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">The Problem</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Every day, millions of cars carry<br className="hidden sm:block" />
              <span className="text-blue-600"> just one person.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              In India, urban congestion costs the economy billions of hours every year. Cars sit idle 96% of the time. When they do move, 70% have empty seats. Meanwhile, millions of people are paying full-price solo fares.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              The solution already exists — people just need a trusted space to coordinate. That is what we built.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5 mt-12">
            {[
              { stat: '70%', label: 'of cars on Indian roads carry only the driver', color: 'text-red-500' },
              { stat: '40%', label: 'cheaper than solo travel when seats are shared', color: 'text-green-600' },
              { stat: '3x',  label: 'lower carbon footprint per passenger vs solo car', color: 'text-blue-600' },
            ].map((item, i) => (
              <Reveal key={item.stat} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className={`text-4xl font-extrabold mb-2 ${item.color}`}>{item.stat}</div>
                  <div className="text-sm text-gray-600 leading-snug">{item.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Our Journey</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">From frustration to platform</h2>
            </div>
          </Reveal>
          <div className="relative">
            <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-px bg-blue-100 -translate-x-1/2" />
            <div className="space-y-10">
              {TIMELINE.map((item, i) => (
                <Reveal key={item.year} delay={i * 0.08}>
                  <div className={`relative flex items-start gap-6 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
                    <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-2xl bg-blue-600 flex flex-col items-center justify-center shadow-lg text-white sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                      <span className="text-xs font-bold">{item.year}</span>
                    </div>
                    <div className={`flex-1 bg-gray-50 rounded-2xl p-5 border border-gray-100 sm:w-[calc(50%-56px)] ${i % 2 === 0 ? 'sm:mr-[calc(50%+28px)]' : 'sm:ml-[calc(50%+28px)]'}`}>
                      <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Purpose</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-12 tracking-tight">What drives everything we do</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { label: 'Mission', text: 'Make shared mobility the default choice for every intercity and intracity journey in India — by building a platform rooted in trust, affordability, and community.' },
              { label: 'Vision',  text: 'A future where every car seat is a social asset, not wasted space. Where travel is an opportunity to connect, not just commute. Not just carpooling - building communities.' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.1}>
                <div className="bg-white/10 rounded-2xl p-7 text-left border border-white/10">
                  <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-2">{item.label}</div>
                  <p className="text-blue-50 leading-relaxed">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-12">
              <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">What We Stand For</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Our values</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.07}>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-200">
                  <div className="text-3xl mb-3">{v.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">Ready to ride with the community?</h2>
            <p className="text-gray-500 mb-8">Find a ride or offer yours — every seat filled is a small win for everyone.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link to={user ? "/ride/search" : "/login"} onClick={() => window.scrollTo(0, 0)}
                className="px-8 py-4 bg-blue-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center">
                Find a Ride
              </Link>
              <Link to={user ? "/ride/post" : "/login"} onClick={() => window.scrollTo(0, 0)}
                className="px-8 py-4 bg-green-500 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-green-600 transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center">
                Offer a Ride
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}