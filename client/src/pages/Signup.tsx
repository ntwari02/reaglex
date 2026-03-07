import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Briefcase, Mail, Phone, AlertCircle, Check } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import AuthLayout from '../components/AuthLayout';

function hasSQLInjectionRisk(value: string): boolean {
  const pattern = /(;|--|\/\*|\*\/|\b(OR|AND)\b\s+\d+=\d+|\bxp_)/i;
  return pattern.test(value);
}

export function Signup() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();

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
      const response = await fetch('http://localhost:5000/api/auth/register', {
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
          ? 'Account created! Your seller profile is pending verification.'
          : 'Account created successfully! Please log in.',
        'success'
      );
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout tab="signup">
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

        {/* Google */}
        <button
          type="button"
          onClick={() => {
            const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            window.location.href = `${base}/auth/google?role=${formData.role}`;
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] border text-sm font-medium hover:bg-gray-50 transition hover:shadow-md"
          style={{ borderColor: '#e5e7eb', color: '#374151', background: 'var(--bg-secondary)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 48 48"><path d="M44.5 20H24V28.5H35.5C34.7 32.5 32.1 35.5 28.5 37.1V43.5H35.5C40.5 39.5 43.5 33.5 44.5 28.5V20Z" fill="#4285F4"/><path d="M24 44C30.5 44 36 41.5 39.5 37.5L32.5 31.5C30.5 33.5 27.5 35 24 35C18.5 35 13.5 31.5 11.5 26.5H4.5V33.5C7.5 39.5 15 44 24 44Z" fill="#34A853"/><path d="M11.5 26.5C11 25 11 23.5 11 22C11 20.5 11 19 11.5 17.5V10.5H4.5C3.5 15.5 3.5 20.5 4.5 26.5H11.5Z" fill="#FBBC05"/><path d="M24 13C27 13 29.5 14 31.5 16L38 9.5C36 7.5 33.5 6 30.5 5C21.5 5 14 9.5 11 17.5L18 22.5C19.5 18.5 21.5 13 24 13Z" fill="#EA4335"/></svg>
          Sign up with Google
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
