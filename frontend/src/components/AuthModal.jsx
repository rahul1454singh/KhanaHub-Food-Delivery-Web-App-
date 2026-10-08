import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import IOSSpinner from './IOSSpinner';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose }) => {
  const { login, signup, verifyOTP, resendOTP, googleAuth, authPromptMessage, setAuthPromptMessage } = useAuth();
  const [view, setView] = useState('login'); // login, signup, otp
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes for OTP

  const isAnyLoading = isEmailLoading || isSignupLoading || isOtpLoading || isGoogleLoading;

  const handleClose = () => {
    if (setAuthPromptMessage) setAuthPromptMessage('');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = ''; document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

    useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const otpRefs = React.useRef([]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only numbers
    
    const newOtp = formData.otp.split('');
    // Handle pasting a full string into one box
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      for (let i = 0; i < pasted.length; i++) {
        if (index + i < 6) newOtp[index + i] = pasted[i];
      }
      setFormData(prev => ({ ...prev, otp: newOtp.join('') }));
      const nextFocus = Math.min(index + pasted.length, 5);
      if (otpRefs.current[nextFocus]) {
        otpRefs.current[nextFocus].focus();
      }
      return;
    }

    newOtp[index] = value;
    const finalOtp = newOtp.join('');
    setFormData(prev => ({ ...prev, otp: finalOtp }));

    // Move to next input
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!formData.otp[index] && index > 0 && otpRefs.current[index - 1]) {
        otpRefs.current[index - 1].focus();
      }
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneCode: '+977',
    contactNumber: '',
    otp: ''
  });

  useEffect(() => {
    if (isOpen) {
      setView('login');
      setFormData({
        name: '', email: '', password: '', confirmPassword: '', phoneCode: '+977', contactNumber: '', otp: ''
      });
      setIsEmailLoading(false);
      setIsSignupLoading(false);
      setIsOtpLoading(false);
      setIsGoogleLoading(false);
      document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; document.documentElement.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = ''; document.documentElement.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if ((view === 'otp' || view === 'otp_mobile') && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [view, countdown]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsEmailLoading(true);
    const startTime = Date.now();
    try {
      await login(formData.email, formData.password);
      // Ensure smooth button loading animation for at least ~1.5 seconds
      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) {
        await new Promise((res) => setTimeout(res, 1500 - elapsed));
      }
      if (setAuthPromptMessage) setAuthPromptMessage('');
      onClose();
      toast.success('Login successful');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    // Do not call signup() here! Go to selection screen first.
    setView('otp_selection');
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (formData.otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }
    
    setIsOtpLoading(true);
    try {
      await verifyOTP(formData.email, formData.otp);
      if (setAuthPromptMessage) setAuthPromptMessage('');
      onClose();
      toast.success('Account verified successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'OTP verification failed');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsOtpLoading(true);
    try {
      await resendOTP(formData.email);
      toast.success('OTP resent to your email!');
      setCountdown(300);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to resend OTP');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      await googleAuth();
      if (setAuthPromptMessage) setAuthPromptMessage('');
      onClose();
      // toast success is handled by redirect usually, but keeping it
    } catch (err) {
      toast.error(err.message || 'Google login failed');
      console.error("Google Auth Error:", err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={`auth-modal-container ${view === 'signup' ? 'signup-mode' : ''}`}>
        <button onClick={handleClose} className="auth-close-btn" aria-label="Close modal">
          <X size={24} />
        </button>

        <div className="auth-header">
          <img src="https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1788190253/newlogo_sterro.png" alt="KhanaHub Logo" className="auth-logo" />
          <h2 className="auth-title">
            {view === 'login' && 'Welcome Back'}
            {view === 'signup' && 'Create Account'}
            {view === 'otp' && 'Verify Your Email'}
            {(view === 'otp_selection' || view === 'otp_mobile') && 'Verify Account'}
          </h2>
          {view === 'login' && <p className="auth-subtitle">Login to continue ordering</p>}
          {view === 'signup' && <p className="auth-subtitle">Join KhanaHub for the best food delivery</p>}
        </div>

        {view === 'login' && authPromptMessage && (
          <div className="auth-prompt-banner">
            <span className="auth-prompt-icon">ðŸ”’</span>
            <span className="auth-prompt-text">{authPromptMessage}</span>
          </div>
        )}

        <div className="auth-body">
          {view === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-input-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Enter your email" />
              </div>
              <div className="auth-input-group">
                <label>Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                    placeholder="Enter your password"
                  />
                  <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isAnyLoading}>
                {isEmailLoading ? <><IOSSpinner size={20} color="white" /> <span>Logging in...</span></> : <><LogIn size={18} /> <span>Login</span></>}
              </button>

              <div className="auth-switch">
                <span>Don't have an account? </span>
                <button type="button" onClick={() => setView('signup')} disabled={isAnyLoading}>Create Account</button>
              </div>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleSignup} className="auth-form">
              <div className="auth-input-group">
                <label>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" disabled={isAnyLoading} />
              </div>
              <div className="auth-input-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" disabled={isAnyLoading} />
              </div>
              <div className="auth-input-group">
                <label>Contact Number</label>
                <div className="phone-input">
                  <select name="phoneCode" value={formData.phoneCode} onChange={handleChange} className="phone-code" disabled={isAnyLoading}>
                    <option value="+977">ðŸ‡³ðŸ‡µ +977</option>
                    <option value="+91">ðŸ‡®ðŸ‡³ +91</option>
                    <option value="+1">ðŸ‡ºðŸ‡¸ +1</option>
                    <option value="+44">ðŸ‡¬ðŸ‡§ +44</option>
                  </select>
                  <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required placeholder="98XXXXXXXX" disabled={isAnyLoading} />
                </div>
              </div>
              <div className="auth-input-group">
                <label>Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                    placeholder="Create a password"
                    disabled={isAnyLoading}
                  />
                  <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="auth-input-group">
                <label>Confirm Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    name="confirmPassword" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    required 
                    placeholder="Confirm your password"
                    disabled={isAnyLoading}
                  />
                  <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isAnyLoading}>
                {isSignupLoading ? <><IOSSpinner size={20} color="white" /> <span>Creating account...</span></> : <><UserPlus size={18} /> <span>Create Account</span></>}
              </button>

              <div className="auth-switch">
                <span>Already have an account? </span>
                <button type="button" onClick={() => setView('login')} disabled={isAnyLoading}>Login</button>
              </div>
            </form>
          )}

          {view === 'otp_selection' && (
            <div className="auth-form otp-selection-view">
              <h3 style={{ textAlign: 'center', marginBottom: '8px', color: 'var(--text-dark)' }}>Verify Your Account</h3>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                Where would you like us to send your 6-digit verification code?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button 
                  type="button" 
                  onClick={handleSendEmailOTP}
                  disabled={isSignupLoading}
                  style={{ padding: '16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                >
                  <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0284c7' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-dark)', fontSize: '1.05rem', marginBottom: '4px' }}>Send OTP to Email</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formData.email}</span>
                  </div>
                </button>

                <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.7, cursor: 'not-allowed', textAlign: 'left', position: 'relative' }}>
                  <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '50%', color: '#94a3b8' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', color: '#64748b', fontSize: '1.05rem', marginBottom: '4px' }}>Send OTP to Mobile</strong>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{formData.phoneCode} {formData.contactNumber}</span>
                  </div>
                  <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    Feature Not Applied
                  </div>
                </div>
              </div>

              <div className="auth-switch" style={{ marginTop: '24px' }}>
                <button type="button" onClick={() => setView('signup')} disabled={isSignupLoading}>← Back to Signup</button>
              </div>
            </div>
          )}

          {view === 'otp_mobile' && (
            <form onSubmit={(e) => { e.preventDefault(); toast.success('Mobile verified successfully!'); onClose(); }} className="auth-form otp-form">
              <h3 className="otp-heading">Check your Phone</h3>
              <p className="otp-message">
                We've sent a 6-digit SMS code to<br/>
                <strong>{formData.phoneCode} {formData.contactNumber}</strong>
              </p>
              
              <div className="otp-input-container">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={'mob-'+index}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.otp[index] || ''}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    className="otp-box"
                  />
                ))}
              </div>

              <button type="submit" className="auth-submit-btn" disabled={formData.otp.length !== 6}>
                Verify Mobile OTP
              </button>

              <div className="otp-actions">
                <p className="countdown">
                  {countdown > 0 ? `Code expires in ${formatTime(countdown)}` : 'Code expired'}
                </p>
                <button type="button" onClick={handleSendMobileOTP} className="resend-btn" disabled={countdown > 0}>
                  Resend SMS
                </button>
                <button type="button" onClick={() => setView('otp_selection')} className="change-email-btn">
                  Change Method
                </button>
              </div>
            </form>
          )}

          {view === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="auth-form otp-form">
              <h3 className="otp-heading">Check your email for the OTP</h3>
              <p className="otp-message">
                We've sent a 6-digit verification code to<br/>
                <strong>{formData.email}</strong>
              </p>
              
              <div className="otp-input-container">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.otp[index] || ''}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="otp-box"
                    autoComplete="off"
                    disabled={isAnyLoading}
                  />
                ))}
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isAnyLoading || formData.otp.length !== 6}>
                {isOtpLoading ? <><IOSSpinner size={20} color="white" /> <span>Verifying...</span></> : <><ShieldCheck size={18} /> <span>Verify OTP</span></>}
              </button>

              <div className="otp-actions">
                <p className="countdown">
                  {countdown > 0 ? `Code expires in ${formatTime(countdown)}` : 'Code expired'}
                </p>
                <button 
                  type="button" 
                  onClick={handleResendOTP} 
                  disabled={countdown > 0 || isAnyLoading}
                  className="resend-btn"
                >
                  {isOtpLoading ? 'Sending OTP...' : 'Resend OTP'}
                </button>
                <button type="button" onClick={() => setView('signup')} className="change-email-btn" disabled={isAnyLoading}>
                  Change Email
                </button>
              </div>
            </form>
          )}

          {(view === 'login' || view === 'signup') && (
            <>
              <div className="auth-divider">
                <span>Or</span>
              </div>
              <button 
                type="button" 
                className="google-auth-btn"
                onClick={handleGoogleLogin}
                disabled={isAnyLoading}
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="google-icon" />
                <span>
                  {isGoogleLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IOSSpinner size={16} color="#374151" /> Signing in with Google...
                    </span>
                  ) : (
                    'Continue with Google'
                  )}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

