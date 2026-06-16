import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ── Try to read user from localStorage (matching useAuth pattern) ── */
function useStoredUser() {
    const [user, setUser] = useState(null);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) setUser(JSON.parse(raw));
        } catch { }
    }, []);
    return user;
}

const ISSUE_TYPES = [
    { id: 'technical', label: 'Technical Bug', icon: '🐛', color: 'blue', desc: 'App crashes, broken features, display errors.', subject: 'Technical Bug Report' },
    { id: 'ride', label: 'Ride Issue', icon: '🚗', color: 'amber', desc: 'Booking problems, cancelled rides, driver disputes.', subject: 'Ride Issue Report' },
    { id: 'safety', label: 'Safety Concern', icon: '🛡️', color: 'red', desc: 'Unsafe behaviour, harassment, misconduct.', subject: 'Safety Concern Report' },
    { id: 'account', label: 'Account Issue', icon: '👤', color: 'violet', desc: 'Login problems, verification failures, profile issues.', subject: 'Account Issue Report' },
    { id: 'payment', label: 'Payment Issue', icon: '💸', color: 'green', desc: 'Incorrect charges, refund requests, payment failures.', subject: 'Payment Issue Report' },
    { id: 'other', label: 'Other', icon: '📌', color: 'gray', desc: 'Something not covered above.', subject: 'General Issue Report' },
];

const colorMap = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-600' },
    amber: { border: 'border-amber-500', bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600' },
    red: { border: 'border-red-500', bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', text: 'text-red-600' },
    violet: { border: 'border-violet-500', bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', text: 'text-violet-600' },
    green: { border: 'border-green-500', bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
    gray: { border: 'border-gray-400', bg: 'bg-gray-50', icon: 'bg-gray-100 text-gray-600', text: 'text-gray-600' },
};

export default function Report() {
    const user = useStoredUser();

    const [selected, setSelected] = useState('technical');
    const [step, setStep] = useState(1); // 1 = select type, 2 = fill form, 3 = success
    const [form, setForm] = useState({
        name: '',
        email: '',
        summary: '',
        affectedPage: '',
        stepsToReproduce: '',
        expected: '',
        actual: '',
        additionalNotes: '',
    });

    // Pre-fill from stored user
    useEffect(() => {
        if (user) {
            setForm(f => ({
                ...f,
                name: user.name || f.name,
                email: user.email || f.email,
            }));
        }
    }, [user]);

    const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const buildMailto = () => {
        const type = ISSUE_TYPES.find(t => t.id === selected);
        const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

        const subject = encodeURIComponent(`Issue: ${type.subject}`);
        const body = encodeURIComponent(
            `Date: ${today}

I am ${form.name || '[Your Name]'} and I found an issue on ShareMyRide.

Issue Summary:
${form.summary || '[Describe the issue briefly]'}

Affected Page:
${form.affectedPage || '[Which page or feature was affected?]'}

Steps To Reproduce:
${form.stepsToReproduce || '[List the steps that led to this issue]'}

Expected Behaviour:
${form.expected || '[What should have happened?]'}

Actual Behaviour:
${form.actual || '[What actually happened?]'}

Screenshots (optional):
[Please attach any screenshots to this email]

Additional Notes:
${form.additionalNotes || 'None'}

---
Reported by: ${form.name || 'Anonymous'}
Email: ${form.email || 'Not provided'}

Thank you.`
        );

        return `mailto:sharemyride@gmail.com?subject=${subject}&body=${body}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        window.location.href = buildMailto();
        setStep(3);
    };

    const issueType = ISSUE_TYPES.find(t => t.id === selected);
    const c = colorMap[issueType?.color || 'blue'];

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Hero ── */}
            <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-14 sm:py-20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-80 h-80 bg-red-400 rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Report an Issue</div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Found something wrong?
                    </h1>
                    <p className="text-blue-100 leading-relaxed max-w-xl mx-auto">
                        Every report helps us make ShareMyRide better, safer, and more reliable for the whole community. Tell us what happened.
                    </p>
                </div>
            </section>

            {/* ── Progress bar ── */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-2">
                        {[{ n: 1, label: 'Issue Type' }, { n: 2, label: 'Details' }, { n: 3, label: 'Submitted' }].map((s, i) => (
                            <React.Fragment key={s.n}>
                                <div className={`flex items-center gap-2 ${step >= s.n ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {step > s.n ? '✓' : s.n}
                                    </div>
                                    <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                                </div>
                                {i < 2 && <div className={`flex-1 h-px ${step > s.n ? 'bg-blue-400' : 'bg-gray-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

                {/* ── Step 3: Success ── */}
                {step === 3 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-5">✅</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Report sent!</h2>
                        <p className="text-gray-500 text-sm mb-2">
                            Your email client should have opened with the report pre-filled. If not, copy the email below and send it manually.
                        </p>
                        <a href="mailto:sharemyride@gmail.com" className="text-blue-600 text-sm font-medium hover:underline">sharemyride@gmail.com</a>
                        <p className="text-xs text-gray-400 mt-4 mb-7">We review all reports within 24–48 hours on working days.</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => { setStep(1); setForm(f => ({ ...f, summary: '', affectedPage: '', stepsToReproduce: '', expected: '', actual: '', additionalNotes: '' })); }}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Submit another report
                            </button>
                            <Link to="/" className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                                Back to home
                            </Link>
                        </div>
                    </div>
                ) : step === 1 ? (
                    /* ── Step 1: Select type ── */
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">What kind of issue is this?</h2>
                        <p className="text-sm text-gray-500 mb-6">Select the category that best describes what you experienced.</p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-7">
                            {ISSUE_TYPES.map(type => {
                                const tc = colorMap[type.color];
                                const isSelected = selected === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setSelected(type.id)}
                                        className={`text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? `${tc.border} ${tc.bg}` : 'border-gray-100 bg-white hover:border-gray-300'}`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl ${tc.icon} flex items-center justify-center text-xl mb-3`}>
                                            {type.icon}
                                        </div>
                                        <div className="font-semibold text-gray-900 text-sm mb-0.5">{type.label}</div>
                                        <div className="text-xs text-gray-500">{type.desc}</div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Safety callout */}
                        {selected === 'safety' && (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex gap-3">
                                <span className="text-xl flex-shrink-0">⚠️</span>
                                <div>
                                    <div className="font-semibold text-red-800 text-sm mb-1">Safety concerns are prioritised</div>
                                    <p className="text-xs text-red-700 leading-relaxed">All safety reports go directly to our Trust & Safety team and are reviewed within 12 hours. If you are in immediate danger, call 112.</p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
                        >
                            Continue → Fill in Details
                        </button>
                    </div>
                ) : (
                    /* ── Step 2: Form ── */
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className={`flex items-center gap-3 p-4 rounded-2xl ${c.bg} border ${c.border}`}>
                            <span className="text-2xl">{issueType?.icon}</span>
                            <div>
                                <div className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{issueType?.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{issueType?.desc}</div>
                            </div>
                            <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs text-gray-400 hover:text-gray-700">Change</button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
                            <h3 className="font-bold text-gray-900">Your details</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Name *</label>
                                    <input name="name" required value={form.name} onChange={change} placeholder="Full name" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
                                    <input name="email" type="email" required value={form.email} onChange={change} placeholder="your@email.com" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
                            <h3 className="font-bold text-gray-900">Issue details</h3>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Issue Summary *</label>
                                <input name="summary" required value={form.summary} onChange={change} placeholder="One-line description of the issue" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Affected Page / Feature</label>
                                <input name="affectedPage" value={form.affectedPage} onChange={change} placeholder="e.g. Ride Search, Booking Confirmation, Profile Page" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Steps to Reproduce *</label>
                                <textarea name="stepsToReproduce" required rows={3} value={form.stepsToReproduce} onChange={change} placeholder="1. Go to…&#10;2. Click on…&#10;3. See error" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expected Behaviour *</label>
                                    <textarea name="expected" required rows={3} value={form.expected} onChange={change} placeholder="What should have happened?" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Actual Behaviour *</label>
                                    <textarea name="actual" required rows={3} value={form.actual} onChange={change} placeholder="What actually happened?" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Additional Notes</label>
                                <textarea name="additionalNotes" rows={2} value={form.additionalNotes} onChange={change} placeholder="Device, browser, app version, or anything else that might help…" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
                            </div>

                            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                                <span>📎</span>
                                <span>After submitting, please attach any screenshots to the email that opens.</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setStep(1)} className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                                ← Back
                            </button>
                            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm">
                                Send Report via Email →
                            </button>
                        </div>

                        <p className="text-center text-xs text-gray-400">
                            This opens your email client with the report pre-filled. Your email:{' '}
                            <span className="text-blue-600">sharemyride@gmail.com</span>
                        </p>
                    </form>
                )}

            </div>

            {/* ── Alt contact ── */}
            {step !== 3 && (
                <section className="border-t border-gray-100 bg-white py-10">
                    <div className="max-w-2xl mx-auto px-4 text-center">
                        <p className="text-sm text-gray-500 mb-3">Prefer to contact us directly?</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a href="tel:+919617714737" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                                📞 +91 9617714737
                            </a>
                            <a href="mailto:sharemyride@gmail.com" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                                ✉️ sharemyride@gmail.com
                            </a>
                        </div>
                    </div>
                </section>
            )}

        </div>
    );
}