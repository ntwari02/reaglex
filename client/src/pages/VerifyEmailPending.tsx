import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, Loader2, ArrowRight, RefreshCw, Sparkles, KeyRound, ExternalLink } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import { authAPI } from '../lib/api';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import { useTheme } from '../contexts/ThemeContext';

const PRIMARY = '#f97316';

export function VerifyEmailPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromUrl = searchParams.get('email') || '';
  const source = searchParams.get('source');
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

  const openInbox = () => {
    window.open('https://mail.google.com/mail/u/0/#search/in%3Ainbox', '_blank', 'noopener,noreferrer');
  };

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const CARD_SHADOW_LIGHT =
    '0 25px 50px -12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)';
  const CARD_SHADOW_DARK =
    '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)';
  const cardShadow = isDark ? CARD_SHADOW_DARK : CARD_SHADOW_LIGHT;
  const cardBg = isDark ? '#111420' : '#ffffff';

  return (
    <AuthPremiumLayout>
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[100%]">
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-auto px-4">
          <div
            className="w-full max-w-[480px] rounded-[24px] p-7 sm:p-8 flex flex-col overflow-hidden relative"
            style={{ background: cardBg, boxShadow: cardShadow }}
          >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg text-white"
                style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)`, boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.3)' }}
              >
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
            <p className="text-center text-sm font-medium text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-950/40 rounded-xl py-3 px-4 mb-6 break-all border border-orange-100 dark:border-orange-500/20">
              {email}
            </p>
          )}

          <p className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Verify using link or code
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={openInbox}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)` }}
            >
              Open inbox & use link
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium border-2 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              style={{
                borderColor: 'rgba(249,115,22,0.4)',
                color: PRIMARY,
                background: 'rgba(249,115,22,0.08)',
              }}
            >
              {resendLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resendLoading ? 'Sending…' : 'Resend verification link'}
            </button>
          </div>

          <div className="pt-6 border-t border-orange-100 dark:border-orange-500/20 mt-6">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" style={{ color: PRIMARY }} />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Or verify with a one-time code
                </h2>
              </div>
              {email && (
                <Link
                  to={`/verify-otp?email=${encodeURIComponent(email)}`}
                  className="text-xs font-medium flex items-center gap-1 transition-colors"
                  style={{ color: PRIMARY }}
                >
                  Beautiful verify page <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
            {!otpSent ? (
              <div className="space-y-3">
                {!emailFromUrl && (
                  <input
                    type="email"
                    placeholder="Your email"
                    value={otpEmail}
                    onChange={(e) => { setOtpEmail(e.target.value); setOtpError(''); }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-400 outline-none"
                  />
                )}
                {otpError && <p className="text-sm text-red-600 dark:text-red-400">{otpError}</p>}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSendLoading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((emailFromUrl || otpEmail).trim())}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)` }}
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
                      className="w-11 h-12 text-center text-lg font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    />
                  ))}
                </div>
                {otpError && <p className="text-sm text-red-600 dark:text-red-400 text-center">{otpError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifyLoading}
                    className="flex-1 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)` }}
                  >
                    {otpVerifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {otpVerifyLoading ? 'Verifying…' : 'Verify code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpError(''); }}
                    className="px-4 py-3 rounded-xl font-medium border-2 transition-colors"
                    style={{
                      borderColor: 'rgba(249,115,22,0.4)',
                      color: PRIMARY,
                      background: 'rgba(249,115,22,0.08)',
                    }}
                  >
                    New code
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6">
            Link expires in 24 hours. Can't find it? Check spam or promotions.
          </p>

          <Link
            to="/auth?tab=login"
            className="mt-6 block text-center text-sm font-medium transition-colors"
            style={{ color: PRIMARY }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthPremiumLayout>
  );
}
