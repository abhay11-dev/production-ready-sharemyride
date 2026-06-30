import React, { useState } from 'react';
import axios from 'axios';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

// ─── EmailJS config (from .env — see setup walkthrough) ───────────────────
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_USER_CONFIRMATION = import.meta.env.VITE_EMAILJS_TEMPLATE_USER_CONFIRMATION;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Maps UI selection → Inquiry model's valid `type` enum values
const INQUIRY_TYPE_MAP = {
    general: 'contact_general',
    partnership: 'contact_partnership',
    corporate: 'contact_corporate',
    community: 'contact_community',
    media: 'contact_media',
    feedback: 'contact_feedback',
};

const INQUIRY_TYPES = [
    { id: 'general', label: 'General Inquiry', icon: '💬', desc: 'Questions about the platform or your account.' },
    { id: 'partnership', label: 'Partnerships', icon: '🤝', desc: 'Strategic collaborations and integrations.' },
    { id: 'corporate', label: 'Corporate Carpooling', icon: '🏢', desc: 'Employee commute programs for companies.' },
    { id: 'community', label: 'Community Collaboration', icon: '🌱', desc: 'NGOs, colleges, and social impact projects.' },
    { id: 'media', label: 'Media & Press', icon: '📰', desc: 'Journalists, bloggers, and content creators.' },
    { id: 'feedback', label: 'Feedback', icon: '⭐', desc: 'Share your experience or suggestions.' },
];


/* ─── Hero background (same pattern as About.jsx) ── */
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

/**
 * Fire the EmailJS "user confirmation" email using the emailAction object
 * the backend returns. Non-fatal — if EmailJS fails, we just log it; the
 * inquiry is already saved server-side regardless.
 */
const sendUserConfirmationViaEmailJS = async (emailAction) => {
    console.log("Service ID:", import.meta.env.VITE_EMAILJS_SERVICE_ID);
console.log("Template ID:", import.meta.env.VITE_EMAILJS_TEMPLATE_USER_CONFIRMATION);
console.log("Public Key:", import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
    if (!emailAction?.payload) return;
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_USER_CONFIRMATION || !EMAILJS_PUBLIC_KEY) {
        console.warn('[EmailJS] Missing service/template/public key env vars — skipping send.');
        return;
    }
    try {
        await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_USER_CONFIRMATION,
            emailAction.payload,
            { publicKey: EMAILJS_PUBLIC_KEY }
        );
    } catch (err) {
        console.error('[EmailJS] Failed to send user confirmation email:', err);
        // Non-fatal: don't block the success UI just because the email failed
    }
};

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
                type: INQUIRY_TYPE_MAP[selected] || 'contact_general',
                inquiryType: INQUIRY_TYPE_MAP[selected] || 'contact_general',
            });

            const data = res.data?.data || {};
            setTicketId(data.ticketId || data.ticketNumber || '');
            setSent(true);
            toast.success('Your inquiry has been submitted!', {
                style: { borderRadius: '8px', background: '#1e293b', color: '#fff', fontSize: '14px' },
            });

            // Fire the confirmation email client-side via EmailJS.
            // Don't await-block the UI on this — already showed success above.
            const emailAction = res.data?.emailActions?.userConfirmation;
            sendUserConfirmationViaEmailJS(emailAction);

        } catch (err) {
            console.error('Inquiry submission error:', err);
            toast.error(err.response?.data?.message || 'Failed to submit. Please try again.', {
                style: { borderRadius: '8px', background: '#dc2626', color: '#fff', fontSize: '14px' },
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">

          {/* ── Hero ── */}
<section className="bg-gradient-to-br from-blue-700 to-blue-900 min-h-screen relative overflow-hidden flex flex-col justify-center">
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <HeroBackground />
    </div>
    <div className="relative max-w-3xl mx-auto px-4 text-center py-20">
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
                                <p className="text-gray-500 text-sm">
                                    We've received your message and will get back to you within 24–48 hours. A confirmation has been sent to your email.
                                </p>
                                <button
                                    onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); setTicketId(''); }}
                                    className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
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
                                        <>
                                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Submitting...
                                        </>
                                    ) : 'Submit Inquiry →'}
                                </button>
                                <p className="text-xs text-gray-400 text-center">
                                    Your inquiry is saved securely and our team will respond via email within 24–48 hours.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}