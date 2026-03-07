import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, Fingerprint, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import AuthLayout from '../components/AuthLayout';

function hasSQLInjectionRisk(value: string): boolean {
  const pattern = /(;|--|\/\*|\*\/|\b(OR|AND)\b\s+\d+=\d+|\bxp_)/i;
  return pattern.test(value);
}

export function Login() {
  const navigate = useNavigate();
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
  const redirectRef = useRef<string>('/');

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
      const result = await login(identifier, password);
      if (!result.success) {
        setFormError(result.error || 'Login failed. Please check your credentials.');
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

  const handleResendOtp = () => {
    if (otpCountdown > 0) return;
    setOtpCountdown(30);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  const primaryHeading =
    step === 'otp' ? 'Two‑factor verification 🔐' : 'Welcome back 👋';
  const primarySub =
    step === 'otp'
      ? 'Enter the 6‑digit code sent to your email or phone.'
      : 'Sign in to your account';

  const renderErrorBanner = () =>
    formError && (
      <div
        className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-2xl text-xs"
        style={{
          background: '#1c0808',
          color: '#f87171',
          boxShadow: 'inset 0 0 0 1px rgba(248,113,113,0.25)',
        }}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{formError}</span>
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
    <AuthLayout tab="login">
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
              className="w-full h-[48px] rounded-[14px] flex items-center justify-center gap-2 text-[14px] font-medium"
              style={{
                background: 'var(--bg-secondary)',
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              <Fingerprint className="w-4 h-4" />
              <span>Use biometric (coming soon)</span>
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

          {/* Social button – Google only */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const base =
                  import.meta.env.VITE_API_URL ||
                  'http://localhost:5000/api';
                window.location.href = `${base}/auth/google?role=buyer`;
              }}
              className="w-full sm:w-auto min-w-[220px] h-[48px] rounded-[12px] flex items-center justify-center gap-2 px-4 text-[14px] font-medium"
              style={{
                background: 'var(--bg-secondary)',
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  d="M44.5 20H24V28.5H35.5C34.7 32.5 32.1 35.5 28.5 37.1V43.5H35.5C40.5 39.5 43.5 33.5 44.5 28.5V20Z"
                  fill="#4285F4"
                />
                <path
                  d="M24 44C30.5 44 36 41.5 39.5 37.5L32.5 31.5C30.5 33.5 27.5 35 24 35C18.5 35 13.5 31.5 11.5 26.5H4.5V33.5C7.5 39.5 15 44 24 44Z"
                  fill="#34A853"
                />
                <path
                  d="M11.5 26.5C11 25 11 23.5 11 22C11 20.5 11 19 11.5 17.5V10.5H4.5C3.5 15.5 3.5 20.5 4.5 26.5H11.5Z"
                  fill="#FBBC05"
                />
                <path
                  d="M24 13C27 13 29.5 14 31.5 16L38 9.5C36 7.5 33.5 6 30.5 5C21.5 5 14 9.5 11 17.5L18 22.5C19.5 18.5 21.5 13 24 13Z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

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
