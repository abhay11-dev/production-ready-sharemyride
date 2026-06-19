import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

/* ─── Point 17: Bottom bar keeps ONLY copyright + Made in India ─────────── */
/* ─── Point 5:  Platform links show login-toast before redirecting ────────── */
/* ─── Point 14: Legal has only "Terms & Conditions" ─────────────────────── */

const FOOTER_LINKS = {
  platform: {
    label: 'Platform',
    links: [
      { label: 'Find a Ride',    to: '/ride/search',           requiresAuth: true  },
      { label: 'Offer a Ride',   to: '/ride/post',             requiresAuth: true  },
      { label: 'My Bookings',    to: '/bookings/my-bookings',  requiresAuth: true  },
      { label: 'Upcoming Trips', to: '/upcoming-rides',        requiresAuth: true  },
    ],
  },
  company: {
    label: 'Company',
    links: [
      { label: 'About Us',              to: '/about',         requiresAuth: false },
      { label: 'How It Works',          to: '/how-it-works',  requiresAuth: false },
      { label: 'Blog',                  to: '/blog',          requiresAuth: false },
      { label: 'Community Guidelines',  to: '/guidelines',    requiresAuth: false },
    ],
  },
  support: {
    label: 'Resources',
    links: [
      { label: 'Help Centre',    to: '/help',    requiresAuth: false },
      { label: 'FAQs',           to: '/faq',     requiresAuth: false },
      { label: 'Contact Us',     to: '/contact', requiresAuth: false },
      { label: 'Report an Issue',to: '/report',  requiresAuth: false },
    ],
  },
  legal: {
    label: 'Legal',
    links: [
      /* Point 14: only one legal item */
      { label: 'Terms & Conditions', to: '/terms', requiresAuth: false },
    ],
  },
};

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/sharemyride.contact?igsh=ZmppeGV2NjZ6dXo2',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/sharemyride-carpooling-community-285301417',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];

/* ─── Car Easter Egg ─────────────────────────────────────────────────────── */
function CarEasterEgg({ onDismiss }) {
  const [phase, setPhase] = useState('idle');
  const [honkVisible, setHonkVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('enter'), 50);
    const t2 = setTimeout(() => setPhase('cruise'), 900);
    const t3 = setTimeout(() => { setPhase('honk'); setHonkVisible(true); }, 2200);
    const t4 = setTimeout(() => setHonkVisible(false), 3200);
    const t5 = setTimeout(() => setPhase('exit'), 3600);
    const t6 = setTimeout(onDismiss, 4800);
    return () => [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
  }, [onDismiss]);

  useEffect(() => {
    const h = () => onDismiss();
    window.addEventListener('keydown', h);
    window.addEventListener('mousedown', h);
    window.addEventListener('touchstart', h);
    return () => {
      window.removeEventListener('keydown', h);
      window.removeEventListener('mousedown', h);
      window.removeEventListener('touchstart', h);
    };
  }, [onDismiss]);

  const carX = phase === 'idle' ? '-120%' : phase === 'enter' ? '10%' : phase === 'cruise' ? '40%' : phase === 'honk' ? '42%' : '130%';

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" style={{ isolation: 'isolate' }}>
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{
          background: 'rgba(3,7,18,0.88)',
          backdropFilter: 'blur(2px)',
          transition: 'opacity 0.4s ease',
          opacity: phase === 'idle' || phase === 'exit' ? 0 : 1,
        }}
        onClick={onDismiss}
      />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 tracking-widest uppercase pointer-events-none select-none"
        style={{ opacity: phase === 'cruise' || phase === 'honk' ? 0.7 : 0, transition: 'opacity 0.6s ease', letterSpacing: '0.15em' }}>
        Press any key to continue
      </div>
      <div className="absolute inset-0 flex flex-col items-stretch justify-center" style={{ pointerEvents: 'none' }}>
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(28)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ width: Math.random() * 2 + 1 + 'px', height: Math.random() * 2 + 1 + 'px', top: Math.random() * 60 + '%', left: Math.random() * 100 + '%', opacity: 0.3 + Math.random() * 0.5, animation: `twinkle ${1.5 + Math.random() * 2}s ease-in-out infinite`, animationDelay: Math.random() * 2 + 's' }} />
          ))}
        </div>
        <div className="absolute left-0 right-0" style={{ height: '76px', bottom: 'calc(50% - 38px)', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderTop: '2px solid #334155' }}>
          <div className="absolute inset-0 flex items-center overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div key={i} style={{ minWidth: '60px', height: '3px', background: '#fbbf24', marginRight: '50px', borderRadius: '2px', opacity: 0.6, animation: phase === 'cruise' || phase === 'honk' ? 'roadMove 0.4s linear infinite' : 'none' }} />
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 'calc(50% - 10px)', left: carX, transition: phase === 'enter' ? 'left 0.85s cubic-bezier(0.22,1,0.36,1)' : phase === 'exit' ? 'left 0.9s cubic-bezier(0.55,0,1,0.45)' : phase === 'cruise' || phase === 'honk' ? 'left 1.4s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none', zIndex: 10 }}>
          <div style={{ position: 'absolute', top: '-52px', right: '-10px', background: 'white', borderRadius: '12px 12px 12px 2px', padding: '6px 12px', fontSize: '15px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap', opacity: honkVisible ? 1 : 0, transform: honkVisible ? 'scale(1)' : 'scale(0.5)', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
            Beep beep!
            <div style={{ position: 'absolute', bottom: '-8px', left: '12px', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '4px solid transparent', borderTop: '8px solid white' }} />
          </div>
          <svg viewBox="0 0 220 90" width="200" height="90" style={{ filter: 'drop-shadow(0 8px 24px rgba(59,130,246,0.35))', animation: phase === 'cruise' || phase === 'honk' ? 'carBob 0.5s ease-in-out infinite' : 'none' }}>
            <defs>
              <linearGradient id="bodyGradF" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient>
              <linearGradient id="windowGradF" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.9" /><stop offset="100%" stopColor="#93c5fd" stopOpacity="0.6" /></linearGradient>
            </defs>
            <ellipse cx="110" cy="84" rx="90" ry="6" fill="rgba(0,0,0,0.3)" />
            <ellipse cx="58" cy="72" rx="22" ry="10" fill="#0f172a" />
            <ellipse cx="160" cy="72" rx="22" ry="10" fill="#0f172a" />
            <rect x="20" y="50" width="180" height="28" rx="6" fill="url(#bodyGradF)" />
            <path d="M55 50 Q65 22 90 20 L140 20 Q165 22 170 50 Z" fill="#2563eb" />
            <rect x="87" y="23" width="48" height="25" rx="3" fill="url(#windowGradF)" stroke="#93c5fd" strokeWidth="0.5" />
            <rect x="192" y="54" width="10" height="6" rx="3" fill="#fef3c7" opacity="0.95" />
            <rect x="18" y="54" width="8" height="6" rx="3" fill="#fca5a5" opacity="0.8" />
            {[58, 160].map((cx, i) => (
              <g key={i}>
                <circle cx={cx} cy="74" r="14" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <circle cx={cx} cy="74" r="5" fill="#334155" />
                <circle cx={cx} cy="74" r="3" fill="#64748b" />
              </g>
            ))}
          </svg>
        </div>
        <div style={{ position: 'absolute', top: '28%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', opacity: phase === 'cruise' || phase === 'honk' ? 1 : 0, transition: 'opacity 0.8s ease 0.4s', pointerEvents: 'none' }}>
          <div style={{ fontSize: '13px', color: '#60a5fa', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>ShareMyRide</div>
          <div style={{ fontSize: '22px', color: 'white', fontWeight: 700, letterSpacing: '-0.02em' }}>Every seat. Every journey. Together.</div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>3 passengers · 1 car · zero guilt</div>
        </div>
      </div>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.3}50%{opacity:0.9} }
        @keyframes carBob { 0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)} }
        @keyframes roadMove { from{transform:translateX(0)}to{transform:translateX(-110px)} }
      `}</style>
    </div>
  );
}

/* ─── Login Toast (speech bubble) ───────────────────────────────────────── */
function FooterLoginToast({ rect, onDismiss }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 20); return () => clearTimeout(t); }, []);
  if (!rect) return null;
  const scrollY = window.scrollY || 0;
  const top = rect.top + scrollY - 60;
  const left = rect.left + rect.width / 2;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 9997, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: `${top}px`, left: `${left}px`, transform: `translateX(-50%) translateY(${vis ? '0' : '6px'})`, opacity: vis ? 1 : 0, transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)', pointerEvents: 'auto' }} onClick={onDismiss}>
        <div style={{ background: '#1d4ed8', color: 'white', borderRadius: '12px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(29,78,216,0.45)', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', position: 'relative' }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Sign in to access this
          <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #1d4ed8' }} />
        </div>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#93c5fd', animation: 'drainFtr 2.4s linear forwards', borderRadius: '2px' }} />
        </div>
      </div>
      <style>{`@keyframes drainFtr{from{width:100%}to{width:0%}}`}</style>
    </div>
  );
}

/* ─── Footer Component ──────────────────────────────────────────────────── */
function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [eggActive, setEggActive] = useState(false);
  const [footerToast, setFooterToast] = useState(null);
  const toastTimerRef = useRef(null);

  const triggerEgg = useCallback((e) => { e.preventDefault(); setEggActive(true); }, []);
  const dismissEgg = useCallback(() => setEggActive(false), []);

  const handleFooterLink = useCallback((e, to, requiresAuth, btnEl) => {
    e.preventDefault();
    window.scrollTo(0, 0);
    if (!requiresAuth || user) {
      navigate(to);
      return;
    }
    /* Point 5: show toast then redirect to login */
    clearTimeout(toastTimerRef.current);
    const rect = btnEl?.getBoundingClientRect?.() || null;
    setFooterToast(rect);
    toastTimerRef.current = setTimeout(() => {
      setFooterToast(null);
      navigate('/login');
    }, 2400);
  }, [user, navigate]);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  return (
    <>
      {eggActive && <CarEasterEgg onDismiss={dismissEgg} />}
      {footerToast !== null && <FooterLoginToast rect={footerToast} onDismiss={() => { clearTimeout(toastTimerRef.current); setFooterToast(null); }} />}

      <footer className="bg-gray-950 text-gray-400" style={{ position: 'relative' }}>

        {/* ── Tagline bar ── */}
        <div className="border-b border-gray-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 text-center">
            <p className="text-sm text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Building smarter, greener, and more connected journeys together.{' '}
              <span className="text-blue-400 font-medium">One shared ride at a time.</span>
            </p>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 sm:pt-14 sm:pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-10">

            {/* Brand column */}
            <div className="col-span-2 lg:col-span-2">
              <button
                onClick={triggerEgg}
                className="flex items-center gap-2.5 mb-4 group w-fit focus:outline-none"
                aria-label="ShareMyRide"
                title="Click for a surprise"
              >
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-200 shadow-lg shadow-blue-900/30">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-base tracking-tight group-hover:text-blue-300 transition-colors">
                  ShareMyRide
                </span>
              </button>

              <p className="text-sm leading-relaxed mb-5 max-w-xs text-gray-400">
                A community-driven carpooling marketplace making travel affordable, sustainable, and social across India.
              </p>

              <div className="flex flex-col gap-2 mb-5">
                <a href="tel:+919617714737" className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-400 transition-colors group">
                  <span className="w-5 h-5 rounded-md bg-gray-800 flex items-center justify-center group-hover:bg-blue-900/40 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </span>
                  +91 9617714737
                </a>
                <a href="mailto:sharemyride.contact@gmail.com" className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-400 transition-colors group">
                  <span className="w-5 h-5 rounded-md bg-gray-800 flex items-center justify-center group-hover:bg-blue-900/40 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </span>
                  sharemyride.contact@gmail.com
                </a>
              </div>

              <div className="flex items-center gap-2">
                {SOCIAL_LINKS.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-blue-600 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 hover:scale-110">
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.values(FOOTER_LINKS).map(col => (
              <div key={col.label}>
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-4">{col.label}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <a
                        href={link.to}
                        onClick={(e) => handleFooterLink(e, link.to, link.requiresAuth, e.currentTarget)}
                        className="text-sm text-gray-400 hover:text-white transition-colors duration-150 hover:translate-x-0.5 transform inline-block cursor-pointer"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Point 17: Bottom bar — ONLY copyright + Made in India ── */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500 text-center sm:text-left">
                &copy; {new Date().getFullYear()} ShareMyRide. All rights reserved.
              </p>
              <span className="text-xs text-gray-600 flex items-center gap-1">
                Made in India
              </span>
            </div>
          </div>
        </div>

      </footer>
    </>
  );
}

export default Footer;