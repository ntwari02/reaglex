import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { Lock, Check, Eye, EyeOff, ArrowRight } from 'lucide-react';
import AuthPremiumLayout from '../components/AuthPremiumLayout';

import { API_BASE_URL } from '../lib/config';
const PRIMARY = '#f97316';
const SUCCESS = '#10b981';

function checkPasswordReqs(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const cardBg = isDark ? '#111420' : '#ffffff';
  const cardShadow = isDark
    ? '0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.5)'
    : '0 0 0 1px rgba(0,0,0,0.04), 0 24px 48px -12px rgba(0,0,0,0.12)';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const reqs = checkPasswordReqs(password);
  const isPasswordValid = Object.values(reqs).every(Boolean);
  const match = confirmPassword.length ? password === confirmPassword : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!tokenFromUrl?.trim()) {
      setError('Invalid or expired reset link. Please request a new one from the forgot password page.');
      setLoading(false);
      return;
    }
    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: tokenFromUrl.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to reset password.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPremiumLayout>
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[100%]">
        <div className="flex-shrink-0 flex justify-end items-center mb-2">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-auto">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="auth-mobile-app-card w-full max-w-[520px] rounded-[24px] p-5 sm:p-6 flex flex-col overflow-hidden"
            style={{ background: cardBg, boxShadow: cardShadow }}
          >
            <div className="auth-mobile-app-glow auth-mobile-app-glow--orange" />
            <div className="auth-mobile-app-glow auth-mobile-app-glow--violet" />
            <div className="relative z-10 flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="w-2 h-2 rounded-full bg-rose-400" />
              </div>
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-faint)' }}>
                Reaglex Secure
              </p>
            </div>
            <div className="relative z-10">
            <Link to="/auth?tab=login" className="text-[12px] font-medium hover:underline mb-4 block" style={{ color: PRIMARY }}>
              ← Back to Sign In
            </Link>

            <h2 className="text-[22px] font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Set New Password
            </h2>
            <p className="text-[13px] mb-5" style={{ color: 'var(--text-muted)' }}>
              Use the link from your reset email to set a new password. If your link expired, request a new one.
            </p>

            {!tokenFromUrl?.trim() && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 text-sm">
                This page is only valid when opened from the link in your reset email. If your link expired or you arrived here by mistake,{' '}
                <Link to="/forgot-password" className="font-semibold underline hover:no-underline">request a new reset link</Link>.
              </div>
            )}

            {success ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                <div className="text-2xl mb-2">✓</div>
                <p className="font-bold text-lg mb-1" style={{ color: SUCCESS }}>Password reset successful!</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Redirecting to sign in...</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="text-sm p-3 rounded-[12px]" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                    {error}
                  </div>
                )}

                <PremiumStyleInput
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="Create a strong password"
                  leftIcon={Lock}
                  focused={focused === 'password'}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  valid={isPasswordValid}
                  rightEl={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <div className="rounded-[12px] p-3 space-y-2" style={{ background: 'var(--bg-tertiary)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Password requirements
                  </p>
                  <ReqItem valid={reqs.length} text="At least 8 characters" />
                  <ReqItem valid={reqs.upper} text="One uppercase letter" />
                  <ReqItem valid={reqs.lower} text="One lowercase letter" />
                  <ReqItem valid={reqs.number} text="One number" />
                  <ReqItem valid={reqs.special} text="One special character" />
                </div>

                <PremiumStyleInput
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm your password"
                  leftIcon={Lock}
                  focused={focused === 'confirm'}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  valid={match === true}
                  rightEl={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-1 rounded hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <motion.button
                  type="submit"
                  disabled={loading || success || !isPasswordValid || !confirmPassword || password !== confirmPassword || !tokenFromUrl?.trim()}
                  className="w-full h-[48px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 border-none cursor-pointer transition-all"
                  style={{
                    background: PRIMARY,
                    color: '#ffffff',
                    boxShadow: '0 8px 28px rgba(249,115,22,0.45), 0 4px 14px rgba(249,115,22,0.35)',
                  }}
                  whileHover={!loading ? { y: -2, boxShadow: '0 12px 36px rgba(249,115,22,0.5)' } : {}}
                  whileTap={!loading ? { y: 0 } : {}}
                >
                  {loading && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {!loading && <>Reset Password <ArrowRight className="w-4 h-4" /></>}
                </motion.button>
              </form>
            )}
            </div>
          </motion.div>
        </div>

        <p className="flex-shrink-0 mt-4 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Remember your password? <Link to="/auth?tab=login" className="font-semibold hover:underline" style={{ color: PRIMARY }}>Sign In</Link>
        </p>
      </div>
    </AuthPremiumLayout>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className="w-9 h-9 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all hover:opacity-90"
      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 0 0 1px var(--divider)' }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

function ReqItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {valid ? <Check className="w-4 h-4 flex-shrink-0" style={{ color: SUCCESS }} /> : <span className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'var(--text-faint)' }} />}
      <span className="text-[13px]" style={{ color: valid ? SUCCESS : 'var(--text-muted)' }}>{text}</span>
    </div>
  );
}

function PremiumStyleInput({
  label,
  type,
  value,
  onChange,
  placeholder,
  leftIcon: LeftIcon,
  focused,
  onFocus,
  onBlur,
  valid,
  rightEl,
  maxLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  leftIcon: React.ComponentType<{ className?: string }>;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  valid?: boolean;
  rightEl?: React.ReactNode;
  maxLength?: number;
}) {
  const ring = valid
    ? '0 0 0 2px rgba(16,185,129,0.40)'
    : focused
      ? '0 0 0 2.5px rgba(249,115,22,0.5)'
      : '0 0 0 1.5px rgba(0,0,0,0.08)';
  const bg = valid ? 'rgba(16,185,129,0.03)' : focused ? 'var(--card-bg)' : 'var(--bg-secondary)';

  return (
    <div className="mb-0">
      <label className="block font-bold uppercase tracking-wider text-[11px] mb-1" style={{ color: 'var(--text-primary)' }}>
        {label} *
      </label>
      <div className="relative">
        {LeftIcon && (
          <span
            className="absolute top-1/2 -translate-y-1/2 left-3 flex items-center justify-center transition-colors"
            style={{ color: focused ? PRIMARY : 'var(--text-muted)' }}
          >
            <LeftIcon className="w-4 h-4" />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full h-[42px] text-[14px] pl-10 pr-10 rounded-[12px] outline-none transition-all"
          style={{ background: bg, boxShadow: ring, color: 'var(--text-primary)' }}
        />
        {rightEl && <div className="absolute top-1/2 -translate-y-1/2 right-3">{rightEl}</div>}
        {valid && !rightEl && (
          <span className="absolute top-1/2 -translate-y-1/2 right-3">
            <Check className="w-4 h-4" style={{ color: SUCCESS }} />
          </span>
        )}
      </div>
    </div>
  );
}
