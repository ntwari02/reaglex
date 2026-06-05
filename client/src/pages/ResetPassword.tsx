import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Check, Eye, EyeOff } from 'lucide-react';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import AuthFusionCard from '../components/auth/AuthFusionCard';
import { AuthInput, ErrorBanner, PrimaryBtn } from '../components/auth/AuthFormControls';

import { API_BASE_URL } from '../lib/config';

const SUCCESS = 'var(--badge-success-text)';

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
      setTimeout(() => navigate('/auth?tab=login'), 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reqItems = [
    { ok: reqs.length, label: 'At least 8 characters' },
    { ok: reqs.upper, label: 'One uppercase letter' },
    { ok: reqs.lower, label: 'One lowercase letter' },
    { ok: reqs.number, label: 'One number' },
    { ok: reqs.special, label: 'One special character' },
  ];

  return (
    <AuthPremiumLayout>
      <AuthFusionCard>
        <Link to="/auth?tab=login" className="agf-link inline-flex mb-3">
          ← Back to Sign In
        </Link>

        {success ? (
          <div className="text-center py-2">
            <div className="agf-otp-icon mx-auto">
              <Check size={28} style={{ color: SUCCESS }} aria-hidden />
            </div>
            <h2 className="agf-heading" style={{ color: SUCCESS }}>
              Password reset successful!
            </h2>
            <p className="agf-subheading agf-subheading--center">Redirecting to sign in…</p>
          </div>
        ) : (
          <>
            <h2 className="agf-heading">Set New Password</h2>
            <p className="agf-subheading">
              Use the link from your reset email to set a new password. If your link expired, request a new one.
            </p>

            {!tokenFromUrl?.trim() && (
              <div
                className="agf-error-banner mb-4"
                style={{
                  background: 'var(--badge-warning-bg, rgba(245, 158, 11, 0.12))',
                  borderColor: 'var(--badge-warning-border, rgba(245, 158, 11, 0.35))',
                  color: 'var(--badge-warning-text, #b45309)',
                }}
              >
                This page is only valid when opened from the link in your reset email.{' '}
                <Link to="/forgot-password" className="agf-link font-semibold">
                  Request a new reset link
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit} className="agf-form">
              <ErrorBanner message={error} />

              <AuthInput
                label="New Password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
                    className="agf-icon-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />

              {password.length > 0 && (
                <div className="agf-pw-reqs flex flex-col" style={{ gap: '0.35rem' }}>
                  <p className="agf-field__label mb-1">Password requirements</p>
                  {reqItems.map((r) => (
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

              <AuthInput
                label="Confirm Password"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm your password"
                leftIcon={Lock}
                focused={focused === 'confirm'}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
                valid={match === true}
                error={match === false ? "Passwords don't match" : undefined}
                rightEl={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="agf-icon-btn"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />

              <PrimaryBtn
                loading={loading}
                disabled={
                  loading ||
                  !isPasswordValid ||
                  !confirmPassword ||
                  password !== confirmPassword ||
                  !tokenFromUrl?.trim()
                }
              >
                {loading ? 'Resetting…' : 'Reset Password →'}
              </PrimaryBtn>
            </form>
          </>
        )}
      </AuthFusionCard>

      <p className="agf-caption agf-caption--link">
        Remember your password?{' '}
        <Link to="/auth?tab=login" className="agf-link">
          Sign In
        </Link>
      </p>
    </AuthPremiumLayout>
  );
}
