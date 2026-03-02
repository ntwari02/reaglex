import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { ShoppingBag, Briefcase, Loader2 } from 'lucide-react';

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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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

      // Store token and user info
      localStorage.setItem('auth_token', data.token);
      
      // Debug: Log the user data received from backend
      console.log('[SelectRole] User data from /auth/google/complete:', data.user);
      console.log('[SelectRole] Avatar URL:', data.user.avatarUrl);
      
      const userProfile = {
        id: data.user.id?.toString() || data.user._id?.toString() || '',
        email: data.user.email,
        full_name: data.user.fullName,
        role: data.user.role,
        seller_status: data.user.sellerVerificationStatus,
        seller_verified: data.user.isSellerVerified,
        phone: data.user.phone,
        avatar_url: data.user.avatarUrl || data.user.avatar_url || null, // Try both camelCase and snake_case
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[SelectRole] Mapped user profile:', userProfile);
      console.log('[SelectRole] Avatar URL in profile:', userProfile.avatar_url);

      localStorage.setItem('user', JSON.stringify(userProfile));
      setUser(userProfile);

      showToast(
        role === 'seller'
          ? 'Account created! Your seller profile is pending verification.'
          : 'Account created successfully!',
        'success'
      );

      // Redirect based on role
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-600 via-teal-600 to-blue-700 dark:from-cyan-900 dark:via-teal-900 dark:to-blue-950 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20 dark:border-gray-700/50">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Choose Your Account Type
            </h2>
            {googleName && (
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                Welcome, <span className="font-semibold text-orange-600 dark:text-orange-400">{googleName}</span>!
              </p>
            )}
            <p className="text-gray-600 dark:text-gray-400">
              {googleName 
                ? `Your account will be created with the name "${googleName}" from your Google account.`
                : 'Select how you want to use Reaglex'
              }
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
            You can change this later in your profile settings
          </p>
        </div>
      </div>
    </div>
  );
}

