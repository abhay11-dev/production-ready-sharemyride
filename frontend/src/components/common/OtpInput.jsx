import React, { useRef, useEffect } from 'react';

/**
 * Reusable 6-digit OTP input.
 * Styled to match the input tokens used across Signup / ForgotPassword / VerificationPending.
 *
 * Props:
 *  - length: number of digits (default 6)
 *  - value: current OTP string, e.g. "123456" or "12"
 *  - onChange: (nextValue: string) => void
 *  - disabled: boolean
 *  - autoFocus: boolean (default true)
 *  - error: boolean - shows red border state
 */
function OtpInput({ length = 6, value = '', onChange, disabled = false, autoFocus = true, error = false }) {
  const inputsRef = useRef([]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const setDigit = (index, digit) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setDigit(index, '');
      return;
    }
    const chars = raw.split('');
    const next = digits.slice();
    let i = index;
    for (const c of chars) {
      if (i >= length) break;
      next[i] = c;
      i++;
    }
    onChange(next.join(''));
    const focusIndex = Math.min(i, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '');
      } else if (index > 0) {
        setDigit(index - 1, '');
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (!pasted) return;
    const next = pasted.split('').concat(Array(length).fill('')).slice(0, length);
    onChange(next.join(''));
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold text-gray-900 border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-150 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed ${
            error
              ? 'border-red-300 focus:ring-red-400 bg-red-50/30'
              : 'border-gray-200 focus:ring-blue-500'
          }`}
        />
      ))}
    </div>
  );
}

export default OtpInput;