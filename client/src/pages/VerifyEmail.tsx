import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { setUserAndToken } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        navigate('/auth?tab=login&verifyEmail=0', { replace: true });
        return;
      }
      try {
        const result = await authAPI.verifyEmailLink(token, emailFromUrl || undefined);
        if (cancelled) return;
        if (result.token && result.user) {
          const userProfile = {
            id: result.user.id?.toString() || result.user._id?.toString() || '',
            email: result.user.email,
            full_name: result.user.fullName,
            role: result.user.role,
            seller_status: result.user.sellerVerificationStatus,
            seller_verified: result.user.isSellerVerified,
            phone: result.user.phone,
            avatar_url: result.user.avatarUrl,
            email_verified: result.user.emailVerified ?? true,
            created_at: result.user.createdAt || new Date().toISOString(),
            updated_at: result.user.updatedAt || new Date().toISOString(),
          };
          setUserAndToken(userProfile as any, result.token);
          showToast('Email verified successfully.', 'success');
          if (result.user.role === 'seller') navigate('/seller', { replace: true });
          else if (result.user.role === 'admin') navigate('/admin', { replace: true });
          else navigate('/account', { replace: true });
          return;
        }
        showToast(result.message || 'Email verified. Please sign in.', 'success');
        navigate('/auth?tab=login&verifyEmail=1', { replace: true });
      } catch (e: any) {
        if (cancelled) return;
        const params = new URLSearchParams();
        if (emailFromUrl) params.set('email', emailFromUrl);
        navigate(`/verify-otp?${params.toString()}`, { replace: true });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [emailFromUrl, navigate, setUserAndToken, showToast, token]);

  return null;
}
