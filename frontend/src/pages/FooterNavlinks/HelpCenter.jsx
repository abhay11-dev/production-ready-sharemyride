import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function useScrollTop() { useEffect(() => { window.scrollTo(0, 0); }, []); }

const CATEGORIES = [
  {
    id: 'getting-started',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'blue',
    title: 'Getting Started',
    desc: 'Account setup, first ride, onboarding guides.',
    articles: [
      { q: 'How do I create an account?', a: 'Visit ShareMyRide and click Get Started. Enter your name, email, and a password. You will receive a verification email — click the link and you are ready. The whole process takes under 60 seconds.' },
      { q: 'How do I complete my profile?', a: 'After signing in, go to Profile and add your phone number, profile photo, and emergency contact. A complete profile builds trust with other community members.' },
      { q: 'What is driver verification?', a: 'To post rides, you must submit your Aadhaar number and driving licence for review. Our team manually verifies all documents within 24-48 hours before issuing a Verified Driver badge.' },
    ],
  },
  {
    id: 'account',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    color: 'violet',
    title: 'Account & Profile',
    desc: 'Passwords, settings, and personal details.',
    articles: [
      { q: 'How do I reset my password?', a: 'Click Forgot Password on the login screen. Enter your registered email and we will send you a reset link valid for 15 minutes. Check your spam folder if you do not see the email.' },
      { q: 'Can I change my email address?', a: 'Email address changes require identity re-verification for security reasons. Contact support at sharemyride.contact@gmail.com to request an email change.' },
      { q: 'How do I delete my account?', a: 'Go to Profile > Settings > Delete Account. Deletion is permanent and removes all your data. If you have active bookings, please cancel them first.' },
    ],
  },
  {
    id: 'rides',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: 'green',
    title: 'Ride Issues',
    desc: 'Booking problems, cancellations, and disputes.',
    articles: [
      { q: 'How do I cancel a booking?', a: 'Go to My Bookings, find the booking, and tap Cancel. Cancellation policies depend on how close to departure you cancel. Please cancel early so the driver can plan accordingly.' },
      { q: 'What if the driver cancels?', a: 'If a driver cancels a confirmed booking, you will be notified immediately. Drivers who frequently cancel face platform penalties. We recommend rebooking with another driver from the search results.' },
      { q: 'Can I change my pickup location?', a: 'Contact the driver directly through in-app messaging before the ride. Significant route changes are at the driver\'s discretion — they are not obligated to accommodate major detours.' },
    ],
  },
  {
    id: 'payments',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'amber',
    title: 'Payments & Costs',
    desc: 'Fare calculation, refunds, and receipts.',
    articles: [
      { q: 'How is the fare calculated?', a: 'Drivers set a per-seat fare to cover fuel and toll costs — not to make a profit. A small platform service fee is added to the passenger total. You see the exact amount before confirming.' },
      { q: 'What payment methods are accepted?', a: 'ShareMyRide supports cash, UPI, and card payments. Payment method is agreed between driver and passenger. Cash is most common for intercity rides.' },
      { q: 'How do I get a receipt?', a: 'After a completed ride, go to My Bookings and tap the booking to find the Receipt option. Receipts include fare breakdown, service fee, and booking reference.' },
    ],
  },
  {
    id: 'safety',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: 'red',
    title: 'Safety & Trust',
    desc: 'Verification, reporting, and community standards.',
    articles: [
      { q: 'What do I do in an emergency during a ride?', a: 'Call 112 (emergency services) immediately. Then use the SOS button in the active ride screen to alert your emergency contacts with your location. Our safety team is also notified.' },
      { q: 'How do I report a driver or passenger?', a: 'Use the Report button on the ride or profile page. All reports are reviewed by our Trust & Safety team within 24 hours. Safety-related reports are escalated and reviewed within 12 hours.' },
      { q: 'Are there women-only rides?', a: 'Yes. Drivers can mark their ride as Women Only, and passengers can filter for women-only rides in search results. This is a voluntary feature designed for passenger comfort.' },
    ],
  },
  {
    id: 'technical',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'gray',
    title: 'Technical Support',
    desc: 'App bugs, login issues, and device problems.',
    articles: [
      { q: 'The app is not loading. What should I do?', a: 'Try refreshing the page or clearing your browser cache. If the issue persists, try a different browser or device. Check our status at sharemyride.contact@gmail.com if you believe there is an outage.' },
      { q: 'I am not receiving notifications.', a: 'Check that browser or app notifications are enabled in your device settings for ShareMyRide. Also check your notification preferences in Profile > Settings > Notifications.' },
      { q: 'I found a bug. How do I report it?', a: 'Visit /report or email sharemyride.contact@gmail.com with a description of the bug, the page it occurred on, steps to reproduce, and screenshots if possible. Our team reviews all reports.' },
    ],
  },
];

const colorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-600 text-white', badge: 'bg-blue-100 text-blue-700' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-600 text-white', badge: 'bg-violet-100 text-violet-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-600 text-white', badge: 'bg-green-100 text-green-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-500 text-white', badge: 'bg-amber-100 text-amber-700' },
  red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-600 text-white', badge: 'bg-red-100 text-red-700' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-600 text-white', badge: 'bg-gray-100 text-gray-700' },
};

export default function HelpCenter() {
  useScrollTop();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [openArticle, setOpenArticle] = useState(null);
  const articlesSectionRef = useRef(null);

  useEffect(() => {
    if (activeCategory || search) {
      // Small timeout to allow DOM to render the section before scrolling
      const timer = setTimeout(() => {
        articlesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeCategory, search]);

  const filtered = CATEGORIES
    .map(cat => ({
      ...cat,
      articles: cat.articles.filter(a =>
        !search.trim() ||
        a.q.toLowerCase().includes(search.toLowerCase()) ||
        a.a.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(cat => !search.trim() || cat.articles.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero — consistent blue (Points 9, 11) ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden min-h-screen flex flex-col justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-6">
            Help Centre
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 tracking-tight">
            How can we help you?
          </h1>
          <p className="text-blue-100 mb-8 leading-relaxed">
            Search our knowledge base or browse by category below.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search articles, topics, questions..."
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveCategory(null); setOpenArticle(null); }}
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 text-sm bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Quick contact links */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
            <a href="tel:+919617714737" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              +91 9617714737
            </a>
            <a href="mailto:sharemyride.contact@gmail.com" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              sharemyride.contact@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* ── Category cards ── */}
      {!search && (
        <section className="py-12 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-6">Browse by category</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map(cat => {
                const c = colorMap[cat.color];
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(isActive ? null : cat.id); setOpenArticle(null); }}
                    className={`text-left p-5 rounded-2xl border-2 transition-all hover:shadow-sm ${isActive ? `${c.bg} ${c.border}` : 'bg-white border-gray-100 hover:border-blue-200'}`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center mb-3 shadow-sm`}>
                      {cat.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{cat.title}</h3>
                    <p className="text-xs text-gray-500 mb-2 leading-snug">{cat.desc}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
                      {cat.articles.length} articles
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Articles ── */}
      {(search || activeCategory) && (
        <section ref={articlesSectionRef} className="py-10 sm:py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            {search && (
              <div className="text-sm text-gray-500 mb-6">
                {filtered.reduce((a, c) => a + c.articles.length, 0)} result{filtered.reduce((a, c) => a + c.articles.length, 0) !== 1 ? 's' : ''} for <span className="font-semibold text-gray-800">"{search}"</span>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-700 mb-1">No articles found</p>
                <p className="text-sm text-gray-400 mb-5">Try a different search or contact us directly.</p>
                <button onClick={() => setSearch('')} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">Clear search</button>
              </div>
            ) : (
              filtered
                .filter(cat => !activeCategory || cat.id === activeCategory)
                .map(cat => (
                  <div key={cat.id} className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${colorMap[cat.color].icon} flex items-center justify-center`}>
                        <span className="scale-75">{cat.icon}</span>
                      </div>
                      <h2 className="font-bold text-gray-900">{cat.title}</h2>
                    </div>
                    <div className="space-y-2">
                      {cat.articles.map((article, i) => {
                        const key = `${cat.id}-${i}`;
                        const isOpen = openArticle === key;
                        return (
                          <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 transition-colors">
                            <button
                              className="w-full text-left flex items-center gap-4 p-4 sm:p-5"
                              onClick={() => setOpenArticle(isOpen ? null : key)}
                            >
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="flex-1 text-sm font-semibold text-gray-900 leading-relaxed">{article.q}</span>
                              <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <div style={{ maxHeight: isOpen ? '400px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                              <div className="px-5 pb-5 pt-1">
                                <div className="h-px bg-gray-100 mb-4" />
                                <p className="text-sm text-gray-600 leading-relaxed">{article.a}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      )}

      {/* ── Still need help ── */}
      <section className="bg-blue-600 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Still need help?</h2>
          <p className="text-blue-100 text-sm mb-6">Our support team responds within 24 hours on working days (Mon-Sat, 9am-6pm IST).</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" onClick={() => window.scrollTo(0, 0)} className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-sm">
              Contact Us
            </Link>
            <Link to="/report" onClick={() => window.scrollTo(0, 0)} className="px-6 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm">
              Report an Issue
            </Link>
            <Link to="/faq" onClick={() => window.scrollTo(0, 0)} className="px-6 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm">
              Browse FAQs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}