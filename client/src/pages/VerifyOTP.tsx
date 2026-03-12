import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, KeyRound, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import { authAPI } from '../lib/api';

const PRIMARY = '#f97316';

export function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromUrl = searchParams.get('email') || '';
  const { showToast } = useToastStore();

  const [email, setEmail] = useState(emailFromUrl);
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [emailFromUrl]);

  useEffect(() => {
    if (step === 'code' && otp.every(d => !d)) {
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    const e = email.trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || sendLoading) return;
    setSendLoading(true);
    setError('');
    try {
      await authAPI.requestVerificationOtp(e);
      setStep('code');
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60);
      showToast('Verification code sent. Check your email.', 'success');
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
    } catch (err: any) {
      setError(err.message || 'Failed to send code.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (value !== '' && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    for (let i = pasted.length; i < 6; i++) next[i] = '';
    setOtp(next);
    setError('');
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    const eMail = email.trim();
    if (code.length !== 6 || !eMail) return;
    setVerifyLoading(true);
    setError('');
    try {
      await authAPI.verifyEmailWithOtp(eMail, code);
      setStep('success');
      showToast('Email verified! You can sign in now.', 'success');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err: any) {
      setError(err.message || 'Invalid code. Try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || sendLoading) return;
    setSendLoading(true);
    setError('');
    try {
      await authAPI.requestVerificationOtp(email.trim());
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60);
      showToast('New code sent. Check your email.', 'success');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to resend.');
    } finally {
      setSendLoading(false);
    }
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canVerify = otp.every(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-rose-50/60 dark:from-gray-950 dark:via-orange-950/30 dark:to-amber-950/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_-30%,rgba(249,115,22,0.15),transparent)_] dark:bg-[radial-gradient(ellipse_90%_80%_at_50%_-30%,rgba(249,115,22,0.08),transparent)]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[320px] rounded-full bg-orange-300/20 dark:bg-orange-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-amber-200/25 dark:bg-amber-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[28px] shadow-2xl shadow-orange-900/10 dark:shadow-black/30 border border-orange-100/80 dark:border-orange-500/20 p-8 sm:p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white transition-transform duration-300 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)`,
                  boxShadow: '0 12px 32px -8px rgba(249, 115, 22, 0.4)',
                }}
              >
                {step === 'success' ? (
                  <CheckCircle2 className="w-10 h-10" strokeWidth={2} />
                ) : (
                  <KeyRound className="w-10 h-10" strokeWidth={1.8} />
                )}
              </div>
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-amber-950 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {step === 'success' ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 tracking-tight">
                You&apos;re all set
              </h1>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Your email is verified. Redirecting you to sign in…
              </p>
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
              </div>
            </>
          ) : step === 'email' ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 tracking-tight">
                Verify with a code
              </h1>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Enter your email and we&apos;ll send you a 6-digit verification code.
              </p>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center mb-4 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30">
                  {error}
                </p>
              )}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendLoading || !validEmail}
                  className="w-full h-14 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-95 active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)`,
                    boxShadow: '0 8px 24px -4px rgba(249, 115, 22, 0.4)',
                  }}
                >
                  {sendLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                  {sendLoading ? 'Sending…' : 'Send verification code'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2 tracking-tight">
                Enter your code
              </h1>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                We sent a 6-digit code to <span className="font-semibold text-gray-900 dark:text-white break-all">{email}</span>
              </p>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center mb-4 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30">
                  {error}
                </p>
              )}
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all hover:border-orange-300 dark:hover:border-orange-500/50"
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={verifyLoading || !canVerify}
                  className="w-full h-14 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-95 active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)`,
                    boxShadow: '0 8px 24px -4px rgba(249, 115, 22, 0.4)',
                  }}
                >
                  {verifyLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : null}
                  {verifyLoading ? 'Verifying…' : 'Verify & continue'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || sendLoading}
                    className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Didn't get the code? Resend"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step !== 'success' && (
            <Link
              to="/login"
              className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
