import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api.js';

/* ─── Scroll-to-top on mount (Point 10) ── */
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
  { year: '2022', title: 'The Idea', desc: 'Frustrated by expensive solo commutes and empty car seats, our founder envisioned a platform where trust between strangers could fill those seats — and cut costs and carbon together.' },
  { year: '2023', title: 'First Version', desc: 'A basic ride-listing MVP went live. Early users started sharing rides between cities, building micro-communities of commuters who became regulars.' },
  { year: '2024', title: 'Community Grows', desc: 'Driver verification, real-time booking, and a rating system launched. Thousands of rides happened. The community started self-policing with integrity.' },
  { year: '2025', title: 'Platform Matures', desc: 'Waypoint routing, cost-sharing calculators, and safety features launched. ShareMyRide became the go-to platform for intercity shared travel across India.' },
  { year: '2026+', title: 'The Road Ahead', desc: 'Corporate carpooling, EV-first routing, and rural connectivity. Scaling to every district in India, one shared seat at a time.' },
];

const VALUES = [
  { icon: '🤝', title: 'Trust First', desc: 'Every driver is verified. Every ride is rated. Community accountability is built into the DNA of the platform.' },
  { icon: '🌿', title: 'Sustainability', desc: 'Fewer cars on the road means less congestion, fewer emissions, and a measurably smaller carbon footprint per journey.' },
  { icon: '💸', title: 'Affordability', desc: 'Cost-sharing, not profit extraction. Drivers recover fuel costs, passengers travel cheaper — everyone wins.' },
  { icon: '🏘️', title: 'Community', desc: 'Not a transactional app — a social layer for mobility. Regular commuters become trusted travel companions.' },
  { icon: '🛡️', title: 'Safety', desc: 'Emergency contacts, in-app SOS, gender preference filters, and verified identities make every seat a safe seat.' },
  { icon: '🚀', title: 'Accessibility', desc: 'From tier-1 metros to tier-3 towns, shared mobility should work everywhere — not just where Uber does.' },
];

export default function About() {
  useScrollTop();

  /* Point 6: real dynamic stats */
  const [stats, setStats] = useState({ totalRides: 0, totalCities: 0, totalUsers: 0, averageRating: 0, loading: true });

  useEffect(() => {
    api.get('/stats/home')
      .then(res => {
        const d = res.data?.data || res.data || {};
        setStats({
          totalRides:    d.totalRides    || 0,
          totalCities:   d.totalCities   || 0,
          totalUsers:    d.totalUsers    || 0,
          averageRating: d.averageRating || 0,
          loading: false,
        });
      })
      .catch(() => setStats(s => ({ ...s, loading: false })));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero — consistent blue (Point 9) ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-500/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-6">
            Our Story
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            We built the ride-sharing<br />
            <span className="text-green-400">India actually needed.</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto">
            Not a taxi app. Not a logistics startup. A community of people who believe that empty car seats are a problem worth solving — together.
          </p>
        </div>
      </section>

      {/* ── Point 6: Real dynamic stats bar ── */}
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
              { stat: '3x', label: 'lower carbon footprint per passenger vs solo car', color: 'text-blue-600' },
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
              { label: 'Vision', text: 'A future where every car seat is a social asset, not wasted space. Where travel is an opportunity to connect, not just commute.' },
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/ride/search" onClick={() => window.scrollTo(0,0)} className="px-7 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">Find a Ride</Link>
              <Link to="/ride/post" onClick={() => window.scrollTo(0,0)} className="px-7 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors">Offer a Ride</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}