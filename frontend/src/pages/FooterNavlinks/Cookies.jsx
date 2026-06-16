import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_TYPES = [
    {
        id: 'essential',
        label: 'Essential Cookies',
        icon: '🔒',
        required: true,
        enabled: true,
        color: 'blue',
        desc: 'These cookies are required for the platform to function. They cannot be disabled.',
        examples: [
            { name: 'auth_token', purpose: 'Keeps you logged in during your session.', duration: '15 minutes' },
            { name: 'refresh_token', purpose: 'Silently renews your login session so you stay signed in.', duration: '7 days' },
            { name: 'csrf_token', purpose: 'Protects against cross-site request forgery attacks.', duration: 'Session' },
            { name: 'cookie_consent', purpose: 'Remembers your cookie preferences.', duration: '1 year' },
        ],
    },
    {
        id: 'analytics',
        label: 'Analytics Cookies',
        icon: '📊',
        required: false,
        enabled: true,
        color: 'indigo',
        desc: 'Help us understand how users navigate ShareMyRide so we can improve the experience. All data is anonymised.',
        examples: [
            { name: '_smr_session', purpose: 'Tracks anonymous session data for usage analytics.', duration: '30 minutes' },
            { name: '_smr_page', purpose: 'Records which pages are visited to identify popular features.', duration: '1 day' },
            { name: '_smr_perf', purpose: 'Measures page load times and performance metrics.', duration: '1 day' },
        ],
    },
    {
        id: 'preferences',
        label: 'Preference Cookies',
        icon: '⚙️',
        required: false,
        enabled: true,
        color: 'violet',
        desc: 'Remember your settings and personalisation choices to improve your experience across visits.',
        examples: [
            { name: 'search_prefs', purpose: 'Saves your last search parameters (city, date) for convenience.', duration: '7 days' },
            { name: 'ui_theme', purpose: 'Remembers your display preferences (e.g., compact vs default view).', duration: '1 year' },
            { name: 'notif_prefs', purpose: 'Stores your notification preference settings.', duration: '1 year' },
        ],
    },
    {
        id: 'performance',
        label: 'Performance Cookies',
        icon: '⚡',
        required: false,
        enabled: false,
        color: 'amber',
        desc: 'Help deliver a faster, more reliable experience by caching assets and optimising server routing.',
        examples: [
            { name: '_cdn_cache', purpose: 'CDN provider caches static assets closer to your location.', duration: '24 hours' },
            { name: '_route_pref', purpose: 'Routes requests to the optimal server region for speed.', duration: '6 hours' },
        ],
    },
    {
        id: 'third-party',
        label: 'Third-Party Cookies',
        icon: '🔗',
        required: false,
        enabled: false,
        color: 'green',
        desc: 'Set by external services we integrate with. Currently limited to payment processing and map services.',
        examples: [
            { name: 'razorpay_*', purpose: 'Payment processor session tokens for secure transactions.', duration: 'Session' },
            { name: 'maps_pref', purpose: 'Map provider preferences for ride location display.', duration: '30 days' },
        ],
    },
];

const colorMap = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', toggle: 'bg-blue-600', icon: 'text-blue-600' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', toggle: 'bg-indigo-600', icon: 'text-indigo-600' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', toggle: 'bg-violet-600', icon: 'text-violet-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', toggle: 'bg-amber-500', icon: 'text-amber-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', toggle: 'bg-green-600', icon: 'text-green-600' },
};

function Toggle({ enabled, required, onChange }) {
    return (
        <button
            onClick={() => !required && onChange(!enabled)}
            disabled={required}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${required ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            aria-label="Toggle cookie category"
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    );
}

export default function Cookies() {
    const [prefs, setPrefs] = useState(() =>
        Object.fromEntries(COOKIE_TYPES.map(c => [c.id, c.enabled]))
    );
    const [expanded, setExpanded] = useState(null);
    const [saved, setSaved] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    const toggle = (id, value) => setPrefs(p => ({ ...p, [id]: value }));

    const savePrefs = () => {
        try { localStorage.setItem('smr_cookie_prefs', JSON.stringify(prefs)); } catch { }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const acceptAll = () => {
        const all = Object.fromEntries(COOKIE_TYPES.map(c => [c.id, true]));
        setPrefs(all);
        try { localStorage.setItem('smr_cookie_prefs', JSON.stringify(all)); } catch { }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const essentialOnly = () => {
        const essential = Object.fromEntries(COOKIE_TYPES.map(c => [c.id, c.required]));
        setPrefs(essential);
        try { localStorage.setItem('smr_cookie_prefs', JSON.stringify(essential)); } catch { }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const enabledCount = Object.values(prefs).filter(Boolean).length;

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Hero ── */}
            <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-14 sm:py-20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-400 rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Cookie Policy</div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Your data, your choices
                    </h1>
                    <p className="text-blue-100 leading-relaxed max-w-xl mx-auto text-sm mb-6">
                        We use cookies to make ShareMyRide work well and to understand how to improve it. You control which non-essential cookies we use.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-blue-100 text-xs border border-white/20">
                        🍪 Currently using <span className="font-bold text-white mx-1">{enabledCount}</span> of {COOKIE_TYPES.length} cookie categories
                    </div>
                </div>
            </section>

            {/* ── Quick actions ── */}
            <div className="bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-600">Manage your cookie preferences below, then save your choices.</p>
                    <div className="flex gap-2 flex-shrink-0">
                        <button onClick={essentialOnly} className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                            Essential Only
                        </button>
                        <button onClick={acceptAll} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                            Accept All
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-4">

                {/* ── What are cookies ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-8">
                    <h2 className="text-base font-bold text-gray-900 mb-3">What are cookies?</h2>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        Cookies are small text files stored on your device by websites you visit. They help websites remember your preferences, keep you signed in, and understand how you use their features — so the experience can be personalised and improved over time.
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        ShareMyRide uses cookies and similar technologies (like session tokens and local storage) to power our platform. We are committed to only using what's necessary, and giving you clear control over the rest.
                    </p>
                </div>

                {/* ── Cookie categories ── */}
                {COOKIE_TYPES.map(cat => {
                    const c = colorMap[cat.color];
                    const isOpen = expanded === cat.id;
                    const isOn = prefs[cat.id];

                    return (
                        <div
                            key={cat.id}
                            className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm ${isOpen ? `${c.border}` : 'border-gray-100'}`}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-4 p-5">
                                <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.icon} flex items-center justify-center text-xl flex-shrink-0`}>
                                    {cat.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="font-bold text-gray-900 text-sm">{cat.label}</h3>
                                        {cat.required && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>Required</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 leading-snug">{cat.desc}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <Toggle enabled={isOn} required={cat.required} onChange={val => toggle(cat.id, val)} />
                                    <button
                                        onClick={() => setExpanded(isOpen ? null : cat.id)}
                                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                                    >
                                        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Expandable examples */}
                            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                                <div className={`px-5 pb-5 ${c.bg} mx-4 mb-4 rounded-xl border ${c.border}`}>
                                    <div className="pt-4">
                                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Cookie details</div>
                                        <div className="space-y-3">
                                            {cat.examples.map(ex => (
                                                <div key={ex.name} className="flex items-start gap-3 text-xs">
                                                    <code className="bg-white px-2 py-0.5 rounded-md border border-gray-200 text-gray-700 font-mono flex-shrink-0">{ex.name}</code>
                                                    <div className="flex-1">
                                                        <p className="text-gray-700">{ex.purpose}</p>
                                                        <p className="text-gray-400 mt-0.5">Duration: {ex.duration}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* ── Save button ── */}
                <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{enabledCount}</span> of {COOKIE_TYPES.length} categories enabled
                    </div>
                    <button
                        onClick={savePrefs}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {saved ? '✓ Preferences Saved' : 'Save My Preferences'}
                    </button>
                </div>

                {/* ── Managing cookies section ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                    <h2 className="text-base font-bold text-gray-900">Managing cookies in your browser</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        In addition to the controls above, you can manage or delete cookies directly in your browser settings. Most browsers allow you to view, delete, and block cookies on a per-site basis. Note that blocking essential cookies will prevent ShareMyRide from functioning correctly.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {[
                            { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
                            { name: 'Firefox', url: 'https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer' },
                            { name: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac' },
                            { name: 'Edge', url: 'https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406' },
                        ].map(b => (
                            <a
                                key={b.name}
                                href={b.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-blue-600 font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors border border-gray-100"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                {b.name} Cookie Settings
                            </a>
                        ))}
                    </div>
                </div>

                {/* ── Contact ── */}
                <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                    <h3 className="font-bold text-gray-900 text-sm mb-2">Questions about our use of cookies?</h3>
                    <p className="text-xs text-gray-600 mb-3">
                        Our data team is happy to explain exactly what we track and why.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <a href="mailto:sharemyride@gmail.com" className="flex items-center gap-2 text-xs text-blue-600 font-medium hover:underline">
                            ✉️ sharemyride@gmail.com
                        </a>
                        <a href="tel:+919617714737" className="flex items-center gap-2 text-xs text-blue-600 font-medium hover:underline">
                            📞 +91 9617714737
                        </a>
                    </div>
                </div>

                <p className="text-xs text-gray-400 text-center">Cookie Policy last updated: June 1, 2026. We will notify you of any material changes via email.</p>

            </div>

        </div>
    );
}