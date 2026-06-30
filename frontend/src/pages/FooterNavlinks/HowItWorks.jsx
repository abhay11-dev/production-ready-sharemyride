import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

function useScrollTop() { useEffect(() => { window.scrollTo(0, 0); }, []); }

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

      <div className="hero-grid" aria-hidden="true" />

      <div className="hero-glow" aria-hidden="true" style={{ width: 500, height: 500, top: -160, right: -120, animationDuration: '8s', animationDelay: '0s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 380, height: 380, bottom: -100, left: -80, animationDuration: '10s', animationDelay: '3s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 260, height: 260, top: '42%', left: '48%', animationDuration: '12s', animationDelay: '1.5s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 180, height: 180, top: '18%', left: '22%', animationDuration: '9s', animationDelay: '5s' }} />

      <div className="hero-ring" aria-hidden="true" style={{ width: 320, height: 320, top: '30%', left: '60%', animationDuration: '7s', animationDelay: '0s' }} />
      <div className="hero-ring" aria-hidden="true" style={{ width: 240, height: 240, top: '60%', left: '20%', animationDuration: '9s', animationDelay: '3.5s' }} />
      <div className="hero-ring" aria-hidden="true" style={{ width: 200, height: 200, top: '10%', left: '75%', animationDuration: '11s', animationDelay: '6s' }} />

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

function useReveal(threshold = 0.1) {
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
      transform: visible ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
}

const PASSENGER_STEPS = [
  { n: '01', title: 'Create & Verify Account', desc: 'Sign up in seconds. Verify your email and complete your profile. Our system ensures a trusted community from step one.', tags: ['Instant signup', 'Email verification', 'Secure platform'] },
  { n: '02', title: 'Find Your Perfect Ride', desc: 'Search with exact origin and destination. Use our advanced filters for dates, time, and preferences. See real-time matches instantly.', tags: ['Advanced search', 'Live matches', 'Smart filtering'] },
  { n: '03', title: 'Review Driver & Vehicle', desc: 'Total transparency. View the driver\'s verified badge, comprehensive ratings, vehicle details, and exact route before requesting.', tags: ['Verified profiles', 'Full transparency', 'Vehicle details'] },
  { n: '04', title: 'Book Your Seat', desc: 'Send a request with one click. Once the driver approves, your seat is confirmed and you get instant notifications with trip details.', tags: ['One-click request', 'Instant alerts', 'Guaranteed seat'] },
  { n: '05', title: 'Travel & Share Costs', desc: 'Coordinate easily via in-app features. Enjoy a comfortable ride and simply split the fuel costs directly—fair and affordable.', tags: ['Easy coordination', 'Comfortable ride', 'Fair cost split'] },
  { n: '06', title: 'Rate & Review', desc: 'After the trip, rate your experience. Your feedback directly influences driver standing and keeps our community safe and high-quality.', tags: ['Impactful feedback', 'Quality control', 'Community driven'] },
];

const DRIVER_STEPS = [
  { n: '01', title: 'Driver Verification', desc: 'Submit your driving credentials securely. Our automated system and team review ensures you get verified and ready to drive quickly.', tags: ['Secure upload', 'Fast verification', 'Trusted status'] },
  { n: '02', title: 'Publish Your Route', desc: 'Enter your start, end, date, and available seats. Our system calculates optimal cost-sharing. Your ride goes live to thousands instantly.', tags: ['Smart pricing', 'Instant visibility', 'Flexible routes'] },
  { n: '03', title: 'Approve Passengers', desc: 'Receive booking requests in real-time. Review passenger profiles and ratings to decide who rides with you. Complete control.', tags: ['Real-time requests', 'Profile review', 'Full control'] },
  { n: '04', title: 'The Shared Journey', desc: 'Pick up your passengers at agreed points. Share the journey, reduce traffic, and make your daily commute much more enjoyable.', tags: ['Smooth pickup', 'Reduce traffic', 'Better commute'] },
  { n: '05', title: 'Recover Fuel Costs', desc: 'Receive passenger contributions seamlessly. Recover your driving expenses while helping others travel affordably.', tags: ['Expense recovery', 'Seamless process', 'Win-win'] },
  { n: '06', title: 'Grow Your Reputation', desc: 'Earn top ratings for safe and pleasant rides. Higher ratings mean your future rides fill up even faster on the platform.', tags: ['Top ratings', 'Priority listing', 'Platform growth'] },
];

const SAFETY_POINTS = [
  { icon: '🛡️', title: 'Every Driver is Verified', desc: 'Aadhaar + driving licence mandatory before posting any ride.' },
  { icon: '⭐', title: 'Mutual Rating System', desc: 'Drivers and passengers rate each other after every ride — full accountability.' },
  { icon: '📞', title: 'Contact After Confirmation', desc: 'Phone numbers are only shared after a booking is confirmed — never before.' },
  { icon: '🚨', title: 'In-App SOS', desc: 'Emergency contact alerts with location during active rides.' },
  { icon: '👩', title: 'Women-Only Option', desc: 'Drivers can set women-only preference; passengers can filter for it.' },
  { icon: '🔒', title: 'Secure Payments', desc: 'Cost-sharing only — no surge pricing, no profit extraction, no hidden fees.' },
];

export default function HowItWorks() {
  useScrollTop();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('passenger');

  const steps = activeTab === 'passenger' ? PASSENGER_STEPS : DRIVER_STEPS;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero — consistent blue (Point 9) ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden min-h-screen flex flex-col justify-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <HeroBackground />
</div>
        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-6">
            The Journey
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            How ShareMyRide<br className="hidden sm:block" />
            <span className="text-green-400"> actually works</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto px-2 sm:px-0">
            From sign-up to shared journey — a clear, visual walkthrough for passengers and drivers.
          </p>
        </div>
      </section>

      {/* ── Tab switcher ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex">
            {[
              { id: 'passenger', label: 'I want to find a ride', icon: '🎒' },
              { id: 'driver',    label: 'I want to offer a ride', icon: '🚗' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Steps ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-10">
              <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-2">
                {activeTab === 'passenger' ? 'For Passengers' : 'For Drivers'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {activeTab === 'passenger'
                  ? 'Find and book a ride in minutes'
                  : 'Post a ride and recover your fuel costs'}
              </h2>
            </div>
          </Reveal>

          <div className="space-y-5">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.06}>
                <div className="flex gap-5 sm:gap-7 bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 group">
                  {/* Step number */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-lg shadow-blue-200">
                      {step.n}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="flex-1 w-px bg-gray-100 min-h-[24px]" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base mb-1.5 group-hover:text-blue-700 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{step.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {step.tags.map(tag => (
                        <span key={tag} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety section ── */}
      <section className="py-14 sm:py-20 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-12">
              <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Built-in Safety</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Safety is not a feature — it is the foundation
              </h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SAFETY_POINTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.07}>
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-blue-200 transition-all">
                  <div className="text-2xl mb-3">{p.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5">{p.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">Ready to get started?</h2>
            <p className="text-blue-100 mb-8 text-sm leading-relaxed">
              Join thousands of travelers already sharing rides, saving money, and building community across India.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link to={user ? "/ride/search" : "/login"} onClick={() => window.scrollTo(0,0)} className="px-8 py-4 bg-white text-blue-700 text-sm sm:text-base font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center">
                Find a Ride
              </Link>
              <Link to={user ? "/ride/post" : "/login"} onClick={() => window.scrollTo(0,0)} className="px-8 py-4 bg-green-500 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-green-600 transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center">
                Offer a Ride
              </Link>
              <Link to="/faq" onClick={() => window.scrollTo(0,0)} className="px-8 py-4 border border-white/30 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-white/10 transition-colors shadow-sm w-full sm:w-auto flex items-center justify-center">
                Read FAQs
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}