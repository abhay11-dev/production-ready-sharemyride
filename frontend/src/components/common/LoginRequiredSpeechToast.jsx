import React, { useEffect, useMemo, useState } from 'react';

/**
 * Comic-style speech-bubble toast attached to a clicked element.
 * - Shows for a few seconds
 * - Redirects to /login
 */
export default function LoginRequiredSpeechToast({
  rect,
  message = 'Please sign in to continue',
  onDismiss,
  redirectTo = '/login',
  durationMs = 2400,
}) {
  const [vis, setVis] = useState(false);

  const position = useMemo(() => {
    if (!rect) return null;
    const scrollY = window.scrollY || 0;
    const top = rect.top + scrollY - 60;
    const left = rect.left + rect.width / 2;
    return { top, left };
  }, [rect]);

  useEffect(() => {
    const t1 = setTimeout(() => setVis(true), 20);
    const t2 = setTimeout(() => {
      onDismiss?.();
      window.scrollTo(0, 0);
      window.location.assign(redirectTo);
    }, durationMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [durationMs, onDismiss, redirectTo]);

  if (!rect || !position) return null;

  return (
    <div
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 9997, pointerEvents: 'none' }}
    >
      <div
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: `translateX(-50%) translateY(${vis ? 0 : 6}px)`,
          opacity: vis ? 1 : 0,
          transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'auto',
        }}
        onClick={() => {
          onDismiss?.();
          window.scrollTo(0, 0);
          window.location.assign(redirectTo);
        }}
      >
        <div
          style={{
            background: '#1d4ed8',
            color: 'white',
            borderRadius: '12px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(29,78,216,0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          {message}
          <div
            style={{
              position: 'absolute',
              bottom: '-7px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid #1d4ed8',
            }}
          />
        </div>

        <div style={{ height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              background: '#93c5fd',
              animation: `drainFtr ${durationMs / 1000}s linear forwards`,
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      <style>{`@keyframes drainFtr{from{width:100%}to{width:0%}}`}</style>
    </div>
  );
}

