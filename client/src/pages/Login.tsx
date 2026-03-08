import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, Fingerprint, AlertCircle, Check, KeyRound, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import AuthLayout from '../components/AuthLayout';

function hasSQLInjectionRisk(value: string): boolean {
  const pattern = /(;|--|\/\*|\*\/|\b(OR|AND)\b\s+\d+=\d+|\bxp_)/i;
  return pattern.test(value);
}

export function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuthStore();
  const { showToast } = useToastStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldTouched, setFieldTouched] = useState<{ identifier: boolean; password: boolean }>({
    identifier: false,
    password: false,
  });
  const [step, setStep] = useState<'password' | 'otp' | 'success'>('password');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [otpError, setOtpError] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [buttonSuccess, setButtonSuccess] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verificationChoice, setVerificationChoice] = useState<'link' | 'otp' | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSendLoading, setOtpSendLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpVerifyError, setOtpVerifyError] = useState('');
  const otpVerificationRefs = useRef<(HTMLInputElement | null)[]>([]);
  const redirectRef = useRef<string>('/');

  // Show OAuth error when redirected back from Google with ?error=...
  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) return;
    const messages: Record<string, string> = {
      access_denied: 'Google sign-in was cancelled.',
      no_code: 'No authorization code received from Google.',
      oauth_not_configured: 'Google sign-in is not configured on the server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server .env and set the redirect URI in Google Cloud Console.',
      no_email: 'No email address found in your Google account.',
      oauth_failed: 'Google sign-in failed. Check server logs and that the redirect URI in Google Cloud Console matches your server URL.',
      account_deactivated: 'Your account has been deactivated. Please contact support.',
    };
    showToast(messages[error] || `Sign-in error: ${error}`, 'error');
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, showToast]);

  // Load remembered identifier
  useEffect(() => {
    const remembered = localStorage.getItem('reaglex_auth_remember');
    if (remembered) {
      setIdentifier(remembered);
      setRememberMe(true);
    }
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (step !== 'otp' || otpCountdown <= 0) return;
    const t = setInterval(() => {
      setOtpCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [step, otpCountdown]);

  const isEmail = identifier.includes('@');
  const isPhone = !isEmail && /^\d+$/.test(identifier.trim());

  const validIdentifier =
    !!identifier &&
    ((isEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) ||
      (isPhone && identifier.trim().length >= 7));

  const validPassword = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 'password') return;

    setLoading(true);
    setFormError('');
    setFieldTouched({ identifier: true, password: true });

    if (!identifier || !password) {
      setFormError('Please enter both email/phone and password.');
      setLoading(false);
      return;
    }
    if (!validIdentifier) {
      setFormError('Please enter a valid email address or phone number.');
      setLoading(false);
      return;
    }
    if (!validPassword) {
      setFormError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (hasSQLInjectionRisk(identifier) || hasSQLInjectionRisk(password)) {
      setFormError('Input contains invalid characters.');
      setLoading(false);
      return;
    }

    try {
      setShowResendVerification(false);
      const result = await login(identifier, password);
      if (!result.success) {
        const errMsg = result.error || 'Login failed. Please check your credentials.';
        setFormError(errMsg);
        if (errMsg.toLowerCase().includes('verify your email') && identifier.includes('@')) {
          setShowResendVerification(true);
        }
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('reaglex_auth_remember', identifier);
      } else {
        localStorage.removeItem('reaglex_auth_remember');
      }

      const { user } = useAuthStore.getState();
      if (user?.role === 'seller') redirectRef.current = '/seller';
      else if (user?.role === 'admin') redirectRef.current = '/admin';
      else redirectRef.current = '/';

      // Move to 2FA step (UI only)
      setStep('otp');
      setOtp(['', '', '', '', '', '']);
      setOtpCountdown(30);
      setLoading(false);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 50);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setOtpError('');
    if (value && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 'otp') return;
    const code = otp.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the 6‑digit code.');
      return;
    }
    setSubmittingOtp(true);
    setOtpError('');
    // Simulate verification delay
    setTimeout(() => {
      setSubmittingOtp(false);
      setStep('success');
      setButtonSuccess(true);
      showToast('Login successful. Welcome back to Reaglex!', 'success');
      const { user } = useAuthStore.getState();
      const firstName = user?.full_name?.split(' ')[0] || 'there';
      showToast(`Welcome back, ${firstName}! 👋`, 'success');
      setTimeout(() => {
        navigate(redirectRef.current);
      }, 700);
    }, 800);
  };

  const handleResendVerificationEmail = async () => {
    if (!identifier.trim() || !identifier.includes('@') || resendLoading) return;
    setResendLoading(true);
    setFormError('');
    try {
      const { authAPI } = await import('../lib/api');
      await authAPI.resendVerificationEmail(identifier.trim());
      showToast('Verification link sent. Check your inbox (and spam folder).', 'success');
      setShowResendVerification(false);
      setVerificationChoice(null);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to send verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSendVerificationOtp = async () => {
    const email = identifier.trim();
    if (!email || !email.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || otpSendLoading) return;
    setOtpSendLoading(true);
    setOtpVerifyError('');
    try {
      const { authAPI } = await import('../lib/api');
      await authAPI.requestVerificationOtp(email);
      setOtpSent(true);
      setOtpDigits(['', '', '', '', '', '']);
      showToast('Verification code sent. Check your email.', 'success');
      setTimeout(() => otpVerificationRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      setOtpVerifyError(e?.message || 'Failed to send code.');
    } finally {
      setOtpSendLoading(false);
    }
  };

  const handleOtpVerificationChange = (index: number, value: string) => {
    if (value !== '' && !/^\d$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    setOtpVerifyError('');
    if (value && index < 5) otpVerificationRefs.current[index + 1]?.focus();
  };

  const handleOtpVerificationKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpVerificationRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmailWithOtp = async () => {
    const code = otpDigits.join('');
    const email = identifier.trim();
    if (code.length !== 6 || !email) return;
    setOtpVerifyLoading(true);
    setOtpVerifyError('');
    try {
      const { authAPI } = await import('../lib/api');
      await authAPI.verifyEmailWithOtp(email, code);
      showToast('Email verified! You can sign in now.', 'success');
      setShowResendVerification(false);
      setVerificationChoice(null);
      setFormError('');
    } catch (e: any) {
      setOtpVerifyError(e?.message || 'Invalid code. Try again.');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (otpCountdown > 0) return;
    setOtpCountdown(30);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  const handleBiometricLogin = async () => {
    if (step !== 'password') return;
    setBiometricLoading(true);
    setFormError('');
    const { loginWithBiometric } = useAuthStore.getState();
    const result = await loginWithBiometric();
    setBiometricLoading(false);
    if (!result.success) {
      setFormError(result.error || 'Biometric sign-in failed.');
      return;
    }
    const { user } = useAuthStore.getState();
    if (user?.role === 'seller') redirectRef.current = '/seller';
    else if (user?.role === 'admin') redirectRef.current = '/admin';
    else redirectRef.current = '/';
    showToast('Signed in with biometric. Welcome back!', 'success');
    navigate(redirectRef.current);
  };

  const primaryHeading =
    step === 'otp' ? 'Two‑factor verification 🔐' : 'Welcome back 👋';
  const primarySub =
    step === 'otp'
      ? 'Enter the 6‑digit code sent to your email or phone.'
      : 'Sign in to your account';

  const renderErrorBanner = () =>
    formError && (
      <div className="mb-3 space-y-3">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs"
          style={{
            background: '#1c0808',
            color: '#f87171',
            boxShadow: 'inset 0 0 0 1px rgba(248,113,113,0.25)',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{formError}</span>
        </div>
        {showResendVerification && identifier.includes('@') && (
          <div
            className="rounded-2xl p-4 space-y-4"
            style={{
              background: 'var(--bg-secondary)',
              boxShadow: '0 0 0 1px rgba(249,115,22,0.2)',
            }}
          >
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              Verify your email to sign in. Choose one:
            </p>
            {verificationChoice === null && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={handleResendVerificationEmail}
                  className="flex-1 min-w-[140px] h-10 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{
                    background: 'rgba(249,115,22,0.15)',
                    color: '#f97316',
                    border: '1px solid rgba(249,115,22,0.4)',
                  }}
                >
                  {resendLoading ? (
                    <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {resendLoading ? 'Sending…' : 'Resend link'}
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationChoice('otp')}
                  className="flex-1 min-w-[140px] h-10 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    color: '#6366f1',
                    border: '1px solid rgba(99,102,241,0.4)',
                  }}
                >
                  <KeyRound className="w-4 h-4" />
                  Verify with code
                </button>
              </div>
            )}
            {verificationChoice === 'otp' && (
              <div className="space-y-3 pt-1">
                {!otpSent ? (
                  <>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      We&apos;ll send a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{identifier}</strong>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSendVerificationOtp}
                        disabled={otpSendLoading}
                        className="flex-1 h-10 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{
                          background: '#6366f1',
                          color: '#fff',
                        }}
                      >
                        {otpSendLoading ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        {otpSendLoading ? 'Sending…' : 'Send code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerificationChoice(null)}
                        className="px-3 rounded-xl text-[13px] font-medium"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Back
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      Enter the 6-digit code sent to your email
                    </p>
                    <div className="flex justify-between gap-2">
                      {otpDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpVerificationRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleOtpVerificationChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpVerificationKeyDown(i, e)}
                          className="w-10 h-11 rounded-xl text-center text-[16px] font-semibold outline-none bg-[var(--bg-secondary)]"
                          style={{
                            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      ))}
                    </div>
                    {otpVerifyError && (
                      <p className="text-[12px]" style={{ color: '#f87171' }}>{otpVerifyError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyEmailWithOtp}
                        disabled={otpVerifyLoading}
                        className="flex-1 h-10 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ background: '#6366f1', color: '#fff' }}
                      >
                        {otpVerifyLoading ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : null}
                        {otpVerifyLoading ? 'Verifying…' : 'Verify & continue'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtpVerifyError(''); }}
                        className="px-3 rounded-xl text-[13px] font-medium"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        New code
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );

  const renderIdentifierField = () => {
    const showError = fieldTouched.identifier && !validIdentifier;
    const showValid = fieldTouched.identifier && validIdentifier && !showError;

    return (
      <div className="space-y-1.5">
        <label
          className="text-[13px] font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          Email or phone number
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {isPhone ? (
              <Phone className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <Mail className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          <input
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onBlur={() =>
              setFieldTouched((s) => ({ ...s, identifier: true }))
            }
            placeholder="Email or phone number"
            className="w-full h-[52px] rounded-[14px] pl-10 pr-10 text-[15px] outline-none transition-shadow bg-[var(--bg-secondary)]"
            style={{
              boxShadow: showError
                ? '0 0 0 2px rgba(239,68,68,0.40)'
                : showValid
                ? '0 0 0 2px rgba(16,185,129,0.40)'
                : '0 0 0 1.5px rgba(0,0,0,0.08)',
              color: 'var(--text-primary)',
            }}
          />
          {showValid && (
            <span className="absolute inset-y-0 right-3 flex items-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </span>
          )}
        </div>
        {showError && (
          <p className="text-[12px]" style={{ color: '#f87171' }}>
            Please enter a valid email address or phone number.
          </p>
        )}
      </div>
    );
  };

  const renderPasswordField = () => {
    const showError = fieldTouched.password && !validPassword;
    const showValid = fieldTouched.password && validPassword && !showError;

    return (
      <div className="space-y-1.5">
        <label
          className="text-[13px] font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() =>
              setFieldTouched((s) => ({ ...s, password: true }))
            }
            placeholder="Your password"
            className="w-full h-[52px] rounded-[14px] pl-10 pr-10 text-[15px] outline-none transition-shadow bg-[var(--bg-secondary)]"
            style={{
              boxShadow: showError
                ? '0 0 0 2px rgba(239,68,68,0.40)'
                : showValid
                ? '0 0 0 2px rgba(16,185,129,0.40)'
                : '0 0 0 1.5px rgba(0,0,0,0.08)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          {showValid && (
            <span className="absolute inset-y-0 right-8 flex items-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </span>
          )}
        </div>
        {showError && (
          <p className="text-[12px]" style={{ color: '#f87171' }}>
            Password must be at least 6 characters.
          </p>
        )}
      </div>
    );
  };

  return (
    <AuthLayout tab="login" formTitle="Sign in">
      {step === 'password' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Heading */}
          <div className="space-y-1 mb-1">
            <h2
              className="text-[24px] sm:text-[28px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {primaryHeading}
            </h2>
            <p
              className="text-[13px] sm:text-[14px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {primarySub}
            </p>
          </div>

          {renderErrorBanner()}

          {/* Inputs */}
          <div className="space-y-4">
            {renderIdentifierField()}
            {renderPasswordField()}
          </div>

          {/* Remember + forgot row */}
          <div className="flex items-center justify-between text-[13px] pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-2"
                style={{ accentColor: '#f97316' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="font-semibold"
              style={{ color: '#f97316' }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Primary button + biometric */}
          <div className="space-y-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] rounded-[14px] font-bold text-[16px] tracking-[0.03em] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-transform"
              style={{
                background:
                  'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
                color: '#ffffff',
                boxShadow:
                  '0 6px 24px rgba(249,115,22,0.45),0 2px 8px rgba(249,115,22,0.25)',
              }}
            >
              {loading && (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {!loading && <span>Sign In</span>}
            </button>

            <button
              type="button"
              disabled={biometricLoading}
              onClick={handleBiometricLogin}
              className="w-full h-[48px] rounded-[14px] flex items-center justify-center gap-2 text-[14px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'var(--bg-secondary)',
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              {biometricLoading ? (
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Fingerprint className="w-4 h-4" />
              )}
              <span>{biometricLoading ? 'Signing in…' : 'Use biometric'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div
              className="flex-1 h-px"
              style={{
                background:
                  'linear-gradient(to right, transparent, var(--divider), transparent)',
              }}
            />
            <span
              className="text-[13px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Or continue with
            </span>
            <div
              className="flex-1 h-px"
              style={{
                background:
                  'linear-gradient(to right, transparent, var(--divider), transparent)',
              }}
            />
          </div>

          {/* Google sign-in – full width, modern */}
          <button
            type="button"
            onClick={() => {
              const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              window.location.href = `${base}/auth/google?role=buyer`;
            }}
            className="w-full h-[52px] rounded-[14px] flex items-center justify-center gap-3 px-4 text-[15px] font-semibold transition-all hover:opacity-95 active:scale-[0.99]"
            style={{
              background: '#fff',
              color: '#3c4043',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
            }}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.27 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            Secure sign-in with email verification
          </p>

          {/* Bottom switch text */}
          <p
            className="text-center text-[14px] mt-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold"
              style={{ color: '#f97316' }}
            >
              Sign Up
            </Link>
          </p>
        </form>
      )}

      {step !== 'password' && (
        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <div className="space-y-1 mb-1">
            <h2
              className="text-[24px] sm:text-[28px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {primaryHeading}
            </h2>
            <p
              className="text-[13px] sm:text-[14px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {primarySub}
            </p>
          </div>

          {renderErrorBanner()}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p
                className="text-[13px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Enter the 6‑digit code we just sent you.
              </p>
              <button
                type="button"
                disabled={otpCountdown > 0}
                onClick={handleResendOtp}
                className="text-[12px] font-semibold disabled:opacity-50"
                style={{ color: '#f97316' }}
              >
                {otpCountdown > 0
                  ? `Resend in ${otpCountdown}s`
                  : 'Resend code'}
              </button>
            </div>

            <div className="flex justify-between gap-2 pt-1">
              {otp.map((value, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-10 h-11 sm:w-11 sm:h-12 rounded-xl text-center text-[16px] font-semibold outline-none bg-[var(--bg-secondary)]"
                  style={{
                    boxShadow:
                      '0 0 0 1.5px rgba(0,0,0,0.08)',
                    color: 'var(--text-primary)',
                  }}
                />
              ))}
            </div>
            {otpError && (
              <p className="text-[12px]" style={{ color: '#f87171' }}>
                {otpError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submittingOtp || buttonSuccess}
            className="w-full h-[54px] rounded-[14px] font-bold text-[16px] tracking-[0.03em] flex items-center justify-center gap-2 disabled:opacity-70 transition-transform"
            style={{
              background: buttonSuccess
                ? '#16a34a'
                : 'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
              color: '#ffffff',
              boxShadow: buttonSuccess
                ? '0 6px 24px rgba(22,163,74,0.55)'
                : '0 6px 24px rgba(249,115,22,0.45),0 2px 8px rgba(249,115,22,0.25)',
            }}
          >
            {submittingOtp && (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {buttonSuccess && <Check className="w-5 h-5" />}
            {!submittingOtp && !buttonSuccess && <span>Verify &amp; Continue</span>}
            {submittingOtp && !buttonSuccess && <span>Verifying…</span>}
            {buttonSuccess && <span>Welcome back!</span>}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
