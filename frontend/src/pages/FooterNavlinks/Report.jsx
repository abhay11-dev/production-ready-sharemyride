import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

function useScrollTop() { useEffect(() => { window.scrollTo(0, 0); }, []); }

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

// ─── EmailJS config (from .env — see setup walkthrough) ───────────────────
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_USER_CONFIRMATION = import.meta.env.VITE_EMAILJS_TEMPLATE_USER_CONFIRMATION;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

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
    }
};

// Maps UI selection → Inquiry model's valid `type` enum values
const ISSUE_TYPE_MAP = {
  technical: 'report_technical',
  ride: 'report_ride',
  safety: 'report_safety',
  account: 'report_account',
  payment: 'report_payment',
  other: 'report_other',
};

const ISSUE_TYPES = [
  { id: 'technical', label: 'Technical Bug', icon: '🐛', color: 'blue', desc: 'App crashes, broken features, display errors.' },
  { id: 'ride', label: 'Ride Issue', icon: '🚗', color: 'amber', desc: 'Booking problems, cancelled rides, driver disputes.' },
  { id: 'safety', label: 'Safety Concern', icon: '🛡️', color: 'red', desc: 'Unsafe behaviour, harassment, misconduct.' },
  { id: 'account', label: 'Account Issue', icon: '👤', color: 'violet', desc: 'Login problems, verification failures, profile issues.' },
  { id: 'payment', label: 'Payment Issue', icon: '💸', color: 'green', desc: 'Incorrect charges, refund requests, payment failures.' },
  { id: 'other', label: 'Other', icon: '📌', color: 'gray', desc: 'Something not covered above.' },
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
  useScrollTop();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState('technical');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '',
    summary: '', affectedPage: '',
    stepsToReproduce: '', expected: '', actual: '',
    additionalNotes: '',
  });

  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, name: user.name || f.name, email: user.email || f.email }));
    }
  }, [user]);

  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const issueLabel = ISSUE_TYPES.find(t => t.id === selected)?.label || 'Issue';
      const payload = {
        name: form.name,
        email: form.email,
        subject: `${issueLabel}: ${form.summary}`,
        message: form.summary,
        type: ISSUE_TYPE_MAP[selected] || 'report_other',
        meta: {
          affectedPage: form.affectedPage,
          stepsToReproduce: form.stepsToReproduce,
          expectedBehaviour: form.expected,
          actualBehaviour: form.actual,
          additionalNotes: form.additionalNotes,
          severity: selected === 'safety' ? 'critical' : 'medium',
        },
      };

      const res = await api.post('/inquiries', payload);
      const data = res.data?.data || {};
      setResult({
        success: true,
        ticketNumber: data.ticketId || data.ticketNumber || 'TKT-0000',
      });
      setStep(3);

      // Fire confirmation email client-side via EmailJS (non-blocking)
      const emailAction = res.data?.emailActions?.userConfirmation;
      sendUserConfirmationViaEmailJS(emailAction);

    } catch (err) {
      setResult({
        success: false,
        error: 'We could not submit your report right now. Please email sharemyride.contact@gmail.com directly.',
      });
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const issueType = ISSUE_TYPES.find(t => t.id === selected);
  const c = colorMap[issueType?.color || 'blue'];

  const resetForm = () => {
    setStep(1);
    setSelected('technical');
    setResult(null);
    setForm(f => ({ ...f, summary: '', affectedPage: '', stepsToReproduce: '', expected: '', actual: '', additionalNotes: '' }));
  };

  // ── Step labels ──────────────────────────────────────────────────────────
  const STEPS = [
    { n: 1, label: 'Issue Type' },
    { n: 2, label: 'Details' },
    { n: 3, label: 'Submitted' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ══════════════════════════════════════════════════════════════
          HERO — full-screen blue, matching About/Blog/ContactUs style
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden min-h-screen flex flex-col items-center justify-center">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  <HeroBackground />
</div>

        {/* Content */}
        <div className="relative w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20 sm:py-28 flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest">
            Report an Issue
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Found something<br className="hidden sm:block" />
            <span className="text-red-300"> wrong?</span>
          </h1>

          <p className="text-base sm:text-lg text-blue-100 leading-relaxed max-w-xl mx-auto">
            Every report helps us make ShareMyRide better, safer, and more reliable. Your report goes directly to our team — no email client needed.
          </p>

          {/* Quick-scroll CTA */}
          <button
            onClick={() => document.getElementById('report-form-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-sm sm:text-base"
          >
            Start your report
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Safety callout badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-xs sm:text-sm font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Safety reports are reviewed within 12 hours.
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PROGRESS BAR
      ══════════════════════════════════════════════════════════════ */}
      <div id="report-form-section" className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className={`flex items-center gap-1.5 sm:gap-2 min-w-0 ${step >= s.n ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= s.n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className="text-xs font-medium hidden sm:block truncate">{s.label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-px ${step > s.n ? 'bg-blue-400' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FORM BODY
      ══════════════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">

        {/* ── Step 3: Result ─────────────────────────────────────── */}
        {step === 3 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10 text-center">
            {result?.success ? (
              <>
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Report submitted successfully</h2>
                {result.ticketNumber && (
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4">
                    <span className="text-xs text-gray-500">Reference ID</span>
                    <span className="font-mono font-bold text-blue-700 text-sm">{result.ticketNumber}</span>
                  </div>
                )}
                <p className="text-gray-500 text-sm mb-2">
                  Your report has been sent directly to our team. We review all reports within 24–48 hours.
                </p>
                <p className="text-gray-400 text-xs mb-7">
                  A confirmation has been sent to <span className="font-medium text-gray-600">{form.email}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={resetForm} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                    Submit another report
                  </button>
                  <Link to="/" onClick={() => window.scrollTo(0, 0)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors text-center">
                    Back to home
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Submission issue</h2>
                <p className="text-gray-500 text-sm mb-6">{result?.error}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                    Try again
                  </button>
                  <a href="mailto:sharemyride.contact@gmail.com" className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors text-center">
                    Email us directly
                  </a>
                </div>
              </>
            )}
          </div>

        ) : step === 1 ? (
          /* ── Step 1: Select type ─────────────────────────────── */
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">What kind of issue is this?</h2>
            <p className="text-sm text-gray-500 mb-5 sm:mb-6">Select the category that best describes what you experienced.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 sm:mb-7">
              {ISSUE_TYPES.map(type => {
                const tc = colorMap[type.color];
                const isSel = selected === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelected(type.id)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${isSel ? `${tc.border} ${tc.bg}` : 'border-gray-100 bg-white hover:border-gray-300'}`}
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

            {selected === 'safety' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <div className="font-semibold text-red-800 text-sm mb-1">Safety concerns are prioritised</div>
                  <p className="text-xs text-red-700 leading-relaxed">
                    All safety reports go directly to our Trust &amp; Safety team and are reviewed within 12 hours. If you are in immediate danger, call 112.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 sm:py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
            >
              Continue — Fill in Details
            </button>
          </div>

        ) : (
          /* ── Step 2: Form ────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Selected type banner */}
            <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl ${c.bg} border ${c.border}`}>
              <span className="text-xl sm:text-2xl">{issueType?.icon}</span>
              <div className="min-w-0">
                <div className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{issueType?.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{issueType?.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ml-auto text-xs text-gray-400 hover:text-gray-700 font-medium whitespace-nowrap flex-shrink-0"
              >
                Change
              </button>
            </div>

            {/* Your details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Your details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name *</label>
                  <input
                    name="name"
                    required
                    value={form.name}
                    onChange={change}
                    placeholder="Full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={change}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Issue details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Issue details</h3>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Issue Summary *</label>
                <input
                  name="summary"
                  required
                  value={form.summary}
                  onChange={change}
                  placeholder="One-line description of the issue"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Affected Page / Feature</label>
                <input
                  name="affectedPage"
                  value={form.affectedPage}
                  onChange={change}
                  placeholder="e.g. Ride Search, Booking Confirmation"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Steps to Reproduce *</label>
                <textarea
                  name="stepsToReproduce"
                  required
                  rows={3}
                  value={form.stepsToReproduce}
                  onChange={change}
                  placeholder={"1. Go to...\n2. Click on...\n3. See error"}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expected Behaviour *</label>
                  <textarea
                    name="expected"
                    required
                    rows={3}
                    value={form.expected}
                    onChange={change}
                    placeholder="What should have happened?"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Actual Behaviour *</label>
                  <textarea
                    name="actual"
                    required
                    rows={3}
                    value={form.actual}
                    onChange={change}
                    placeholder="What actually happened?"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Additional Notes</label>
                <textarea
                  name="additionalNotes"
                  rows={2}
                  value={form.additionalNotes}
                  onChange={change}
                  placeholder="Device, browser, app version, or anything else that might help..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400"
                />
              </div>

              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your report is submitted directly to our team — no email client required. You will receive a reference number on submission.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 sm:px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Submitting...
                  </>
                ) : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Alt contact (only on steps 1 & 2) ── */}
      {step !== 3 && (
        <section className="border-t border-gray-100 bg-white py-8 sm:py-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-sm text-gray-500 mb-3">Prefer to contact us directly?</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="tel:+919617714737"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +91 9617714737
              </a>
              <a
                href="mailto:sharemyride.contact@gmail.com"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                sharemyride.contact@gmail.com
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}