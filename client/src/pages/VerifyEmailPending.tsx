import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../lib/api';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import AuthFusionCard from '../components/auth/AuthFusionCard';
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to resend. Try again later.';
      if (!isAuto) showToast(message, 'error');
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
    if (user?.email_verified === true) {
      if (user.role === 'seller') navigate('/seller', { replace: true });
      else if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/account', { replace: true });
    }
  }, [user?.email_verified, user?.role, navigate]);

  useEffect(() => {
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

  return (
    <AuthPremiumLayout>
      <AuthFusionCard>
        <div className="agf-otp-icon mx-auto">
          <Mail size={28} aria-hidden />
        </div>

        <h1 className="agf-heading text-center">Check your email</h1>
        <p className="agf-subheading agf-subheading--center">
          {source === 'google'
            ? "We've sent a verification link to your Google account email. Click the link to verify and sign in."
            : "We've sent a verification link to your email. Click the link in the message to verify your account and sign in."}
        </p>

        {email && <p className="agf-email-chip">{email}</p>}

        <div className="agf-form">
          <Link
            to={email ? `/verify-otp?email=${encodeURIComponent(email)}` : '/verify-otp'}
            className="agf-btn-primary inline-flex items-center justify-center gap-2 no-underline"
            style={{ textDecoration: 'none' }}
          >
            Enter 6-digit code — recommended
            <ArrowRight size={16} aria-hidden />
          </Link>

          <p className="agf-meta text-center">
            Use the verification code from your email for the fastest path. Prefer a link in the message? Use the options below.
          </p>

          <p className="agf-field__label text-center" style={{ marginBottom: 0 }}>
            Or verify using email link
          </p>

          <button type="button" onClick={openInbox} className="agf-btn-primary">
            Open inbox &amp; use link
            <ArrowRight size={16} aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => handleResend(false)}
            disabled={resendLoading || cooldown > 0}
            className="agf-btn-outline"
          >
            {resendLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="w-4 h-4" aria-hidden />
            )}
            {resendLoading
              ? 'Sending…'
              : cooldown > 0
                ? `Resend verification link (${cooldown}s)`
                : 'Resend verification link'}
          </button>
        </div>

        <p className="agf-caption text-center mt-4">
          Link expires in 24 hours. Can&apos;t find it? Check spam or promotions.
        </p>

        <Link to="/auth?tab=login" className="agf-link block text-center mt-4">
          Back to sign in
        </Link>
      </AuthFusionCard>
    </AuthPremiumLayout>
  );
}
