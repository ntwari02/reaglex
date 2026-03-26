import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { Loader2, KeyRound, Shield, Mail } from 'lucide-react';
import { authAPI } from '../lib/api';

import { API_BASE_URL } from '../lib/config';

export function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserAndToken } = useAuthStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<'loading' | '2fa' | '2fa-setup' | 'device-approval' | 'done'>('loading');
  const [twoFATempToken, setTwoFATempToken] = useState('');
  const [twoFAEmail, setTwoFAEmail] = useState('');
  const [twoFARole, setTwoFARole] = useState('');
  const [deviceApprovalRequestId, setDeviceApprovalRequestId] = useState('');
  const [deviceApprovalEmail, setDeviceApprovalEmail] = useState('');
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

      // 2FA is disabled for now; if old URLs still include these params, send user to sign-in
      if (tempToken) {
        showToast('2FA is disabled for now. Please sign in again.', 'info');
        navigate('/auth?tab=login', { replace: true });
        return;
      }

      if (success === 'true' && token) {
        try {
          // Store token first so authAPI can call /me
          localStorage.setItem('auth_token', token);

          let userProfile: any = null;
          try {
            const me = await authAPI.getCurrentUser();
            userProfile = {
              id: me.user.id?.toString() || me.user._id?.toString() || '',
              email: me.user.email,
              full_name: me.user.fullName,
              role: me.user.role,
              seller_status: me.user.sellerVerificationStatus,
              seller_verified: me.user.isSellerVerified,
              phone: me.user.phone,
              // Use Google profile image when available
              avatar_url: me.user.avatarUrl || me.user.avatar_url || null,
              created_at: me.user.createdAt || new Date().toISOString(),
              updated_at: me.user.updatedAt || new Date().toISOString(),
            };
          } catch {
            // Fallback: still complete sign-in even if /me fails temporarily
            userProfile = {
              id: '',
              email: email || '',
              full_name: '',
              role: role || 'buyer',
              seller_status: undefined,
              seller_verified: undefined,
              phone: undefined,
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }

          setUserAndToken(userProfile, token);
          showToast('Successfully signed in with Google!', 'success');
          if (userProfile.role === 'seller') navigate('/seller');
          else if (userProfile.role === 'admin') navigate('/admin');
          else navigate('/');
        } catch (err: any) {
          showToast('Failed to complete sign-in', 'error');
          navigate('/login');
        }
        return;
      }

      showToast('Invalid callback parameters', 'error');
      navigate('/login');
    };

    handleCallback();
  }, [searchParams, navigate, setUserAndToken, showToast]);

  useEffect(() => {
    if (step !== 'device-approval' || !deviceApprovalRequestId) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const result = await authAPI.checkPendingRequest(deviceApprovalRequestId);
        if (cancelled) return;
        if (result.approved && result.token && result.user) {
          const profile = {
            id: result.user.id?.toString() || result.user._id?.toString() || '',
            email: result.user.email,
            full_name: result.user.fullName,
            role: result.user.role,
            seller_status: result.user.sellerVerificationStatus,
            seller_verified: result.user.isSellerVerified,
            phone: result.user.phone,
            avatar_url: result.user.avatarUrl,
            created_at: result.user.createdAt || new Date().toISOString(),
            updated_at: result.user.updatedAt || new Date().toISOString(),
          };
          setUserAndToken(profile, result.token);
          showToast('Device approved. Welcome!', 'success');
          const redir = result.user.role === 'seller' ? '/seller' : result.user.role === 'admin' ? '/admin' : '/';
          navigate(redir);
          return;
        }
        if (result.rejected) {
          showToast(result.message || 'Login was denied.', 'error');
          setStep('loading');
          setDeviceApprovalRequestId('');
          navigate('/login');
          return;
        }
      } catch (_) {}
    };
    const interval = setInterval(poll, 3000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, deviceApprovalRequestId, setUserAndToken, showToast, navigate]);

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
      if ('requiresDeviceApproval' in data && data.requiresDeviceApproval) {
        setDeviceApprovalRequestId(data.requestId);
        setDeviceApprovalEmail(data.email);
        setStep('device-approval');
        setSubmitting(false);
        return;
      }
      const success = data as { user: any; token: string };
      const profile = {
        id: success.user.id?.toString() || success.user._id?.toString() || '',
        email: success.user.email,
        full_name: success.user.fullName,
        role: success.user.role,
        seller_status: success.user.sellerVerificationStatus,
        seller_verified: success.user.isSellerVerified,
        phone: success.user.phone,
        avatar_url: success.user.avatarUrl,
        created_at: success.user.createdAt || new Date().toISOString(),
        updated_at: success.user.updatedAt || new Date().toISOString(),
      };
      setUserAndToken(profile, success.token);
      showToast('Signed in with Google successfully!', 'success');
      if (success.user.role === 'seller') navigate('/seller');
      else if (success.user.role === 'admin') navigate('/admin');
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
      if ('requiresDeviceApproval' in data && data.requiresDeviceApproval) {
        setDeviceApprovalRequestId(data.requestId);
        setDeviceApprovalEmail(data.email);
        setStep('device-approval');
        setSubmitting(false);
        return;
      }
      const success = data as { user: any; token: string };
      const profile = {
        id: success.user.id?.toString() || success.user._id?.toString() || '',
        email: success.user.email,
        full_name: success.user.fullName,
        role: success.user.role,
        seller_status: success.user.sellerVerificationStatus,
        seller_verified: success.user.isSellerVerified,
        phone: success.user.phone,
        avatar_url: success.user.avatarUrl,
        created_at: success.user.createdAt || new Date().toISOString(),
        updated_at: success.user.updatedAt || new Date().toISOString(),
      };
      setUserAndToken(profile, success.token);
      showToast('2FA enabled. Signed in with Google!', 'success');
      if (success.user.role === 'seller') navigate('/seller');
      else if (success.user.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Device approval (wait for approval from other device or email)
  if (step === 'device-approval') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Shield className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">Approve this device</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
            Your account is already signed in on another device. Approve this login to continue.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Mail className="w-4 h-4" />
            <span>Check <strong>{deviceApprovalEmail}</strong> for a verification link</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center mb-4">
            Or approve from your other device. We&apos;ll check every few seconds.
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
          <button
            type="button"
            onClick={() => { setStep('loading'); setDeviceApprovalRequestId(''); navigate('/login'); }}
            className="w-full mt-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
          >
            Cancel and sign in again
          </button>
        </div>
      </div>
    );
  }

  // 2FA step (authenticator code)
  if (step === '2fa') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Two-factor authentication</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You signed in with Google. Enter the 6-digit code from your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy).
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {twoFARole === 'admin' ? 'Admin accounts require 2FA.' : 'Seller accounts require 2FA for security.'} The QR code uses <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">otpauth://</code> (TOTP) and works only in an <strong>authenticator app</strong>, not in a normal browser or camera.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
            Use <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong>. Search your app store for “authenticator app” or “TOTP” if you don’t have one.
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
              <p className="text-xs text-gray-600 dark:text-gray-400">Scan with your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy), then enter the 6-digit code.</p>
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
  