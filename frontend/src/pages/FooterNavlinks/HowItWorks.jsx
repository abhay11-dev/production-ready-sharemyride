import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

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
  { n: '01', title: 'Create Your Account', desc: 'Sign up with name, email, and password. Verify your phone number via OTP. Done in under 2 minutes — free forever.', tags: ['Email signup', 'Phone OTP', 'Free account'] },
  { n: '02', title: 'Search for a Ride', desc: 'Enter your origin, destination, and travel date. Browse real-time results from verified drivers going your way.', tags: ['Live results', 'Date filter', 'Route matching'] },
  { n: '03', title: 'Review the Driver', desc: 'Check the driver\'s profile, verified badge, rating history, vehicle details, and preferences before you request.', tags: ['Verified badge', 'Star ratings', 'Vehicle info'] },
  { n: '04', title: 'Request a Seat', desc: 'Click "Request to Join". The driver reviews your profile and accepts or declines — you get notified instantly.', tags: ['Instant notification', 'Driver approval', 'In-app messaging'] },
  { n: '05', title: 'Travel Together', desc: 'Meet at the pickup point. Share the journey and the cost. Your contribution goes directly toward the driver\'s fuel.', tags: ['Cost sharing', 'Pickup location', 'Contact shared'] },
  { n: '06', title: 'Rate the Experience', desc: 'After arrival, rate your driver. Your honest review helps build a trustworthy community for every future traveler.', tags: ['1-5 stars', 'Written review', 'Community trust'] },
];

const DRIVER_STEPS = [
  { n: '01', title: 'Complete Verification', desc: 'Submit your Aadhaar, driving licence, and profile photo. Our team reviews and approves within 24-48 hours.', tags: ['Aadhaar check', 'Licence check', '24-48h approval'] },
  { n: '02', title: 'Post Your Ride', desc: 'Enter origin, destination, date, departure time, available seats, and your cost-per-seat. Goes live instantly.', tags: ['Set your price', 'Add waypoints', 'Live instantly'] },
  { n: '03', title: 'Manage Requests', desc: 'Passengers request seats. Review their profile and rating, then accept or decline. You are in full control.', tags: ['Passenger profiles', 'Accept / decline', 'Full control'] },
  { n: '04', title: 'Complete the Ride', desc: 'Pick up confirmed passengers, travel together, and collect the agreed cost-share at the destination.', tags: ['Cost sharing', 'Fuel recovery', 'Community building'] },
  { n: '05', title: 'Build Your Reputation', desc: 'Earn ratings from passengers. High-rated drivers get priority placement in search results and community trust.', tags: ['Priority listing', 'Trust score', 'Community recognition'] },
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
  const [activeTab, setActiveTab] = useState('passenger');

  const steps = activeTab === 'passenger' ? PASSENGER_STEPS : DRIVER_STEPS;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero — consistent blue (Point 9) ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-6">
            The Journey
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5 tracking-tight">
            How ShareMyRide<br />
            <span className="text-green-400">actually works</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/ride/search" onClick={() => window.scrollTo(0,0)} className="px-7 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-sm">
                Find a Ride
              </Link>
              <Link to="/ride/post" onClick={() => window.scrollTo(0,0)} className="px-7 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors text-sm">
                Offer a Ride
              </Link>
              <Link to="/faq" onClick={() => window.scrollTo(0,0)} className="px-7 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm">
                Read FAQs
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}