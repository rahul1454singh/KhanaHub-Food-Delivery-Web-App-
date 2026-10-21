import React, { useState, useEffect, useRef } from 'react';
import { 
  KeyRound, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../api/supabase';
import IOSSpinner from './IOSSpinner';
import './ForgotPassword.css';

const ForgotPassword = ({ onBackToLogin, onViewChange }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'password' | 'success'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef([]);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => Math.max(0, c - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Clean recovery state if user navigates away or mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Normalize email safely
  const getNormalizedEmail = () => email.trim().toLowerCase();

  // Step 1: Send Recovery OTP via Supabase Auth
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    const targetEmail = getNormalizedEmail();

    if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // Supabase Auth sends recovery token/OTP to the exact entered email
      const { data, error } = await supabase.auth.resetPasswordForEmail(targetEmail);
      if (error) {
        // Handle common Supabase rate-limiting or validation errors gracefully
        if (error.message?.toLowerCase().includes('rate limit')) {
          toast.error('Too many attempts. Please wait a minute before requesting another code.');
        } else {
          toast.error(error.message || 'Unable to send recovery code. Please try again.');
        }
        return;
      }

      toast.success(`Verification code sent to ${targetEmail}`);
      setStep('otp');
      setCountdown(60); // 60s cooldown before resend
      setOtp(['', '', '', '', '', '']);

      // Auto focus first OTP input box on next tick
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      toast.error(err.message || 'Error sending recovery code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle 6-Digit OTP Inputs
  const handleOtpChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;

    const singleDigit = cleaned.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);

    // Auto-advance to next input box if a digit was entered
    if (singleDigit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        // Current box is empty, clear and focus previous box
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);

    // Focus box corresponding to pasted length
    const nextIdx = Math.min(pasted.length, 5);
    otpRefs.current[nextIdx]?.focus();
  };

  // Verify 6-digit OTP using Supabase Auth recovery type
  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    const token = otp.join('').trim();

    if (token.length !== 6) {
      toast.error('Please enter all 6 digits of your verification code');
      return;
    }

    setIsLoading(true);
    try {
      const targetEmail = getNormalizedEmail();
      // Supabase GoTrue validates the recovery OTP token against auth.users
      const { data, error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: token,
        type: 'recovery',
      });

      if (error) {
        toast.error(error.message || 'Invalid or expired verification code');
        return;
      }

      toast.success('Verification code accepted! You can now set your new password.');
      setStep('password');
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Update Password via authenticated recovery session
  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Updates password for the authenticated recovery session
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message || 'Failed to update password');
        return;
      }

      // Security requirement: Invalidate recovery session so user starts clean
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn('Signout after recovery:', signOutErr);
      }

      toast.success('Password updated successfully!');
      setStep('success');
    } catch (err) {
      toast.error(err.message || 'Error updating password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else if (onViewChange) {
      onViewChange('home');
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        {step !== 'success' && (
          <button 
            type="button" 
            className="forgot-back-btn" 
            onClick={step === 'email' ? handleReturnToLogin : () => setStep(step === 'password' ? 'otp' : 'email')}
            aria-label="Return to previous screen"
          >
            <ArrowLeft size={16} />
            <span>{step === 'email' ? 'Return to Login' : 'Back'}</span>
          </button>
        )}

        {/* STEP 1: Email Form */}
        {step === 'email' && (
          <>
            <div className="forgot-header">
              <div className="forgot-badge-icon">
                <KeyRound size={28} />
              </div>
              <h2 className="forgot-title">Forgot Password?</h2>
              <p className="forgot-subtitle">
                Enter your registered account email and we'll send a 6-digit recovery code to reset your password.
              </p>
            </div>

            <form onSubmit={handleSendOTP} className="forgot-form" noValidate>
              <div className="forgot-input-group">
                <label htmlFor="recovery-email">Account Email</label>
                <div className="forgot-input-wrapper">
                  <Mail size={18} className="forgot-input-icon" />
                  <input
                    id="recovery-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    autoFocus
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="forgot-submit-btn" 
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <>
                    <IOSSpinner size={18} color="white" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <span>Send Recovery Code</span>
                )}
              </button>
            </form>
          </>
        )}

        {/* STEP 2: 6-Digit OTP Verification */}
        {step === 'otp' && (
          <>
            <div className="forgot-header">
              <div className="forgot-badge-icon">
                <ShieldCheck size={28} />
              </div>
              <h2 className="forgot-title">Verify 6-Digit Code</h2>
              <p className="forgot-subtitle">
                We've sent a 6-digit recovery OTP to<br />
                <span className="forgot-target-email">{getNormalizedEmail()}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="forgot-form">
              <div 
                className="forgot-otp-container" 
                role="group" 
                aria-label="6-digit verification code"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`forgot-otp-box ${digit ? 'filled' : ''}`}
                    aria-label={`Digit ${idx + 1}`}
                    autoComplete="one-time-code"
                    disabled={isLoading}
                  />
                ))}
              </div>

              <button 
                type="submit" 
                className="forgot-submit-btn" 
                disabled={isLoading || otp.join('').length !== 6}
              >
                {isLoading ? (
                  <>
                    <IOSSpinner size={18} color="white" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>

              <div className="forgot-actions">
                {countdown > 0 ? (
                  <p className="forgot-countdown-text">
                    Resend code in <strong>0:{countdown < 10 ? `0${countdown}` : countdown}</strong>
                  </p>
                ) : (
                  <button 
                    type="button" 
                    className="forgot-resend-btn" 
                    onClick={() => handleSendOTP()}
                    disabled={isLoading}
                  >
                    Resend Code
                  </button>
                )}

                <button 
                  type="button" 
                  className="forgot-change-email-btn"
                  onClick={() => setStep('email')}
                  disabled={isLoading}
                >
                  Use a different email
                </button>
              </div>
            </form>
          </>
        )}

        {/* STEP 3: Set New Password */}
        {step === 'password' && (
          <>
            <div className="forgot-header">
              <div className="forgot-badge-icon">
                <Lock size={28} />
              </div>
              <h2 className="forgot-title">Set New Password</h2>
              <p className="forgot-subtitle">
                Enter your new secure password below to complete account recovery.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="forgot-form">
              <div className="forgot-input-group">
                <label htmlFor="new-password">New Password</label>
                <div className="forgot-input-wrapper password-wrapper">
                  <Lock size={18} className="forgot-input-icon" />
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    required
                    autoFocus
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    className="forgot-password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="forgot-input-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <div className="forgot-input-wrapper password-wrapper">
                  <Lock size={18} className="forgot-input-icon" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    className="forgot-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="password-requirements">
                <div className={`req-item ${newPassword.length >= 6 ? 'met' : ''}`}>
                  <span>{newPassword.length >= 6 ? '✓' : '•'}</span>
                  <span>At least 6 characters long</span>
                </div>
                <div className={`req-item ${newPassword && newPassword === confirmPassword ? 'met' : ''}`}>
                  <span>{newPassword && newPassword === confirmPassword ? '✓' : '•'}</span>
                  <span>Passwords match</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="forgot-submit-btn" 
                disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
              >
                {isLoading ? (
                  <>
                    <IOSSpinner size={18} color="white" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Change Password</span>
                )}
              </button>
            </form>
          </>
        )}

        {/* STEP 4: Success View */}
        {step === 'success' && (
          <div className="forgot-success-content">
            <div className="forgot-badge-icon success-badge">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="forgot-title">Password Reset Complete!</h2>
            <p className="forgot-subtitle">
              Your password has been successfully updated. You can now log in to KhanaHub with your new credentials.
            </p>

            <div className="forgot-success-actions">
              <button 
                type="button" 
                className="forgot-submit-btn"
                onClick={handleReturnToLogin}
              >
                <span>Proceed to Login</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
