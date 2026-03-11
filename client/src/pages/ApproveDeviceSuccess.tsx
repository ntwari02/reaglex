import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function ApproveDeviceSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/login?error=missing_token', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok || cancelled) {
          if (!cancelled) navigate('/login', { replace: true });
          return;
        }
        const data = await res.json();
        const u = data.user;
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
        setUserAndToken(profile, token);
        if (!cancelled) {
          const redir = profile.role === 'seller' ? '/seller' : profile.role === 'admin' ? '/admin' : '/';
          navigate(redir, { replace: true });
        }
      } catch {
        if (!cancelled) navigate('/login', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [token, navigate]);

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
