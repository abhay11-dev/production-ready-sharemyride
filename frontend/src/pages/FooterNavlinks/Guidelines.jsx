import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';

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
            transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
        }}>
            {children}
        </div>
    );
}

const PRINCIPLES = [
    {
        icon: '🤝',
        title: 'Respect',
        color: 'blue',
        desc: 'Every person on this platform — regardless of gender, religion, background, or destination — deserves to be treated with dignity.',
        rules: ['Use polite, inclusive language at all times', 'Respect personal space and privacy during rides', 'Do not discriminate based on identity or appearance'],
    },
    {
        icon: '🛡️',
        title: 'Safety',
        color: 'green',
        desc: 'Physical and emotional safety is non-negotiable. Drivers must follow traffic rules. Passengers must not distract drivers. Everyone shares responsibility.',
        rules: ['Follow all traffic laws and road safety norms', 'Do not consume alcohol before or during rides', 'Share your trip with an emergency contact'],
    },
    {
        icon: '⏰',
        title: 'Reliability',
        color: 'amber',
        desc: 'When you commit to a ride — whether offering or booking — people plan around that commitment. Reliability is how trust compounds over time.',
        rules: ['Confirm only rides you genuinely intend to complete', 'Notify others immediately if plans change', 'Avoid last-minute cancellations whenever possible'],
    },
    {
        icon: '💡',
        title: 'Transparency',
        color: 'violet',
        desc: 'Honest information keeps everyone safe. Accurate vehicle details, real photos, and fair fares are the foundation of a trustworthy marketplace.',
        rules: ['Post accurate ride details including stops and timing', 'Upload a real, recent profile photo', 'Set fair fares that reflect actual cost-sharing'],
    },
    {
        icon: '🌍',
        title: 'Inclusion',
        color: 'indigo',
        desc: 'ShareMyRide is for everyone. We actively build features and policies that make travel accessible, safe, and comfortable across all communities.',
        rules: ['Welcome riders from all backgrounds equally', 'Support gender-preference settings without judgment', 'Accommodate reasonable accessibility needs when possible'],
    },
];

const colorMap = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-600', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700' },
    green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-600', badge: 'bg-green-100 text-green-700', text: 'text-green-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-600', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-700' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-700' },
};

const DRIVER_RESP = [
    'Post accurate ride details: origin, destination, waypoints, departure time, and available seats.',
    'Upload a real profile photo and keep vehicle information current.',
    'Drive safely. No speeding, phone use while driving, or rash driving.',
    'Respond to booking requests within a reasonable time.',
    'Communicate any changes — delays, route adjustments — promptly through the app.',
    'Maintain a clean, comfortable vehicle environment for passengers.',
];

const PASSENGER_RESP = [
    'Be ready at the agreed pickup location at the confirmed time.',
    'Treat the driver\'s vehicle with care — no food, smoking, or mess without explicit consent.',
    'Confirm bookings only for rides you intend to take.',
    'Leave an honest, fair review after every ride.',
    'Do not request personal contact details outside the platform.',
    'Respect driver preferences (music, conversation, quiet ride).',
];

const PROHIBITED = [
    { icon: '🚫', title: 'Harassment & Discrimination', desc: 'Any form of verbal, physical, or sexual harassment is an immediate ban. This includes discriminatory remarks based on caste, religion, gender, sexuality, or disability.' },
    { icon: '🕵️', title: 'Fake Accounts & Impersonation', desc: 'Creating accounts with false identities, using others\' photos, or impersonating verified drivers is strictly prohibited and may result in legal action.' },
    { icon: '💰', title: 'Fraud & Overcharging', desc: 'Charging fares above what was listed, requesting payments outside the app, or manipulating booking totals is grounds for permanent account suspension.' },
    { icon: '📍', title: 'Misleading Ride Information', desc: 'Posting rides with false starting points, destinations, or availability with no intention of completing them harms the community and violates platform trust.' },
    { icon: '⚠️', title: 'Unsafe Behaviour', desc: 'Driving under the influence, refusing to follow safety protocols, carrying undisclosed passengers, or behaving in a way that endangers others.' },
    { icon: '🤐', title: 'Pressure & Coercion', desc: 'Pressuring users to cancel reviews, leave false ratings, share personal data, or communicate outside the platform is not tolerated.' },
];

const TRUST_STEPS = [
    { step: '1', title: 'Report Submitted', desc: 'User submits a report via the in-app flag or through the Report an Issue page. All reports are confidential.' },
    { step: '2', title: 'Initial Review', desc: 'Our trust & safety team reviews the submission within 24–48 hours and may request additional information.' },
    { step: '3', title: 'Investigation', desc: 'We review ride history, messages, ratings, and both parties\' accounts to make a fair and informed decision.' },
    { step: '4', title: 'Resolution & Action', desc: 'Appropriate action is taken — from a formal warning to permanent suspension — and the reporter is notified of the outcome.' },
];

const CONSEQUENCES = [
    { level: 'Warning', color: 'amber', desc: 'First-time, minor violations receive a formal warning with a clear explanation of what went wrong.' },
    { level: 'Temporary Suspension', color: 'orange', desc: 'Repeated minor violations or a single serious violation result in a temporary account suspension (7–30 days).' },
    { level: 'Permanent Ban', color: 'red', desc: 'Severe violations (harassment, fraud, safety endangerment) result in permanent removal from the platform.' },
    { level: 'Legal Referral', color: 'gray', desc: 'Criminal behaviour — including assault, fraud, or threats — is reported to law enforcement authorities. Safety is must and always first.' },
];

const consequenceColors = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
};

export default function Guidelines() {
    const [openPrinciple, setOpenPrinciple] = useState(null);
    const [platformStats, setPlatformStats] = useState({
        users: '...',
        rating: '...',
        cities: '...',
        rides: '...'
    });

    useEffect(() => {
        window.scrollTo(0, 0);

        const fetchStats = async () => {
            try {
                const res = await api.get('/stats/home');
                if (res.data?.success) {
                    const data = res.data.data;
                    setPlatformStats({
                        users: `${(data.totalUsers || 0).toLocaleString()}`,
                        rating: `${(data.averageRating || 0).toFixed(1)}★`,
                        cities: `${(data.totalCities || 0).toLocaleString()}`,
                        rides: `${(data.totalRides || 0).toLocaleString()}`
                    });
                }
            } catch (err) {
                console.error("Failed to fetch platform stats", err);
                setPlatformStats({
                    users: '0',
                    rating: '0.0★',
                    cities: '0',
                    rides: '0'
                });
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Hero ── */}
            <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden min-h-screen flex flex-col justify-center">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-400/10 rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-6">
                        Community First
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5 tracking-tight">
                        Safe rides.<br />
                        <span className="text-green-400">Trusted connections.</span>
                    </h1>
                    <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed mb-8">
                        These guidelines aren't rules imposed from above — they're the shared commitments that make ShareMyRide a community worth belonging to.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a href="#principles" className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-sm">
                            Read Guidelines ↓
                        </a>
                        <Link to="/report" className="px-6 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm">
                            Report a Violation
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Stats bar ── */}
            <section className="bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        {[
                            { value: platformStats.users, label: 'Verified Members' },
                            { value: platformStats.rating, label: 'Avg. Community Rating' },
                            { value: platformStats.cities, label: 'Cities Covered' },
                            { value: platformStats.rides, label: 'Rides Shared' },
                        ].map(s => (
                            <div key={s.label}>
                                <div className="text-2xl font-extrabold text-blue-600">{s.value}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Core Principles ── */}
            <section id="principles" className="py-16 sm:py-24 bg-gray-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-12">
                            <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Core Principles</div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">What we stand for</h2>
                            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">Five principles that define how every member of the ShareMyRide community is expected to show up.</p>
                        </div>
                    </Reveal>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {PRINCIPLES.map((p, i) => {
                            const c = colorMap[p.color];
                            const isOpen = openPrinciple === i;
                            return (
                                <Reveal key={p.title} delay={i * 0.07}>
                                    <div
                                        className={`rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 ${isOpen ? `${c.bg} ${c.border} shadow-md` : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'}`}
                                        onClick={() => setOpenPrinciple(isOpen ? null : i)}
                                    >
                                        <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center text-xl mb-4 shadow-sm`}>
                                            {p.icon}
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-base mb-2">{p.title}</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>

                                        <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-64 mt-4' : 'max-h-0'}`}>
                                            <div className="border-t border-current/10 pt-4 space-y-2">
                                                {p.rules.map(r => (
                                                    <div key={r} className="flex items-start gap-2 text-xs text-gray-700">
                                                        <span className={`mt-0.5 w-4 h-4 rounded-full ${c.icon} text-white flex items-center justify-center flex-shrink-0 text-[10px]`}>✓</span>
                                                        {r}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={`text-xs font-medium mt-3 ${c.text} flex items-center gap-1`}>
                                            {isOpen ? 'Hide details ↑' : 'See specifics ↓'}
                                        </div>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Responsibilities ── */}
            <section className="py-16 sm:py-24 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-12">
                            <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Community Expectations</div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Your responsibilities</h2>
                        </div>
                    </Reveal>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {/* Drivers */}
                        <Reveal delay={0.05}>
                            <div className="bg-blue-50 rounded-2xl p-7 border border-blue-100 h-full">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">🚗</div>
                                    <h3 className="font-bold text-gray-900 text-lg">Driver Responsibilities</h3>
                                </div>
                                <ul className="space-y-3">
                                    {DRIVER_RESP.map((r, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                                            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>

                        {/* Passengers */}
                        <Reveal delay={0.1}>
                            <div className="bg-green-50 rounded-2xl p-7 border border-green-100 h-full">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white text-lg">🎒</div>
                                    <h3 className="font-bold text-gray-900 text-lg">Passenger Responsibilities</h3>
                                </div>
                                <ul className="space-y-3">
                                    {PASSENGER_RESP.map((r, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                                            <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── Prohibited Activities ── */}
            <section className="py-16 sm:py-24 bg-gray-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-12">
                            <div className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-3">Zero Tolerance</div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Prohibited activities</h2>
                            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">These behaviours result in immediate investigation and potential permanent removal.</p>
                        </div>
                    </Reveal>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {PROHIBITED.map((item, i) => (
                            <Reveal key={item.title} delay={i * 0.06}>
                                <div className="bg-white rounded-2xl p-5 border border-red-100 hover:border-red-200 hover:shadow-sm transition-all">
                                    <div className="text-2xl mb-3">{item.icon}</div>
                                    <h3 className="font-bold text-gray-900 text-sm mb-2">{item.title}</h3>
                                    <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Trust & Safety Process ── */}
            <section className="py-16 sm:py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-12">
                            <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Trust & Safety</div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">How we handle reports</h2>
                        </div>
                    </Reveal>

                    <div className="relative">
                        <div className="absolute left-6 top-6 bottom-6 w-px bg-blue-100" />
                        <div className="space-y-6">
                            {TRUST_STEPS.map((s, i) => (
                                <Reveal key={s.step} delay={i * 0.1}>
                                    <div className="flex items-start gap-5 pl-2">
                                        <div className="relative z-10 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-md">
                                            {s.step}
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex-1">
                                            <h3 className="font-bold text-gray-900 mb-1.5">{s.title}</h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Consequences ── */}
            <section className="py-16 sm:py-24 bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-10">
                            <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Enforcement</div>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Consequences of violations</h2>
                        </div>
                    </Reveal>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {CONSEQUENCES.map((c, i) => (
                            <Reveal key={c.level} delay={i * 0.08}>
                                <div className={`rounded-2xl border p-5 ${consequenceColors[c.color]}`}>
                                    <div className="font-bold text-base mb-2">{c.level}</div>
                                    <p className="text-sm leading-relaxed opacity-80">{c.desc}</p>
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
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Witnessed a violation?</h2>
                        <p className="text-blue-100 mb-7 text-sm">Help keep the community safe. Every report is reviewed and every report matters.</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link to="/report" className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-sm">
                                Report an Issue
                            </Link>
                            <Link to="/faq" className="px-6 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm">
                                FAQ
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

        </div>
    );
}