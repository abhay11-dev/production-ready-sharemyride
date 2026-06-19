import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

function useScrollTop() { useEffect(() => { window.scrollTo(0, 0); }, []); }

const ISSUE_TYPES = [
  { id: 'technical',  label: 'Technical Bug',    icon: '🐛', color: 'blue',   desc: 'App crashes, broken features, display errors.' },
  { id: 'ride',       label: 'Ride Issue',        icon: '🚗', color: 'amber',  desc: 'Booking problems, cancelled rides, driver disputes.' },
  { id: 'safety',     label: 'Safety Concern',    icon: '🛡️', color: 'red',    desc: 'Unsafe behaviour, harassment, misconduct.' },
  { id: 'account',    label: 'Account Issue',     icon: '👤', color: 'violet', desc: 'Login problems, verification failures, profile issues.' },
  { id: 'payment',    label: 'Payment Issue',     icon: '💸', color: 'green',  desc: 'Incorrect charges, refund requests, payment failures.' },
  { id: 'other',      label: 'Other',             icon: '📌', color: 'gray',   desc: 'Something not covered above.' },
];

const colorMap = {
  blue:   { border: 'border-blue-500',   bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-600' },
  amber:  { border: 'border-amber-500',  bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',  text: 'text-amber-600' },
  red:    { border: 'border-red-500',    bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',      text: 'text-red-600' },
  violet: { border: 'border-violet-500', bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600',text: 'text-violet-600' },
  green:  { border: 'border-green-500',  bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  text: 'text-green-600' },
  gray:   { border: 'border-gray-400',   bg: 'bg-gray-50',   icon: 'bg-gray-100 text-gray-600',    text: 'text-gray-600' },
};

export default function Report() {
  useScrollTop();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState('technical');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { success, ticketNumber, error }
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

  /* Point 13: Submit directly — no mailto, API call only */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name:    form.name,
        email:   form.email,
        subject: `${ISSUE_TYPES.find(t => t.id === selected)?.label}: ${form.summary}`,
        message: form.summary,
        type:    `report_${selected}`,
        meta: {
          affectedPage:      form.affectedPage,
          stepsToReproduce:  form.stepsToReproduce,
          expectedBehaviour: form.expected,
          actualBehaviour:   form.actual,
          additionalNotes:   form.additionalNotes,
          severity: selected === 'safety' ? 'critical' : 'medium',
        },
      };
      const res = await api.post('/inquiries', payload);
      setResult({ success: true, ticketNumber: res.data?.data?.ticketNumber || res.data?.ticketNumber || 'TKT-0000' });
      setStep(3);
    } catch (err) {
      /* Point 5: Never expose API errors */
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

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero — consistent blue (Point 9) ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-80 h-80 bg-red-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-6">
            Report an Issue
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Found something wrong?
          </h1>
          <p className="text-blue-100 leading-relaxed max-w-xl mx-auto">
            Every report helps us make ShareMyRide better, safer, and more reliable. Your report is submitted directly to our team — no email client needed.
          </p>
        </div>
      </section>

      {/* ── Progress ── */}
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

        {/* ── Step 3: Result ── */}
        {step === 3 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            {result?.success ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Report submitted successfully</h2>
                {result.ticketNumber && (
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4">
                    <span className="text-xs text-gray-500">Reference ID</span>
                    <span className="font-mono font-bold text-blue-700 text-sm">{result.ticketNumber}</span>
                  </div>
                )}
                <p className="text-gray-500 text-sm mb-2">
                  Your report has been sent directly to our team. We review all reports within 24-48 hours.
                </p>
                <p className="text-gray-400 text-xs mb-7">
                  A confirmation has been sent to <span className="font-medium text-gray-600">{form.email}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={resetForm} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                    Submit another report
                  </button>
                  <Link to="/" onClick={() => window.scrollTo(0,0)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                    Back to home
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Submission issue</h2>
                <p className="text-gray-500 text-sm mb-6">{result?.error}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                    Try again
                  </button>
                  <a href="mailto:sharemyride.contact@gmail.com" className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                    Email us directly
                  </a>
                </div>
              </>
            )}
          </div>

        ) : step === 1 ? (
          /* ── Step 1: Select type ── */
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">What kind of issue is this?</h2>
            <p className="text-sm text-gray-500 mb-6">Select the category that best describes what you experienced.</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-7">
              {ISSUE_TYPES.map(type => {
                const tc = colorMap[type.color];
                const isSel = selected === type.id;
                return (
                  <button key={type.id} onClick={() => setSelected(type.id)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${isSel ? `${tc.border} ${tc.bg}` : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                    <div className={`w-9 h-9 rounded-xl ${tc.icon} flex items-center justify-center text-xl mb-3`}>{type.icon}</div>
                    <div className="font-semibold text-gray-900 text-sm mb-0.5">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.desc}</div>
                  </button>
                );
              })}
            </div>
            {selected === 'safety' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                  <div className="font-semibold text-red-800 text-sm mb-1">Safety concerns are prioritised</div>
                  <p className="text-xs text-red-700 leading-relaxed">All safety reports go directly to our Trust & Safety team and are reviewed within 12 hours. If you are in immediate danger, call 112.</p>
                </div>
              </div>
            )}
            <button onClick={() => setStep(2)} className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm">
              Continue — Fill in Details
            </button>
          </div>

        ) : (
          /* ── Step 2: Form — Point 13: direct API submit ── */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`flex items-center gap-3 p-4 rounded-2xl ${c.bg} border ${c.border}`}>
              <span className="text-2xl">{issueType?.icon}</span>
              <div>
                <div className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{issueType?.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{issueType?.desc}</div>
              </div>
              <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs text-gray-400 hover:text-gray-700 font-medium">Change</button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
              <h3 className="font-bold text-gray-900">Your details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name *</label>
                  <input name="name" required value={form.name} onChange={change} placeholder="Full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input name="email" type="email" required value={form.email} onChange={change} placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
              <h3 className="font-bold text-gray-900">Issue details</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Issue Summary *</label>
                <input name="summary" required value={form.summary} onChange={change} placeholder="One-line description of the issue"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Affected Page / Feature</label>
                <input name="affectedPage" value={form.affectedPage} onChange={change} placeholder="e.g. Ride Search, Booking Confirmation"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Steps to Reproduce *</label>
                <textarea name="stepsToReproduce" required rows={3} value={form.stepsToReproduce} onChange={change}
                  placeholder={"1. Go to...\n2. Click on...\n3. See error"}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expected Behaviour *</label>
                  <textarea name="expected" required rows={3} value={form.expected} onChange={change} placeholder="What should have happened?"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Actual Behaviour *</label>
                  <textarea name="actual" required rows={3} value={form.actual} onChange={change} placeholder="What actually happened?"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Additional Notes</label>
                <textarea name="additionalNotes" rows={2} value={form.additionalNotes} onChange={change}
                  placeholder="Device, browser, app version, or anything else that might help..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
              </div>

              {/* Point 13: inform user it's direct submit */}
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your report is submitted directly to our team — no email client required. You will receive a reference number on submission.
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                Back
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Submitting...</>
                ) : 'Submit Report'}
              </button>
            </div>
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                +91 9617714737
              </a>
              <a href="mailto:sharemyride.contact@gmail.com" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                sharemyride.contact@gmail.com
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}