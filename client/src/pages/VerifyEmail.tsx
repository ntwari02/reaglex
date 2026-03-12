import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight, Sparkles, KeyRound, Link2 } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useToastStore } from '../stores/toastStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const PRIMARY = '#f97316';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailFromUrl = searchParams.get('email') || '';
  const { showToast } = useToastStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const [otpEmail, setOtpEmail] = useState(emailFromUrl);
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSendLoading, setOtpSendLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailFromUrl) setOtpEmail(emailFromUrl);
  }, [emailFromUrl]);

  useEffect(() => {
    if (!token?.trim()) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }
    fetch(`${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message) setMessage(data.message);
        setStatus(data.message?.toLowerCase().includes('success') ? 'success' : 'error');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Verification failed. Please try again or use the options below.');
      });
  }, [token]);

  const handleSendOtp = async () => {
    const email = otpEmail?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOtpError('Please enter a valid email address.');
      return;
    }
    setOtpError('');
    setOtpSendLoading(true);
    try {
      await authAPI.requestVerificationOtp(email);
      setOtpSent(true);
      setOtpDigits(['', '', '', '', '', '']);
      showToast('Verification code sent. Check your email.', 'success');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      setOtpError(e.message || 'Failed to send code. Try again.');
    } finally {
      setOtpSendLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value !== '' && !/^\d$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    setOtpError('');
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Enter all 6 digits.');
      return;
    }
    const email = otpEmail?.trim();
    if (!email) return;
    setOtpError('');
    setOtpVerifyLoading(true);
    try {
      await authAPI.verifyEmailWithOtp(email, code);
      setMessage('Email verified successfully. You can now sign in.');
      setStatus('success');
      showToast('Email verified! You can sign in now.', 'success');
    } catch (e: any) {
      setOtpError(e.message || 'Invalid code. Try again.');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-amber-50/60 to-rose-50/40 dark:from-gray-950 dark:via-amber-950/20 dark:to-orange-950/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.08),transparent)]" />
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-orange-200/25 dark:bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-24 right-1/3 w-56 h-56 bg-amber-200/20 dark:bg-amber-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-900/5 dark:shadow-black/20 border border-orange-100/60 dark:border-orange-500/20 p-8 sm:p-10">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25 text-white">
                  <Loader2 className="w-10 h-10 animate-spin" strokeWidth={2} />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                Verifying your email
              </h1>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Please wait a moment…
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 text-white">
                    <CheckCircle className="w-10 h-10" strokeWidth={2} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 tracking-tight">
                Email verified
              </h1>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                {message || "You're all set. You can now sign in to your account."}
              </p>
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)` }}
              >
                Sign in
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20 text-white">
                  <XCircle className="w-10 h-10" strokeWidth={2} />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 tracking-tight">
                Link invalid or expired
              </h1>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                {message}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link
                  to="/login"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white transition-all"
                  style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)` }}
                >
                  Back to sign in
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-medium border-2 transition-all text-gray-700 dark:text-gray-300 border-orange-200 dark:border-orange-500/30 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                >
                  <Link2 className="w-4 h-4" style={{ color: PRIMARY }} />
                  Sign in & resend link
                </Link>
              </div>

              <div className="pt-6 border-t border-orange-100 dark:border-orange-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <KeyRound className="w-5 h-5" style={{ color: PRIMARY }} />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Or verify with a one-time code
                  </h2>
                </div>
                {!otpSent ? (
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="Your email address"
                      value={otpEmail}
                      onChange={(e) => { setOtpEmail(e.target.value); setOtpError(''); }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                    />
                    {otpError && <p className="text-sm text-red-600 dark:text-red-400">{otpError}</p>}
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSendLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)` }}
                    >
                      {otpSendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {otpSendLoading ? 'Sending…' : 'Send verification code'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      We sent a 6-digit code to <span className="font-medium text-gray-900 dark:text-white">{otpEmail}</span>. Enter it below.
                    </p>
                    <div className="flex justify-center gap-2">
                      {otpDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpInputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-11 h-12 text-center text-lg font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-colors"
                        />
                      ))}
                    </div>
                    {otpError && <p className="text-sm text-red-600 dark:text-red-400 text-center">{otpError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpVerifyLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all disabled:opacity-50"
                        style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)` }}
                      >
                        {otpVerifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {otpVerifyLoading ? 'Verifying…' : 'Verify code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtpError(''); }}
                        className="px-4 py-3 rounded-xl font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                      >
                        Change email
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
