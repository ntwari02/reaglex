import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Lock, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useTheme } from '../contexts/ThemeContext';
import AuthPremiumLayout from '../components/AuthPremiumLayout';

const PRIMARY = '#f97316';
const SUCCESS = '#10b981';
const ERROR = '#ef4444';
import { API_BASE_URL } from '../lib/config';
const API_BASE = API_BASE_URL;

function hasSQLRisk(v: string) {
  return /(;|--|\/\*|\*\/|\b(OR|AND)\b\s+\d+=\d+|\bxp_)/i.test(v);
}

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!pw.length) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Weak', 'Fair', 'Good', 'Strong ✓'];
  return { level: Math.min(3, score) as 0 | 1 | 2 | 3, label: labels[Math.min(3, score)] };
}

function checkPasswordReqs(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

// ── Premium input (shared) ───────────────────────────────────────────────────
function PremiumInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  valid,
  focused,
  leftIcon: LeftIcon,
  rightEl,
  onFocus,
  onBlur,
  required,
  autoFocus,
  size = 'default',
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  valid?: boolean;
  focused?: boolean;
  leftIcon?: React.ComponentType<{ className?: string; size?: number | string }>;
  rightEl?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  required?: boolean;
  autoFocus?: boolean;
  size?: 'default' | 'large';
}) {
  const isError = !!error;
  const ring = isError
    ? '0 0 0 2px rgba(239,68,68,0.40)'
    : valid
      ? '0 0 0 2px rgba(16,185,129,0.40)'
      : focused
        ? '0 0 0 2.5px rgba(249,115,22,0.5), 0 0 20px rgba(249,115,22,0.2)'
        : '0 0 0 1.5px rgba(0,0,0,0.08)';
  const { theme } = useTheme();
  const inputBgDefault = theme === 'dark' ? '#1a1e2c' : '#f9fafb';
  const bg = isError ? 'rgba(239,68,68,0.03)' : valid ? 'rgba(16,185,129,0.03)' : focused ? 'var(--card-bg)' : inputBgDefault;
  const isLarge = size === 'large';
  return (
    <div className={isLarge ? 'mb-0' : 'mb-2'}>
      <label className={`block font-bold uppercase tracking-wider ${isLarge ? 'text-[12px] mb-2' : 'text-[11px] mb-1.5'}`} style={{ color: 'var(--text-primary)', letterSpacing: '0.6px' }}>
        {label}{required ? ' *' : ''}
      </label>
      <div className="relative">
        {LeftIcon && (
          <span
            className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors duration-200 ${isLarge ? 'left-4' : 'left-3'}`}
            style={{ color: focused && !isError ? PRIMARY : 'var(--text-muted)' }}
          >
            <LeftIcon className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} />
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
          className={`w-full rounded-[12px] outline-none transition-all duration-200 ${isLarge ? 'h-[52px] text-[15px] pl-12 pr-12' : 'h-[42px] text-[14px] pl-10 pr-10'}`}
          style={{
            background: bg,
            boxShadow: ring,
            color: 'var(--text-primary)',
          }}
        />
        {rightEl && <div className={`absolute top-1/2 -translate-y-1/2 ${isLarge ? 'right-4' : 'right-3'}`}>{rightEl}</div>}
        {valid && !rightEl && (
          <span className={`absolute top-1/2 -translate-y-1/2 ${isLarge ? 'right-4' : 'right-3'}`}>
            <Check className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} style={{ color: SUCCESS }} />
          </span>
        )}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] mt-0.5" style={{ color: '#f87171' }}>
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ── Login form (premium) ─────────────────────────────────────────────────────
function LoginFormContent({
  role = 'buyer',
  onRequireEmailVerification,
}: {
  role?: 'buyer' | 'seller';
  onRequireEmailVerification: (email: string) => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { login } = useAuthStore();
  const { showToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^\d+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in both fields.'); setShake(true); setTimeout(() => setShake(false), 400); return; }
    if (!emailValid) { setError('Enter a valid email or phone.'); setShake(true); setTimeout(() => setShake(false), 400); return; }
    if (password.length < 6) { setError('Password must be ≥ 6 characters.'); setShake(true); setTimeout(() => setShake(false), 400); return; }
    if (hasSQLRisk(email) || hasSQLRisk(password)) { setError('Invalid characters detected.'); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success && 'code' in (result as any) && (result as any).code === 'EMAIL_NOT_VERIFIED' && (result as any).email) {
        onRequireEmailVerification(String((result as any).email));
        setLoading(false);
        return;
      }
      if (!result.success) { setError(result.error || 'Wrong email or password. Please try again.'); setShake(true); setTimeout(() => setShake(false), 400); setLoading(false); return; }
      setSuccess(true);
      const { user } = useAuthStore.getState();
      const name = user?.full_name?.split(' ')[0] || 'there';
      showToast(`Welcome back, ${name}! 👋`, 'success');
      setTimeout(() => {
        if (redirectParam && redirectParam.startsWith('/')) navigate(redirectParam);
        else if (user?.role === 'seller') navigate('/seller');
        else if (user?.role === 'admin') navigate('/admin');
        else navigate('/');
      }, 600);
    } catch (err: unknown) { setError((err as Error)?.message || 'Unexpected error.'); setShake(true); setTimeout(() => setShake(false), 400); }
    finally { if (!success) setLoading(false); }
  };

  const googleAuth = () => { window.location.href = `${API_BASE}/auth/google?role=${role}`; };

  const buttonBg = success
    ? 'linear-gradient(135deg, #059669, #047857)'
    : error && shake
      ? 'linear-gradient(135deg, #dc2626, #ef4444)'
      : 'linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)';

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className={`flex-1 flex flex-col min-h-0 ${shake ? 'auth-shake' : ''}`}
    >
      <h2 className="text-[24px] font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>Welcome back 👋</h2>
      <p className="text-[14px] mb-5" style={{ color: 'var(--text-muted)' }}>Sign in to your Reaglex account</p>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg mb-4 text-[13px]"
          style={{
            background: 'rgba(239,68,68,0.10)',
            boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.30)',
            color: '#f87171',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </motion.div>
      )}

      <div className="mb-5">
        <PremiumInput
          size="large"
          label="Email or Phone"
          type="text"
          value={email}
          onChange={setEmail}
          placeholder="Enter email or phone"
          leftIcon={Mail}
          valid={email.length > 0 && emailValid}
          focused={focused === 'email'}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused(null)}
          required
          autoFocus
        />
      </div>
      <div className="mb-6">
        <PremiumInput
          size="large"
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          placeholder="Password"
          leftIcon={Lock}
          focused={focused === 'pw'}
          onFocus={() => setFocused('pw')}
          onBlur={() => setFocused(null)}
          rightEl={
            <button type="button" onClick={() => setShowPw(!showPw)} className="p-0.5 rounded transition hover:opacity-80" style={{ color: 'var(--text-muted)' }} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
          required
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            type="button"
            role="checkbox"
            aria-checked={rememberMe}
            onClick={() => setRememberMe(!rememberMe)}
            className="w-9 h-5 rounded-full transition-colors flex-shrink-0"
            style={{
              background: rememberMe ? PRIMARY : 'var(--bg-secondary)',
              boxShadow: '0 0 0 1.5px var(--divider)',
            }}
          >
            <span
              className="block w-4 h-4 rounded-full bg-white shadow mt-0.5 ml-0.5 transition-transform"
              style={{ transform: rememberMe ? 'translateX(18px)' : 'translateX(2px)' }}
            />
          </button>
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Remember me</span>
        </label>
        <Link to="/auth?tab=forgot" className="text-[13px] font-medium hover:underline transition" style={{ color: PRIMARY }}>Forgot Password?</Link>
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        className="w-full h-[48px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 border-none cursor-pointer transition-all duration-250 relative overflow-hidden"
        style={{
          background: buttonBg,
          color: '#ffffff',
          letterSpacing: '0.3px',
          boxShadow: success ? 'none' : '0 8px 28px rgba(249,115,22,0.45), 0 4px 14px rgba(249,115,22,0.35)',
        }}
        whileHover={!loading && !success ? { y: -2, boxShadow: '0 12px 36px rgba(249,115,22,0.5)' } : {}}
        whileTap={!loading ? { y: 0 } : {}}
      >
        {loading && !success && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {success && <Check className="w-5 h-5" />}
        {!loading && !success && <>Sign In <ArrowRight className="w-4 h-4" /></>}
        {loading && !success && 'Signing in...'}
      </motion.button>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--divider))' }} />
        <span className="text-[12px]" style={{ color: 'var(--text-faint)' }}>Or continue with</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, var(--divider))' }} />
      </div>

      <button
        type="button"
        onClick={googleAuth}
        className="w-full h-[52px] rounded-[12px] flex items-center justify-center gap-2 text-[14px] font-semibold transition-all border-none cursor-pointer shadow-sm"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.77-6.77C35.41 2.38 30.21 0 24 0 14.67 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.5 17.79 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.29 7.09-17.55z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.67 48 24 48z"/></svg>
        Google
      </button>

      <p className="text-center text-[13px] mt-6" style={{ color: 'var(--text-muted)' }}>
        Don&apos;t have an account? <Link to="/auth?tab=signup" className="font-bold hover:underline" style={{ color: PRIMARY }}>Create one free →</Link>
      </p>
    </motion.form>
  );
}

// ── Signup form (premium) ────────────────────────────────────────────────────
function SignupFormContent({
  onRegistered,
}: {
  onRegistered: (email: string) => void;
}) {
  const { showToast } = useToastStore();
  const [role, setRoleState] = useState<'buyer' | 'seller'>('buyer');
  const [fd, setFd] = useState({ fullName: '', email: '', password: '', confirmPassword: '', storeName: '' });
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const strength = getPasswordStrength(fd.password);
  const reqs = checkPasswordReqs(fd.password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email);
  const match = fd.confirmPassword.length ? fd.password === fd.confirmPassword : null;
  const canSubmit = fd.fullName.trim().length >= 2 && emailValid && fd.password.length >= 8 && reqs.upper && reqs.number && reqs.special && fd.password === fd.confirmPassword && agreed && (role !== 'seller' || fd.storeName.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!fd.fullName.trim() || fd.fullName.trim().length < 2) { setError('Full name must be at least 2 characters.'); return; }
    if (!emailValid) { setError('Please enter a valid email.'); return; }
    if (fd.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!reqs.upper || !reqs.number || !reqs.special) { setError('Password must include uppercase, number, and special character.'); return; }
    if (fd.password !== fd.confirmPassword) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('Please agree to the Terms.'); return; }
    if (role === 'seller' && !fd.storeName.trim()) { setError('Store name is required for sellers.'); return; }
    if (hasSQLRisk(fd.fullName) || hasSQLRisk(fd.email) || hasSQLRisk(fd.password)) { setError('Invalid characters detected.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fd.fullName, email: fd.email, password: fd.password, role, storeName: role === 'seller' ? fd.storeName : undefined }),
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
      <div className="text-2xl mb-1">🎉</div>
      <h3 className="font-bold text-lg mb-0.5" style={{ color: SUCCESS }}>Account Created!</h3>
      <p className="font-semibold text-sm mb-0.5" style={{ color: PRIMARY }}>Welcome, {fd.fullName.trim().split(/\s+/)[0] || 'there'}!</p>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Check your email to verify</p>
      <Link to="/auth?tab=login" className="inline-flex justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: PRIMARY }}>Sign In →</Link>
    </motion.div>
  );

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      <h2 className="text-[20px] font-extrabold" style={{ color: 'var(--text-primary)' }}>Create account 🚀</h2>
      <p className="text-[13px] -mt-4 mb-1" style={{ color: 'var(--text-muted)' }}>Join buyers and sellers</p>

      {error && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px]" style={{ background: 'rgba(239,68,68,0.10)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.30)', color: '#f87171' }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PremiumInput label="Full Name" value={fd.fullName} onChange={(v) => setFd({ ...fd, fullName: v })} placeholder="Your full name" leftIcon={User} valid={fd.fullName.trim().length >= 2} required autoFocus />
        <PremiumInput label="Email Address" type="email" value={fd.email} onChange={(v) => setFd({ ...fd, email: v })} placeholder="you@example.com" leftIcon={Mail} error={fd.email.length > 0 && !emailValid ? 'Please enter a valid email' : undefined} valid={emailValid} required />
      </div>

      <div>
        <PremiumInput
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={fd.password}
          onChange={(v) => setFd({ ...fd, password: v })}
          placeholder="At least 8 characters"
          leftIcon={Lock}
          rightEl={<button type="button" onClick={() => setShowPw(!showPw)} className="p-0.5 rounded transition" style={{ color: 'var(--text-muted)' }} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
          required
        />
        <div className="flex gap-0.5 h-1 rounded-full overflow-hidden mt-1" style={{ background: 'var(--bg-secondary)' }}>
          {[0, 1, 2, 3].map((i) => (
            <motion.div key={i} className="flex-1 rounded-full transition-colors" style={{ background: i === 0 ? ERROR : i === 1 ? '#f97316' : i === 2 ? '#eab308' : SUCCESS, opacity: strength.level > i ? 1 : 0.25 }} />
          ))}
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: strength.level === 0 ? 'var(--text-faint)' : strength.level <= 2 ? '#f97316' : SUCCESS }}>{strength.label || 'Weak'}</p>
      </div>

      <div>
      <PremiumInput
        label="Confirm Password"
        type={showCPw ? 'text' : 'password'}
        value={fd.confirmPassword}
        onChange={(v) => setFd({ ...fd, confirmPassword: v })}
        placeholder="Confirm password"
        leftIcon={Lock}
        rightEl={match === true ? <Check className="w-4 h-4" style={{ color: SUCCESS }} /> : <button type="button" onClick={() => setShowCPw(!showCPw)} className="p-0.5 rounded" style={{ color: 'var(--text-muted)' }}><Eye className="w-4 h-4" /></button>}
        valid={match === true}
        error={match === false ? "Passwords don't match" : undefined}
        required
      />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>I want to:</p>
        <div className="flex gap-1.5">
          {(['buyer', 'seller'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleState(r)}
              className="flex-1 flex items-center justify-center gap-1 h-8 rounded-full text-[12px] font-bold transition-all"
              style={{
                background: role === r ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'var(--bg-secondary)',
                color: role === r ? '#ffffff' : 'var(--text-muted)',
                boxShadow: role === r ? '0 4px 12px rgba(249,115,22,0.35)' : '0 0 0 1.5px var(--divider)',
              }}
            >
              {r === 'buyer' ? '🛒' : '🏪'} {r === 'buyer' ? 'Buy' : 'Sell'}
            </button>
          ))}
        </div>
      </div>

      <div>
      {role === 'seller' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <PremiumInput label="Store Name" value={fd.storeName} onChange={(v) => setFd({ ...fd, storeName: v })} placeholder="Your store name" leftIcon={User} required />
        </motion.div>
      )}
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <button
          type="button"
          role="checkbox"
          aria-checked={agreed}
          onClick={() => setAgreed(!agreed)}
          className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors"
          style={{ background: agreed ? PRIMARY : 'var(--bg-secondary)', boxShadow: '0 0 0 1.5px var(--divider)' }}
        >
          {agreed && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>I agree to <a href="/terms" className="font-medium hover:underline" style={{ color: PRIMARY }}>Terms</a> & <a href="/privacy" className="font-medium hover:underline" style={{ color: PRIMARY }}>Privacy</a></span>
      </label>

      <motion.button
        type="submit"
        disabled={!canSubmit || loading}
        className="w-full h-[44px] rounded-[12px] font-bold text-[14px] flex items-center justify-center gap-1.5 border-none cursor-pointer transition-all duration-250"
        style={{
          background: canSubmit && !loading ? 'linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)' : 'var(--bg-secondary)',
          color: canSubmit && !loading ? '#ffffff' : 'var(--text-muted)',
          boxShadow: canSubmit && !loading ? '0 6px 24px rgba(249,115,22,0.45)' : 'none',
        }}
        whileHover={canSubmit && !loading ? { y: -2 } : {}}
        whileTap={!loading ? { y: 0 } : {}}
      >
        {loading && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {!loading && 'Create Account →'}
      </motion.button>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--divider))' }} />
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Or continue with</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, var(--divider))' }} />
      </div>
      <button
        type="button"
        onClick={() => window.location.href = `${API_BASE}/auth/google?role=${role}`}
        className="w-full h-[52px] rounded-[12px] flex items-center justify-center gap-2 text-[14px] font-semibold transition-all border-none cursor-pointer shadow-sm"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.77-6.77C35.41 2.38 30.21 0 24 0 14.67 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.5 17.79 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.29 7.09-17.55z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.67 48 24 48z"/></svg>
        Google
      </button>

      <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>Already have an account? <Link to="/auth?tab=login" className="font-bold hover:underline" style={{ color: PRIMARY }}>Sign In</Link></p>
    </motion.form>
  );
}

// ── Forgot password form (premium) ───────────────────────────────────────────
function ForgotFormContent(props: { onSent: (email: string) => void }) {
  const { showToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      props.onSent(email.trim());
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Link to="/auth?tab=login" className="text-[12px] font-medium hover:underline mb-2 block" style={{ color: PRIMARY }}>← Back to Sign In</Link>
      <h2 className="text-[20px] font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
      <p className="text-[13px] mb-2" style={{ color: 'var(--text-muted)' }}>Enter your email to receive a 6-digit reset code.</p>
      {error && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg mb-2 text-[12px]" style={{ background: 'rgba(239,68,68,0.10)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.30)', color: '#f87171' }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </motion.div>
      )}
      <PremiumInput label="Email" type="email" value={email} onChange={setEmail} placeholder="Enter your email" leftIcon={Mail} required autoFocus />
      <motion.button
        type="submit"
        disabled={loading}
        className="w-full h-[42px] rounded-[12px] font-bold text-[14px] flex items-center justify-center gap-1.5 border-none cursor-pointer transition-all"
        style={{ background: 'linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)', color: '#ffffff', boxShadow: '0 6px 24px rgba(249,115,22,0.45)' }}
        whileHover={!loading ? { y: -2 } : {}}
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {!loading && <>Send Reset Code <ArrowRight className="w-3.5 h-3.5" /></>}
      </motion.button>
    </motion.form>
  );
}

// ── Auth page: single form card with header, role pills, tab switcher ─────────
const CARD_SHADOW_LIGHT = '0 25px 50px -12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)';
const CARD_SHADOW_DARK = '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)';
const RESEND_COOLDOWN_S = 120;

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function AuthHeaderThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className="w-9 h-9 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all hover:opacity-90 text-base"
      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 0 0 1px var(--divider)' }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserAndToken } = useAuthStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const tab = (searchParams.get('tab') as 'login' | 'signup' | 'forgot') || 'login';
  const validTab = ['login', 'signup', 'forgot'].includes(tab) ? tab : 'login';
  const [rightPanelState, setRightPanelState] = useState<'auth' | 'otp' | 'success' | 'reset'>('auth');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLocked, setOtpLocked] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldownS, setResendCooldownS] = useState(60);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [resendLockedUntil, setResendLockedUntil] = useState<number | null>(null);
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });

  // Password reset OTP state (separate from email-verification OTP)
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLocked, setResetLocked] = useState(false);
  const [resetDigits, setResetDigits] = useState<string[]>(['', '', '', '', '', '']);
  const resetRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resetResendCooldownS, setResetResendCooldownS] = useState(60);
  const [resetResendAttempts, setResetResendAttempts] = useState(0);
  const [resetResendLockedUntil, setResetResendLockedUntil] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Allow deep-link into OTP flow: /auth?tab=login&verifyEmail=1&email=...&sent=1
  useEffect(() => {
    const verifyEmail = searchParams.get('verifyEmail');
    const email = searchParams.get('email');
    const sent = searchParams.get('sent') === '1';
    if (verifyEmail === '1' && email && rightPanelState === 'auth') {
      // Fire-and-forget; panel swap is local state
      goToOtp(email, !sent).catch(() => undefined);
      // remove verifyEmail/email from URL to avoid looping on refresh
      const next = new URLSearchParams(searchParams);
      next.delete('verifyEmail');
      next.delete('email');
      next.delete('sent');
      navigate(`/auth?${next.toString()}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canResend = useMemo(() => {
    if (resendLockedUntil && Date.now() < resendLockedUntil) return false;
    return resendCooldownS <= 0 && resendAttempts < 3;
  }, [resendAttempts, resendCooldownS, resendLockedUntil]);

  const canResendReset = useMemo(() => {
    if (resetResendLockedUntil && Date.now() < resetResendLockedUntil) return false;
    return resetResendCooldownS <= 0 && resetResendAttempts < 3;
  }, [resetResendAttempts, resetResendCooldownS, resetResendLockedUntil]);

  const expiryText = useMemo(() => {
    if (!expiresAtMs) return 'Code expires in 10 minutes.';
    const ms = Math.max(0, expiresAtMs - Date.now());
    const totalS = Math.ceil(ms / 1000);
    const m = Math.floor(totalS / 60);
    const s = totalS % 60;
    return `Code expires in ${m}:${String(s).padStart(2, '0')}.`;
  }, [expiresAtMs]);

  useEffect(() => {
    if (rightPanelState !== 'otp') return;
    if (resendCooldownS <= 0) return;
    const t = window.setInterval(() => setResendCooldownS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [rightPanelState, resendCooldownS]);

  useEffect(() => {
    if (rightPanelState !== 'reset') return;
    if (resetResendCooldownS <= 0) return;
    const t = window.setInterval(() => setResetResendCooldownS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [rightPanelState, resetResendCooldownS]);

  useEffect(() => {
    if (rightPanelState !== 'otp') return;
    if (!expiresAtMs) return;
    const t = window.setInterval(() => {
      // force re-render for expiryText countdown
      setExpiresAtMs((v) => v);
    }, 1000);
    return () => window.clearInterval(t);
  }, [rightPanelState, expiresAtMs]);

  const clearOtpState = () => {
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setFailedAttempts(0);
    setOtpLocked(false);
    setVerifying(false);
  };

  const clearResetState = () => {
    setResetDigits(['', '', '', '', '', '']);
    setResetError('');
    setResetLocked(false);
    setResetResendAttempts(0);
    setResetResendLockedUntil(null);
    setResetResendCooldownS(RESEND_COOLDOWN_S);
    setResetPassword('');
    setResetConfirm('');
    setResettingPassword(false);
  };

  const sendOtp = async (email: string, reason: 'initial' | 'resend' | 'autoAfterLock') => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setSending(true);
    setOtpError('');
    try {
      const { authAPI } = await import('../lib/api');
      await authAPI.requestVerificationOtp(e);
      setOtpEmail(e);
      setExpiresAtMs(Date.now() + 10 * 60 * 1000);
      setResendCooldownS(RESEND_COOLDOWN_S);
      if (reason === 'resend') setResendAttempts((n) => n + 1);
      if (reason === 'autoAfterLock') setResendAttempts((n) => n + 1);
      window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to send code. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const sendResetOtp = async (email: string, reason: 'request' | 'resend') => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setResetError('');
    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e }),
      });
      setResetEmail(e);
      setResetResendCooldownS(RESEND_COOLDOWN_S);
      if (reason === 'resend') setResetResendAttempts((n) => n + 1);
      window.setTimeout(() => resetRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setResetError(err?.message || 'Failed to send code. Please try again.');
    }
  };

  const goToOtp = async (email: string, autoSend: boolean) => {
    setRightPanelState('otp');
    setOtpEmail(email.trim().toLowerCase());
    clearOtpState();
    setResendAttempts(0);
    setResendLockedUntil(null);
    setResendCooldownS(RESEND_COOLDOWN_S);
    setExpiresAtMs(Date.now() + 10 * 60 * 1000);
    if (autoSend) {
      await sendOtp(email, 'initial');
    } else {
      window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  const goToReset = async (email: string) => {
    setRightPanelState('reset');
    setResetEmail(email.trim().toLowerCase());
    clearResetState();
    setResetResendAttempts(0);
    setResetResendLockedUntil(null);
    setResetResendCooldownS(RESEND_COOLDOWN_S);
    window.setTimeout(() => resetRefs.current[0]?.focus(), 100);
  };

  const verifyOtp = async () => {
    const code = otpDigits.join('');
    if (otpLocked || verifying || sending) return;
    if (!/^\d{6}$/.test(code)) {
      setOtpError('Enter the 6-digit code.');
      return;
    }
    if (expiresAtMs && Date.now() > expiresAtMs) {
      setOtpError('Verification code expired. Request a new code.');
      return;
    }
    setVerifying(true);
    setOtpError('');
    try {
      const { authAPI } = await import('../lib/api');
      const result = await authAPI.verifyEmailWithOtp(otpEmail, code);
      if (result?.token && result?.user) {
        const userProfile = {
          id: result.user.id?.toString() || result.user._id?.toString() || '',
          email: result.user.email,
          full_name: result.user.fullName,
          role: result.user.role,
          seller_status: result.user.sellerVerificationStatus,
          seller_verified: result.user.isSellerVerified,
          phone: result.user.phone,
          avatar_url: result.user.avatarUrl,
          created_at: result.user.createdAt || new Date().toISOString(),
          updated_at: result.user.updatedAt || new Date().toISOString(),
        };
        setUserAndToken(userProfile as any, result.token);
      }
      // Clear OTP from UI state immediately after success
      clearOtpState();
      setExpiresAtMs(null);
      setRightPanelState('success');
    } catch (err: any) {
      const nextFails = failedAttempts + 1;
      setFailedAttempts(nextFails);
      setOtpError(err?.message || 'Wrong code. Please try again.');
      if (nextFails >= 5) {
        setOtpLocked(true);
        setOtpError('Too many failed attempts. A new code has been sent.');
        setOtpDigits(['', '', '', '', '', '']);
        // auto-resend fresh code
        await sendOtp(otpEmail, 'autoAfterLock');
        setFailedAttempts(0);
        setOtpLocked(false);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpDigitChange = (index: number, raw: string) => {
    if (otpLocked) return;
    const v = raw.replace(/\D/g, '').slice(0, 1);
    const next = [...otpDigits];
    next[index] = v;
    setOtpDigits(next);
    setOtpError('');
    if (v && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (otpLocked) return;
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (otpLocked) return;
    const text = e.clipboardData.getData('text') || '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 0) return;
    e.preventDefault();
    const next = Array.from({ length: 6 }, (_, i) => digits[i] || '');
    setOtpDigits(next);
    setOtpError('');
    const last = Math.min(5, digits.length - 1);
    window.setTimeout(() => otpRefs.current[last]?.focus(), 0);
  };

  const handleResetDigitChange = (index: number, raw: string) => {
    if (resetLocked || resettingPassword) return;
    const v = raw.replace(/\D/g, '').slice(0, 1);
    const next = [...resetDigits];
    next[index] = v;
    setResetDigits(next);
    setResetError('');
    if (v && index < 5) resetRefs.current[index + 1]?.focus();
  };

  const handleResetKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (resetLocked || resettingPassword) return;
    if (e.key === 'Backspace' && !resetDigits[index] && index > 0) {
      resetRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) resetRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) resetRefs.current[index + 1]?.focus();
  };

  const handleResetPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (resetLocked || resettingPassword) return;
    const text = e.clipboardData.getData('text') || '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 0) return;
    e.preventDefault();
    const next = Array.from({ length: 6 }, (_, i) => digits[i] || '');
    setResetDigits(next);
    setResetError('');
    const last = Math.min(5, digits.length - 1);
    resetRefs.current[last]?.focus();
  };

  const submitReset = async () => {
    setResetError('');
    const code = resetDigits.join('');
    if (!/^\d{6}$/.test(code)) {
      setResetError('Enter the 6-digit code.');
      return;
    }
    if (resetPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError('Passwords do not match.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password-otp`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          code,
          password: resetPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(data.message || 'Failed to reset password.');
        return;
      }
      clearResetState();
      setRightPanelState('auth');
      navigate('/auth?tab=login');
    } catch {
      setResetError('Network error. Try again.');
    } finally {
      setResettingPassword(false);
    }
  };

  const cardShadow = isDark ? CARD_SHADOW_DARK : CARD_SHADOW_LIGHT;
  const cardBg = isDark ? '#111420' : '#ffffff';
  const cardTiltTransform = `perspective(1100px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg) translateZ(0)`;

  return (
    <AuthPremiumLayout>
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[100%]">
        {/* Right panel header: theme toggle only */}
        <div className="flex-shrink-0 flex justify-end items-center mb-2">
          <AuthHeaderThemeToggle />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-auto">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            onMouseMove={(e) => {
              if (window.innerWidth <= 640) return;
              if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
              const r = e.currentTarget.getBoundingClientRect();
              const rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
              const ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
              setCardTilt({ x: Number(rx.toFixed(2)), y: Number(ry.toFixed(2)) });
            }}
            onMouseLeave={() => setCardTilt({ x: 0, y: 0 })}
            className="auth-mobile-app-card w-full max-w-[460px] sm:max-w-[520px] rounded-[24px] p-5 sm:p-6 flex flex-col overflow-hidden"
            style={{ background: cardBg, boxShadow: cardShadow, transform: cardTiltTransform }}
          >
            <div className="auth-mobile-app-glow auth-mobile-app-glow--orange" />
            <div className="auth-mobile-app-glow auth-mobile-app-glow--violet" />
            <div className="relative z-10 flex items-center justify-between mb-3 px-1 sm:px-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="w-2 h-2 rounded-full bg-rose-400" />
              </div>
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-faint)' }}>
                Reaglex Secure
              </p>
            </div>
            <AnimatePresence mode="wait">
              {rightPanelState === 'auth' && (
                <motion.div
                  key="auth-panel"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.25 }}
                  className="px-1 sm:px-2"
                >
                  {/* Tab switcher: Sign In | Register with sliding pill */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="inline-flex w-full sm:w-auto items-center p-1 rounded-[14px] relative" style={{ background: 'var(--bg-tertiary)' }}>
                      <Link
                        to="/auth?tab=login"
                        className="relative z-10 flex-1 text-center px-4 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors"
                        style={{ color: validTab === 'login' || validTab === 'forgot' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/auth?tab=signup"
                        className="relative z-10 flex-1 text-center px-4 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors"
                        style={{ color: validTab === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        Register
                      </Link>
                      <motion.span
                        layoutId="auth-tab-pill"
                        className="absolute z-0 top-1 rounded-[10px]"
                        style={{
                          background: isDark ? '#1a1e2c' : '#ffffff',
                          boxShadow: isDark ? '0 0 0 1px rgba(15,23,42,0.9)' : '0 2px 8px rgba(0,0,0,0.08)',
                          height: 'calc(100% - 8px)',
                        }}
                        animate={{
                          left: validTab === 'signup' ? 'calc(50% + 2px)' : '4px',
                          width: 'calc(50% - 10px)',
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {validTab === 'forgot' && (
                      <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="pt-1">
                        <ForgotFormContent onSent={(email) => { goToReset(email).catch(() => undefined); }} />
                      </motion.div>
                    )}
                    {validTab === 'login' && (
                      <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="pt-1">
                        <LoginFormContent
                          role="buyer"
                          onRequireEmailVerification={async (email) => {
                            await goToOtp(email, true);
                          }}
                        />
                      </motion.div>
                    )}
                    {validTab === 'signup' && (
                      <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="pt-1">
                        <SignupFormContent
                          onRegistered={async (email) => {
                            // After successful register, immediately send OTP and swap panel
                            // Backend already sent OTP on register
                            await goToOtp(email, false);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {rightPanelState === 'otp' && (
                <motion.div
                  key="otp-panel"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                      style={{
                        background: 'rgba(249,115,22,0.12)',
                        boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.25)',
                      }}
                    >
                      <Mail className="w-6 h-6" style={{ color: PRIMARY }} />
                    </div>
                    <h2 className="text-[22px] font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>Verify your email</h2>
                    <p className="text-[13px] mb-5 max-w-[420px]" style={{ color: 'var(--text-muted)' }}>
                      We sent a 6-digit code to <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{otpEmail}</span>. Check your inbox and spam.
                    </p>

                    <div className="w-full max-w-[360px]">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {otpDigits.map((d, i) => (
                          <input
                            key={i}
                            ref={(el) => { otpRefs.current[i] = el; }}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={d}
                            disabled={otpLocked || verifying}
                            onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            onPaste={handleOtpPaste}
                            className="w-11 h-12 rounded-[12px] text-center text-[18px] font-extrabold outline-none transition-all"
                            style={{
                              background: isDark ? '#1a1e2c' : '#f9fafb',
                              boxShadow: otpError
                                ? '0 0 0 2px rgba(239,68,68,0.35)'
                                : '0 0 0 1.5px rgba(0,0,0,0.08)',
                              color: 'var(--text-primary)',
                            }}
                            aria-label={`Digit ${i + 1}`}
                          />
                        ))}
                      </div>

                      {otpError && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-center mb-3" style={{ color: '#f87171' }}>
                          {otpError}
                        </motion.p>
                      )}

                      {!otpError && (
                        <p className="text-[11px] text-center mb-3" style={{ color: 'var(--text-faint)' }}>
                          {expiryText}
                        </p>
                      )}

                      {resendAttempts >= 3 ? (
                        <p className="text-[12px] text-center mb-3" style={{ color: '#f87171' }}>
                          Too many attempts. Try again in 30 minutes.
                        </p>
                      ) : (
                        <div className="text-center mb-4">
                          {resendCooldownS > 0 ? (
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              Resend code in {formatCountdown(resendCooldownS)}
                            </p>
                          ) : (
                            <button
                              type="button"
                              disabled={!canResend || sending}
                              onClick={async () => {
                                if (resendAttempts >= 2) {
                                  setResendAttempts(3);
                                  setResendLockedUntil(Date.now() + 30 * 60 * 1000);
                                  return;
                                }
                                await sendOtp(otpEmail, 'resend');
                              }}
                              className="text-[13px] font-bold hover:underline"
                              style={{ color: PRIMARY, opacity: !canResend || sending ? 0.6 : 1 }}
                            >
                              {sending ? 'Sending…' : 'Resend Code'}
                            </button>
                          )}
                        </div>
                      )}

                      <motion.button
                        type="button"
                        disabled={verifying || sending || otpLocked}
                        onClick={verifyOtp}
                        className="w-full h-[48px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 border-none cursor-pointer transition-all duration-250"
                        style={{
                          background: 'linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)',
                          color: '#ffffff',
                          boxShadow: '0 8px 28px rgba(249,115,22,0.45), 0 4px 14px rgba(249,115,22,0.35)',
                          opacity: verifying || sending || otpLocked ? 0.8 : 1,
                        }}
                        whileHover={!(verifying || sending || otpLocked) ? { y: -2 } : {}}
                        whileTap={!(verifying || sending || otpLocked) ? { y: 0 } : {}}
                      >
                        {(verifying || sending) && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {verifying ? 'Verifying…' : 'Verify Email →'}
                      </motion.button>

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            clearOtpState();
                            setRightPanelState('auth');
                            navigate('/auth?tab=login');
                          }}
                          className="text-xs font-semibold hover:underline block mx-auto"
                          style={{ color: PRIMARY }}
                        >
                          ← Back to Sign In
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {rightPanelState === 'reset' && (
                <motion.div
                  key="reset-panel"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                      style={{
                        background: 'rgba(249,115,22,0.12)',
                        boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.25)',
                      }}
                    >
                      <Lock className="w-6 h-6" style={{ color: PRIMARY }} />
                    </div>
                    <h2 className="text-[22px] font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>Reset your password</h2>
                    <p className="text-[13px] mb-5 max-w-[420px]" style={{ color: 'var(--text-muted)' }}>
                      We sent a 6-digit code to <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{resetEmail}</span>. It expires in 15 minutes.
                    </p>

                    <div className="w-full max-w-[380px]">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {resetDigits.map((d, i) => (
                          <input
                            key={i}
                            ref={(el) => { resetRefs.current[i] = el; }}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={d}
                            disabled={resetLocked || resettingPassword}
                            onChange={(e) => handleResetDigitChange(i, e.target.value)}
                            onKeyDown={(e) => handleResetKeyDown(i, e)}
                            onPaste={handleResetPaste}
                            className="w-11 h-12 rounded-[12px] text-center text-[18px] font-extrabold outline-none transition-all"
                            style={{
                              background: isDark ? '#1a1e2c' : '#f9fafb',
                              boxShadow: resetError
                                ? '0 0 0 2px rgba(239,68,68,0.35)'
                                : '0 0 0 1.5px rgba(0,0,0,0.08)',
                              color: 'var(--text-primary)',
                            }}
                            aria-label={`Digit ${i + 1}`}
                          />
                        ))}
                      </div>

                      {resetError && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-center mb-3" style={{ color: '#f87171' }}>
                          {resetError}
                        </motion.p>
                      )}

                      {resetResendAttempts >= 3 ? (
                        <p className="text-[12px] text-center mb-3" style={{ color: '#f87171' }}>
                          Too many attempts. Try again in 30 minutes.
                        </p>
                      ) : (
                        <div className="text-center mb-4">
                          {resetResendCooldownS > 0 ? (
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              Resend code in {formatCountdown(resetResendCooldownS)}
                            </p>
                          ) : (
                            <button
                              type="button"
                              disabled={!canResendReset}
                              onClick={async () => {
                                if (resetResendAttempts >= 2) {
                                  setResetResendAttempts(3);
                                  setResetResendLockedUntil(Date.now() + 30 * 60 * 1000);
                                  return;
                                }
                                await sendResetOtp(resetEmail, 'resend');
                              }}
                              className="text-[13px] font-bold hover:underline"
                              style={{ color: PRIMARY, opacity: !canResendReset ? 0.6 : 1 }}
                            >
                              Resend Code
                            </button>
                          )}
                        </div>
                      )}

                      <div className="grid gap-3 mb-4">
                        <PremiumInput
                          label="New Password"
                          type="password"
                          value={resetPassword}
                          onChange={setResetPassword}
                          placeholder="Enter new password"
                          leftIcon={Lock}
                          required
                        />
                        <PremiumInput
                          label="Confirm Password"
                          type="password"
                          value={resetConfirm}
                          onChange={setResetConfirm}
                          placeholder="Confirm new password"
                          leftIcon={Lock}
                          required
                        />
                      </div>

                      <motion.button
                        type="button"
                        disabled={resettingPassword || resetLocked}
                        onClick={submitReset}
                        className="w-full h-[48px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 border-none cursor-pointer transition-all duration-250"
                        style={{
                          background: 'linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)',
                          color: '#ffffff',
                          boxShadow: '0 8px 28px rgba(249,115,22,0.45), 0 4px 14px rgba(249,115,22,0.35)',
                          opacity: resettingPassword || resetLocked ? 0.8 : 1,
                        }}
                        whileHover={!(resettingPassword || resetLocked) ? { y: -2 } : {}}
                        whileTap={!(resettingPassword || resetLocked) ? { y: 0 } : {}}
                      >
                        {resettingPassword && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {resettingPassword ? 'Updating…' : 'Set New Password →'}
                      </motion.button>

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            clearResetState();
                            setRightPanelState('auth');
                            navigate('/auth?tab=login');
                          }}
                          className="text-xs font-semibold hover:underline block mx-auto"
                          style={{ color: PRIMARY }}
                        >
                          ← Back to Sign In
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {rightPanelState === 'success' && (
                <motion.div
                  key="success-panel"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex flex-col items-center text-center py-2">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{
                        background: 'rgba(16,185,129,0.14)',
                        boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.25)',
                      }}
                    >
                      <svg width="34" height="26" viewBox="0 0 52 38" fill="none" aria-hidden="true">
                        <path
                          d="M6 20.5L20 34L46 6"
                          stroke={SUCCESS}
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            strokeDasharray: 80,
                            strokeDashoffset: 80,
                            animation: 'auth-check 650ms ease-out forwards',
                          }}
                        />
                      </svg>
                    </div>
                    <style>{`
                      @keyframes auth-check {
                        to { stroke-dashoffset: 0; }
                      }
                    `}</style>
                    <h2 className="text-[22px] font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>Email Verified!</h2>
                    <p className="text-[13px] mb-5" style={{ color: 'var(--text-muted)' }}>
                      Your account is ready. Welcome to Reaglex.
                    </p>

                    <motion.button
                      type="button"
                      onClick={() => {
                        const { user } = useAuthStore.getState();
                        if (user?.role === 'seller') navigate('/seller');
                        else if (user?.role === 'admin') navigate('/admin');
                        else navigate('/');
                      }}
                      className="w-full h-[48px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 border-none cursor-pointer transition-all duration-250"
                      style={{
                        background: 'linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)',
                        color: '#ffffff',
                        boxShadow: '0 8px 28px rgba(249,115,22,0.45), 0 4px 14px rgba(249,115,22,0.35)',
                      }}
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 0 }}
                    >
                      Go to Dashboard →
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <p className="flex-shrink-0 mt-4 text-[10px] sm:text-[11px] text-center leading-relaxed px-2" style={{ color: 'var(--text-faint)' }}>
          By continuing you agree to our{' '}
          <a href="/terms" className="hover:underline" style={{ color: '#f97316' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="hover:underline" style={{ color: '#f97316' }}>Privacy Policy</a>.
        </p>
      </div>
    </AuthPremiumLayout>
  );
}
