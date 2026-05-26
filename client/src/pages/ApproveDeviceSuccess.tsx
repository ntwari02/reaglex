import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

import { API_BASE_URL } from '../lib/config';
const API_BASE = API_BASE_URL;

export function ApproveDeviceSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/session-bootstrap`, {
          credentials: 'include',
        });
        if (!res.ok || cancelled) {
          if (!cancelled) navigate('/login?error=approval_session', { replace: true });
          return;
        }
        const data = await res.json();
        const u = data.user;
        const tokenFromBody = typeof data.token === 'string' ? data.token : '';
        if (!tokenFromBody) {
          if (!cancelled) navigate('/login?error=approval_session', { replace: true });
          return;
        }
        const profile = {
          id: u?.id?.toString() || u?._id?.toString() || '',
          email: u?.email,
          full_name: u?.fullName,
          role: u?.role,
          seller_status: u?.sellerVerificationStatus,
          seller_verified: u?.isSellerVerified,
          phone: u?.phone,
          avatar_url: u?.avatarUrl,
          created_at: u?.createdAt || new Date().toISOString(),
          updated_at: u?.updatedAt || new Date().toISOString(),
        };
        const { setUserAndToken } = useAuthStore.getState();
        setUserAndToken(profile, tokenFromBody);
        if (!cancelled) {
          const redir = profile.role === 'seller' ? '/seller' : profile.role === 'admin' ? '/admin' : '/';
          navigate(redir, { replace: true });
        }
      } catch {
        if (!cancelled) navigate('/login?error=approval_session', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-emerald-950/20">
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Completing sign-in…</p>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mt-4" />
      </div>
    </div>
  );
}
