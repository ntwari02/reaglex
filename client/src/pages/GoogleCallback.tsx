import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { Loader2 } from 'lucide-react';

export function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const success = searchParams.get('success');
      const error = searchParams.get('error');

      if (error) {
        let errorMessage = 'Authentication failed';
        switch (error) {
          case 'access_denied':
            errorMessage = 'Google sign-in was cancelled';
            break;
          case 'no_code':
            errorMessage = 'No authorization code received';
            break;
          case 'oauth_not_configured':
            errorMessage = 'Google OAuth is not configured on the server';
            break;
          case 'no_email':
            errorMessage = 'No email address found in Google account';
            break;
          case 'oauth_failed':
            errorMessage = 'Failed to authenticate with Google';
            break;
          case 'account_deactivated':
            errorMessage = 'Your account has been deactivated. Please contact support for assistance.';
            break;
          default:
            errorMessage = `Authentication error: ${error}`;
        }
        showToast(errorMessage, 'error');
        navigate('/login');
        return;
      }

      if (success === 'true' && token) {
        try {
          // Store token
          localStorage.setItem('auth_token', token);

          // Fetch user profile
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const data = await response.json();
          
          // Debug: Log the user data received from backend
          console.log('[GoogleCallback] User data from /auth/me:', data.user);
          console.log('[GoogleCallback] Avatar URL:', data.user.avatarUrl);
          
          // Map backend user to Profile format
          const userProfile = {
            id: data.user.id?.toString() || data.user._id?.toString() || '',
            email: data.user.email,
            full_name: data.user.fullName,
            role: data.user.role,
            seller_status: data.user.sellerVerificationStatus,
            seller_verified: data.user.isSellerVerified,
            phone: data.user.phone,
            avatar_url: data.user.avatarUrl || data.user.avatar_url || null, // Try both camelCase and snake_case
            created_at: data.user.createdAt || new Date().toISOString(),
            updated_at: data.user.updatedAt || new Date().toISOString(),
          };

          console.log('[GoogleCallback] Mapped user profile:', userProfile);
          console.log('[GoogleCallback] Avatar URL in profile:', userProfile.avatar_url);

          localStorage.setItem('user', JSON.stringify(userProfile));
          setUser(userProfile);

          showToast('Successfully signed in with Google!', 'success');

          // Redirect based on role
          if (userProfile.role === 'seller') {
            navigate('/seller');
          } else if (userProfile.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        } catch (err: any) {
          console.error('Callback error:', err);
          showToast('Failed to complete sign-in', 'error');
          navigate('/login');
        }
      } else {
        showToast('Invalid callback parameters', 'error');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, showToast]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-primary flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Completing sign-in...</p>
      </div>
    </div>
  );
}

