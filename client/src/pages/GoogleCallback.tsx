import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { Loader2, KeyRound } from 'lucide-react';
import { authAPI } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setUserAndToken } = useAuthStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<'loading' | '2fa' | '2fa-setup' | 'done'>('loading');
  const [twoFATempToken, setTwoFATempToken] = useState('');
  const [twoFAEmail, setTwoFAEmail] = useState('');
  const [twoFARole, setTwoFARole] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [twoFAQRCode, setTwoFAQRCode] = useState('');
  const [twoFAManualKey, setTwoFAManualKey] = useState('');
  const [otpError, setOtpError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [setupQRLoading, setSetupQRLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const success = searchParams.get('success');
      const error = searchParams.get('error');
      const requires2FA = searchParams.get('requires2FA') === 'true';
      const requires2FASetup = searchParams.get('requires2FASetup') === 'true';
      const tempToken = searchParams.get('tempToken');
      const email = searchParams.get('email') || '';
      const role = searchParams.get('role') || '';

      if (error) {
        const messages: Record<string, string> = {
          access_denied: 'Google sign-in was cancelled',
          no_code: 'No authorization code received',
          oauth_not_configured: 'Google OAuth is not configured on the server',
          no_email: 'No email address found in Google account',
          oauth_failed: 'Failed to authenticate with Google',
          account_deactivated: 'Your account has been deactivated. Please contact support.',
        };
        showToast(messages[error] || `Authentication error: ${error}`, 'error');
        navigate('/login');
        return;
      }

      // Seller/Admin: 2FA required (from redirect or from SelectRole)
      if ((requires2FA || requires2FASetup) && tempToken) {
        setTwoFATempToken(tempToken);
        setTwoFAEmail(email);
        setTwoFARole(role);
        setStep(requires2FA ? '2fa' : '2fa-setup');
        if (requires2FA) setTimeout(() => otpRefs.current[0]?.focus(), 100);
        return;
      }

      if (success === 'true' && token) {
        try {
          localStorage.setItem('auth_token', token);
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Failed to fetch user profile');
          const data = await response.json();
          const userProfile = {
            id: data.user.id?.toString() || data.user._id?.toString() || '',
            email: data.user.email,
            full_name: data.user.fullName,
            role: data.user.role,
            seller_status: data.user.sellerVerificationStatus,
            seller_verified: data.user.isSellerVerified,
            phone: data.user.phone,
            avatar_url: data.user.avatarUrl || data.user.avatar_url || null,
            created_at: data.user.createdAt || new Date().toISOString(),
            updated_at: data.user.updatedAt || new Date().toISOString(),
          };
          localStorage.setItem('user', JSON.stringify(userProfile));
          setUser(userProfile);
          showToast('Successfully signed in with Google!', 'success');
          if (userProfile.role === 'seller') navigate('/seller');
          else if (userProfile.role === 'admin') navigate('/admin');
          else navigate('/');
        } catch (err: any) {
          console.error('Callback error:', err);
          showToast('Failed to complete sign-in', 'error');
          navigate('/login');
        }
        return;
      }

      showToast('Invalid callback parameters', 'error');
      navigate('/login');
    };

    handleCallback();
  }, [searchParams, navigate, setUser, showToast]);

  const handleOtpChange = (i: number, value: string) => {
    if (value !== '' && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[i] = value;
    setOtp(next);
    setOtpError('');
    if (value && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setOtpError('Enter the 6-digit code from your app.');
      return;
    }
    setSubmitting(true);
    setOtpError('');
    try {
      const data = await authAPI.verify2FA(twoFATempToken, code);
      const profile = {
        id: data.user.id?.toString() || data.user._id?.toString() || '',
        email: data.user.email,
        full_name: data.user.fullName,
        role: data.user.role,
        seller_status: data.user.sellerVerificationStatus,
        seller_verified: data.user.isSellerVerified,
        phone: data.user.phone,
        avatar_url: data.user.avatarUrl,
        created_at: data.user.createdAt || new Date().toISOString(),
        updated_at: data.user.updatedAt || new Date().toISOString(),
      };
      setUserAndToken(profile, data.token);
      showToast('Signed in with Google successfully!', 'success');
      if (data.user.role === 'seller') navigate('/seller');
      else if (data.user.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handle2FASetupGetQR = async () => {
    setSetupQRLoading(true);
    setOtpError('');
    try {
      const data = await authAPI.setup2FAStart(twoFATempToken);
      setTwoFAQRCode(data.qrCode);
      setTwoFAManualKey(data.manualEntryKey);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to load QR code.');
    } finally {
      setSetupQRLoading(false);
    }
  };

  const handle2FASetupConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setOtpError('Enter the 6-digit code from your app.');
      return;
    }
    setSubmitting(true);
    setOtpError('');
    try {
      const data = await authAPI.setup2FAConfirm(twoFATempToken, code);
      const profile = {
        id: data.user.id?.toString() || data.user._id?.toString() || '',
        email: data.user.email,
        full_name: data.user.fullName,
        role: data.user.role,
        seller_status: data.user.sellerVerificationStatus,
        seller_verified: data.user.isSellerVerified,
        phone: data.user.phone,
        avatar_url: data.user.avatarUrl,
        created_at: data.user.createdAt || new Date().toISOString(),
        updated_at: data.user.updatedAt || new Date().toISOString(),
      };
      setUserAndToken(profile, data.token);
      showToast('2FA enabled. Signed in with Google!', 'success');
      if (data.user.role === 'seller') navigate('/seller');
      else if (data.user.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2FA step (authenticator code)
  if (step === '2fa') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Two-factor authentication</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You signed in with Google. Enter the 6-digit code from your authenticator app.
          </p>
          {twoFAEmail && <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">{twoFAEmail}</p>}
          <form onSubmit={handle2FAVerify} className="space-y-4">
            <div className="flex justify-between gap-2">
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={v}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-10 h-12 text-center text-lg font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                />
              ))}
            </div>
            {otpError && <p className="text-sm text-red-600 dark:text-red-400">{otpError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {submitting ? 'Verifying…' : 'Verify & continue'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full mt-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // 2FA setup step (QR + code)
  if (step === '2fa-setup') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Set up 2FA (required)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {twoFARole === 'admin' ? 'Admin accounts require 2FA.' : 'Seller accounts require 2FA for security.'} Scan the QR code with your authenticator app.
          </p>
          {twoFAEmail && <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">{twoFAEmail}</p>}

          {!twoFAQRCode ? (
            <>
              <button
                type="button"
                onClick={handle2FASetupGetQR}
                disabled={setupQRLoading}
                className="w-full h-12 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {setupQRLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                {setupQRLoading ? 'Loading…' : 'Get QR code'}
              </button>
            </>
          ) : (
            <form onSubmit={handle2FASetupConfirm} className="space-y-4">
              <div className="flex justify-center">
                <img src={twoFAQRCode} alt="2FA QR" className="w-36 h-36 rounded-xl border-2 border-orange-200 dark:border-orange-500/30" />
              </div>
              {twoFAManualKey && (
                <p className="text-[11px] font-mono text-center break-all text-gray-500 dark:text-gray-400">
                  Or enter manually: {twoFAManualKey}
                </p>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400">Scan with your app, then enter the 6-digit code.</p>
              <div className="flex justify-between gap-2">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-10 h-12 text-center text-lg font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 outline-none"
                  />
                ))}
              </div>
              {otpError && <p className="text-sm text-red-600 dark:text-red-400">{otpError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {submitting ? 'Verifying…' : 'Enable 2FA & sign in'}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full mt-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-primary flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Completing sign-in...</p>
      </div>
    </div>
  );
}
