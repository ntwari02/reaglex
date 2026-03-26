import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { ShoppingBag, Briefcase, Loader2 } from 'lucide-react';
import AuthPremiumLayout from '../components/AuthPremiumLayout';
import { useTheme } from '../contexts/ThemeContext';

export function SelectRole() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const { showToast } = useToastStore();
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleName, setGoogleName] = useState<string>('');
  const [googleEmail, setGoogleEmail] = useState<string>('');

  const temp = searchParams.get('temp');

  // Decode temp token to get Google user info
  useEffect(() => {
    if (temp) {
      try {
        // Decode base64 in browser using atob
        const decoded = atob(temp);
        const googleInfo = JSON.parse(decoded);
        setGoogleName(googleInfo.name || googleInfo.email?.split('@')[0] || '');
        setGoogleEmail(googleInfo.email || '');
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
      const { API_BASE_URL } = await import('../lib/config');
      const response = await fetch(`${API_BASE_URL}/auth/google/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          temp,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete registration');
      }

      // Email verification required (Google sign-up or existing unverified user)
      if (data.needsVerification && data.email) {
        showToast('Check your email for the 6-digit verification code.', 'success');
        // Backend already sent OTP on this path
        navigate(`/auth?tab=login&verifyEmail=1&sent=1&email=${encodeURIComponent(data.email)}`);
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

      if (role === 'seller') {
        navigate('/seller');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Role selection error:', err);
      showToast(err.message || 'Failed to complete registration', 'error');
      setLoading(false);
      setSelectedRole(null);
    }
  };

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const CARD_SHADOW_LIGHT = '0 25px 50px -12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)';
  const CARD_SHADOW_DARK = '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)';
  const cardShadow = isDark ? CARD_SHADOW_DARK : CARD_SHADOW_LIGHT;
  const cardBg = isDark ? '#111420' : '#ffffff';

  return (
    <AuthPremiumLayout>
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[100%]">
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-auto">
          <div
            className="w-full max-w-[640px] rounded-[24px] p-6 sm:p-8 flex flex-col overflow-hidden"
            style={{ background: cardBg, boxShadow: cardShadow }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Choose Your Account Type
              </h2>
              {googleName && (
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                  Welcome, <span className="font-semibold text-orange-600 dark:text-orange-400">{googleName}</span>!
                </p>
              )}
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                {googleName
                  ? `Your account will be created with the name "${googleName}" from your Google account.`
                  : 'Select how you want to use Reaglex'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Buyer Option */}
            <button
              onClick={() => handleRoleSelection('buyer')}
              disabled={loading}
              className={`relative p-6 rounded-xl border-2 transition-all ${
                selectedRole === 'buyer'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-orange-400 bg-white dark:bg-gray-800'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`p-4 rounded-full mb-4 ${
                  selectedRole === 'buyer'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Buyer
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Shop and purchase products from sellers
                </p>
                {selectedRole === 'buyer' && loading && (
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500 mt-3" />
                )}
              </div>
            </button>

            {/* Seller Option */}
            <button
              onClick={() => handleRoleSelection('seller')}
              disabled={loading}
              className={`relative p-6 rounded-xl border-2 transition-all ${
                selectedRole === 'seller'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-orange-400 bg-white dark:bg-gray-800'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`p-4 rounded-full mb-4 ${
                  selectedRole === 'seller'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Seller
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sell products and manage your store
                </p>
                {selectedRole === 'seller' && loading && (
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500 mt-3" />
                )}
              </div>
            </button>
            </div>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
              You can change this later in your profile settings.
            </p>
          </div>
        </div>
      </div>
    </AuthPremiumLayout>
  );
}

