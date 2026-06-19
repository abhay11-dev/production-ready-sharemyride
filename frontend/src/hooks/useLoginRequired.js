import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import LoginRequiredSpeechToast from '../components/common/LoginRequiredSpeechToast';

/**
 * Hook to handle "login required" flow for CTAs
 * Shows a professional speech bubble toast on the clicked element
 * Then redirects to login after a few seconds
 * 
 * Usage:
 *   const { handleLoginRequired, LoginToastComponent } = useLoginRequired();
 *   
 *   <button ref={buttonRef} onClick={() => handleLoginRequired(buttonRef)}>
 *     Search Rides
 *   </button>
 *   {LoginToastComponent}
 */
export function useLoginRequired(message = 'Sign in to continue', redirectTo = '/login') {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toastRef = useRef(null);
  const [toastRect, setToastRect] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);

  const handleLoginRequired = (buttonElement, customMessage = null) => {
    // If already logged in, don't show toast
    if (user) return;

    // Get button's bounding rectangle
    if (buttonElement && buttonElement.current) {
      const rect = buttonElement.current.getBoundingClientRect();
      setToastRect(rect);
      setToastVisible(true);
    }
  };

  const LoginToastComponent = toastVisible && toastRect ? (
    <LoginRequiredSpeechToast
      key={toastRect.toString()}
      rect={toastRect}
      message={message}
      redirectTo={redirectTo}
      durationMs={2400}
      onDismiss={() => {
        setToastVisible(false);
        setToastRect(null);
      }}
    />
  ) : null;

  return {
    handleLoginRequired,
    LoginToastComponent,
    toastVisible,
    isLoggedIn: !!user,
  };
}
