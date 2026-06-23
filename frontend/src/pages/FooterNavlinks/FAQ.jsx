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
            <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden min-h-[90vh] flex flex-col justify-center">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-400/10 rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-3xl mx-auto px-4 text-center mt-12 sm:mt-0">
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