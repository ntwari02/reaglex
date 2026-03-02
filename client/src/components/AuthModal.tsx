import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, User, Briefcase, Mail, Lock, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuthModal } from '../stores/authModalStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

const PRIMARY = '#f97316';
const SUCCESS = '#10b981';
const ERROR = '#ef4444';
const EASE = [0.25, 0.46, 0.45, 0.94];

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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Left branded panel (desktop only) ─────────────────────────────────────────
function LeftPanel() {
  return (
    <div
      className="hidden md:flex flex-col justify-between p-8 w-[40%] min-w-0"
      style={{
        background: 'linear-gradient(160deg, #0f0f1a, #1a1a2e)',
        borderRadius: '24px 0 0 24px',
      }}
    >
      <div>
        <div className="text-white font-bold text-2xl tracking-tight">Reaglex</div>
        <p className="text-white/90 text-sm mt-2">Smart Shopping. Trusted Sellers.</p>
      </div>
      <ul className="space-y-2 text-[13px] text-white">
        {['Escrow Protected Payments', 'Verified Sellers Only', 'Free Buyer Protection'].map((t, i) => (
          <li key={i} className="flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0 text-green-400" />
            {t}
          </li>
        ))}
      </ul>
      <div className="h-12 opacity-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)' }} />
    </div>
  );
}

// ── Styled field wrapper ─────────────────────────────────────────────────────
function Field({
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
  name,
  required,
  inputClassName = '',
  autoFocus,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  valid?: boolean;
  focused?: boolean;
  leftIcon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  rightEl?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  name?: string;
  required?: boolean;
  inputClassName?: string;
  autoFocus?: boolean;
}) {
  const borderColor = error ? ERROR : valid ? SUCCESS : focused ? PRIMARY : '#e5e7eb';
  const shadow = focused && !error ? '0 0 0 3px rgba(249,115,22,0.15)' : 'none';
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>{label}{required ? ' *' : ''}</label>
      <div className="relative">
        {LeftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center" style={{ color: error ? ERROR : focused || valid ? PRIMARY : '#9ca3af' }}>
            <LeftIcon className="w-5 h-5" />
          </span>
        )}
        <input
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          className={`w-full h-12 pl-10 pr-10 rounded-xl border bg-white outline-none transition-all text-sm ${inputClassName}`}
          style={{
            borderWidth: '1.5px',
            borderColor,
            boxShadow: shadow,
            color: '#111827',
          }}
        />
        {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
        {valid && !rightEl && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="w-5 h-5" style={{ color: SUCCESS }} />
          </span>
        )}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs flex items-center gap-1" style={{ color: ERROR }}>
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </motion.p>
      )}
    </div>
  );
}

// ── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onShake }: { onShake: () => void }) {
  const { setTab, close } = useAuthModal();
  const { login } = useAuthStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState< string | null>(null);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^\d+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in both fields.'); onShake(); return; }
    if (!emailValid) { setError('Enter a valid email or phone.'); onShake(); return; }
    if (password.length < 6) { setError('Password must be ≥ 6 characters.'); onShake(); return; }
    if (hasSQLRisk(email) || hasSQLRisk(password)) { setError('Invalid characters detected.'); onShake(); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) { setError(result.error || 'Login failed.'); onShake(); setLoading(false); return; }
      setSuccess(true);
      const { user } = useAuthStore.getState();
      const name = user?.full_name?.split(' ')[0] || 'there';
      showToast(`Welcome back, ${name}! 👋`, 'success');
      setTimeout(() => {
        close();
        if (user?.role === 'seller') navigate('/seller');
        else if (user?.role === 'admin') navigate('/admin');
      }, 600);
    } catch (err: any) { setError(err.message || 'Unexpected error.'); onShake(); }
    finally { if (!success) setLoading(false); }
  };

  const googleAuth = () => { window.location.href = `${API_BASE}/auth/google?role=buyer`; };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="font-bold text-2xl" style={{ color: '#111827' }}>Welcome back 👋</h3>
        <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Sign in to your Reaglex account</p>
      </motion.div>
      {error && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-red-50 border border-red-200" style={{ color: ERROR }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Field label="Email or Phone" type="text" value={email} onChange={setEmail} placeholder="Enter email or phone" leftIcon={Mail} valid={email.length > 0 && emailValid} focused={focused === 'email'} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} required autoFocus />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Field label="Password" type={showPw ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Password" leftIcon={Lock} focused={focused === 'pw'} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} rightEl={
          <button type="button" onClick={() => setShowPw(!showPw)} className="p-1 rounded hover:bg-gray-100 transition" aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? <EyeOff className="w-4 h-4" style={{ color: '#6b7280' }} /> : <Eye className="w-4 h-4" style={{ color: '#6b7280' }} />}
          </button>
        } required />
      </motion.div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded border-2" style={{ accentColor: PRIMARY }} />
          <span className="text-[13px]" style={{ color: '#6b7280' }}>Remember me</span>
        </label>
        <button type="button" onClick={() => setTab('forgot')} className="text-sm font-medium hover:underline transition" style={{ color: PRIMARY }}>Recover Password?</button>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <motion.button type="submit" disabled={loading} className="w-full h-[50px] rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all" style={{ background: success ? SUCCESS : 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: success ? 'none' : '0 4px 16px rgba(249,115,22,0.3)' }} whileHover={!loading && !success ? { scale: 1.01 } : {}} whileTap={!loading ? { scale: 0.99 } : {}}>
          {loading && !success && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {success && <Check className="w-5 h-5" />}
          {!loading && !success && <>Sign In <ArrowRight className="w-4 h-4" /></>}
          {loading && !success && 'Signing in…'}
        </motion.button>
      </motion.div>
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-gray-200" /><span className="text-xs" style={{ color: '#9ca3af' }}>Or Continue with</span><div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="space-y-2.5">
        <motion.button
          type="button"
          onClick={googleAuth}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-12 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm bg-white hover:bg-gray-50 transition-shadow"
          style={{ borderColor: '#e5e7eb', color: '#374151', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.77-6.77C35.41 2.38 30.21 0 24 0 14.67 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.5 17.79 9.5 24 9.5z"/>
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.29 7.09-17.55z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.67 48 24 48z"/>
          </svg>
          Continue with Google
        </motion.button>
      </div>
      <p className="text-center text-sm pt-1" style={{ color: '#6b7280' }}>
        No account? <button type="button" onClick={() => setTab('signup')} className="font-bold hover:underline" style={{ color: PRIMARY }}>Sign Up</button>
      </p>
    </form>
  );
}

// ── Signup form ──────────────────────────────────────────────────────────────
function SignupForm({ onShake }: { onShake: () => void }) {
  const { setTab } = useAuthModal();
  const { showToast } = useToastStore();
  const [fd, setFd] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'buyer' as 'buyer' | 'seller', storeName: '' });
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const strength = getPasswordStrength(fd.password);
  const reqs = checkPasswordReqs(fd.password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email);
  const match = fd.confirmPassword.length ? fd.password === fd.confirmPassword : null;
  const canSubmit = fd.fullName.trim().length >= 2 && emailValid && fd.password.length >= 8 && reqs.upper && reqs.number && reqs.special && fd.password === fd.confirmPassword && agreed && (fd.role !== 'seller' || fd.storeName.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!fd.fullName.trim() || fd.fullName.trim().length < 2) { setError('Full name must be at least 2 characters.'); onShake(); return; }
    if (!emailValid) { setError('Please enter a valid email.'); onShake(); return; }
    if (fd.password.length < 8) { setError('Password must be at least 8 characters.'); onShake(); return; }
    if (!reqs.upper || !reqs.number || !reqs.special) { setError('Password must include uppercase, number, and special character.'); onShake(); return; }
    if (fd.password !== fd.confirmPassword) { setError('Passwords do not match.'); onShake(); return; }
    if (!agreed) { setError('Please agree to the Terms.'); onShake(); return; }
    if (fd.role === 'seller' && !fd.storeName.trim()) { setError('Store name is required for sellers.'); onShake(); return; }
    if (hasSQLRisk(fd.fullName) || hasSQLRisk(fd.email) || hasSQLRisk(fd.password)) { setError('Invalid characters detected.'); onShake(); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fd.fullName, email: fd.email, password: fd.password, role: fd.role, storeName: fd.role === 'seller' ? fd.storeName : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Registration failed.'); onShake(); return; }
      setSuccess(true);
      showToast(fd.role === 'seller' ? 'Account created! Pending verification.' : 'Account created! Please sign in.', 'success');
    } catch { setError('Network error. Try again.'); onShake(); }
    finally { setLoading(false); }
  };

  if (success) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
      <div className="text-4xl mb-3">🎉</div>
      <h3 className="font-bold text-2xl mb-1" style={{ color: SUCCESS }}>Account Created!</h3>
      <p className="font-semibold text-lg mb-1" style={{ color: PRIMARY }}>Welcome to Reaglex, {fd.fullName.trim().split(/\s+/)[0] || 'there'}!</p>
      <p className="text-sm mb-6" style={{ color: '#6b7280' }}>Check your email to verify your account</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTab('login')} className="px-5 py-2.5 rounded-xl font-semibold text-white" style={{ background: PRIMARY }}>Start Shopping →</motion.button>
        <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTab('login')} className="px-5 py-2.5 rounded-xl font-semibold border-2" style={{ borderColor: PRIMARY, color: PRIMARY }}>Complete Profile</motion.button>
      </div>
    </motion.div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-bold text-2xl" style={{ color: '#111827' }}>Create your account 🚀</h3>
      <p className="text-sm" style={{ color: '#6b7280' }}>Join thousands of buyers and sellers</p>
      {error && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-red-50 border border-red-200" style={{ color: ERROR }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </motion.div>
      )}
      <Field label="Full Name" value={fd.fullName} onChange={(v) => setFd({ ...fd, fullName: v })} placeholder="Your full name" leftIcon={User} valid={fd.fullName.trim().length >= 2} required autoFocus />
      <Field label="Email Address" type="email" value={fd.email} onChange={(v) => setFd({ ...fd, email: v })} placeholder="you@example.com" leftIcon={Mail} error={fd.email.length > 0 && !emailValid ? 'Please enter a valid email' : undefined} valid={emailValid} required />
      <div className="space-y-1.5">
        <Field label="Password" type={showPw ? 'text' : 'password'} value={fd.password} onChange={(v) => setFd({ ...fd, password: v })} placeholder="At least 8 characters" leftIcon={Lock} onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)} rightEl={<button type="button" onClick={() => setShowPw(!showPw)} className="p-1 rounded hover:bg-gray-100" aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? <EyeOff className="w-4 h-4" style={{ color: '#6b7280' }} /> : <Eye className="w-4 h-4" style={{ color: '#6b7280' }} />}</button>} required />
        <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
          {[0, 1, 2, 3].map((i) => <motion.div key={i} className="flex-1 rounded-full" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.3 }} style={{ background: i === 0 ? ERROR : i === 1 ? '#f97316' : i === 2 ? '#eab308' : SUCCESS, opacity: strength.level >= i ? 1 : 0.2 }} />)}
        </div>
        <p className="text-xs" style={{ color: strength.level === 0 ? '#9ca3af' : strength.level <= 2 ? '#f97316' : SUCCESS }}>{strength.label}</p>
        {pwFocused && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs space-y-1 mt-1" style={{ color: '#6b7280' }}>
            {[{ key: 'length', met: reqs.length, text: 'At least 8 characters' }, { key: 'upper', met: reqs.upper, text: 'One uppercase letter' }, { key: 'number', met: reqs.number, text: 'One number' }, { key: 'special', met: reqs.special, text: 'One special character' }].map(({ key, met, text }) => (
              <li key={key} className="flex items-center gap-2">{met ? <Check className="w-3.5 h-3.5 text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-gray-300" />} {text}</li>
            ))}
          </motion.ul>
        )}
      </div>
      <Field label="Confirm Password" type={showCPw ? 'text' : 'password'} value={fd.confirmPassword} onChange={(v) => setFd({ ...fd, confirmPassword: v })} placeholder="Confirm password" leftIcon={Lock} rightEl={<button type="button" onClick={() => setShowCPw(!showCPw)} className="p-1 rounded hover:bg-gray-100"><Eye className="w-4 h-4" style={{ color: '#6b7280' }} /></button>} valid={match === true} error={match === false ? "Passwords don't match" : undefined} required />
      {fd.confirmPassword.length > 0 && <p className="text-xs" style={{ color: match ? SUCCESS : ERROR }}>{match ? 'Passwords match ✓' : "Passwords don't match"}</p>}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>I want to:</p>
        <div className="flex gap-2">
          {(['buyer', 'seller'] as const).map((r) => (
            <motion.button key={r} type="button" onClick={() => setFd({ ...fd, role: r })} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all"
              style={{ borderColor: fd.role === r ? PRIMARY : '#e5e7eb', background: fd.role === r ? PRIMARY : 'white', color: fd.role === r ? 'white' : '#6b7280' }}>
              {r === 'buyer' ? '🛒' : '🏪'} {r === 'buyer' ? 'Buy' : 'Sell'}
            </motion.button>
          ))}
        </div>
      </div>
      {fd.role === 'seller' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <Field label="Store Name" value={fd.storeName} onChange={(v) => setFd({ ...fd, storeName: v })} placeholder="Your store name" required />
        </motion.div>
      )}
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0" style={{ accentColor: PRIMARY }} />
        <span className="text-sm" style={{ color: '#6b7280' }}>I agree to the <a href="/terms" className="font-medium hover:underline" style={{ color: PRIMARY }}>Terms of Service</a> and <a href="/privacy" className="font-medium hover:underline" style={{ color: PRIMARY }}>Privacy Policy</a></span>
      </label>
      <motion.button type="submit" disabled={!canSubmit || loading} whileHover={canSubmit && !loading ? { scale: 1.01 } : {}} whileTap={canSubmit && !loading ? { scale: 0.99 } : {}}
        className="w-full h-[50px] rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        style={{ background: canSubmit && !loading ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#d1d5db', boxShadow: canSubmit && !loading ? '0 4px 16px rgba(249,115,22,0.3)' : 'none' }}>
        {loading && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {!loading && (canSubmit ? 'Create Account →' : 'Create Account')}
      </motion.button>
      <div className="flex items-center gap-3 py-2"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">Or sign up with</span><div className="flex-1 h-px bg-gray-200" /></div>
      <button type="button" onClick={() => window.location.href = `${API_BASE}/auth/google?role=${fd.role}`}
        className="w-full h-12 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm bg-white hover:bg-gray-50 transition" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
        <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.77-6.77C35.41 2.38 30.21 0 24 0 14.67 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.5 17.79 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.29 7.09-17.55z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.67 48 24 48z"/></svg>
        Continue with Google
      </button>
      <p className="text-center text-sm" style={{ color: '#6b7280' }}>Already have an account? <button type="button" onClick={() => setTab('login')} className="font-bold hover:underline" style={{ color: PRIMARY }}>Sign In</button></p>
    </form>
  );
}

// ── Forgot password form ─────────────────────────────────────────────────────
function ForgotForm() {
  const { setTab } = useAuthModal();
  const { showToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

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
      setSent(true);
      showToast('Password reset link sent!', 'success');
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (res.ok) showToast('Reset link sent again!', 'success');
    } finally { setLoading(false); }
  };

  if (sent) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 space-y-5">
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }} className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-4xl">✉️</motion.div>
      <div>
        <p className="font-bold text-xl mb-1" style={{ color: SUCCESS }}>Check your email!</p>
        <p className="text-sm" style={{ color: '#6b7280' }}>We sent a reset link to <strong style={{ color: '#111827' }}>{email}</strong></p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="inline-flex justify-center px-4 py-2.5 rounded-xl font-semibold text-white" style={{ background: PRIMARY }}>Open Gmail →</a>
        <button type="button" onClick={handleResend} disabled={loading} className="px-4 py-2.5 rounded-xl font-semibold border-2 disabled:opacity-50" style={{ borderColor: PRIMARY, color: PRIMARY }}>{loading ? 'Sending…' : 'Resend Email'}</button>
      </div>
      <button type="button" onClick={() => setTab('login')} className="text-sm font-semibold hover:underline block mx-auto" style={{ color: PRIMARY }}>← Back to Sign In</button>
    </motion.div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button type="button" onClick={() => setTab('login')} className="text-sm font-medium hover:underline mb-2 block" style={{ color: PRIMARY }}>← Back to Sign In</button>
      <h3 className="font-bold text-xl" style={{ color: '#111827' }}>Reset Password</h3>
      <p className="text-sm" style={{ color: '#6b7280' }}>Enter your email and we'll send a reset link.</p>
      {error && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-red-50 border border-red-200" style={{ color: ERROR }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </motion.div>
      )}
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="Enter your email" leftIcon={Mail} required autoFocus />
      <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        className="w-full h-[50px] rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
        {loading && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {!loading && <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
      </motion.button>
    </form>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function AuthModal() {
  const { isOpen, tab, setTab, close } = useAuthModal();
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const onShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ authModal: true }, '');
    const pop = () => close();
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [isOpen, close]);

  const closeDrawer = useCallback(() => {
    if (window.history.state?.authModal) { window.history.back(); return; }
    close();
  }, [close]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeDrawer]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          />
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              ref={formRef}
              className={`relative w-full max-w-[560px] flex overflow-hidden rounded-3xl bg-white pointer-events-auto ${shake ? 'auth-shake' : ''}`}
              style={{
                maxHeight: '90vh',
                borderRadius: 24,
                boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              }}
            >
              <LeftPanel />
              <div className="flex-1 flex flex-col overflow-y-auto min-w-0 py-8 px-6 md:px-8" style={{ paddingTop: 36, paddingBottom: 36, paddingLeft: 32, paddingRight: 32 }}>
                {tab !== 'forgot' && (
                  <div className="relative flex p-1 rounded-full mb-6 self-start w-full max-w-[220px]" style={{ background: '#f3f4f6' }}>
                    {(['login', 'signup'] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setTab(t)}
                        className="relative z-10 flex-1 py-2 rounded-full text-sm font-semibold transition-colors"
                        style={{ color: tab === t ? PRIMARY : '#6b7280' }}>
                        {t === 'login' ? 'Sign In' : 'Register'}
                      </button>
                    ))}
                    <motion.div
                      className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm"
                      style={{ width: 'calc(50% - 4px)', left: 4 }}
                      animate={{ x: tab === 'signup' ? '100%' : 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                    />
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, x: tab === 'forgot' ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: tab === 'forgot' ? 12 : -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    {tab === 'login' && <LoginForm onShake={onShake} />}
                    {tab === 'signup' && <SignupForm onShake={onShake} />}
                    {tab === 'forgot' && <ForgotForm />}
                  </motion.div>
                </AnimatePresence>
              </div>

              <motion.button
                type="button"
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
                onClick={closeDrawer}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors"
                style={{ background: '#f3f4f6', color: '#374151' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = ERROR; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#374151'; }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
