import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToastStore } from '../stores/toastStore';
import AuthLayout from '../components/AuthLayout';
import { API_BASE_URL } from '../lib/config';

const inputClass =
  'w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all bg-[var(--bg-secondary)] border border-[var(--divider)] placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address'); setLoading(false); return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) { setError(data.message || 'Failed to send reset email.'); setLoading(false); return; }

      setSuccess(true);
      showToast('6-digit code sent! Check your email.', 'success');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout tab="login">
      {success ? (
        <div className="space-y-4 text-center py-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgba(255,140,66,0.1)' }}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#ff8c42" strokeWidth="2">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Check your inbox</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. It expires in 15 minutes.
            </p>
          </div>
          <Link to="/reset-password" className="inline-block px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#ff8c42' }}>
            Enter code →
          </Link>
          <Link to="/login" className="block text-sm font-semibold hover:underline mt-2" style={{ color: '#ff8c42' }}>
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Enter the email associated with your account and we'll send you reset instructions.
          </p>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className={inputClass}
            style={{ color: 'var(--text-primary)' }}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #ff8c42 0%, #ff5f00 100%)',
              boxShadow: '0 8px 24px rgba(255,140,66,0.35)',
            }}
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--text-faint)' }}>
            Remember your password?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#ff8c42' }}>
              Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

