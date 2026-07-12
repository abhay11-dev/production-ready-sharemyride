/**
 * toastService.js — Centralized toast service for ShareMyRide

 */

import { toast as hotToast } from 'react-hot-toast';
import React from 'react';

// ── Shared visual constants ────────────────────────────────────────────────────
const BASE_STYLE = {
  borderRadius: '12px',
  padding: '14px 16px',
  maxWidth: '380px',
  width: '100%',
  boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
  fontFamily: 'inherit',
  fontSize: '14px',
  lineHeight: '1.5',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  border: '1px solid',
};

const VARIANTS = {
  success: {
    background: '#f0fdf4',
    color:      '#14532d',
    borderColor:'#bbf7d0',
    iconColor:  '#16a34a',
  },
  error: {
    background: '#fff1f2',
    color:      '#7f1d1d',
    borderColor:'#fecdd3',
    iconColor:  '#dc2626',
  },
  warning: {
    background: '#fffbeb',
    color:      '#78350f',
    borderColor:'#fed7aa',
    iconColor:  '#d97706',
  },
  info: {
    background: '#eff6ff',
    color:      '#1e3a5f',
    borderColor:'#bfdbfe',
    iconColor:  '#2563eb',
  },
  loading: {
    background: '#f9fafb',
    color:      '#111827',
    borderColor:'#e5e7eb',
    iconColor:  '#6b7280',
  },
};

// ── SVG icons (inline — avoids bundling the entire Lucide tree in this util) ──
const SVG_ICONS = {
  success: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  error: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" x2="12" y1="8" y2="12"/>
      <line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  warning: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>
  ),
  info: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>
  ),
  loading: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: '1px', animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  ),
};

// ── Inject spin keyframe once ─────────────────────────────────────────────────
let spinInjected = false;
function ensureSpinStyle() {
  if (spinInjected || typeof document === 'undefined') return;
  spinInjected = true;
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

// ── Toast content builder ─────────────────────────────────────────────────────
function ToastContent({ title, message, variant }) {
  const v = VARIANTS[variant] || VARIANTS.info;
  ensureSpinStyle();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
      {title && (
        <p style={{ fontWeight: 600, fontSize: '14px', color: v.color, margin: 0, lineHeight: '1.4' }}>
          {title}
        </p>
      )}
      {message && (
        <p style={{
          fontWeight: 400,
          fontSize: title ? '13px' : '14px',
          color: title ? v.color.replace('14532d', '166534').replace('7f1d1d', '9f1239').replace('78350f', '92400e').replace('1e3a5f', '1e40af') : v.color,
          opacity: title ? 0.85 : 1,
          margin: 0,
          lineHeight: '1.5',
        }}>
          {message}
        </p>
      )}
    </div>
  );
}

// ── Dynamic Duration Calculator ────────────────────────────────────────────────
function calculateDuration(variant, message, opts) {
  if (opts.duration) return opts.duration;
  
  if (variant === 'loading') return Infinity;
  
  let base = 3500; // default Info
  if (variant === 'success') base = 3000;
  if (variant === 'warning') base = 4500;
  if (variant === 'error') base = 6000;
  
  const msgLength = typeof message === 'string' ? message.length : 0;
  // Approx 50ms per character for reading time, up to a max of +3000ms
  const lengthDuration = Math.min(msgLength * 50, 3000);
  
  return base + lengthDuration;
}

// ── Core toast builder ────────────────────────────────────────────────────────
function buildToast(variant, titleOrMessage, messageOrOptions, options = {}) {
  // Support both toast.success('msg') and toast.success('title', 'msg', opts)
  let title, message, opts;
  if (typeof messageOrOptions === 'string') {
    title   = titleOrMessage;
    message = messageOrOptions;
    opts    = options;
  } else {
    title   = undefined;
    message = titleOrMessage;
    opts    = messageOrOptions || {};
  }

  const v = VARIANTS[variant] || VARIANTS.info;
  const duration = calculateDuration(variant, message || title, opts);
  
  // Duplicate prevention: use message string as ID if no ID is provided
  const msgString = typeof message === 'string' ? message : (typeof title === 'string' ? title : undefined);
  const toastId = opts.id || (msgString ? msgString.substring(0, 100) : undefined);
  
  // Responsive position
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const defaultPosition = isMobile ? 'top-center' : 'top-right';

  return hotToast.custom(
    (t) => (
      <div
        role="status"
        aria-live="polite"
        style={{
          ...BASE_STYLE,
          background:   v.background,
          color:        v.color,
          borderColor:  v.borderColor,
          opacity:      t.visible ? 1 : 0,
          transform:    t.visible ? 'translateY(0)' : 'translateY(16px)',
          transition:   'opacity 0.22s ease-out, transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
      >
        {SVG_ICONS[variant]?.(v.iconColor)}
        <ToastContent title={title} message={message} variant={variant} />
        <button
          onClick={() => hotToast.dismiss(t.id)}
          aria-label="Dismiss"
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: v.iconColor,
            opacity: 0.5,
            lineHeight: 1,
            marginTop: '1px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" x2="6" y1="6" y2="18"/>
            <line x1="6" x2="18" y1="6" y2="18"/>
          </svg>
        </button>
      </div>
    ),
    {
      duration: duration,
      position: opts.position ?? defaultPosition,
      id:       toastId,
    }
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
const toastService = {
  /**
   * Show a success toast.
   * @param {string} titleOrMessage
   * @param {string|object} [messageOrOptions]
   * @param {object} [options]   duration, position, id
   */
  success(titleOrMessage, messageOrOptions, options) {
    return buildToast('success', titleOrMessage, messageOrOptions, options);
  },

  /**
   * Show an error toast.
   */
  error(titleOrMessage, messageOrOptions, options) {
    return buildToast('error', titleOrMessage, messageOrOptions, options);
  },

  /**
   * Show a warning toast.
   */
  warning(titleOrMessage, messageOrOptions, options) {
    return buildToast('warning', titleOrMessage, messageOrOptions, options);
  },

  /**
   * Show an info toast.
   */
  info(titleOrMessage, messageOrOptions, options) {
    return buildToast('info', titleOrMessage, messageOrOptions, options);
  },

  /**
   * Show a loading toast. Returns the toast id — pass it to dismiss().
   */
  loading(message, options = {}) {
    const v = VARIANTS.loading;
    ensureSpinStyle();
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const defaultPosition = isMobile ? 'top-center' : 'top-right';
    
    // Duplicate prevention for loading as well
    const toastId = options.id || (typeof message === 'string' ? message.substring(0, 100) : undefined);

    return hotToast.custom(
      (t) => (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...BASE_STYLE,
            background:  v.background,
            color:       v.color,
            borderColor: v.borderColor,
            opacity:     t.visible ? 1 : 0,
            transform:   t.visible ? 'translateY(0)' : 'translateY(16px)',
            transition:  'opacity 0.22s ease-out, transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
          }}
        >
          {SVG_ICONS.loading(v.iconColor)}
          <ToastContent message={message} variant="loading" />
        </div>
      ),
      {
        duration: options.duration ?? Infinity,
        position: options.position ?? defaultPosition,
        id:       toastId,
      }
    );
  },

  /**
   * Dismiss a specific toast (or all if no id).
   */
  dismiss(id) {
    hotToast.dismiss(id);
  },

  /**
   * Promise-based toast: loading → success/error.
   * @param {Promise} promise
   * @param {{ loading, success, error }} messages
   */
  promise(promise, messages, options = {}) {
    const loadingId = toastService.loading(messages.loading || 'Working…', options);

    promise
      .then((result) => {
        hotToast.dismiss(loadingId);
        const msg = typeof messages.success === 'function'
          ? messages.success(result)
          : (messages.success || 'Done!');
        toastService.success(msg, options);
      })
      .catch((err) => {
        hotToast.dismiss(loadingId);
        const msg = typeof messages.error === 'function'
          ? messages.error(err)
          : (messages.error || 'Something went wrong.');
        toastService.error(msg, options);
      });

    return promise;
  },

  /**
   * Confirmation-style toast with action buttons.
   * Returns the toast id.
   */
  confirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = false }) {
    const v = danger ? VARIANTS.error : VARIANTS.info;
    return hotToast.custom(
      (t) => (
        <div
          role="alertdialog"
          aria-modal="false"
          style={{
            ...BASE_STYLE,
            flexDirection: 'column',
            gap: '12px',
            background:  v.background,
            color:       v.color,
            borderColor: v.borderColor,
            opacity:     t.visible ? 1 : 0,
            transform:   t.visible ? 'translateY(0)' : 'translateY(8px)',
            transition:  'opacity 0.22s ease, transform 0.22s ease',
            maxWidth:    '360px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {danger ? SVG_ICONS.error(v.iconColor) : SVG_ICONS.warning(v.iconColor)}
            <ToastContent title={title} message={message} variant={danger ? 'error' : 'warning'} />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { hotToast.dismiss(t.id); onCancel?.(); }}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer',
                background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb',
              }}
            >{cancelLabel}</button>
            <button
              onClick={() => { hotToast.dismiss(t.id); onConfirm?.(); }}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer',
                background: danger ? '#dc2626' : '#2563eb',
                color: '#fff', border: 'none',
              }}
            >{confirmLabel}</button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' }
    );
  },
};

export default toastService;
