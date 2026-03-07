import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, Loader2, ArrowRight, RefreshCw, Sparkles, KeyRound } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import { authAPI } from '../lib/api';

export function VerifyEmailPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromUrl = searchParams.get('email') || '';
  const source = searchParams.get('source'); // 'google' | null
  const { showToast } = useToastStore();
  const [resendLoading, setResendLoading] = useState(false);

  const [otpEmail, setOtpEmail] = useState(emailFromUrl);
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSendLoading, setOtpSendLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailFromUrl) setOtpEmail(emailFromUrl);
  }, [emailFromUrl]);

  const email = emailFromUrl || otpEmail;

  const handleResend = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerificationEmail(email);
      showToast('Verification link sent! Check your inbox.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to resend. Try again later.', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const e = (emailFromUrl || otpEmail).trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || otpSendLoading) return;
    setOtpSendLoading(true);
    setOtpError('');
    try {
      await authAPI.requestVerificationOtp(e);
      setOtpSent(true);
      setOtpDigits(['', '', '', '', '', '']);
      showToast('Verification code sent. Check your email.', 'success');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send code.');
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
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    const e = (emailFromUrl || otpEmail).trim();
    if (code.length !== 6 || !e) return;
    setOtpVerifyLoading(true);
    setOtpError('');
    try {
      await authAPI.verifyEmailWithOtp(e, code);
      showToast('Email verified! You can sign in now.', 'success');
      navigate('/login', { replace: true });
    } catch (err: any) {
      setOtpError(err.message || 'Invalid code.');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const openGmail = () => {
    window.open('https://mail.google.com/mail/u/0/#search/in%3Ainbox', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-amber-950/20 dark:to-orange-950/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,191,36,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,191,36,0.08),transparent)]" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-orange-200/20 dark:bg-orange-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-900/5 dark:shadow-black/20 border border-amber-100/50 dark:border-amber-500/10 p-8 sm:p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 text-white">
                <Mail className="w-10 h-10" strokeWidth={1.8} />
              </div>
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-amber-950">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 tracking-tight">
            Check your email
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {source === 'google'
              ? "We've sent a verification link to your Google account email. Click the link to verify and sign in."
              : "We've sent a verification link to your email. Click the link in the message to verify your account and sign in."}
          </p>

          {email && (
            <p className="text-center text-sm font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-xl py-3 px-4 mb-6 break-all">
              {email}
            </p>
          )}

          <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Choose how to verify:
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={openGmail}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all shadow-md shadow-amber-500/20"
            >
              Open Gmail & use link
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50 transition-all"
            >
              {resendLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resendLoading ? 'Sending…' : 'Resend verification link'}
            </button>
          </div>

          <div className="pt-6 border-t border-amber-200/50 dark:border-amber-500/20 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Or verify with a code
              </h2>
            </div>
            {!otpSent ? (
              <div className="space-y-3">
                {!emailFromUrl && (
                  <input
                    type="email"
                    placeholder="Your email"
                    value={otpEmail}
                    onChange={(e) => { setOtpEmail(e.target.value); setOtpError(''); }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-400"
                  />
                )}
                {otpError && <p className="text-sm text-red-600 dark:text-red-400">{otpError}</p>}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSendLoading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((emailFromUrl || otpEmail).trim())}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition-all"
                >
                  {otpSendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {otpSendLoading ? 'Sending…' : 'Send me a 6-digit code'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter the code sent to <span className="font-medium text-gray-900 dark:text-white">{emailFromUrl || otpEmail}</span>
                </p>
                <div className="flex justify-center gap-2">
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-12 text-center text-lg font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  ))}
                </div>
                {otpError && <p className="text-sm text-red-600 dark:text-red-400 text-center">{otpError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifyLoading}
                    className="flex-1 py-3 rounded-xl font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {otpVerifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {otpVerifyLoading ? 'Verifying…' : 'Verify code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpError(''); }}
                    className="px-4 py-3 rounded-xl font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30"
                  >
                    New code
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6">
            Link expires in 24 hours. Can't find it? Check spam or promotions.
          </p>

          <Link
            to="/login"
            className="mt-6 block text-center text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
