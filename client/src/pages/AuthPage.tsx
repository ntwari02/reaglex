import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Eye, EyeOff, User, Mail, Lock, Check, ArrowRight, Sun, Moon, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useTheme } from '../contexts/ThemeContext';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import AuthFusionTabs from '../components/auth/AuthFusionTabs';
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
      className={`agf-form${shake && !reduceMotion ? ' agf-form--shake' : ''}`}
    >
      <div>
        <h2 className="agf-heading">Welcome back 👋</h2>
        <p className="agf-subheading">Sign in to your Spacilly account</p>
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
              className="agf-icon-btn" aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
        />
      </div>

      <div className="agf-row">
        <label className="agf-remember">
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
            className="agf-remember__toggle"
          >
            <span className="agf-remember__knob" />
          </button>
          Remember me
        </label>
        <Link to="/auth?tab=forgot" className="agf-link">
          Forgot password?
        </Link>
      </div>

      <PrimaryBtn loading={loading} success={success}>
        {success ? <><Check size={17} /> Signed In</> : <>Sign In <ArrowRight size={16} /></>}
      </PrimaryBtn>

      <OrDivider />

      <div className="agf-social-row">
        <GoogleBtn
          onClick={() => {
            onOAuthBegin?.();
            setError('');
            setFieldErrors({});
            sessionStorage.setItem('auth_oauth_role', role);
            window.location.href = `${API_BASE}/auth/google?role=${role}`;
          }}
        />
      </div>

      <p className="text-center text-[13px]" style={{ color: 'var(--agf-text-muted)' }}>
        No account?{' '}
        <Link to="/auth?tab=signup" className="agf-link">
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
      className={`agf-form${shake && !reduceMotion ? ' agf-form--shake' : ''}`}
    >
      <div>
        <h2 className="agf-heading">Create your account</h2>
        <p className="agf-subheading">Join buyers and sellers on Spacilly</p>
      </div>

      <ErrorBanner message={error} />

      {/* Name + Email */}
      <div className="agf-field-grid grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              className="agf-icon-btn"
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required />
        {/* Strength bar */}
        {fd.password.length > 0 && (
          <div className="agf-pw-strength flex items-center gap-2" aria-live="polite" aria-atomic="true">
            <div className="agf-pw-strength__bar flex gap-0.5 flex-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              {[0,1,2,3].map((i) => (
                <div key={i} className="flex-1 transition-all duration-300" style={{
                  background: [ERROR, 'var(--brand-primary)', 'var(--notif-type-review)', SUCCESS][i],
                  opacity: strength.level > i ? 1 : 0.2,
                }} />
              ))}
            </div>
            <span className="agf-pw-strength__label font-semibold text-right"
              style={{ color: strength.level <= 1 ? ERROR : strength.level === 2 ? 'var(--notif-type-review)' : SUCCESS }}>
              {strength.label}
            </span>
          </div>
        )}
        {fd.password.length > 0 && (
          <div className="agf-pw-reqs grid grid-cols-2">
            {[
              { ok: reqs.length,  label: '8+ chars'    },
              { ok: reqs.upper,   label: 'Uppercase'   },
              { ok: reqs.number,  label: 'Number'      },
              { ok: reqs.special, label: 'Special char'},
            ].map((r) => (
              <div key={r.label} className={`agf-pw-req flex items-center${r.ok ? ' is-met' : ''}`}>
                <span className="agf-pw-req__dot rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: r.ok ? 'var(--badge-success-bg)' : 'var(--bg-secondary)' }}>
                  {r.ok && <Check size={9} style={{ color: SUCCESS }} />}
                </span>
                <span style={{ color: r.ok ? SUCCESS : undefined }}>{r.label}</span>
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
                className="agf-icon-btn" aria-label={showCPw ? 'Hide password' : 'Show password'}>
                {showCPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            : undefined
        }
        required />

      {/* Role selector */}
      <div>
        <p className="agf-field__label mb-2" id="auth-role-label">
          Account type
        </p>
        <div
          className="agf-role-segment"
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
              className={`agf-role-segment__btn${role === r ? ' is-active' : ''}`}
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
      <div className="agf-checkbox-row">
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
          className="agf-checkbox"
        >
          {agreed && <Check size={11} className="text-white" aria-hidden />}
        </button>
        <span className="agf-checkbox__text">
          I agree to the{' '}
          <a href="/terms">Terms of Service</a>
          {' '}&amp;{' '}
          <a href="/privacy">Privacy Policy</a>
        </span>
      </div>

      <PrimaryBtn disabled={!canSubmit} loading={loading}>
        {loading ? 'Creating account…' : 'Create Account →'}
      </PrimaryBtn>

      <OrDivider />
      <div className="agf-social-row">
        <GoogleBtn
          onClick={() => {
            onOAuthBegin?.();
            setError('');
            setFieldErrors({});
            sessionStorage.setItem('auth_oauth_role', role);
            window.location.href = `${API_BASE}/auth/google?role=${role}`;
          }}
        />
      </div>

      <p className="text-center text-[13px]" style={{ color: 'var(--agf-text-muted)' }}>
        Already have an account?{' '}
        <Link to="/auth?tab=login" className="agf-link">Sign In</Link>
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
      className="agf-form"
    >
      <div>
        <Link to="/auth?tab=login" className="agf-link flex items-center gap-1 mb-4 w-fit">
          ← Back to Sign In
        </Link>
        <h2 className="agf-heading">Reset password</h2>
        <p className="agf-subheading">Enter your email and we&apos;ll send a 6-digit reset code.</p>
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
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="agf-theme-btn"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function AuthPage() {
  const navigate            = useNavigate();
  const [searchParams]      = useSearchParams();
  const { setUserAndToken, user, initialized, loading } = useAuthStore();
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

  const panelSlide = reduceMotion
    ? { initial: false as const, animate: false as const, exit: false as const, transition: { duration: 0 } }
    : { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -12 }, transition: { duration: 0.28 } };
  const cardFade = reduceMotion
    ? { initial: false as const, animate: false as const }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45 } };

  const showTabs = panel === 'auth' && validTab !== 'forgot';
  const showCardFooter = panel === 'auth' || panel === 'otp' || panel === 'reset';

  return (
    <AuthPremiumLayout>
      <div className="auth-fusion__toolbar">
        <ThemeToggle />
      </div>

      <motion.div className="auth-fusion__card" {...cardFade}>
        {showTabs && <AuthFusionTabs activeTab={validTab} />}

        <AnimatePresence mode="wait">
                {panel === 'auth' && (
                  <motion.div key="auth" {...panelSlide}>
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
                  <motion.div key="otp" {...panelSlide} className="agf-otp-wrap">
                    <div className="agf-otp-icon">
                      <Mail size={28} aria-hidden />
                    </div>

                    <h2 className="agf-heading">Verify email</h2>
                    <p className="agf-subheading agf-subheading--center">
                      We sent a 6-digit code to{' '}
                      <strong style={{ color: 'var(--agf-brand)' }}>{otpEmail}</strong>.
                      Check your inbox and spam folder.
                    </p>

                    <div className="agf-center-narrow">
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
                        <p className="agf-otp-meta text-center">{expiryText}</p>
                      )}

                      <div className="text-center my-4 sm:my-5">
                        {resendN >= 3 ? (
                          <p className="agf-meta" style={{ color: 'var(--badge-error-text)' }}>Too many attempts. Try again in 30 min.</p>
                        ) : resendCd > 0 ? (
                          <p className="agf-meta">Resend in {formatCountdown(resendCd)}</p>
                        ) : (
                          <button type="button" disabled={!canResend || sending}
                            onClick={async () => {
                              if (resendN >= 2) { setResendN(3); setResendLock(Date.now() + 30*60*1000); return; }
                              await sendOtp(otpEmail, 'resend');
                            }}
                            className="agf-link"
                            style={{ opacity: !canResend || sending ? 0.55 : 1 }}>
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
                        className="agf-link block mx-auto mt-5">
                        ← Back to Sign In
                      </button>
                    </div>
                  </motion.div>
                )}

                {panel === 'reset' && (
                  <motion.div key="reset" {...panelSlide} className="agf-otp-wrap">
                    <div className="agf-otp-icon">
                      <Lock size={28} aria-hidden />
                    </div>
                    <h2 className="agf-heading">Reset password</h2>
                    <p className="agf-subheading agf-subheading--center">
                      Enter the 6-digit code sent to{' '}
                      <strong style={{ color: 'var(--agf-brand)' }}>{resetEmail}</strong>, then set a new password.
                    </p>

                    <div className="agf-center-narrow">
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

                      <div className="text-center mt-3 mb-5 sm:mb-6">
                        {resetResendN >= 3 ? (
                          <p className="agf-meta" style={{ color: 'var(--badge-error-text)' }}>Too many attempts.</p>
                        ) : resetResendCd > 0 ? (
                          <p className="agf-meta">Resend in {formatCountdown(resetResendCd)}</p>
                        ) : (
                          <button type="button" disabled={!canResendReset}
                            onClick={async () => {
                              if (resetResendN >= 2) { setResetResendN(3); setResetResendLock(Date.now() + 30*60*1000); return; }
                              await sendResetOtp(resetEmail, 'resend');
                            }}
                            className="agf-link"
                            style={{ opacity: !canResendReset ? 0.55 : 1 }}>
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
                        className="agf-link block mx-auto mt-5">
                        ← Back to Sign In
                      </button>
                    </div>
                  </motion.div>
                )}

                {panel === 'success' && (
                  <motion.div
                    key="success"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={reduceMotion ? false : { opacity: 1, scale: 1 }}
                    exit={reduceMotion ? false : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3 }}
                    className="agf-otp-wrap py-2"
                  >
                    <div className="agf-otp-icon mx-auto mb-4">
                      <Check size={32} style={{ color: 'var(--badge-success-text)' }} aria-hidden />
                    </div>
                    <h2 className="agf-heading">Email verified!</h2>
                    <p className="agf-subheading mb-6">
                      Your account is ready. Welcome to Spacilly.
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

        {showCardFooter && (
          <div className="agf-card-footer">
            <ShieldCheck size={14} aria-hidden />
            Secure · Reliable · Built for the future
          </div>
        )}

        {panel === 'auth' && validTab !== 'signup' && (
          <p className="agf-legal">
            By continuing you agree to our{' '}
            <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
        )}
      </motion.div>
    </AuthPremiumLayout>
  );
}
