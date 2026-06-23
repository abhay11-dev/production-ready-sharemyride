import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

function useScrollTop() { useEffect(() => { window.scrollTo(0, 0); }, []); }

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
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-500/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
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