import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../lib/api';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import { useTheme } from '../contexts/ThemeContext';

const PRIMARY = '#f97316';

export function VerifyEmailPending() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const source = searchParams.get('source');
  const alreadySent = searchParams.get('sent') === '1';
  const { showToast } = useToastStore();
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const autoSentRef = useRef(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const email = emailFromUrl;
  const handleResend = async (isAuto = false) => {
    if (!email || resendLoading) return;
    if (!isAuto && cooldown > 0) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerificationEmail(email, source || undefined);
      if (!isAuto) {
        showToast('New link sent — check your inbox', 'success');
      }
      setCooldown(60);
    } catch (e: any) {
      if (!isAuto) showToast(e.message || 'Failed to resend. Try again later.', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    // If the user is already verified (e.g., they clicked the link in another tab),
    // immediately redirect to the right dashboard to avoid "re-gaining" this page.
    if (user?.email_verified === true) {
      if (user.role === 'seller') navigate('/seller', { replace: true });
      else if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/account', { replace: true });
    }
  }, [user?.email_verified, user?.role, navigate]);

  useEffect(() => {
    // For Google signup path, automatically send verification link on arrival.
    if (source !== 'google') return;
    if (alreadySent) return;
    if (!email) return;
    if (user?.email_verified === true) return;
    if (autoSentRef.current) return;
    autoSentRef.current = true;
    handleResend(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, email, alreadySent, user?.email_verified]);

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
    <AuthPremiumLayout currentView="pending">
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
            <p className="text-center text-sm font-medium text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-950/40 rounded-xl py-3 px-4 mb-4 break-all border border-orange-100 dark:border-orange-500/20">
              {email}
            </p>
          )}

          <Link
            to={email ? `/verify-otp?email=${encodeURIComponent(email)}` : '/verify-otp'}
            className="mb-4 w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)` }}
          >
            Enter 6-digit code — recommended
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-6">
            Use the verification code from your email for the fastest path. Prefer clicking a link in the message? Use the options below.
          </p>

          <p className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Or verify using email link
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
              disabled={resendLoading || cooldown > 0}
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
              {resendLoading
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend verification link (${cooldown}s)`
                  : 'Resend verification link'}
            </button>
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
