import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const INQUIRY_TYPES = [
    { id: 'general', label: 'General Inquiry', icon: '💬', desc: 'Questions about the platform or your account.' },
    { id: 'partnership', label: 'Partnerships', icon: '🤝', desc: 'Strategic collaborations and integrations.' },
    { id: 'corporate', label: 'Corporate Carpooling', icon: '🏢', desc: 'Employee commute programs for companies.' },
    { id: 'community', label: 'Community Collaboration', icon: '🌱', desc: 'NGOs, colleges, and social impact projects.' },
    { id: 'media', label: 'Media & Press', icon: '📰', desc: 'Journalists, bloggers, and content creators.' },
    { id: 'feedback', label: 'Feedback', icon: '⭐', desc: 'Share your experience or suggestions.' },
];

export default function ContactUs() {
    const [selected, setSelected] = useState('general');
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [sent, setSent] = useState(false);
    const [ticketId, setTicketId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await axios.post(`${API_URL}/inquiries`, {
                name: form.name,
                email: form.email,
                subject: form.subject,
                message: form.message,
                inquiryType: selected
            });
            setTicketId(res.data.data?.ticketId || '');
            setSent(true);
            toast.success('Your inquiry has been submitted!', {
                style: { borderRadius: '8px', background: '#1e293b', color: '#fff', fontSize: '14px' }
            });
        } catch (err) {
            console.error('Inquiry submission error:', err);
            toast.error(err.response?.data?.message || 'Failed to submit. Please try again.', {
                style: { borderRadius: '8px', background: '#dc2626', color: '#fff', fontSize: '14px' }
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Hero ── */}
            <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-16 sm:py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-green-400 rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-3xl mx-auto px-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Contact Us</div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-5 tracking-tight">
                        Let's build something together
                    </h1>
                    <p className="text-blue-100 leading-relaxed max-w-xl mx-auto">
                        From partnerships to enterprise carpooling, we're open to conversations that help more people travel smarter.
                    </p>
                </div>
            </section>

            {/* ── Inquiry type selector ── */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-8">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-2">What brings you here?</div>
                    <h2 className="text-xl font-bold text-gray-900">Select inquiry type</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
                    {INQUIRY_TYPES.map(type => (
                        <button
                            key={type.id}
                            onClick={() => setSelected(type.id)}
                            className={`text-left p-4 rounded-2xl border-2 transition-all ${selected === type.id
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-gray-100 bg-white hover:border-blue-200'
                                }`}
                        >
                            <div className="text-2xl mb-2">{type.icon}</div>
                            <div className="font-semibold text-gray-900 text-sm mb-1">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.desc}</div>
                        </button>
                    ))}
                </div>

                {/* ── Form + Info side by side ── */}
                <div className="grid lg:grid-cols-5 gap-8">

                    {/* Left: Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </span>
                                Phone
                            </div>
                            <a href="tel:+919617714737" className="text-sm text-blue-600 font-medium hover:underline">
                                +91 9617714737
                            </a>
                            <p className="text-xs text-gray-400 mt-1">Mon–Sat, 9am–6pm IST</p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                Email
                            </div>
                            <a href="mailto:sharemyride@gmail.com" className="text-sm text-blue-600 font-medium hover:underline break-all">
                                sharemyride@gmail.com
                            </a>
                            <p className="text-xs text-gray-400 mt-1">Responses within 24 hours</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
                            <div className="font-bold mb-2">Enterprise Carpooling</div>
                            <p className="text-xs text-blue-100 leading-relaxed mb-4">
                                Help your team commute smarter. ShareMyRide for companies reduces transport costs, cuts emissions, and builds workplace community.
                            </p>
                            <div className="text-xs font-semibold text-green-300">✦ Custom pricing available</div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="lg:col-span-3">
                        {sent ? (
                            <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center">
                                <div className="text-5xl mb-4">✅</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Inquiry Submitted!</h3>
                                {ticketId && (
                                    <div className="inline-block bg-blue-50 text-blue-700 font-mono font-bold px-4 py-2 rounded-lg text-sm mb-3">
                                        Reference: {ticketId}
                                    </div>
                                )}
                                <p className="text-gray-500 text-sm">We've received your message and will get back to you within 24–48 hours. A confirmation has been sent to your email.</p>
                                <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); setTicketId(''); }} className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                                    Send another inquiry
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm space-y-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name *</label>
                                        <input
                                            name="name"
                                            required
                                            value={form.name}
                                            onChange={handleChange}
                                            placeholder="Your full name"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="your@email.com"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subject *</label>
                                    <input
                                        name="subject"
                                        required
                                        value={form.subject}
                                        onChange={handleChange}
                                        placeholder="What's this about?"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message *</label>
                                    <textarea
                                        name="message"
                                        required
                                        rows={6}
                                        value={form.message}
                                        onChange={handleChange}
                                        placeholder="Tell us more…"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400 resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                                    ) : 'Submit Inquiry →'}
                                </button>
                                <p className="text-xs text-gray-400 text-center">Your inquiry will be stored securely and our team will respond via email.</p>
                            </form>
                        )}
                    </div>

                </div>
            </section>

        </div>
    );
}