import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { ShoppingBag, Briefcase, Loader2 } from 'lucide-react';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import AuthFusionCard from '../components/auth/AuthFusionCard';
import { API_BASE_URL } from '../lib/config';
import { getDashboardPathForRole } from '../lib/authRouting';

export function SelectRole() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const { showToast } = useToastStore();
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleName, setGoogleName] = useState<string>('');
  const [referralProgramEnabled, setReferralProgramEnabled] = useState(true);

  const temp = searchParams.get('temp');
  const referralFromUrl = searchParams.get('ref')?.trim();

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/marketing/referral-status?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { referralProgramEnabled?: boolean }) => {
        if (typeof d.referralProgramEnabled === 'boolean') setReferralProgramEnabled(d.referralProgramEnabled);
      })
      .catch(() => {});
  }, []);

  // Decode temp token to get Google user info
  useEffect(() => {
    if (temp) {
      try {
        // Decode base64 in browser using atob
        const decoded = atob(temp);
        const googleInfo = JSON.parse(decoded);
        setGoogleName(googleInfo.name || googleInfo.email?.split('@')[0] || '');
      } catch (e) {
        console.error('Failed to decode temp token:', e);
      }
    }
  }, [temp]);

  if (!temp) {
    // No temp token - redirect to login
    showToast('Invalid registration link', 'error');
    navigate('/login');
    return null;
  }

  const handleRoleSelection = async (role: 'buyer' | 'seller') => {
    setSelectedRole(role);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          temp,
          role,
          ...(referralProgramEnabled && referralFromUrl ? { referralCode: referralFromUrl } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete registration');
      }

      // Email verification required (Google sign-up or existing unverified user)
      if (data.needsVerification && data.email) {
        showToast('Verification link sent. Check your inbox.', 'success');
        navigate(`/verify-otp?email=${encodeURIComponent(data.email)}&source=google`);
        setLoading(false);
        return;
      }

      // Seller/Admin: 2FA required – redirect to callback page to complete 2FA
      if ((data.requires2FA || data.requires2FASetup) && data.tempToken) {
        const params = new URLSearchParams();
        params.set(data.requires2FA ? 'requires2FA' : 'requires2FASetup', 'true');
        params.set('tempToken', data.tempToken);
        params.set('email', data.email || '');
        params.set('role', data.role || '');
        navigate(`/auth/google/callback?${params.toString()}`);
        setLoading(false);
        return;
      }

      // Store token and user info
      localStorage.setItem('auth_token', data.token);
      
      const userProfile = {
        id: data.user.id?.toString() || data.user._id?.toString() || '',
        email: data.user.email,
        email_verified: data.user.emailVerified ?? true,
        full_name: data.user.fullName,
        role: data.user.role,
        seller_status: data.user.sellerVerificationStatus,
        seller_verified: data.user.isSellerVerified,
        phone: data.user.phone,
        avatar_url: data.user.avatarUrl || data.user.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem('user', JSON.stringify(userProfile));
      setUser(userProfile);

      showToast(
        role === 'seller'
          ? 'Account created! Your seller profile is pending verification.'
          : 'Account created successfully!',
        'success'
      );

      navigate(getDashboardPathForRole(role));
    } catch (err: any) {
      console.error('Role selection error:', err);
      showToast(err.message || 'Failed to complete registration', 'error');
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <AuthPremiumLayout>
      <AuthFusionCard>
        <h2 className="agf-heading text-center">Choose Your Account Type</h2>
        {googleName && (
          <p className="agf-subheading text-center">
            Welcome, <strong style={{ color: 'var(--agf-brand)' }}>{googleName}</strong>!
          </p>
        )}
        <p className="agf-subheading agf-subheading--center">
          {googleName
            ? `Your account will be created with the name "${googleName}" from your Google account.`
            : 'Select how you want to use Spacilly'}
        </p>

        <div className="agf-role-picker">
          <button
            type="button"
            onClick={() => handleRoleSelection('buyer')}
            disabled={loading}
            className={`agf-role-picker__option${selectedRole === 'buyer' ? ' is-selected' : ''}`}
            aria-pressed={selectedRole === 'buyer'}
          >
            <span className="agf-role-picker__icon">
              <ShoppingBag aria-hidden />
            </span>
            <span>
              <span className="agf-role-picker__title">Buyer</span>
              <span className="agf-role-picker__desc block">Shop and purchase products from sellers</span>
              {selectedRole === 'buyer' && loading && (
                <Loader2 className="w-4 h-4 animate-spin mt-2" style={{ color: 'var(--agf-brand)' }} aria-hidden />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelection('seller')}
            disabled={loading}
            className={`agf-role-picker__option${selectedRole === 'seller' ? ' is-selected' : ''}`}
            aria-pressed={selectedRole === 'seller'}
          >
            <span className="agf-role-picker__icon">
              <Briefcase aria-hidden />
            </span>
            <span>
              <span className="agf-role-picker__title">Seller</span>
              <span className="agf-role-picker__desc block">Sell products and manage your store</span>
              {selectedRole === 'seller' && loading && (
                <Loader2 className="w-4 h-4 animate-spin mt-2" style={{ color: 'var(--agf-brand)' }} aria-hidden />
              )}
            </span>
          </button>
        </div>

        <p className="agf-caption text-center mt-4">
          You can change this later in your profile settings.
        </p>
      </AuthFusionCard>
    </AuthPremiumLayout>
  );
}

