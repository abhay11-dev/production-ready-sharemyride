import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
    {
        category: 'Account',
        icon: '👤',
        items: [
            {
                q: 'How do I create an account?',
                a: 'Visit sharemyride.in and click "Sign Up". Enter your name, email, and a secure password. You\'ll receive a verification email — click the link and you\'re in. The whole process takes under 60 seconds.',
            },
            {
                q: 'Can I edit my profile after signing up?',
                a: 'Yes, anytime. Go to your profile page and update your name, photo, phone number, bio, gender, and emergency contact. Changes are saved instantly.',
            },
            {
                q: 'Can I be both a passenger and a driver?',
                a: 'Absolutely. You can search for rides as a passenger at any time. To post rides as a driver, you need to complete driver verification (submit your Aadhaar and driving licence). Once approved, you can switch between both roles freely.',
            },
        ],
    },
    {
        category: 'Ride Sharing',
        icon: '🚗',
        items: [
            {
                q: 'How do I offer a ride?',
                a: 'Complete driver verification first. Once approved, click "Offer a Ride", fill in your origin, destination, date, time, available seats, and your fare per seat. Your listing goes live immediately for passengers to find.',
            },
            {
                q: 'How do I join a ride?',
                a: 'Use the search bar on the homepage. Enter where you\'re travelling from, to, and on which date. Browse matching rides, check the driver\'s profile and ratings, and click "Request to Join". The driver will accept or decline — you\'ll be notified instantly.',
            },
            {
                q: 'How are costs shared?',
                a: 'Drivers set a per-seat fare intended to cover fuel and toll costs — not to make a profit. There\'s no surge pricing. What you see is what you pay. A small platform service fee applies.',
            },
            {
                q: 'Can I cancel a booking?',
                a: 'Yes. Go to My Bookings, find the ride, and tap Cancel. Cancellation policies depend on how close to the departure time you cancel. Please cancel early so the driver and other passengers can plan accordingly.',
            },
        ],
    },
    {
        category: 'Safety',
        icon: '🛡️',
        items: [
            {
                q: 'Are all drivers verified?',
                a: 'Yes. To post rides, drivers must submit their Aadhaar number and driving licence for review. Our team manually verifies all documents before issuing a "Verified Driver" badge.',
            },
            {
                q: 'How does the rating system work?',
                a: 'After every completed ride, both the driver and passenger rate each other on a 1-5 star scale and can leave a written review. Ratings are cumulative and visible on every profile — they are the foundation of community trust on ShareMyRide.',
            },
            {
                q: 'How do I report misconduct or a safety issue?',
                a: 'Use the "Report" button on the ride or profile page. For urgent safety situations, tap the SOS button in the active ride screen. Our safety team reviews all reports within 24 hours.',
            },
            {
                q: 'Is there a women-only ride option?',
                a: 'Yes. Drivers can set a "Women Only" preference on their ride. Passengers can also filter for women-only rides in search. This is an opt-in feature to help women travel more comfortably.',
            },
        ],
    },
    {
        category: 'Community',
        icon: '🤝',
        items: [
            {
                q: 'What are the community guidelines?',
                a: 'ShareMyRide is built on mutual respect. Key principles: be on time, be courteous, don\'t cancel without notice, keep the vehicle clean, and follow traffic laws. Read the full guidelines at /guidelines.',
            },
            {
                q: 'How do reviews affect my profile?',
                a: 'Your cumulative rating is visible to all other users and impacts your ride requests being accepted. Consistently high ratings unlock priority search listing for drivers and faster acceptance for passengers.',
            },
        ],
    },
    {
        category: 'Technical',
        icon: '⚙️',
        items: [
            {
                q: 'I forgot my password. What do I do?',
                a: 'Click "Forgot Password" on the login screen. Enter your registered email and we\'ll send you a password reset link valid for 15 minutes. If you don\'t see the email, check your spam folder.',
            },
            {
                q: 'I found a bug. How do I report it?',
                a: 'Visit /report or email sharemyride@gmail.com. Describe the bug, the page it happened on, and the steps to reproduce it. Screenshots help. Our engineering team reviews all reports.',
            },
        ],
    },
    {
        category: 'Business',
        icon: '🏢',
        items: [
            {
                q: 'Can companies use ShareMyRide for employee carpooling?',
                a: 'Yes! We offer corporate carpool solutions for companies looking to reduce commute costs and carbon emissions. Contact us at sharemyride@gmail.com with the subject "Corporate Carpooling" and we\'ll set up a call.',
            },
            {
                q: 'Do you support daily commuter routes?',
                a: 'Currently, ShareMyRide is optimised for intercity travel. Daily intra-city commuter routing is on our 2026 roadmap. If your city has high demand, reach out — we may prioritise it.',
            },
        ],
    },
];

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

export default function FAQ() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [openItem, setOpenItem] = useState(null);
    const faqSectionRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (search || activeCategory !== 'All') {
            const timer = setTimeout(() => {
                faqSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [search, activeCategory]);

    const categories = ['All', ...FAQS.map(f => f.category)];

    const filtered = useMemo(() => {
        return FAQS
            .filter(group => activeCategory === 'All' || group.category === activeCategory)
            .map(group => ({
                ...group,
                items: group.items.filter(
                    item =>
                        !search.trim() ||
                        item.q.toLowerCase().includes(search.toLowerCase()) ||
                        item.a.toLowerCase().includes(search.toLowerCase())
                ),
            }))
            .filter(group => group.items.length > 0);
    }, [search, activeCategory]);

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Hero ── */}
            <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden min-h-screen flex flex-col justify-center">
              <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <HeroBackground />
</div>
                <div className="relative max-w-3xl mx-auto px-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">FAQ</div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-5 tracking-tight">
                        Frequently asked questions
                    </h1>
                    <p className="text-blue-100 mb-8">Everything you need to know about ShareMyRide.</p>

                    <div className="relative max-w-lg mx-auto">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 4.5 4.5a7.5 7.5 0 0 0 12.15 12.15z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search questions…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 text-sm bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
                        />
                    </div>
                </div>
            </section>

            {/* ── Category pills ── */}
            <div ref={faqSectionRef} className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
                    {categories.map(cat => {
                        const group = FAQS.find(f => f.category === cat);
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {group?.icon && <span>{group.icon}</span>}
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── FAQ Accordion ── */}
            <section className="py-12 sm:py-16">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-4xl mb-4">🔍</div>
                            <div className="text-lg font-semibold text-gray-700 mb-2">No results found</div>
                            <p className="text-gray-500 text-sm mb-6">Try a different search or browse all categories.</p>
                            <button onClick={() => { setSearch(''); setActiveCategory('All'); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                                Clear search
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {filtered.map(group => (
                                <div key={group.category}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-xl">{group.icon}</span>
                                        <h2 className="text-lg font-bold text-gray-900">{group.category}</h2>
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.items.length}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {group.items.map((item, i) => {
                                            const key = `${group.category}-${i}`;
                                            const isOpen = openItem === key;
                                            return (
                                                <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 transition-colors">
                                                    <button
                                                        className="w-full text-left flex items-start gap-4 p-5"
                                                        onClick={() => setOpenItem(isOpen ? null : key)}
                                                    >
                                                        <span className="flex-1 text-sm font-semibold text-gray-900 leading-relaxed">{item.q}</span>
                                                        <svg
                                                            className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    <div
                                                        style={{
                                                            maxHeight: isOpen ? '400px' : '0',
                                                            overflow: 'hidden',
                                                            transition: 'max-height 0.3s ease',
                                                        }}
                                                    >
                                                        <div className="px-5 pb-5">
                                                            <div className="h-px bg-gray-100 mb-4" />
                                                            <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="bg-white border-t border-gray-100 py-14">
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <div className="text-xl font-bold text-gray-900 mb-2">Can't find what you're looking for?</div>
                    <p className="text-gray-500 text-sm mb-7">Our support team is available on weekdays 9am – 6pm IST.</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/help" onClick={() => window.scrollTo(0, 0)} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm">
                            Help Centre
                        </Link>
                        <Link to="/contact" onClick={() => window.scrollTo(0, 0)} className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm">
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    );
}