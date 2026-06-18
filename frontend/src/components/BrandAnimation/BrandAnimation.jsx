import React, { useState, useEffect, useCallback } from 'react';

/**
 * ShareMyRide Brand Animation
 *
 * Usage — drop into Footer.jsx and Home.jsx:
 *
 *   import BrandAnimation from '../BrandAnimation/BrandAnimation.jsx';
 *
 *   const [showAnim, setShowAnim] = useState(false);
 *   <BrandAnimation show={showAnim} onClose={() => setShowAnim(false)} />
 *
 * Trigger it on the logo/brand click:
 *   onClick={() => setShowAnim(true)}
 *
 * Auto-dismisses after 6 seconds. Also dismisses on:
 *   - Any keypress
 *   - Click anywhere
 *   - Scroll
 */

const PARTICLE_COUNT = 22;
const AUTO_CLOSE_MS = 6000;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: rand(5, 95),
    y: rand(10, 90),
    size: rand(3, 7),
    delay: rand(0, 2.5),
    duration: rand(2.5, 5),
    opacity: rand(0.3, 0.7),
  }));
}

export default function BrandAnimation({ show, onClose }) {
  const [phase, setPhase] = useState('hidden'); // hidden | entering | active | leaving
  const [particles] = useState(generateParticles);

  // Phase machine
  useEffect(() => {
    if (!show) {
      setPhase(p => (p !== 'hidden' ? 'leaving' : 'hidden'));
      return;
    }
    setPhase('entering');
    const t1 = setTimeout(() => setPhase('active'), 60);
    const t2 = setTimeout(() => setPhase('leaving'), AUTO_CLOSE_MS - 400);
    const t3 = setTimeout(() => {
      setPhase('hidden');
      onClose?.();
    }, AUTO_CLOSE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [show, onClose]);

  // Dismiss on any interaction
  const dismiss = useCallback(() => {
    if (phase === 'hidden') return;
    setPhase('leaving');
    setTimeout(() => {
      setPhase('hidden');
      onClose?.();
    }, 400);
  }, [phase, onClose]);

  useEffect(() => {
    if (phase === 'hidden') return;
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('scroll', dismiss, { once: true });
    return () => {
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('scroll', dismiss);
    };
  }, [phase, dismiss]);

  if (phase === 'hidden') return null;

  const visible = phase === 'active';

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: visible ? 'rgba(15,23,42,0.82)' : 'rgba(15,23,42,0)',
        backdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
        WebkitBackdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
        transition: 'background 0.4s ease, backdrop-filter 0.4s ease',
        cursor: 'pointer',
      }}
      aria-hidden="true"
    >
      {/* ── Floating road particles ── */}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.id % 3 === 0 ? '#3b82f6' : p.id % 3 === 1 ? '#22c55e' : '#ffffff',
            opacity: visible ? p.opacity : 0,
            transform: visible ? 'scale(1)' : 'scale(0)',
            transition: `opacity ${p.duration}s ease ${p.delay}s, transform ${p.duration}s ease ${p.delay}s`,
            animation: visible ? `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate` : 'none',
          }}
        />
      ))}

      {/* ── Central scene ── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.92)',
          transition: 'opacity 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {/* Road scene SVG */}
        <RoadScene visible={visible} />

        {/* Brand name */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #60a5fa 0%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
            }}
          >
            ShareMyRide
          </div>
          <div
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.55)',
              marginTop: '6px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.5s ease 0.55s',
            }}
          >
            Community · Carpooling · India
          </div>
        </div>

        {/* Tagline */}
        <TaglineWords visible={visible} />

        {/* Dismiss hint */}
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.08em',
            marginTop: '0.5rem',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.6s ease 1.2s',
          }}
        >
          Click or press any key to continue
        </div>
      </div>

      <style>{`
        @keyframes particleFloat {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(${Math.random() > 0.5 ? '' : '-'}${Math.round(rand(8,20))}px, -${Math.round(rand(10,30))}px) scale(1.3); }
        }
        @keyframes carDrive {
          0%   { transform: translateX(-160px); opacity: 0; }
          8%   { opacity: 1; }
          45%  { transform: translateX(0px); opacity: 1; }
          55%  { transform: translateX(0px); opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateX(160px); opacity: 0; }
        }
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes roadScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-120px); }
        }
        @keyframes cloudDrift {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-40px); }
        }
        @keyframes treeBob {
          0%, 100% { transform: scaleY(1); transform-origin: bottom; }
          50%       { transform: scaleY(1.05); transform-origin: bottom; }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(59,130,246,0.4)); }
          50%       { filter: drop-shadow(0 0 18px rgba(59,130,246,0.9)); }
        }
      `}</style>
    </div>
  );
}

/* ── Road Scene ───────────────────────────────────────────────────────────── */
function RoadScene({ visible }) {
  return (
    <div
      style={{
        width: 'min(520px, 90vw)',
        position: 'relative',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
      }}
    >
      <svg
        viewBox="0 0 520 200"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible', animation: visible ? 'glowPulse 3s ease-in-out infinite' : 'none' }}
      >
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </linearGradient>
          <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <clipPath id="sceneClip">
            <rect x="0" y="0" width="520" height="200" rx="20" />
          </clipPath>
        </defs>

        <g clipPath="url(#sceneClip)">
          {/* Sky */}
          <rect x="0" y="0" width="520" height="200" fill="url(#skyGrad)" />

          {/* Stars */}
          {[
            [40,18,1.5],[90,8,1],[140,22,1.2],[200,10,1],[260,16,1.5],[320,6,1],
            [380,20,1.2],[440,12,1],[480,8,1.5],[60,35,0.8],[170,30,0.8],
            [300,28,1],[420,33,0.8],[500,25,1],
          ].map(([x,y,r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.6 + Math.random()*0.3} />
          ))}

          {/* Moon */}
          <circle cx="460" cy="25" r="14" fill="#f1f5f9" opacity="0.9" />
          <circle cx="466" cy="20" r="11" fill="#1e3a5f" opacity="0.95" />

          {/* Clouds */}
          <g style={{ animation: visible ? 'cloudDrift 8s linear infinite' : 'none' }}>
            <ellipse cx="80" cy="40" rx="35" ry="12" fill="#1e293b" opacity="0.8" />
            <ellipse cx="100" cy="35" rx="25" ry="10" fill="#1e293b" opacity="0.8" />
            <ellipse cx="60" cy="38" rx="20" ry="9" fill="#1e293b" opacity="0.8" />
          </g>
          <g style={{ animation: visible ? 'cloudDrift 12s linear infinite 3s' : 'none' }}>
            <ellipse cx="320" cy="30" rx="28" ry="9" fill="#1e293b" opacity="0.6" />
            <ellipse cx="340" cy="26" rx="20" ry="8" fill="#1e293b" opacity="0.6" />
          </g>

          {/* Distant city skyline */}
          {[
            [30,110,18,50],[55,100,14,60],[75,95,12,65],[95,105,16,55],
            [340,108,20,52],[365,98,15,62],[385,92,13,68],[405,103,18,57],
          ].map(([x,h,w,top],i) => (
            <rect key={i} x={x} y={top} width={w} height={h} fill="#0f2040" rx="1" />
          ))}
          {/* City lights */}
          {[[38,80],[60,68],[80,64],[348,76],[370,66],[392,62]].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="3" height="3" fill="#fbbf24" opacity="0.7" />
          ))}

          {/* Ground / road base */}
          <rect x="0" y="140" width="520" height="60" fill="#111827" />
          {/* Road surface */}
          <rect x="0" y="148" width="520" height="40" fill="url(#roadGrad)" />
          {/* Road edge lines */}
          <line x1="0" y1="149" x2="520" y2="149" stroke="#374151" strokeWidth="1" />
          <line x1="0" y1="187" x2="520" y2="187" stroke="#374151" strokeWidth="1" />

          {/* Scrolling dashes */}
          <g style={{ animation: visible ? 'roadScroll 1.2s linear infinite' : 'none' }}>
            {[0,120,240,360,480,600].map(x => (
              <rect key={x} x={x} y="166" width="60" height="4" rx="2" fill="#374151" opacity="0.7" />
            ))}
          </g>

          {/* Trees */}
          {[[18,138],[488,138],[470,132],[505,136]].map(([x,y],i) => (
            <g key={i} style={{ animation: visible ? `treeBob ${2+i*0.3}s ease-in-out infinite ${i*0.5}s` : 'none', transformOrigin: `${x}px ${y}px` }}>
              <rect x={x-2} y={y-14} width="4" height="14" fill="#92400e" />
              <ellipse cx={x} cy={y-18} rx="9" ry="11" fill="#166534" />
              <ellipse cx={x} cy={y-22} rx="6" ry="8" fill="#15803d" />
            </g>
          ))}

          {/* ── Car ── */}
          <g style={{ animation: visible ? 'carDrive 3.5s cubic-bezier(0.4,0,0.2,1) 0.4s forwards' : 'none' }}>
            {/* Car glow */}
            <ellipse cx="260" cy="178" rx="55" ry="6" fill="#3b82f6" opacity="0.25" />
            {/* Car body */}
            <rect x="210" y="155" width="100" height="24" rx="8" fill="#1d4ed8" />
            {/* Roof */}
            <path d="M228 155 Q238 138 282 138 Q296 138 302 155 Z" fill="#2563eb" />
            {/* Windscreen */}
            <path d="M235 155 Q242 143 278 143 Q288 143 296 155 Z" fill="#bfdbfe" opacity="0.6" />
            {/* Side windows */}
            <rect x="233" y="144" width="24" height="11" rx="3" fill="#bfdbfe" opacity="0.5" />
            <rect x="263" y="144" width="24" height="11" rx="3" fill="#bfdbfe" opacity="0.5" />
            {/* Door lines */}
            <line x1="259" y1="155" x2="259" y2="179" stroke="#1e40af" strokeWidth="1.5" />
            {/* Headlights */}
            <ellipse cx="312" cy="165" rx="5" ry="4" fill="#fef3c7" opacity="0.9" />
            <rect x="312" y="161" width="22" height="8" rx="2" fill="#fef3c7" opacity="0.15" />
            {/* Tail lights */}
            <ellipse cx="208" cy="165" rx="4" ry="3" fill="#ef4444" opacity="0.9" />
            {/* Door handle */}
            <rect x="241" y="164" width="8" height="2" rx="1" fill="#93c5fd" opacity="0.8" />
            <rect x="271" y="164" width="8" height="2" rx="1" fill="#93c5fd" opacity="0.8" />
            {/* Wheels */}
            <WheelAnim cx={232} cy={179} visible={visible} />
            <WheelAnim cx={292} cy={179} visible={visible} />
            {/* Roof rack luggage dot */}
            <rect x="245" y="136" width="22" height="5" rx="2" fill="#0369a1" opacity="0.7" />
            {/* ShareMyRide text on car */}
            <text x="260" y="172" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" letterSpacing="0.05em" fontFamily="system-ui,sans-serif" opacity="0.9">
              ShareMyRide
            </text>
          </g>

          {/* Road lamp post */}
          <line x1="130" y1="100" x2="130" y2="148" stroke="#374151" strokeWidth="3" />
          <line x1="130" y1="100" x2="148" y2="110" stroke="#374151" strokeWidth="2" />
          <circle cx="150" cy="111" r="4" fill="#fef3c7" opacity="0.9" />
          <ellipse cx="150" cy="120" rx="18" ry="8" fill="#fef3c7" opacity="0.08" />

          <line x1="390" y1="105" x2="390" y2="148" stroke="#374151" strokeWidth="3" />
          <line x1="390" y1="105" x2="372" y2="115" stroke="#374151" strokeWidth="2" />
          <circle cx="370" cy="116" r="4" fill="#fef3c7" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
}

function WheelAnim({ cx, cy, visible }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="11" fill="#111827" />
      <circle cx={cx} cy={cy} r="7" fill="#1f2937" />
      <g style={{ animation: visible ? 'wheelSpin 0.5s linear infinite' : 'none', transformOrigin: `${cx}px ${cy}px` }}>
        <line x1={cx-7} y1={cy} x2={cx+7} y2={cy} stroke="#6b7280" strokeWidth="2" />
        <line x1={cx} y1={cy-7} x2={cx} y2={cy+7} stroke="#6b7280" strokeWidth="2" />
        <line x1={cx-5} y1={cy-5} x2={cx+5} y2={cy+5} stroke="#6b7280" strokeWidth="1.5" />
        <line x1={cx+5} y1={cy-5} x2={cx-5} y2={cy+5} stroke="#6b7280" strokeWidth="1.5" />
      </g>
      <circle cx={cx} cy={cy} r="3" fill="#9ca3af" />
      <circle cx={cx} cy={cy} r="11" fill="none" stroke="#374151" strokeWidth="2" />
    </g>
  );
}

/* ── Animated tagline words ───────────────────────────────────────────────── */
const WORDS = ['Share', 'the', 'road.', 'Save', 'money.', 'Build', 'community.'];

function TaglineWords({ visible }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '320px' }}>
      {WORDS.map((word, i) => (
        <span
          key={word}
          style={{
            fontSize: 'clamp(15px, 2.5vw, 18px)',
            fontWeight: i === 0 || i === 3 || i === 5 ? 700 : 400,
            color: i === 0 ? '#60a5fa' : i === 3 ? '#34d399' : i === 5 ? '#a78bfa' : 'rgba(255,255,255,0.8)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: `opacity 0.4s ease ${0.7 + i * 0.1}s, transform 0.4s ease ${0.7 + i * 0.1}s`,
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}