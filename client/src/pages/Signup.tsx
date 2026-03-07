import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Briefcase, Mail, Phone, AlertCircle, Check, Fingerprint, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import AuthLayout from '../components/AuthLayout';

function hasSQLInjectionRisk(value: string): boolean {
  const pattern = /(;|--|\/\*|\*\/|\b(OR|AND)\b\s+\d+=\d+|\bxp_)/i;
  return pattern.test(value);
}

export function Signup() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const { loginWithBiometric } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'buyer' as 'buyer' | 'seller',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);

  const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const passwordStrong =
    formData.password.length >= 8 &&
    /[A-Z]/.test(formData.password) &&
    /\d/.test(formData.password) &&
    /[^A-Za-z0-9]/.test(formData.password);

  const strengthScore = (() => {
    let score = 0;
    if (formData.password.length >= 8) score++;
    if (/[A-Z]/.test(formData.password)) score++;
    if (/\d/.test(formData.password)) score++;
    if (/[^A-Za-z0-9]/.test(formData.password)) score++;
    return Math.min(score, 3);
  })();

  const strengthLabel =
    strengthScore === 0
      ? ''
      : strengthScore === 1
      ? 'Weak'
      : strengthScore === 2
      ? 'Fair'
      : 'Strong';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!fullName || fullName.length < 2) {
      setError('Full name must be at least 2 characters'); setLoading(false); return;
    }
    if (!emailValid) {
      setError('Please enter a valid email address'); setLoading(false); return;
    }
    if (!passwordStrong) {
      setError('Password must be at least 8 characters and include uppercase, number, and special character'); setLoading(false); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match'); setLoading(false); return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service'); setLoading(false); return;
    }
    if (hasSQLInjectionRisk(fullName) || hasSQLInjectionRisk(formData.email) || hasSQLInjectionRisk(formData.password)) {
      setError('Input contains invalid characters'); setLoading(false); return;
    }

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.message || 'Failed to create account'); setLoading(false); return; }

      showToast(
        formData.role === 'seller'
          ? 'Account created! Verify your email below, then sign in. Seller profile is pending approval.'
          : 'Account created! Verify your email below (link or code), then sign in.',
        'success'
      );
      navigate(`/verify-email-pending?email=${encodeURIComponent(formData.email)}`, { replace: true });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError('');
    const result = await loginWithBiometric();
    setBiometricLoading(false);
    if (!result.success) {
      setError(result.error || 'Biometric sign-in failed.');
      return;
    }
    showToast('Signed in with biometric. Welcome back!', 'success');
    const { user } = useAuthStore.getState();
    if (user?.role === 'seller') navigate('/seller');
    else if (user?.role === 'admin') navigate('/admin');
    else navigate('/');
  };

  return (
    <AuthLayout tab="signup" formTitle="Create account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1 mb-1">
          <h2
            className="text-[24px] sm:text-[28px] font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Create account 🚀
          </h2>
          <p
            className="text-[13px] sm:text-[14px]"
            style={{ color: 'var(--text-muted)' }}
          >
            Join the Reaglex community
          </p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 mb-2 rounded-2xl text-xs"
            style={{
              background: '#1c0808',
              color: '#f87171',
              boxShadow: 'inset 0 0 0 1px rgba(248,113,113,0.25)',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Name row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              className="text-[13px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              First name
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              placeholder="First name"
              className="w-full h-[52px] rounded-[14px] px-4 text-[15px] outline-none bg-[var(--bg-secondary)]"
              style={{
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-[13px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Last name
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              placeholder="Last name"
              className="w-full h-[52px] rounded-[14px] px-4 text-[15px] outline-none bg-[var(--bg-secondary)]"
              style={{
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label
            className="text-[13px] font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Mail className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="you@example.com"
              className="w-full h-[52px] rounded-[14px] pl-10 pr-10 text-[15px] outline-none bg-[var(--bg-secondary)]"
              style={{
                boxShadow: emailValid
                  ? '0 0 0 2px rgba(16,185,129,0.40)'
                  : '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-primary)',
              }}
            />
            {emailValid && (
              <span className="absolute inset-y-0 right-3 flex items-center">
                <Check className="w-4 h-4 text-emerald-400" />
              </span>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label
            className="text-[13px] font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Phone number
          </label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 px-3 rounded-[14px] h-[52px] text-[13px]"
              style={{
                background: 'var(--bg-secondary)',
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              <span>🇷🇼</span>
              <span className="font-semibold text-[13px]">+250</span>
            </div>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="Phone number (optional)"
              className="flex-1 h-[52px] rounded-[14px] px-4 text-[15px] outline-none bg-[var(--bg-secondary)]"
              style={{
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Password + strength */}
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label
              className="text-[13px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="At least 8 characters"
                className="w-full h-[52px] rounded-[14px] px-4 pr-10 text-[15px] outline-none bg-[var(--bg-secondary)]"
                style={{
                  boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {/* Strength meter */}
          <div className="space-y-1">
            <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-opacity"
                  style={{
                    background:
                      i === 0
                        ? '#ef4444'
                        : i === 1
                        ? '#f97316'
                        : i === 2
                        ? '#eab308'
                        : '#10b981',
                    opacity: strengthScore >= i ? 1 : 0.2,
                  }}
                />
              ))}
            </div>
            {strengthLabel && (
              <p
                className="text-[12px]"
                style={{
                  color:
                    strengthScore <= 1
                      ? '#ef4444'
                      : strengthScore === 2
                      ? '#f97316'
                      : '#10b981',
                }}
              >
                {strengthLabel}
              </p>
            )}
          </div>
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label
            className="text-[13px] font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="Confirm password"
              className="w-full h-[52px] rounded-[14px] px-4 pr-10 text-[15px] outline-none bg-[var(--bg-secondary)]"
              style={{
                boxShadow:
                  '0 0 0 1.5px rgba(0,0,0,0.08)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Role selector */}
        <div className="space-y-2 pt-1">
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--text-muted)' }}
          >
            I want to
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['buyer', 'seller'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFormData({ ...formData, role: r })}
                className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-xs font-semibold transition-all"
                style={{
                  borderColor:
                    formData.role === r ? '#f97316' : '#e5e7eb',
                  background:
                    formData.role === r
                      ? 'rgba(249,115,22,0.10)'
                      : 'white',
                  color:
                    formData.role === r ? '#f97316' : '#6b7280',
                }}
              >
                {r === 'buyer' ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Briefcase className="w-3.5 h-3.5" />
                )}
                {r === 'buyer' ? 'Buy Products' : 'Sell Products'}
              </button>
            ))}
          </div>
        </div>

        {/* Referral code (optional) */}
        <div className="space-y-1">
          {!referralOpen ? (
            <button
              type="button"
              onClick={() => setReferralOpen(true)}
              className="text-[13px] font-medium"
              style={{ color: '#f97316' }}
            >
              Have a referral code?
            </button>
          ) : (
            <div className="space-y-1.5">
              <label
                className="text-[13px] font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                Referral code (optional)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Enter referral code"
                className="w-full h-[48px] rounded-[14px] px-4 text-[14px] outline-none bg-[var(--bg-secondary)]"
                style={{
                  boxShadow:
                    '0 0 0 1.5px rgba(0,0,0,0.08)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-orange-500 flex-shrink-0"
          />
          <span
            className="text-[13px] leading-tight"
            style={{ color: '#6b7280' }}
          >
            I agree to the{' '}
            <span style={{ color: '#f97316' }}>Terms of Service</span> and{' '}
            <span style={{ color: '#f97316' }}>Privacy Policy</span>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-[54px] rounded-[14px] text-white font-bold text-[16px] tracking-[0.03em] disabled:opacity-60 disabled:cursor-not-allowed transition-transform"
          style={{
            background:
              'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
            boxShadow:
              '0 6px 24px rgba(249,115,22,0.45),0 2px 8px rgba(249,115,22,0.25)',
          }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

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
            Or sign up with
          </span>
          <div
            className="flex-1 h-px"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--divider), transparent)',
            }}
          />
        </div>

        {/* Google – full width, modern */}
        <button
          type="button"
          onClick={() => {
            const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            window.location.href = `${base}/auth/google?role=${formData.role}`;
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

        <p className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          Secure sign-up with email verification (link or code)
        </p>

        <button
          type="button"
          disabled={biometricLoading}
          onClick={handleBiometricLogin}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] border text-sm font-medium hover:bg-gray-50 transition hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ borderColor: '#e5e7eb', color: '#374151', background: 'var(--bg-secondary)' }}
        >
          {biometricLoading ? (
            <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Fingerprint className="w-4 h-4" />
          )}
          {biometricLoading ? 'Signing in…' : 'Sign in with biometric'}
        </button>

        <p className="text-center text-[14px]" style={{ color: '#9ca3af' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold" style={{ color: '#f97316' }}>
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
