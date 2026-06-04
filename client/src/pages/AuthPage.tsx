import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Eye, EyeOff, User, Mail, Lock, Check, ArrowRight, Sun, Moon,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useTheme } from '../contexts/ThemeContext';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import {
  AuthInput,
  ErrorBanner,
  PrimaryBtn,
  OrDivider,
  GoogleBtn,
  OtpInputs,
  applyOtpInput,
  focusAuthErrorSummary,
  focusAuthField,
} from '../components/auth/AuthFormControls';
import { authAPI } from '../lib/api';
import { API_BASE_URL } from '../lib/config';
import { getDashboardPathForRole, resolvePostLoginPath } from '../lib/authRouting';
import {
  clearAllAuthDrafts,
  clearAuthDraft,
  loadAuthDraft,
  type AuthDraftScope,
  type ResetDraft,
} from '../lib/authDraftStorage';
import { mapAuthApiErrors, focusAuthApiErrors } from '../lib/authFieldErrors';
import { getAuthDraftInitial, useSaveAuthDraft } from '../hooks/useAuthDraft';

const PRIMARY     = 'var(--brand-primary)';
const SUCCESS     = 'var(--badge-success-text)';
const ERROR       = 'var(--badge-error-text)';
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

const panelMotion = (reduceMotion: boolean) =>
  reduceMotion
    ? { initial: false as const, animate: false as const, exit: false as const, transition: { duration: 0 } }
    : { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 }, transition: { duration: 0.28 } };

function stripFieldError(errors: Record<string, string>, label: string) {
  if (!errors[label]) return errors;
  const next = { ...errors };
  delete next[label];
  return next;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN FORM
═══════════════════════════════════════════════════════════════════════════ */
function LoginFormContent({
  role = 'buyer',
  storageScope = 'page',
  onRequireEmailVerification,
  onOAuthBegin,
}: {
  role?: 'buyer' | 'seller';
  storageScope?: AuthDraftScope;
  onRequireEmailVerification: (email: string) => void;
  onOAuthBegin?: () => void;
}) {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const redirectParam   = searchParams.get('redirect');
  const { login }       = useAuthStore();
  const { showToast }   = useToastStore();
  const reduceMotion    = useReducedMotion();
  const loginDraft      = getAuthDraftInitial(storageScope, 'login', { email: '', password: '', remember: false });
  const [email,    setEmail]    = useState(loginDraft.email || '');
  const [password, setPassword] = useState(loginDraft.password || '');
  const [showPw,   setShowPw]   = useState(false);
  const [remember, setRemember] = useState(!!loginDraft.remember);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focused,  setFocused]  = useState<string | null>(null);
  const [shake,    setShake]    = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^\d+$/.test(email);

  useSaveAuthDraft(storageScope, 'login', { email, password, remember }, !success);

  const applyApiError = (payload: { message?: string; errors?: { fieldErrors?: Record<string, string[]> } }) => {
    const { banner, fields } = mapAuthApiErrors(payload, 'login');
    setError(banner);
    setFieldErrors(fields);
    focusAuthApiErrors(fields, banner);
  };

  const doShake = () => {
    setShake(true);
    if (!reduceMotion) setTimeout(() => setShake(false), 500);
    else setShake(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!email || !password)     { setError('Please fill in both fields.'); focusAuthField(!email ? 'Email or Phone' : 'Password'); doShake(); return; }
    if (!emailValid)             { setError('Enter a valid email or phone.'); focusAuthField('Email or Phone'); doShake(); return; }
    if (password.length < 6)     { setError('Password must be ≥ 6 characters.'); focusAuthField('Password'); doShake(); return; }
    if (hasSQLRisk(email) || hasSQLRisk(password)) { setError('Invalid characters detected.'); focusAuthErrorSummary(); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success && 'code' in (result as any) && (result as any).code === 'EMAIL_NOT_VERIFIED') {
        onRequireEmailVerification(String((result as any).email));
        setLoading(false); return;
      }
      if (!result.success) {
        const loginError = 'error' in result ? result.error : undefined;
        applyApiError({ message: loginError || 'Wrong email or password.' });
        doShake();
        setLoading(false);
        return;
      }
      setSuccess(true);
      clearAuthDraft(storageScope, 'login');
      const { user } = useAuthStore.getState();
      showToast(`Welcome back, ${user?.full_name?.split(' ')[0] || 'there'}! 👋`, 'success');
      setTimeout(() => {
        navigate(resolvePostLoginPath(user?.role, redirectParam));
      }, 600);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Unexpected error.'); doShake();
    } finally {
      if (!success) setLoading(false);
    }
  };

  const motionProps = panelMotion(!!reduceMotion);

  return (
      <motion.form
      onSubmit={handleSubmit}
      {...motionProps}
      className={`auth-mobile-form flex flex-col gap-3 sm:gap-5 ${shake && !reduceMotion ? 'auth-shake-anim' : ''}`}
    >
      <div className="auth-mobile-panel-heading mb-0 sm:mb-1">
        <h2 className="auth-mobile-title text-xl sm:text-[26px] font-bold sm:font-black mb-0.5 sm:mb-1" style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}>Welcome back</h2>
        <p className="auth-mobile-subtitle text-sm sm:text-[15px]" style={{ color: 'var(--text-muted)' }}>Sign in to your Reaglex account</p>
      </div>

      <ErrorBanner message={error} />

      <AuthInput
        label="Email or Phone"
        name="username"
        type="text"
        autoComplete="username"
        value={email}
        onChange={(v) => {
          setEmail(v);
          setFieldErrors((prev) => stripFieldError(prev, 'Email or Phone'));
        }}
        error={fieldErrors['Email or Phone']}
        placeholder="you@example.com"
        leftIcon={Mail}
        valid={email.length > 0 && emailValid && !fieldErrors['Email or Phone']}
        focused={focused === 'email'}
        onFocus={() => setFocused('email')}
        onBlur={() => setFocused(null)}
        required
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <AuthInput
          label="Password"
          name="password"
          type={showPw ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setFieldErrors((prev) => stripFieldError(prev, 'Password'));
          }}
          error={fieldErrors.Password}
          placeholder="Your password"
          leftIcon={Lock}
          focused={focused === 'pw'}
          onFocus={() => setFocused('pw')}
          onBlur={() => setFocused(null)}
          rightEl={
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="p-1 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--text-muted)' }} aria-label={showPw ? 'Hide password' : 'Show password'}>
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
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <button
          type="button"
          role="checkbox"
          aria-checked={remember}
          aria-label="Remember me on this device"
          onClick={() => setRemember(!remember)}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setRemember((r) => !r);
            }
          }}
          className="auth-remember-toggle w-11 h-6 rounded-full transition-all flex-shrink-0 relative"
          style={{ background: remember ? PRIMARY : 'var(--bg-tertiary)', boxShadow: `0 0 0 1.5px ${remember ? 'color-mix(in srgb, var(--brand-primary) 50%, transparent)' : 'var(--divider)'}` }}
        >
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform"
            style={{ transform: remember ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
        <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Remember me</span>
      </label>

      <PrimaryBtn loading={loading} success={success}>
        {success ? <><Check size={17} /> Signed In</> : <>Sign In <ArrowRight size={16} /></>}
      </PrimaryBtn>

      <OrDivider />

      <GoogleBtn
        onClick={() => {
          onOAuthBegin?.();
          setError('');
          setFieldErrors({});
          sessionStorage.setItem('auth_oauth_role', role);
          window.location.href = `${API_BASE}/auth/google?role=${role}`;
        }}
      />

      <p className="text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
        No account?{' '}
        <Link to="/auth?tab=signup" className="font-bold hover:underline" style={{ color: PRIMARY }}>
          Create one free →
        </Link>
      </p>

      {/* Security note */}
    </motion.form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIGNUP FORM
═══════════════════════════════════════════════════════════════════════════ */
function SignupFormContent({
  onRegistered,
  storageScope = 'page',
  onOAuthBegin,
}: {
  onRegistered: (email: string) => void;
  storageScope?: AuthDraftScope;
  onOAuthBegin?: () => void;
}) {
  const [searchParams]       = useSearchParams();
  const referralFromUrl      = searchParams.get('ref')?.trim() || '';
  const { showToast }        = useToastStore();
  const reduceMotion         = useReducedMotion();
  const signupDraft          = getAuthDraftInitial(storageScope, 'signup', {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    role: 'buyer' as const,
    agreed: false,
    referralCode: '',
  });
  const [role, setRole]      = useState<'buyer' | 'seller'>(signupDraft.role || 'buyer');
  const [fd, setFd]          = useState({
    fullName: signupDraft.fullName || '',
    email: signupDraft.email || '',
    password: signupDraft.password || '',
    confirmPassword: signupDraft.confirmPassword || '',
    storeName: signupDraft.storeName || '',
  });
  const [showPw,  setShowPw] = useState(false);
  const [showCPw, setShowCPw]= useState(false);
  const [agreed,  setAgreed] = useState(!!signupDraft.agreed);
  const [loading, setLoading]= useState(false);
  const [error,   setError]  = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess]= useState(false);
  const [focused, setFocused]= useState<string | null>(null);
  const [shake, setShake]     = useState(false);
  const [referralProgramEnabled, setReferralProgramEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState(signupDraft.referralCode || '');

  useSaveAuthDraft(
    storageScope,
    'signup',
    { ...fd, role, agreed, referralCode },
    !success,
  );

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

  const doShake = () => {
    setShake(true);
    if (!reduceMotion) setTimeout(() => setShake(false), 500);
    else setShake(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (fd.fullName.trim().length < 2)        { setError('Full name must be ≥ 2 characters.'); focusAuthField('Full Name'); doShake(); return; }
    if (!emailValid)                          { setError('Enter a valid email address.'); focusAuthField('Email Address'); doShake(); return; }
    if (fd.password.length < 8)               { setError('Password must be ≥ 8 characters.'); focusAuthField('Password'); doShake(); return; }
    if (!reqs.upper || !reqs.number || !reqs.special) { setError('Password needs uppercase, number & special char.'); focusAuthField('Password'); doShake(); return; }
    if (fd.password !== fd.confirmPassword)   { setError('Passwords do not match.'); focusAuthField('Confirm Password'); doShake(); return; }
    if (!agreed)                              { setError('Please agree to the Terms of Service.'); focusAuthErrorSummary(); doShake(); return; }
    if (role === 'seller' && !fd.storeName.trim()) { setError('Store name is required for sellers.'); focusAuthField('Store Name'); doShake(); return; }
    if (hasSQLRisk(fd.fullName) || hasSQLRisk(fd.email) || hasSQLRisk(fd.password)) { setError('Invalid characters detected.'); focusAuthErrorSummary(); doShake(); return; }
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
      if (!res.ok) {
        const { banner, fields } = mapAuthApiErrors(data, 'signup');
        setError(banner);
        setFieldErrors(fields);
        focusAuthApiErrors(fields, banner);
        return;
      }
      setSuccess(true);
      clearAuthDraft(storageScope, 'signup');
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
        style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta-hover)' }}>
        Sign In →
      </Link>
    </motion.div>
  );

  const fieldLabelByKey: Record<keyof typeof fd, string> = {
    fullName: 'Full Name',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    storeName: 'Store Name',
  };

  const f = (k: keyof typeof fd) => (v: string) => {
    setFd({ ...fd, [k]: v });
    setFieldErrors((prev) => stripFieldError(prev, fieldLabelByKey[k]));
  };

  const selectRole = (r: 'buyer' | 'seller') => {
    setRole(r);
    setError('');
    setFieldErrors({});
  };

  const motionProps = panelMotion(!!reduceMotion);

  return (
    <motion.form
      onSubmit={handleSubmit}
      {...motionProps}
      className={`auth-mobile-form flex flex-col gap-3 sm:gap-4 ${shake && !reduceMotion ? 'auth-shake-anim' : ''}`}
    >
      <div className="auth-mobile-panel-heading mb-0 sm:mb-1">
        <h2 className="auth-mobile-title text-xl sm:text-[26px] font-bold sm:font-black mb-0.5 sm:mb-1" style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}>Create account</h2>
        <p className="auth-mobile-subtitle text-sm sm:text-[15px]" style={{ color: 'var(--text-muted)' }}>Join buyers and sellers on Reaglex</p>
      </div>

      <ErrorBanner message={error} />

      {/* Name + Email */}
      <div className="auth-mobile-field-grid grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <AuthInput label="Full Name" name="name" autoComplete="name" value={fd.fullName} onChange={f('fullName')} placeholder="Your full name"
          error={fieldErrors['Full Name']}
          leftIcon={User} valid={fd.fullName.trim().length >= 2 && !fieldErrors['Full Name']}
          focused={focused === 'name'} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} required autoFocus />
        <AuthInput label="Email Address" name="email" type="email" autoComplete="email" value={fd.email} onChange={f('email')} placeholder="you@example.com"
          leftIcon={Mail}
          error={fieldErrors['Email Address'] || (fd.email.length > 0 && !emailValid ? 'Enter a valid email' : undefined)}
          valid={emailValid && !fieldErrors['Email Address']}
          focused={focused === 'email'} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} required />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <AuthInput label="Password" name="new-password" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={fd.password} onChange={f('password')}
          error={fieldErrors.Password}
          placeholder="At least 8 characters" leftIcon={Lock}
          focused={focused === 'pw'} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
          rightEl={
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required />
        {/* Strength bar */}
        {fd.password.length > 0 && (
          <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
            <div className="flex gap-0.5 flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              {[0,1,2,3].map((i) => (
                <div key={i} className="flex-1 transition-all duration-300" style={{
                  background: [ERROR, 'var(--brand-primary)', 'var(--notif-type-review)', SUCCESS][i],
                  opacity: strength.level > i ? 1 : 0.2,
                }} />
              ))}
            </div>
            <span className="text-[11px] font-semibold w-14 text-right"
              style={{ color: strength.level <= 1 ? ERROR : strength.level === 2 ? 'var(--notif-type-review)' : SUCCESS }}>
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
                  style={{ background: r.ok ? 'var(--badge-success-bg)' : 'var(--bg-secondary)' }}>
                  {r.ok && <Check size={9} style={{ color: SUCCESS }} />}
                </span>
                <span className="text-[11px]" style={{ color: r.ok ? SUCCESS : 'var(--text-faint)' }}>{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm password */}
      <AuthInput label="Confirm Password" name="confirm-password" type={showCPw ? 'text' : 'password'} autoComplete="new-password" value={fd.confirmPassword} onChange={f('confirmPassword')}
        placeholder="Repeat your password" leftIcon={Lock}
        focused={focused === 'cpw'} onFocus={() => setFocused('cpw')} onBlur={() => setFocused(null)}
        valid={pwMatch === true}
        error={fieldErrors['Confirm Password'] || (pwMatch === false ? "Passwords don't match" : undefined)}
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
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }} id="auth-role-label">
          Account type
        </p>
        <div
          className="auth-role-segment"
          role="group"
          aria-labelledby="auth-role-label"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            selectRole(role === 'buyer' ? 'seller' : 'buyer');
          }}
        >
          {(['buyer', 'seller'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => selectRole(r)}
              className={`auth-role-segment__btn${role === r ? ' is-active' : ''}`}
              aria-pressed={role === r}
            >
              {r === 'buyer' ? 'Buyer' : 'Seller'}
            </button>
          ))}
        </div>
      </div>

      {/* Seller store name */}
      <AnimatePresence>
        {role === 'seller' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <AuthInput label="Store Name" name="organization" autoComplete="organization" value={fd.storeName} onChange={f('storeName')} placeholder="Your store name"
              error={fieldErrors['Store Name']}
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
      <label className="flex items-start gap-2.5 sm:gap-3 cursor-pointer select-none">
        <button
          type="button"
          role="checkbox"
          aria-checked={agreed}
          aria-label="Agree to Terms of Service and Privacy Policy"
          onClick={() => setAgreed(!agreed)}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setAgreed((a) => !a);
            }
          }}
          className="w-5 h-5 rounded-lg flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
          style={{ background: agreed ? PRIMARY : 'var(--bg-secondary)', boxShadow: `0 0 0 1.5px ${agreed ? PRIMARY : 'var(--border-card)'}` }}>
          {agreed && <Check size={12} className="text-white" />}
        </button>
        <span className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
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
      <GoogleBtn
        onClick={() => {
          onOAuthBegin?.();
          setError('');
          setFieldErrors({});
          sessionStorage.setItem('auth_oauth_role', role);
          window.location.href = `${API_BASE}/auth/google?role=${role}`;
        }}
      />

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
function ForgotFormContent({
  onSent,
  storageScope = 'page',
}: {
  onSent: (email: string) => void;
  storageScope?: AuthDraftScope;
}) {
  const { showToast }        = useToastStore();
  const reduceMotion         = useReducedMotion();
  const forgotDraft          = getAuthDraftInitial(storageScope, 'forgot', { email: '' });
  const [email,   setEmail]  = useState(forgotDraft.email || '');
  const [loading, setLoading]= useState(false);
  const [error,   setError]  = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focused, setFocused]= useState(false);

  useSaveAuthDraft(storageScope, 'forgot', { email }, true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email.'); focusAuthField('Email Address'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        const { banner, fields } = mapAuthApiErrors(data, 'forgot');
        setError(banner);
        setFieldErrors(fields);
        focusAuthApiErrors(fields, banner);
        return;
      }
      showToast('Reset code sent! Check your email.', 'success');
      onSent(email.trim());
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  };

  const motionProps = panelMotion(!!reduceMotion);

  return (
    <motion.form
      onSubmit={handleSubmit}
      {...motionProps}
      className="flex flex-col gap-5"
    >
      <div>
        <Link to="/auth?tab=login" className="text-[12px] font-semibold hover:underline flex items-center gap-1 mb-4 w-fit" style={{ color: PRIMARY }}>
          ← Back to Sign In
        </Link>
        <h2 className="text-[26px] font-black mb-1" style={{ color: 'var(--text-primary)', lineHeight: 1.1 }}>Reset Password</h2>
        <p className="text-[15px]" style={{ color: 'var(--text-muted)' }}>Enter your email and we'll send a 6-digit reset code.</p>
      </div>
      <ErrorBanner message={error} />
      <AuthInput
        label="Email Address"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          setFieldErrors((prev) => stripFieldError(prev, 'Email Address'));
        }}
        error={fieldErrors['Email Address']}
        placeholder="you@example.com"
        leftIcon={Mail}
        focused={focused}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        autoFocus
      />
      <PrimaryBtn loading={loading}>
        {loading ? 'Sending…' : <>Send Reset Code <ArrowRight size={15} /></>}
      </PrimaryBtn>
    </motion.form>
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
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button" onClick={toggleTheme}
      whileHover={!reduceMotion ? { scale: 1.05 } : {}}
      whileTap={!reduceMotion ? { scale: 0.95 } : {}}
      className="auth-theme-toggle w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200"
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
  const { setUserAndToken, user, initialized, loading } = useAuthStore();
  const { theme }           = useTheme();
  const isDark              = theme === 'dark';
  const reduceMotion        = useReducedMotion();
  const [formEpoch, setFormEpoch] = useState(0);

  useEffect(() => {
    if (!initialized || loading || !user) return;
    navigate(getDashboardPathForRole(user.role), { replace: true });
  }, [initialized, loading, user, navigate]);

  const tab      = (searchParams.get('tab') as 'login'|'signup'|'forgot') || 'login';
  const validTab = (['login','signup','forgot'] as const).includes(tab as any) ? tab : 'login';

  useEffect(() => {
    setFormEpoch((e) => e + 1);
  }, [validTab]);

  const [panel,    setPanel]   = useState<'auth'|'otp'|'success'|'reset'>('auth');
  const prevPanelRef = useRef(panel);
  useEffect(() => {
    if (prevPanelRef.current !== 'auth' && panel === 'auth') {
      setFormEpoch((e) => e + 1);
    }
    prevPanelRef.current = panel;
  }, [panel]);
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
  const [resetFieldErrors, setResetFieldErrors] = useState<Record<string, string>>({});
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

  const onOAuthBegin = useCallback(() => {
    setOtpError('');
    setOtpLocked(false);
    setVerifying(false);
    setSending(false);
    setFailN(0);
    setResetError('');
    setResetLocked(false);
    setResetting(false);
  }, []);

  useEffect(() => {
    if (panel !== 'reset') return;
    const saved = loadAuthDraft<ResetDraft>('page', 'reset');
    if (!saved) return;
    if (saved.digits?.length === 6) setResetDigits([...saved.digits]);
    if (saved.newPassword) setNewPassword(saved.newPassword);
    if (saved.newConfirm) setNewConfirm(saved.newConfirm);
  }, [panel]);

  useSaveAuthDraft(
    'page',
    'reset',
    { email: resetEmail, digits: resetDigits, newPassword, newConfirm },
    panel === 'reset',
  );

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
  const clearReset= () => {
    setResetDigits(['','','','','','']);
    setResetError('');
    setResetFieldErrors({});
    setResetLocked(false);
    setResetResendN(0);
    setResetResendLock(null);
    setResetResendCd(RESEND_CD);
    setNewPassword('');
    setNewConfirm('');
    setResetting(false);
  };

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
    const e = email.trim().toLowerCase();
    setPanel('reset');
    setResetEmail(e);
    const saved = loadAuthDraft<ResetDraft>('page', 'reset');
    clearReset();
    setResetResendN(0);
    setResetResendLock(null);
    setResetResendCd(RESEND_CD);
    if (saved?.digits?.length === 6) setResetDigits([...saved.digits]);
    if (saved?.newPassword) setNewPassword(saved.newPassword);
    if (saved?.newConfirm) setNewConfirm(saved.newConfirm);
    window.setTimeout(() => resetRefs.current[0]?.focus(), 100);
  };

  const verifyOtp = async () => {
    const code = otpDigits.join('');
    if (otpLocked || verifying || sending) return;
    if (!/^\d{6}$/.test(code))              { setOtpError('Enter the 6-digit code.'); otpRefs.current[0]?.focus(); return; }
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
      clearOtp();
      setExpiresAt(null);
      setPanel('success');
      clearAllAuthDrafts('page');
      setFormEpoch((e) => e + 1);
    } catch (err: any) {
      const n = failN + 1; setFailN(n);
      const { banner, fields } = mapAuthApiErrors({ message: err?.message }, 'otp');
      setOtpError(fields.__otp__ || banner || 'Wrong code. Try again.');
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
    setResetFieldErrors({});
    const code = resetDigits.join('');
    if (!/^\d{6}$/.test(code)) {
      setResetError('Enter the 6-digit code.');
      resetRefs.current[0]?.focus();
      return;
    }
    if (newPassword.length < 6) {
      setResetFieldErrors({ 'New Password': 'Password must be ≥ 6 characters.' });
      focusAuthField('New Password');
      return;
    }
    if (newPassword !== newConfirm) {
      setResetFieldErrors({ 'Confirm Password': 'Passwords do not match.' });
      focusAuthField('Confirm Password');
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password-otp`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code, password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const { banner, fields } = mapAuthApiErrors(data, 'reset');
        const { __otp__, ...pwFields } = fields;
        if (__otp__) setResetError(__otp__);
        else setResetError(banner);
        setResetFieldErrors(pwFields);
        focusAuthApiErrors(fields, banner);
        return;
      }
      clearReset();
      clearAllAuthDrafts('page');
      clearAuthDraft('page', 'forgot');
      setFormEpoch((e) => e + 1);
      setPanel('auth');
      navigate('/auth?tab=login');
    } catch { setResetError('Network error. Try again.'); }
    finally { setResetting(false); }
  };

  /* OTP key handlers */
  const handleOtpChange = (i: number, raw: string) => {
    if (otpLocked) return;
    const { next, focusIndex } = applyOtpInput(i, raw, otpDigits);
    setOtpDigits(next);
    setOtpError('');
    if (next[focusIndex]) otpRefs.current[focusIndex]?.focus();
    else if (focusIndex < 5 && next[i]) otpRefs.current[Math.min(5, i + 1)]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (otpLocked) return;
    if (e.key === 'Backspace') {
      if (otpDigits[i]) {
        const next = [...otpDigits];
        next[i] = '';
        setOtpDigits(next);
        e.preventDefault();
        return;
      }
      if (i > 0) {
        e.preventDefault();
        otpRefs.current[i - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft'  && i > 0) { e.preventDefault(); otpRefs.current[i-1]?.focus(); }
    if (e.key === 'ArrowRight' && i < 5) { e.preventDefault(); otpRefs.current[i+1]?.focus(); }
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
    const { next, focusIndex } = applyOtpInput(i, raw, resetDigits);
    setResetDigits(next);
    setResetError('');
    setResetFieldErrors((prev) => {
      const n = { ...prev };
      delete n.__otp__;
      return n;
    });
    if (next[focusIndex]) resetRefs.current[focusIndex]?.focus();
    else if (focusIndex < 5 && next[i]) resetRefs.current[Math.min(5, i + 1)]?.focus();
  };
  const handleResetKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (resetLocked || resetting) return;
    if (e.key === 'Backspace') {
      if (resetDigits[i]) {
        const next = [...resetDigits];
        next[i] = '';
        setResetDigits(next);
        e.preventDefault();
        return;
      }
      if (i > 0) {
        e.preventDefault();
        resetRefs.current[i - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft'  && i > 0) { e.preventDefault(); resetRefs.current[i-1]?.focus(); }
    if (e.key === 'ArrowRight' && i < 5) { e.preventDefault(); resetRefs.current[i+1]?.focus(); }
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

  const cardBg     = 'var(--card-bg)';
  const cardShadow = isDark ? CARD_SHADOW_DARK : CARD_SHADOW_LIGHT;

  /* ── RENDER ── */
  const fadeIn = reduceMotion
    ? { initial: false as const, animate: false as const, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } };
  const panelSlide = reduceMotion
    ? { initial: false as const, animate: false as const, exit: false as const, transition: { duration: 0 } }
    : { initial: { opacity: 0, x: 12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -12 }, transition: { duration: 0.22 } };

  return (
    <AuthPremiumLayout>
      {/*
        Mobile: card fills the right panel edge-to-edge with small margins.
        Desktop (sm+): card is centred with max-width, floated in the panel.
      */}
      <div className="flex flex-col flex-1 min-h-0 w-full">

        {/* Card area */}
        <div className="auth-mobile-card-wrap flex-1 flex flex-col items-stretch sm:items-center justify-start sm:justify-center min-h-0 w-full
                        px-3 py-3 sm:px-6 sm:py-8 md:px-8 md:py-10">
          <motion.div
            {...fadeIn}
            className="auth-mobile-card w-full sm:max-w-[520px] relative overflow-hidden rounded-2xl sm:rounded-2xl flex-shrink-0"
            style={{
              background: cardBg,
              boxShadow: cardShadow,
              /* Futuristic accent border — top gradient line */
              borderTop: `2px solid transparent`,
              backgroundClip: 'padding-box',
            }}
          >
            {/* Top accent line (gradient overlay) */}
            <div className="auth-mobile-card-accent absolute top-0 left-0 right-0 pointer-events-none z-20" />

            <div
              className="auth-card-deco-glow-tr absolute top-0 right-0 w-72 h-72"
              style={{
                background: 'radial-gradient(circle at top right, color-mix(in srgb, var(--brand-primary) 9%, transparent) 0%, transparent 60%)',
              }}
            />
            <div
              className="auth-card-deco-glow-bl absolute bottom-0 left-0 w-56 h-56"
              style={{
                background: 'radial-gradient(circle at bottom left, var(--navbar-violet-glow-soft) 0%, transparent 60%)',
              }}
            />
            <div
              className="auth-card-deco-dots absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)'} 1px, transparent 1px)`,
                backgroundSize: '22px 22px',
              }}
            />

            {/* Padding wrapper */}
            <div className="auth-mobile-card-inner relative z-10 p-4 sm:p-8">

              <div className="auth-mobile-chrome flex items-center gap-1.5 mb-4 sm:mb-6 max-sm:hidden">
                <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase ml-3"
                  style={{ color: 'var(--text-faint)' }}>REAGLEX · SECURE</span>
                <div className="ml-auto"><ThemeToggle /></div>
              </div>

              <div className="auth-mobile-theme-row flex items-center justify-end mb-3 sm:hidden">
                <ThemeToggle />
              </div>

              <AnimatePresence mode="wait">

                {/* ── AUTH (login/signup/forgot) panel ── */}
                {panel === 'auth' && (
                  <motion.div key="auth" {...panelSlide}>
                    <div
                      role="tablist"
                      aria-label="Sign in or register"
                      className="auth-mobile-tab-bar flex items-center p-1 sm:p-1.5 rounded-xl sm:rounded-2xl mb-4 sm:mb-7 relative"
                      data-active-tab={validTab === 'signup' ? 'signup' : 'login'}
                      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
                    >
                      <Link
                        role="tab"
                        aria-selected={validTab === 'login' || validTab === 'forgot'}
                        to="/auth?tab=login"
                        className="auth-mobile-tab-link relative z-10 flex-1 text-center py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] font-bold transition-colors"
                        style={{ color: (validTab === 'login' || validTab === 'forgot') ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        Sign In
                      </Link>
                      <Link
                        role="tab"
                        aria-selected={validTab === 'signup'}
                        to="/auth?tab=signup"
                        className="auth-mobile-tab-link relative z-10 flex-1 text-center py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[13px] sm:text-[14px] font-bold transition-colors"
                        style={{ color: validTab === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        Register
                      </Link>
                      {!reduceMotion && (
                        <motion.span
                          layoutId="auth-v2-pill"
                          className="auth-mobile-tab-pill absolute rounded-xl pointer-events-none"
                          style={{
                            background: 'var(--card-bg)',
                            boxShadow: (validTab === 'login' || validTab === 'forgot')
                              ? `var(--shadow-cta), 0 0 0 1px color-mix(in srgb, var(--brand-primary) 18%, transparent)`
                              : `0 2px 12px var(--navbar-violet-glow-soft), 0 0 0 1px var(--navbar-violet-mix)`,
                            top: 4,
                            bottom: 4,
                            width: 'calc(50% - 4px)',
                          }}
                          animate={{
                            left: validTab === 'signup' ? 'calc(50%)' : 4,
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      {reduceMotion && (
                        <span
                          className="auth-mobile-tab-pill absolute rounded-xl pointer-events-none"
                          aria-hidden
                          style={{
                            background: 'var(--card-bg)',
                            top: 4,
                            bottom: 4,
                            width: 'calc(50% - 4px)',
                            left: validTab === 'signup' ? 'calc(50%)' : 4,
                          }}
                        />
                      )}
                    </div>

                    <AnimatePresence mode="wait">
                      {validTab === 'forgot' && (
                        <motion.div
                          key={`forgot-${formEpoch}`}
                          initial={reduceMotion ? false : { opacity: 0 }}
                          animate={reduceMotion ? false : { opacity: 1 }}
                          exit={reduceMotion ? false : { opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.18 }}
                        >
                          <ForgotFormContent
                            storageScope="page"
                            onSent={(email) => goToReset(email).catch(() => undefined)}
                          />
                        </motion.div>
                      )}
                      {validTab === 'login' && (
                        <motion.div
                          key={`login-${formEpoch}`}
                          initial={reduceMotion ? false : { opacity: 0 }}
                          animate={reduceMotion ? false : { opacity: 1 }}
                          exit={reduceMotion ? false : { opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.18 }}
                        >
                          <LoginFormContent
                            role="buyer"
                            storageScope="page"
                            onOAuthBegin={onOAuthBegin}
                            onRequireEmailVerification={(email) => goToOtp(email, true)}
                          />
                        </motion.div>
                      )}
                      {validTab === 'signup' && (
                        <motion.div
                          key={`signup-${formEpoch}`}
                          initial={reduceMotion ? false : { opacity: 0 }}
                          animate={reduceMotion ? false : { opacity: 1 }}
                          exit={reduceMotion ? false : { opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.18 }}
                        >
                          <SignupFormContent
                            storageScope="page"
                            onOAuthBegin={onOAuthBegin}
                            onRegistered={(email) => goToOtp(email, false)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ── OTP PANEL ── */}
                {panel === 'otp' && (
                  <motion.div key="otp" {...panelSlide} className="flex flex-col items-center text-center">
                    {/* Icon orb */}
                    <div className="auth-otp-icon-wrap">
                      <div className="auth-otp-icon-box mx-auto">
                        <Mail size={32} style={{ color: PRIMARY }} aria-hidden />
                      </div>
                      {!reduceMotion && (
                        <motion.div className="absolute inset-0 rounded-2xl pointer-events-none"
                          animate={{ boxShadow: ['0 0 0 0 color-mix(in srgb, var(--brand-primary) 30%, transparent)', '0 0 0 10px transparent', '0 0 0 0 transparent'] }}
                          transition={{ duration: 2, repeat: Infinity }} />
                      )}
                    </div>

                    <h2 className="auth-mobile-otp-title text-xl sm:text-[26px] font-bold sm:font-black mb-2" style={{ color: 'var(--text-primary)' }}>Verify Email</h2>
                    <p className="auth-mobile-subtitle text-sm sm:text-[14px] mb-4 sm:mb-6" style={{ color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto' }}>
                      We sent a 6-digit code to{' '}
                      <span className="font-bold" style={{ color: PRIMARY }}>{otpEmail}</span>.
                      Check your inbox and spam folder.
                    </p>

                    <div className="w-full max-w-[380px] mx-auto">
                      <OtpInputs
                        digits={otpDigits}
                        inputRefs={otpRefs}
                        locked={otpLocked || verifying}
                        error={!!otpError}
                        errorMessage={otpError || undefined}
                        onChange={handleOtpChange}
                        onKeyDown={handleOtpKey}
                        onPaste={handleOtpPaste}
                      />

                      {!otpError && (
                        <p className="text-[12px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>{expiryText}</p>
                      )}

                      <div className="text-center my-5">
                        {resendN >= 3 ? (
                          <p className="text-[13px]" style={{ color: 'var(--badge-error-text)' }}>Too many attempts. Try again in 30 min.</p>
                        ) : resendCd > 0 ? (
                          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Resend in {formatCountdown(resendCd)}</p>
                        ) : (
                          <button type="button" disabled={!canResend || sending}
                            onClick={async () => {
                              if (resendN >= 2) { setResendN(3); setResendLock(Date.now() + 30*60*1000); return; }
                              await sendOtp(otpEmail, 'resend');
                            }}
                            className="text-[14px] font-bold hover:underline"
                            style={{ color: PRIMARY, opacity: !canResend || sending ? 0.55 : 1 }}>
                            {sending ? 'Sending…' : 'Resend Code'}
                          </button>
                        )}
                      </div>

                      <PrimaryBtn type="button" onClick={verifyOtp} loading={verifying || sending} disabled={otpLocked}>
                        {verifying ? 'Verifying…' : 'Verify Email →'}
                      </PrimaryBtn>

                      <button
                        type="button"
                        onClick={() => {
                          clearOtp();
                          setOtpError('');
                          setPanel('auth');
                          setFormEpoch((e) => e + 1);
                          navigate('/auth?tab=login');
                        }}
                        className="mt-5 text-[13px] font-bold hover:underline block mx-auto" style={{ color: PRIMARY }}>
                        ← Back to Sign In
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── RESET PANEL ── */}
                {panel === 'reset' && (
                  <motion.div key="reset" {...panelSlide} className="flex flex-col items-center text-center">
                    <div className="auth-otp-icon-wrap">
                      <div className="auth-otp-icon-box mx-auto">
                        <Lock size={32} style={{ color: PRIMARY }} aria-hidden />
                      </div>
                    </div>
                    <h2 className="auth-mobile-otp-title text-xl sm:text-[26px] font-bold sm:font-black mb-2" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
                    <p className="auth-mobile-subtitle text-sm sm:text-[14px] mb-4 sm:mb-6" style={{ color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto' }}>
                      Enter the 6-digit code sent to{' '}
                      <span className="font-bold" style={{ color: PRIMARY }}>{resetEmail}</span>, then set a new password.
                    </p>

                    <div className="w-full max-w-[400px] mx-auto">
                      <OtpInputs
                        digits={resetDigits}
                        inputRefs={resetRefs}
                        locked={resetLocked || resetting}
                        error={!!resetError}
                        errorMessage={resetError || undefined}
                        onChange={handleResetChange}
                        onKeyDown={handleResetKey}
                        onPaste={handleResetPaste}
                      />

                      <div className="text-center mt-3 mb-6">
                        {resetResendN >= 3 ? (
                          <p className="text-[13px]" style={{ color: 'var(--badge-error-text)' }}>Too many attempts.</p>
                        ) : resetResendCd > 0 ? (
                          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Resend in {formatCountdown(resetResendCd)}</p>
                        ) : (
                          <button type="button" disabled={!canResendReset}
                            onClick={async () => {
                              if (resetResendN >= 2) { setResetResendN(3); setResetResendLock(Date.now() + 30*60*1000); return; }
                              await sendResetOtp(resetEmail, 'resend');
                            }}
                            className="text-[14px] font-bold hover:underline"
                            style={{ color: PRIMARY, opacity: !canResendReset ? 0.55 : 1 }}>
                            Resend Code
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-4 mb-6 text-left">
                        <AuthInput
                          label="New Password"
                          name="new-password"
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(v) => {
                            setNewPassword(v);
                            setResetFieldErrors((prev) => stripFieldError(prev, 'New Password'));
                          }}
                          error={resetFieldErrors['New Password']}
                          placeholder="New password"
                          leftIcon={Lock}
                          focused={resetFocused === 'np'}
                          onFocus={() => setResetFocused('np')}
                          onBlur={() => setResetFocused(null)}
                          required
                        />
                        <AuthInput
                          label="Confirm Password"
                          name="confirm-password"
                          type="password"
                          autoComplete="new-password"
                          value={newConfirm}
                          onChange={(v) => {
                            setNewConfirm(v);
                            setResetFieldErrors((prev) => stripFieldError(prev, 'Confirm Password'));
                          }}
                          error={resetFieldErrors['Confirm Password']}
                          placeholder="Confirm new password"
                          leftIcon={Lock}
                          focused={resetFocused === 'nc'} onFocus={() => setResetFocused('nc')} onBlur={() => setResetFocused(null)} required />
                      </div>

                      <PrimaryBtn type="button" onClick={submitReset} loading={resetting} disabled={resetLocked}>
                        {resetting ? 'Updating…' : 'Set New Password →'}
                      </PrimaryBtn>

                      <button
                        type="button"
                        onClick={() => {
                          clearReset();
                          setPanel('auth');
                          setFormEpoch((e) => e + 1);
                          navigate('/auth?tab=login');
                        }}
                        className="mt-5 text-[13px] font-bold hover:underline block mx-auto" style={{ color: PRIMARY }}>
                        ← Back to Sign In
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── SUCCESS PANEL ── */}
                {panel === 'success' && (
                  <motion.div
                    key="success"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={reduceMotion ? false : { opacity: 1, scale: 1 }}
                    exit={reduceMotion ? false : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3 }}
                    className="flex flex-col items-center text-center py-4"
                  >
                    <div className="relative mb-6">
                      <div className="auth-success-orb mx-auto">
                        <svg width="44" height="34" viewBox="0 0 52 38" fill="none" aria-hidden>
                          <path d="M6 20.5L20 34L46 6" stroke={SUCCESS} strokeWidth="6"
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{ strokeDasharray: 80, strokeDashoffset: 80, animation: 'auth-check 650ms ease-out forwards' }} />
                        </svg>
                      </div>
                      {!reduceMotion && (
                        <motion.div className="absolute inset-0 rounded-full pointer-events-none"
                          animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.3)', '0 0 0 14px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0)'] }}
                          transition={{ duration: 2, repeat: Infinity }} />
                      )}
                    </div>
                    <h2 className="auth-mobile-otp-title text-xl sm:text-[28px] font-bold sm:font-black mb-2" style={{ color: 'var(--text-primary)' }}>Email Verified!</h2>
                    <p className="auth-mobile-subtitle text-sm sm:text-[15px] mb-5 sm:mb-7" style={{ color: 'var(--text-muted)' }}>
                      Your account is ready. Welcome to Reaglex.
                    </p>
                    <PrimaryBtn type="button" onClick={() => {
                      const { user } = useAuthStore.getState();
                      navigate(getDashboardPathForRole(user?.role));
                    }}>
                      Go to Dashboard →
                    </PrimaryBtn>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Footer inside card — hide on signup (terms already in form) */}
              {validTab !== 'signup' && (
              <p className="auth-mobile-footer-legal mt-4 sm:mt-6 text-[11px] sm:text-[12px] text-center leading-relaxed"
                style={{ color: 'var(--text-faint)' }}>
                By continuing you agree to our{' '}
                <a href="/terms" className="hover:underline font-semibold" style={{ color: PRIMARY }}>Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="hover:underline font-semibold" style={{ color: PRIMARY }}>Privacy Policy</a>.
              </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AuthPremiumLayout>
  );
}
