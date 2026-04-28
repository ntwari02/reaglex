import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, User, Mail, Lock, Check, ArrowRight, AlertCircle, Sun, Moon,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useTheme } from '../contexts/ThemeContext';
import AuthPremiumLayout, { type AuthView } from '../components/AuthPremiumLayout';
import { authAPI } from '../lib/api';
import { API_BASE_URL } from '../lib/config';

const PRIMARY     = '#f97316';
const SUCCESS     = '#10b981';
const ERROR       = '#ef4444';
const API_BASE    = API_BASE_URL;
const RESEND_CD   = 120;

/* ─── helpers ────────────────────────────────────────────────────────────── */
function hasSQLRisk(v: string) {
  return /(;|--|\/\*|\*\/|\b(OR|AND)\b\s+\d+=\d+|\bxp_)/i.test(v);
}

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!pw.length) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/\d/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return { level: Math.min(3, score) as 0|1|2|3, label: ['Weak','Fair','Good','Strong ✓'][Math.min(3, score)] };
}

function checkPasswordReqs(pw: string) {
  return {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    number:  /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function formatCountdown(s: number) {
  const t = Math.max(0, s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/* ─── Shared input ───────────────────────────────────────────────────────── */
function AuthInput({
  label, type = 'text', value, onChange, placeholder, error, valid, focused,
  leftIcon: LeftIcon, rightEl, onFocus, onBlur, required, autoFocus,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  error?: string; valid?: boolean; focused?: boolean;
  leftIcon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  rightEl?: React.ReactNode; onFocus?: () => void; onBlur?: () => void;
  required?: boolean; autoFocus?: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const ring = error
    ? '0 0 0 2px rgba(239,68,68,0.45)'
    : valid
      ? '0 0 0 2px rgba(16,185,129,0.45)'
      : focused
        ? `0 0 0 2.5px rgba(249,115,22,0.55), 0 0 18px rgba(249,115,22,0.15)`
        : `0 0 0 1.5px ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`;

  const inputBg = error
    ? 'rgba(239,68,68,0.04)'
    : focused
      ? isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'
      : isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fc';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
        {label}{required ? <span style={{ color: PRIMARY }}> *</span> : ''}
      </label>
      <div className="relative">
        {LeftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
            style={{ color: focused && !error ? PRIMARY : 'var(--text-faint)' }}>
            <LeftIcon size={16} />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          className="w-full h-[50px] rounded-2xl outline-none text-[14px] transition-all duration-200"
          style={{
            background: inputBg,
            boxShadow: ring,
            color: 'var(--text-primary)',
            paddingLeft: LeftIcon ? '44px' : '16px',
            paddingRight: rightEl || valid ? '44px' : '16px',
          }}
        />
        {rightEl && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
        {valid && !rightEl && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <Check size={14} style={{ color: SUCCESS }} />
          </span>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-[11px] flex items-center gap-1"
          style={{ color: '#f87171' }}
        >
          <AlertCircle size={10} /> {error}
        </motion.p>
      )}
    </div>
  );
}

/* ─── Error banner ───────────────────────────────────────────────────────── */
function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-[13px] font-medium"
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        color: '#f87171',
      }}
    >
      <AlertCircle size={15} className="flex-shrink-0" />
      {message}
    </motion.div>
  );
}

/* ─── Primary button ─────────────────────────────────────────────────────── */
function PrimaryBtn({
  children, onClick, type = 'submit', disabled, loading, success,
}: {
  children: React.ReactNode; onClick?: () => void; type?: 'submit'|'button';
  disabled?: boolean; loading?: boolean; success?: boolean;
}) {
  const bg = success
    ? 'linear-gradient(135deg, #059669, #047857)'
    : 'linear-gradient(135deg, #ff8c2a 0%, #f97316 50%, #ea580c 100%)';

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className="relative w-full h-[52px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2.5 overflow-hidden border-none cursor-pointer select-none"
      style={{
        background: bg,
        color: '#ffffff',
        boxShadow: (disabled && !success)
          ? 'none'
          : success
            ? '0 8px 24px rgba(5,150,105,0.4)'
            : '0 8px 28px rgba(249,115,22,0.4), 0 2px 8px rgba(249,115,22,0.25)',
        opacity: disabled && !success ? 0.55 : 1,
        transition: 'box-shadow 250ms ease, transform 250ms ease',
      }}
    >
      {/* Shimmer */}
      <span className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)',
        animation: !disabled ? 'btn-shimmer 2.8s ease infinite' : undefined,
      }} />
      <span className="relative flex items-center gap-2">
        {loading && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {children}
      </span>
      <style>{`
        @keyframes btn-shimmer {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%);  }
          100% { transform: translateX(100%);  }
        }
      `}</style>
    </motion.button>
  );
}

/* ─── OR divider ─────────────────────────────────────────────────────────── */
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
      <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-faint)' }}>or</span>
      <div className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
    </div>
  );
}

/* ─── Google button ──────────────────────────────────────────────────────── */
function GoogleBtn({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className="w-full h-[50px] rounded-2xl flex items-center justify-center gap-3 text-[14px] font-semibold border-none cursor-pointer transition-all"
      style={{
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        boxShadow: '0 0 0 1.5px var(--border-card)',
      }}
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
        <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.77-6.77C35.41 2.38 30.21 0 24 0 14.67 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.5 17.79 9.5 24 9.5z"/>
        <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.29 7.09-17.55z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.67 48 24 48z"/>
      </svg>
      Continue with Google
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN FORM
═══════════════════════════════════════════════════════════════════════════ */
function LoginFormContent({
  role = 'buyer',
  onRequireEmailVerification,
}: {
  role?: 'buyer' | 'seller';
  onRequireEmailVerification: (email: string) => void;
}) {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const redirectParam   = searchParams.get('redirect');
  const { login }       = useAuthStore();
  const { showToast }   = useToastStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState<string | null>(null);
  const [shake,    setShake]    = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^\d+$/.test(email);

  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!email || !password)     { setError('Please fill in both fields.');             doShake(); return; }
    if (!emailValid)             { setError('Enter a valid email or phone.');            doShake(); return; }
    if (password.length < 6)     { setError('Password must be ≥ 6 characters.');        doShake(); return; }
    if (hasSQLRisk(email) || hasSQLRisk(password)) { setError('Invalid characters detected.'); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success && 'code' in (result as any) && (result as any).code === 'EMAIL_NOT_VERIFIED') {
        onRequireEmailVerification(String((result as any).email));
        setLoading(false); return;
      }
      if (!result.success) {
        setError(result.error || 'Wrong email or password.'); doShake(); setLoading(false); return;
      }
      setSuccess(true);
      const { user } = useAuthStore.getState();
      showToast(`Welcome back, ${user?.full_name?.split(' ')[0] || 'there'}! 👋`, 'success');
      setTimeout(() => {
        if (redirectParam?.startsWith('/')) navigate(redirectParam);
        else if (user?.role === 'seller') navigate('/seller');
        else if (user?.role === 'admin')  navigate('/admin');
        else navigate('/');
      }, 600);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Unexpected error.'); doShake();
    } finally {
      if (!success) setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.28 }}
      className={`flex flex-col gap-5 ${shake ? 'auth-shake-anim' : ''}`}
    >
      {/* Heading */}
      <div>
        <h2 className="text-[26px] font-black mb-1" style={{ color: 'var(--text-primary)' }}>Welcome back</h2>
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Sign in to your Reaglex account</p>
      </div>

      <ErrorBanner message={error} />

      <AuthInput
        label="Email or Phone"
        type="text"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        leftIcon={Mail}
        valid={email.length > 0 && emailValid}
        focused={focused === 'email'}
        onFocus={() => setFocused('email')}
        onBlur={() => setFocused(null)}
        required
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <AuthInput
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          leftIcon={Lock}
          focused={focused === 'pw'}
          onFocus={() => setFocused('pw')}
          onBlur={() => setFocused(null)}
          rightEl={
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="p-1 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--text-muted)' }} aria-label={showPw ? 'Hide' : 'Show'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
        />
        <div className="flex items-center justify-end">
          <Link to="/auth?tab=forgot" className="text-[12px] font-semibold hover:underline" style={{ color: PRIMARY }}>
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Remember me */}
      <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
        <button
          type="button" role="checkbox" aria-checked={remember}
          onClick={() => setRemember(!remember)}
          className="w-10 h-5 rounded-full transition-all flex-shrink-0 relative"
          style={{ background: remember ? PRIMARY : 'var(--bg-tertiary)', boxShadow: '0 0 0 1.5px var(--divider)' }}
        >
          <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
            style={{ transform: remember ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Remember me</span>
      </label>

      <PrimaryBtn loading={loading} success={success}>
        {success ? <><Check size={17} /> Signed In</> : <>Sign In <ArrowRight size={16} /></>}
      </PrimaryBtn>

      <OrDivider />

      <GoogleBtn onClick={() => { window.location.href = `${API_BASE}/auth/google?role=${role}`; }} />

      <p className="text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
        No account?{' '}
        <Link to="/auth?tab=signup" className="font-bold hover:underline" style={{ color: PRIMARY }}>
          Create one free →
        </Link>
      </p>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#10b981' }} />
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>256-bit SSL encrypted • Secure login</span>
      </div>
    </motion.form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIGNUP FORM
═══════════════════════════════════════════════════════════════════════════ */
function SignupFormContent({ onRegistered }: { onRegistered: (email: string) => void }) {
  const [searchParams]       = useSearchParams();
  const referralFromUrl      = searchParams.get('ref')?.trim() || '';
  const { showToast }        = useToastStore();
  const [role, setRole]      = useState<'buyer' | 'seller'>('buyer');
  const [fd, setFd]          = useState({ fullName: '', email: '', password: '', confirmPassword: '', storeName: '' });
  const [showPw,  setShowPw] = useState(false);
  const [showCPw, setShowCPw]= useState(false);
  const [agreed,  setAgreed] = useState(false);
  const [loading, setLoading]= useState(false);
  const [error,   setError]  = useState('');
  const [success, setSuccess]= useState(false);
  const [focused, setFocused]= useState<string | null>(null);
  const [referralProgramEnabled, setReferralProgramEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState('');

  const strength  = getPasswordStrength(fd.password);
  const reqs      = checkPasswordReqs(fd.password);
  const emailValid= /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email);
  const pwMatch   = fd.confirmPassword.length ? fd.password === fd.confirmPassword : null;
  const canSubmit = fd.fullName.trim().length >= 2 && emailValid && fd.password.length >= 8
    && reqs.upper && reqs.number && reqs.special
    && fd.password === fd.confirmPassword && agreed
    && (role !== 'seller' || fd.storeName.trim().length > 0);

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/marketing/referral-status?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { referralProgramEnabled?: boolean }) => {
        if (typeof d.referralProgramEnabled === 'boolean') setReferralProgramEnabled(d.referralProgramEnabled);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (referralProgramEnabled && referralFromUrl) setReferralCode(referralFromUrl.toUpperCase());
  }, [referralProgramEnabled, referralFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (fd.fullName.trim().length < 2)        { setError('Full name must be ≥ 2 characters.');            return; }
    if (!emailValid)                          { setError('Enter a valid email address.');                  return; }
    if (fd.password.length < 8)               { setError('Password must be ≥ 8 characters.');             return; }
    if (!reqs.upper || !reqs.number || !reqs.special) { setError('Password needs uppercase, number & special char.'); return; }
    if (fd.password !== fd.confirmPassword)   { setError('Passwords do not match.');                      return; }
    if (!agreed)                              { setError('Please agree to the Terms of Service.');        return; }
    if (role === 'seller' && !fd.storeName.trim()) { setError('Store name is required for sellers.');    return; }
    if (hasSQLRisk(fd.fullName) || hasSQLRisk(fd.email) || hasSQLRisk(fd.password)) { setError('Invalid characters detected.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fd.fullName, email: fd.email, password: fd.password, role,
          storeName: role === 'seller' ? fd.storeName : undefined,
          ...(referralProgramEnabled && referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Registration failed.'); return; }
      setSuccess(true);
      showToast('Account created! Verify your email to continue.', 'success');
      onRegistered(fd.email.trim().toLowerCase());
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  };

  if (success) return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <span className="text-3xl">🎉</span>
      </div>
      <h3 className="font-black text-xl mb-1" style={{ color: SUCCESS }}>Account Created!</h3>
      <p className="font-semibold text-sm mb-1" style={{ color: PRIMARY }}>
        Welcome, {fd.fullName.trim().split(/\s+/)[0] || 'there'}!
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Check your email to verify your account</p>
      <Link to="/auth?tab=login"
        className="inline-flex justify-center px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
        style={{ background: `linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)`, boxShadow: '0 6px 20px rgba(249,115,22,0.4)' }}>
        Sign In →
      </Link>
    </motion.div>
  );

  const f = (k: keyof typeof fd) => (v: string) => setFd({ ...fd, [k]: v });

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.28 }}
      className="flex flex-col gap-4"
    >
      {/* Heading */}
      <div>
        <h2 className="text-[24px] font-black mb-1" style={{ color: 'var(--text-primary)' }}>Create account</h2>
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Join buyers and sellers on Reaglex</p>
      </div>

      <ErrorBanner message={error} />

      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput label="Full Name" value={fd.fullName} onChange={f('fullName')} placeholder="Your full name"
          leftIcon={User} valid={fd.fullName.trim().length >= 2}
          focused={focused === 'name'} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} required autoFocus />
        <AuthInput label="Email Address" type="email" value={fd.email} onChange={f('email')} placeholder="you@example.com"
          leftIcon={Mail}
          error={fd.email.length > 0 && !emailValid ? 'Enter a valid email' : undefined}
          valid={emailValid}
          focused={focused === 'email'} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} required />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-2">
        <AuthInput label="Password" type={showPw ? 'text' : 'password'} value={fd.password} onChange={f('password')}
          placeholder="At least 8 characters" leftIcon={Lock}
          focused={focused === 'pw'} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
          rightEl={
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}
              aria-label={showPw ? 'Hide' : 'Show'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required />
        {/* Strength bar */}
        {fd.password.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              {[0,1,2,3].map((i) => (
                <div key={i} className="flex-1 transition-all duration-300" style={{
                  background: [ERROR, '#f97316', '#eab308', SUCCESS][i],
                  opacity: strength.level > i ? 1 : 0.2,
                }} />
              ))}
            </div>
            <span className="text-[11px] font-semibold w-14 text-right"
              style={{ color: strength.level <= 1 ? ERROR : strength.level === 2 ? '#eab308' : SUCCESS }}>
              {strength.label}
            </span>
          </div>
        )}
        {/* Password requirements */}
        {fd.password.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {[
              { ok: reqs.length,  label: '8+ chars'    },
              { ok: reqs.upper,   label: 'Uppercase'   },
              { ok: reqs.number,  label: 'Number'      },
              { ok: reqs.special, label: 'Special char'},
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: r.ok ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)' }}>
                  {r.ok && <Check size={9} style={{ color: SUCCESS }} />}
                </span>
                <span className="text-[11px]" style={{ color: r.ok ? SUCCESS : 'var(--text-faint)' }}>{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm password */}
      <AuthInput label="Confirm Password" type={showCPw ? 'text' : 'password'} value={fd.confirmPassword} onChange={f('confirmPassword')}
        placeholder="Repeat your password" leftIcon={Lock}
        focused={focused === 'cpw'} onFocus={() => setFocused('cpw')} onBlur={() => setFocused(null)}
        valid={pwMatch === true}
        error={pwMatch === false ? "Passwords don't match" : undefined}
        rightEl={
          pwMatch !== true
            ? <button type="button" onClick={() => setShowCPw(!showCPw)}
                className="p-1 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                {showCPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            : undefined
        }
        required />

      {/* Role selector */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Account type</p>
        <div className="flex gap-2">
          {(['buyer', 'seller'] as const).map((r) => (
            <motion.button key={r} type="button" onClick={() => setRole(r)}
              whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-[13px] font-bold transition-all"
              style={{
                background: role === r ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'var(--bg-secondary)',
                color: role === r ? '#ffffff' : 'var(--text-muted)',
                boxShadow: role === r ? '0 4px 14px rgba(249,115,22,0.35)' : '0 0 0 1.5px var(--border-card)',
              }}>
              {r === 'buyer' ? '🛒' : '🏪'}
              {r === 'buyer' ? 'Buyer' : 'Seller'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Seller store name */}
      <AnimatePresence>
        {role === 'seller' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <AuthInput label="Store Name" value={fd.storeName} onChange={f('storeName')} placeholder="Your store name"
              leftIcon={User}
              focused={focused === 'store'} onFocus={() => setFocused('store')} onBlur={() => setFocused(null)} required />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referral code */}
      {referralProgramEnabled && (
        <AuthInput label="Referral Code (optional)" value={referralCode} onChange={setReferralCode}
          placeholder="e.g. RX-xxxxxxxx" leftIcon={User}
          focused={focused === 'ref'} onFocus={() => setFocused('ref')} onBlur={() => setFocused(null)} />
      )}

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <button type="button" role="checkbox" aria-checked={agreed} onClick={() => setAgreed(!agreed)}
          className="w-5 h-5 rounded-lg flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
          style={{ background: agreed ? PRIMARY : 'var(--bg-secondary)', boxShadow: `0 0 0 1.5px ${agreed ? PRIMARY : 'var(--border-card)'}` }}>
          {agreed && <Check size={12} className="text-white" />}
        </button>
        <span className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          I agree to the{' '}
          <a href="/terms" className="font-semibold hover:underline" style={{ color: PRIMARY }}>Terms of Service</a>
          {' '}&amp;{' '}
          <a href="/privacy" className="font-semibold hover:underline" style={{ color: PRIMARY }}>Privacy Policy</a>
        </span>
      </label>

      <PrimaryBtn disabled={!canSubmit} loading={loading}>
        {loading ? 'Creating account…' : 'Create Account →'}
      </PrimaryBtn>

      <OrDivider />
      <GoogleBtn onClick={() => { window.location.href = `${API_BASE}/auth/google?role=${role}`; }} />

      <p className="text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link to="/auth?tab=login" className="font-bold hover:underline" style={{ color: PRIMARY }}>Sign In</Link>
      </p>
    </motion.form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FORGOT PASSWORD FORM
═══════════════════════════════════════════════════════════════════════════ */
function ForgotFormContent({ onSent }: { onSent: (email: string) => void }) {
  const { showToast }        = useToastStore();
  const [email,   setEmail]  = useState('');
  const [loading, setLoading]= useState(false);
  const [error,   setError]  = useState('');
  const [focused, setFocused]= useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to send reset email.'); return; }
      showToast('Reset code sent! Check your email.', 'success');
      onSent(email.trim());
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.28 }}
      className="flex flex-col gap-5"
    >
      <div>
        <Link to="/auth?tab=login" className="text-[12px] font-semibold hover:underline flex items-center gap-1 mb-4 w-fit" style={{ color: PRIMARY }}>
          ← Back to Sign In
        </Link>
        <h2 className="text-[24px] font-black mb-1" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Enter your email and we'll send a 6-digit reset code.</p>
      </div>
      <ErrorBanner message={error} />
      <AuthInput label="Email Address" type="email" value={email} onChange={setEmail}
        placeholder="you@example.com" leftIcon={Mail}
        focused={focused} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        required autoFocus />
      <PrimaryBtn loading={loading}>
        {loading ? 'Sending…' : <>Send Reset Code <ArrowRight size={15} /></>}
      </PrimaryBtn>
    </motion.form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OTP inputs (shared)
═══════════════════════════════════════════════════════════════════════════ */
function OtpInputs({
  digits, inputRefs, locked, error, onChange, onKeyDown, onPaste,
}: {
  digits: string[]; inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  locked: boolean; error: boolean;
  onChange: (i: number, v: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className="flex items-center justify-center gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          inputMode="numeric" autoComplete="one-time-code"
          value={d} disabled={locked}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          className="w-12 h-[56px] rounded-2xl text-center text-[20px] font-black outline-none transition-all duration-200"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : '#f8f9fc',
            boxShadow: error
              ? '0 0 0 2px rgba(239,68,68,0.45)'
              : d ? `0 0 0 2px rgba(249,115,22,0.5), 0 0 12px rgba(249,115,22,0.15)`
              : `0 0 0 1.5px ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            color: 'var(--text-primary)',
          }}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN AUTH PAGE
═══════════════════════════════════════════════════════════════════════════ */
const CARD_SHADOW_LIGHT = '0 32px 64px -12px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)';
const CARD_SHADOW_DARK  = '0 32px 64px -12px rgba(0,0,0,0.55), 0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <motion.button
      type="button" onClick={toggleTheme}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200"
      style={{
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
        color: 'var(--text-primary)',
        boxShadow: isDark
          ? '0 0 0 1.5px rgba(255,255,255,0.14), 0 8px 20px rgba(0,0,0,0.28)'
          : '0 0 0 1.5px rgba(15,23,42,0.1), 0 8px 20px rgba(15,23,42,0.08)',
        backdropFilter: 'blur(8px)',
      }}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </motion.button>
  );
}

export default function AuthPage() {
  const navigate            = useNavigate();
  const [searchParams]      = useSearchParams();
  const { setUserAndToken } = useAuthStore();
  const { theme }           = useTheme();
  const isDark              = theme === 'dark';

  const tab      = (searchParams.get('tab') as 'login'|'signup'|'forgot') || 'login';
  const validTab = (['login','signup','forgot'] as const).includes(tab as any) ? tab : 'login';

  const [panel,    setPanel]   = useState<'auth'|'otp'|'success'|'reset'>('auth');
  const [otpEmail, setOtpEmail]= useState('');
  const [otpError, setOtpError]= useState('');
  const [otpLocked,setOtpLocked]=useState(false);
  const [otpDigits,setOtpDigits]=useState(['','','','','','']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCd, setResendCd]= useState(60);
  const [resendN,  setResendN] = useState(0);
  const [resendLock,setResendLock]=useState<number|null>(null);
  const [expiresAt,setExpiresAt]=useState<number|null>(null);
  const [failN,   setFailN]   = useState(0);
  const [verifying,setVerifying]=useState(false);
  const [sending, setSending] = useState(false);

  const [resetEmail,   setResetEmail]   = useState('');
  const [resetError,   setResetError]   = useState('');
  const [resetLocked,  setResetLocked]  = useState(false);
  const [resetDigits,  setResetDigits]  = useState(['','','','','','']);
  const resetRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resetResendCd,setResetResendCd]= useState(60);
  const [resetResendN, setResetResendN] = useState(0);
  const [resetResendLock,setResetResendLock]=useState<number|null>(null);
  const [newPassword,  setNewPassword]  = useState('');
  const [newConfirm,   setNewConfirm]   = useState('');
  const [resetting,    setResetting]    = useState(false);
  const [resetFocused, setResetFocused] = useState<string|null>(null);

  /* Deep-link: ?verifyEmail=1&email=... */
  useEffect(() => {
    const ve    = searchParams.get('verifyEmail');
    const email = searchParams.get('email');
    const sent  = searchParams.get('sent') === '1';
    if (ve === '1' && email && panel === 'auth') {
      goToOtp(email, !sent).catch(() => undefined);
      const next = new URLSearchParams(searchParams);
      ['verifyEmail','email','sent'].forEach((k) => next.delete(k));
      navigate(`/auth?${next.toString()}`, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Countdown timers */
  useEffect(() => {
    if (panel !== 'otp' || resendCd <= 0) return;
    const t = window.setInterval(() => setResendCd((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [panel, resendCd]);

  useEffect(() => {
    if (panel !== 'reset' || resetResendCd <= 0) return;
    const t = window.setInterval(() => setResetResendCd((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [panel, resetResendCd]);

  /* Expiry countdown (force re-render) */
  useEffect(() => {
    if (panel !== 'otp' || !expiresAt) return;
    const t = window.setInterval(() => setExpiresAt((v) => v), 1000);
    return () => clearInterval(t);
  }, [panel, expiresAt]);

  const expiryText = useMemo(() => {
    if (!expiresAt) return 'Code expires in 10 minutes.';
    const ms = Math.max(0, expiresAt - Date.now());
    const s  = Math.ceil(ms / 1000);
    return `Code expires in ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}.`;
  }, [expiresAt]);

  const canResend      = !resendLock || Date.now() >= resendLock
    ? resendCd <= 0 && resendN < 3 : false;
  const canResendReset = !resetResendLock || Date.now() >= resetResendLock
    ? resetResendCd <= 0 && resetResendN < 3 : false;

  /* OTP helpers */
  const clearOtp  = () => { setOtpDigits(['','','','','','']); setOtpError(''); setFailN(0); setOtpLocked(false); setVerifying(false); };
  const clearReset= () => { setResetDigits(['','','','','','']); setResetError(''); setResetLocked(false); setResetResendN(0); setResetResendLock(null); setResetResendCd(RESEND_CD); setNewPassword(''); setNewConfirm(''); setResetting(false); };

  const sendOtp = async (email: string, reason: 'initial'|'resend'|'autoAfterLock') => {
    const e = email.trim().toLowerCase(); if (!e) return;
    setSending(true); setOtpError('');
    try {
      await authAPI.requestVerificationOtp(e);
      setOtpEmail(e); setExpiresAt(Date.now() + 10*60*1000); setResendCd(RESEND_CD);
      if (reason === 'resend' || reason === 'autoAfterLock') setResendN((n) => n+1);
      window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to send code.');
    } finally { setSending(false); }
  };

  const sendResetOtp = async (email: string, reason: 'request'|'resend') => {
    const e = email.trim().toLowerCase(); if (!e) return;
    setResetError('');
    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e }),
      });
      setResetEmail(e); setResetResendCd(RESEND_CD);
      if (reason === 'resend') setResetResendN((n) => n+1);
      window.setTimeout(() => resetRefs.current[0]?.focus(), 100);
    } catch (err: any) { setResetError(err?.message || 'Failed to send code.'); }
  };

  const goToOtp = async (email: string, autoSend: boolean) => {
    setPanel('otp'); setOtpEmail(email.trim().toLowerCase());
    clearOtp(); setResendN(0); setResendLock(null); setResendCd(RESEND_CD);
    setExpiresAt(Date.now() + 10*60*1000);
    if (autoSend) await sendOtp(email, 'initial');
    else window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const goToReset = async (email: string) => {
    setPanel('reset'); setResetEmail(email.trim().toLowerCase());
    clearReset(); setResetResendN(0); setResetResendLock(null); setResetResendCd(RESEND_CD);
    window.setTimeout(() => resetRefs.current[0]?.focus(), 100);
  };

  const verifyOtp = async () => {
    const code = otpDigits.join('');
    if (otpLocked || verifying || sending) return;
    if (!/^\d{6}$/.test(code))              { setOtpError('Enter the 6-digit code.'); return; }
    if (expiresAt && Date.now() > expiresAt) { setOtpError('Code expired. Request a new one.'); return; }
    setVerifying(true); setOtpError('');
    try {
      const result = await authAPI.verifyEmailWithOtp(otpEmail, code);
      if (result?.token && result?.user) {
        const u = result.user;
        setUserAndToken({
          id: u.id?.toString() || u._id?.toString() || '',
          email: u.email, full_name: u.fullName, role: u.role,
          seller_status: u.sellerVerificationStatus, seller_verified: u.isSellerVerified,
          phone: u.phone, avatar_url: u.avatarUrl,
          created_at: u.createdAt || new Date().toISOString(),
          updated_at: u.updatedAt || new Date().toISOString(),
        } as any, result.token);
      }
      clearOtp(); setExpiresAt(null); setPanel('success');
    } catch (err: any) {
      const n = failN + 1; setFailN(n);
      setOtpError(err?.message || 'Wrong code. Try again.');
      if (n >= 5) {
        setOtpLocked(true); setOtpError('Too many attempts. A new code has been sent.');
        setOtpDigits(['','','','','','']);
        await sendOtp(otpEmail, 'autoAfterLock');
        setFailN(0); setOtpLocked(false);
      }
    } finally { setVerifying(false); }
  };

  const submitReset = async () => {
    setResetError('');
    const code = resetDigits.join('');
    if (!/^\d{6}$/.test(code))         { setResetError('Enter the 6-digit code.'); return; }
    if (newPassword.length < 6)        { setResetError('Password must be ≥ 6 characters.'); return; }
    if (newPassword !== newConfirm)    { setResetError('Passwords do not match.'); return; }
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password-otp`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code, password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setResetError(data.message || 'Failed to reset password.'); return; }
      clearReset(); setPanel('auth'); navigate('/auth?tab=login');
    } catch { setResetError('Network error. Try again.'); }
    finally { setResetting(false); }
  };

  /* OTP key handlers */
  const handleOtpChange = (i: number, raw: string) => {
    if (otpLocked) return;
    const v = raw.replace(/\D/g,'').slice(0,1);
    const next = [...otpDigits]; next[i] = v; setOtpDigits(next); setOtpError('');
    if (v && i < 5) otpRefs.current[i+1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (otpLocked) return;
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) otpRefs.current[i-1]?.focus();
    if (e.key === 'ArrowLeft'  && i > 0) otpRefs.current[i-1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) otpRefs.current[i+1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (otpLocked) return;
    const digits = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6).split('');
    if (!digits.length) return;
    e.preventDefault();
    setOtpDigits(Array.from({length:6}, (_,i) => digits[i] || ''));
    setOtpError('');
    window.setTimeout(() => otpRefs.current[Math.min(5, digits.length-1)]?.focus(), 0);
  };

  const handleResetChange = (i: number, raw: string) => {
    if (resetLocked || resetting) return;
    const v = raw.replace(/\D/g,'').slice(0,1);
    const next = [...resetDigits]; next[i] = v; setResetDigits(next); setResetError('');
    if (v && i < 5) resetRefs.current[i+1]?.focus();
  };
  const handleResetKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (resetLocked || resetting) return;
    if (e.key === 'Backspace' && !resetDigits[i] && i > 0) resetRefs.current[i-1]?.focus();
    if (e.key === 'ArrowLeft'  && i > 0) resetRefs.current[i-1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) resetRefs.current[i+1]?.focus();
  };
  const handleResetPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (resetLocked || resetting) return;
    const digits = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6).split('');
    if (!digits.length) return;
    e.preventDefault();
    setResetDigits(Array.from({length:6}, (_,i) => digits[i] || ''));
    setResetError('');
    resetRefs.current[Math.min(5, digits.length-1)]?.focus();
  };

  const cardBg     = isDark ? '#0e1019' : '#ffffff';
  const cardShadow = isDark ? CARD_SHADOW_DARK : CARD_SHADOW_LIGHT;

  /* Derive the contextual image view for the left panel */
  const currentView: AuthView = (() => {
    if (panel === 'otp')     return 'otp';
    if (panel === 'reset')   return 'reset';
    if (panel === 'success') return 'success';
    if (validTab === 'signup') return 'signup';
    if (validTab === 'forgot') return 'forgot';
    return 'login';
  })();

  /* ── RENDER ── */
  return (
    <AuthPremiumLayout currentView={currentView}>
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[100%]">

        {/* Card area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-[480px] sm:max-w-[520px] p-6 sm:p-8 relative overflow-hidden"
            style={{ background: cardBg, boxShadow: cardShadow }}
          >
            {/* Corner glow */}
            <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none" style={{
              background: 'radial-gradient(circle at top right, rgba(249,115,22,0.08) 0%, transparent 60%)',
            }} />
            {/* Dot grid */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }} />

            <div className="relative z-10">
              {/* Window dots + theme toggle */}
              <div className="flex items-center gap-1.5 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-semibold tracking-wider uppercase ml-2"
                  style={{ color: 'var(--text-faint)' }}>Reaglex Secure</span>
                <div className="ml-auto"><ThemeToggle /></div>
              </div>

              <AnimatePresence mode="wait">

                {/* ── AUTH (login/signup/forgot) panel ── */}
                {panel === 'auth' && (
                  <motion.div key="auth"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}
                  >
                    {/* Tab switcher */}
                    <div className="flex items-center p-1 rounded-2xl mb-6 relative"
                      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f2f5' }}>
                      <Link
                        to="/auth?tab=login"
                        className="relative z-10 flex-1 text-center py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                        style={{ color: (validTab === 'login' || validTab === 'forgot') ? 'var(--text-primary)' : 'var(--text-faint)' }}
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/auth?tab=signup"
                        className="relative z-10 flex-1 text-center py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                        style={{ color: validTab === 'signup' ? 'var(--text-primary)' : 'var(--text-faint)' }}
                      >
                        Register
                      </Link>
                      <motion.span
                        layoutId="auth-v2-pill"
                        className="absolute top-1 rounded-xl"
                        style={{
                          background: isDark ? '#1a1d2e' : '#ffffff',
                          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                          height: 'calc(100% - 8px)',
                        }}
                        animate={{
                          left:  validTab === 'signup' ? 'calc(50% + 4px)' : '4px',
                          width: 'calc(50% - 8px)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    </div>

                    <AnimatePresence mode="wait">
                      {validTab === 'forgot' && (
                        <motion.div key="forgot"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}>
                          <ForgotFormContent onSent={(email) => goToReset(email).catch(() => undefined)} />
                        </motion.div>
                      )}
                      {validTab === 'login' && (
                        <motion.div key="login"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}>
                          <LoginFormContent role="buyer" onRequireEmailVerification={(email) => goToOtp(email, true)} />
                        </motion.div>
                      )}
                      {validTab === 'signup' && (
                        <motion.div key="signup"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}>
                          <SignupFormContent onRegistered={(email) => goToOtp(email, false)} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ── OTP PANEL ── */}
                {panel === 'otp' && (
                  <motion.div key="otp"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)' }}>
                      <Mail size={26} style={{ color: PRIMARY }} />
                    </div>
                    <h2 className="text-[22px] font-black mb-2" style={{ color: 'var(--text-primary)' }}>Verify your email</h2>
                    <p className="text-[13px] mb-6 max-w-[340px]" style={{ color: 'var(--text-muted)' }}>
                      We sent a 6-digit code to{' '}
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{otpEmail}</span>.{' '}
                      Check your inbox and spam folder.
                    </p>

                    <div className="w-full max-w-[340px]">
                      <OtpInputs
                        digits={otpDigits} inputRefs={otpRefs} locked={otpLocked || verifying}
                        error={!!otpError} onChange={handleOtpChange} onKeyDown={handleOtpKey} onPaste={handleOtpPaste}
                      />

                      {otpError ? (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-[12px] text-center mt-3" style={{ color: '#f87171' }}>
                          {otpError}
                        </motion.p>
                      ) : (
                        <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-faint)' }}>{expiryText}</p>
                      )}

                      <div className="text-center my-4">
                        {resendN >= 3 ? (
                          <p className="text-[12px]" style={{ color: '#f87171' }}>Too many attempts. Try again in 30 min.</p>
                        ) : resendCd > 0 ? (
                          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Resend in {formatCountdown(resendCd)}</p>
                        ) : (
                          <button type="button" disabled={!canResend || sending}
                            onClick={async () => {
                              if (resendN >= 2) { setResendN(3); setResendLock(Date.now() + 30*60*1000); return; }
                              await sendOtp(otpEmail, 'resend');
                            }}
                            className="text-[13px] font-bold hover:underline"
                            style={{ color: PRIMARY, opacity: !canResend || sending ? 0.55 : 1 }}>
                            {sending ? 'Sending…' : 'Resend Code'}
                          </button>
                        )}
                      </div>

                      <PrimaryBtn type="button" onClick={verifyOtp} loading={verifying || sending} disabled={otpLocked}>
                        {verifying ? 'Verifying…' : 'Verify Email →'}
                      </PrimaryBtn>

                      <button type="button" onClick={() => { clearOtp(); setPanel('auth'); navigate('/auth?tab=login'); }}
                        className="mt-4 text-[12px] font-semibold hover:underline block mx-auto" style={{ color: PRIMARY }}>
                        ← Back to Sign In
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── RESET PANEL ── */}
                {panel === 'reset' && (
                  <motion.div key="reset"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)' }}>
                      <Lock size={26} style={{ color: PRIMARY }} />
                    </div>
                    <h2 className="text-[22px] font-black mb-2" style={{ color: 'var(--text-primary)' }}>Reset password</h2>
                    <p className="text-[13px] mb-6 max-w-[340px]" style={{ color: 'var(--text-muted)' }}>
                      Enter the 6-digit code sent to{' '}
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{resetEmail}</span>, then set a new password.
                    </p>

                    <div className="w-full max-w-[380px]">
                      <OtpInputs
                        digits={resetDigits} inputRefs={resetRefs} locked={resetLocked || resetting}
                        error={!!resetError} onChange={handleResetChange} onKeyDown={handleResetKey} onPaste={handleResetPaste}
                      />

                      {resetError && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-[12px] text-center mt-3 mb-2" style={{ color: '#f87171' }}>
                          {resetError}
                        </motion.p>
                      )}

                      <div className="text-center mt-2 mb-5">
                        {resetResendN >= 3 ? (
                          <p className="text-[12px]" style={{ color: '#f87171' }}>Too many attempts.</p>
                        ) : resetResendCd > 0 ? (
                          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Resend in {formatCountdown(resetResendCd)}</p>
                        ) : (
                          <button type="button" disabled={!canResendReset}
                            onClick={async () => {
                              if (resetResendN >= 2) { setResetResendN(3); setResetResendLock(Date.now() + 30*60*1000); return; }
                              await sendResetOtp(resetEmail, 'resend');
                            }}
                            className="text-[13px] font-bold hover:underline"
                            style={{ color: PRIMARY, opacity: !canResendReset ? 0.55 : 1 }}>
                            Resend Code
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-4 mb-5 text-left">
                        <AuthInput label="New Password" type="password" value={newPassword} onChange={setNewPassword}
                          placeholder="New password" leftIcon={Lock}
                          focused={resetFocused === 'np'} onFocus={() => setResetFocused('np')} onBlur={() => setResetFocused(null)} required />
                        <AuthInput label="Confirm Password" type="password" value={newConfirm} onChange={setNewConfirm}
                          placeholder="Confirm new password" leftIcon={Lock}
                          focused={resetFocused === 'nc'} onFocus={() => setResetFocused('nc')} onBlur={() => setResetFocused(null)} required />
                      </div>

                      <PrimaryBtn type="button" onClick={submitReset} loading={resetting} disabled={resetLocked}>
                        {resetting ? 'Updating…' : 'Set New Password →'}
                      </PrimaryBtn>

                      <button type="button" onClick={() => { clearReset(); setPanel('auth'); navigate('/auth?tab=login'); }}
                        className="mt-4 text-[12px] font-semibold hover:underline block mx-auto" style={{ color: PRIMARY }}>
                        ← Back to Sign In
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── SUCCESS PANEL ── */}
                {panel === 'success' && (
                  <motion.div key="success"
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                    className="flex flex-col items-center text-center py-4"
                  >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)' }}>
                      <svg width="40" height="30" viewBox="0 0 52 38" fill="none" aria-hidden>
                        <path d="M6 20.5L20 34L46 6" stroke={SUCCESS} strokeWidth="6"
                          strokeLinecap="round" strokeLinejoin="round"
                          style={{ strokeDasharray: 80, strokeDashoffset: 80, animation: 'auth-check 650ms ease-out forwards' }} />
                      </svg>
                    </div>
                    <h2 className="text-[24px] font-black mb-2" style={{ color: 'var(--text-primary)' }}>Email Verified!</h2>
                    <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                      Your account is ready. Welcome to Reaglex.
                    </p>
                    <PrimaryBtn type="button" onClick={() => {
                      const { user } = useAuthStore.getState();
                      if (user?.role === 'seller') navigate('/seller');
                      else if (user?.role === 'admin') navigate('/admin');
                      else navigate('/');
                    }}>
                      Go to Dashboard →
                    </PrimaryBtn>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Footer inside card */}
              <p className="mt-5 text-[11px] text-center leading-relaxed"
                style={{ color: 'var(--text-faint)' }}>
                By continuing you agree to our{' '}
                <a href="/terms" className="hover:underline" style={{ color: PRIMARY }}>Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="hover:underline" style={{ color: PRIMARY }}>Privacy Policy</a>.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </AuthPremiumLayout>
  );
}
