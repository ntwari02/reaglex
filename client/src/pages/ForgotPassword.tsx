import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToastStore } from '../stores/toastStore';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../lib/config';

const PRIMARY = '#f97316';


export function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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

  const cardBg = isDark ? '#0e1019' : '#ffffff';
  const cardShadow = isDark
    ? '0 32px 64px -12px rgba(0,0,0,0.55), 0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
    : '0 32px 64px -12px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)';

  return (
    <AuthPremiumLayout currentView={success ? 'verify' : 'forgot'}>
      <div className="flex flex-col flex-1 min-h-0 w-full">
        {/* Mobile logo */}
        <div className="flex-shrink-0 flex items-center justify-between mb-4">
          <Link to="/" className="text-2xl font-bold lg:hidden"
            style={{ fontFamily: "'Mea Culpa', serif", color: 'var(--text-primary)' }}>
            Reaglex
          </Link>
        </div>

        {/* Card */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div
            className="w-full max-w-[480px] sm:max-w-[520px] rounded-[20px] p-7 sm:p-9 relative overflow-hidden"
            style={{ background: cardBg, boxShadow: cardShadow }}
          >
            {/* Corner glow */}
            <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
              style={{ background: 'radial-gradient(circle at top right, rgba(249,115,22,0.07) 0%, transparent 60%)' }} />
            <div className="absolute inset-0 pointer-events-none rounded-[20px]"
              style={{
                backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }} />

            <div className="relative z-10">
              {/* Window dots */}
              <div className="flex items-center gap-1.5 mb-6">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-auto text-[10px] font-semibold tracking-wider uppercase"
                  style={{ color: 'var(--text-faint)' }}>Reaglex Secure</span>
              </div>

              {success ? (
                <div className="text-center py-2">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)' }}>
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2">
                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                  </div>
                  <h3 className="text-[22px] font-black mb-2" style={{ color: 'var(--text-primary)' }}>Check your inbox</h3>
                  <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                    We sent a 6-digit code to{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.{' '}
                    It expires in 15 minutes.
                  </p>
                  <Link to="/reset-password"
                    className="inline-block px-6 py-3 rounded-2xl text-sm font-bold text-white mb-3"
                    style={{ background: `linear-gradient(135deg, #ff8c2a, ${PRIMARY}, #ea580c)`, boxShadow: '0 6px 20px rgba(249,115,22,0.4)' }}>
                    Enter Code →
                  </Link>
                  <Link to="/auth?tab=login" className="block text-sm font-semibold hover:underline" style={{ color: PRIMARY }}>
                    Back to Sign In
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-[24px] font-black mb-1" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
                    <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                      Enter your email and we&apos;ll send a 6-digit reset code.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-medium"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Email Address <span style={{ color: PRIMARY }}>*</span>
                    </label>
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoFocus
                      className="w-full h-[50px] rounded-2xl text-[14px] outline-none pl-4 pr-4 transition-all"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fc',
                        boxShadow: `0 0 0 1.5px ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="w-full h-[52px] rounded-2xl font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)',
                      boxShadow: loading ? 'none' : '0 8px 28px rgba(249,115,22,0.4)',
                    }}
                  >
                    {loading && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {loading ? 'Sending…' : 'Send Reset Code →'}
                  </button>

                  <p className="text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Remember your password?{' '}
                    <Link to="/auth?tab=login" className="font-bold hover:underline" style={{ color: PRIMARY }}>
                      Sign In
                    </Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        <p className="flex-shrink-0 mt-5 text-[11px] text-center" style={{ color: 'var(--text-faint)' }}>
          <a href="/terms" className="hover:underline" style={{ color: PRIMARY }}>Terms</a>
          {' · '}
          <a href="/privacy" className="hover:underline" style={{ color: PRIMARY }}>Privacy</a>
        </p>
      </div>
    </AuthPremiumLayout>
  );
}

