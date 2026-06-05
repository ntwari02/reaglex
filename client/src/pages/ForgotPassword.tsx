import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import AuthFusionCard from '../components/auth/AuthFusionCard';
import { AuthInput, ErrorBanner, PrimaryBtn } from '../components/auth/AuthFormControls';
import { API_BASE_URL } from '../lib/config';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send reset email.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      showToast('6-digit code sent! Check your email.', 'success');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPremiumLayout>
      <AuthFusionCard>
        {success ? (
          <div className="text-center">
            <div className="agf-otp-icon mx-auto">
              <Mail size={28} aria-hidden />
            </div>
            <h2 className="agf-heading">Check your inbox</h2>
            <p className="agf-subheading agf-subheading--center">
              We sent a 6-digit code to <strong style={{ color: 'var(--agf-brand)' }}>{email}</strong>.
              It expires in 15 minutes.
            </p>
            <PrimaryBtn
              type="button"
              onClick={() => navigate('/reset-password')}
            >
              Enter Code →
            </PrimaryBtn>
            <Link to="/auth?tab=login" className="agf-link block mx-auto mt-4">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="agf-form">
            <h2 className="agf-heading">Reset Password</h2>
            <p className="agf-subheading">
              Enter your email and we&apos;ll send a 6-digit reset code.
            </p>

            <ErrorBanner message={error} />

            <AuthInput
              label="Email Address"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              leftIcon={Mail}
              focused={focused === 'email'}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              autoFocus
              required
            />

            <PrimaryBtn loading={loading} disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Code →'}
            </PrimaryBtn>

            <p className="agf-caption agf-caption--link">
              Remember your password?{' '}
              <Link to="/auth?tab=login" className="agf-link">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </AuthFusionCard>

      <p className="agf-legal">
        <a href="/terms">Terms</a>
        {' · '}
        <a href="/privacy">Privacy</a>
      </p>
    </AuthPremiumLayout>
  );
}
