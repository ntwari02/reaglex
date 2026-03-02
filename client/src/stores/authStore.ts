import { create } from 'zustand';
import type { Profile } from '../types';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: Profile | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  demoLogin: (email: string, name?: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user, loading: false }),

  signOut: async () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    set({ user: null });
  },

  login: async (email: string, password: string) => {
    try {
      // Import API service dynamically to avoid circular dependencies
      const { authAPI } = await import('../lib/api');
      const data = await authAPI.login(email, password);

      // Map backend user to Profile format (MongoDB uses _id)
      const userProfile: Profile = {
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

      // Store token in localStorage for persistence
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      localStorage.setItem('user', JSON.stringify(userProfile));

      set({ user: userProfile, loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      // If account is deactivated, clear any existing auth data
      if (error.message?.includes('deactivated') || error.message?.includes('403')) {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        set({ user: null });
      }
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  },

  demoLogin: (email: string, name?: string) => {
    // Create a mock user profile for demo purposes
    const demoUser: Profile = {
      id: 'demo-user-' + Date.now(),
      email: email,
      full_name: name || email.split('@')[0],
      avatar_url: undefined,
      role: 'buyer',
      phone: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Save to localStorage for persistence
    localStorage.setItem('demo_user', JSON.stringify(demoUser));
    set({ user: demoUser, loading: false });
  },

  initialize: async () => {
    try {
      // Check for stored user from MongoDB backend
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const token = localStorage.getItem('auth_token');
          
          // Verify token is still valid by calling /me endpoint
          if (token) {
            try {
              const { authAPI } = await import('../lib/api');
              const data = await authAPI.getCurrentUser();
              
              // Map backend user to Profile format (MongoDB uses _id)
              const userProfile: Profile = {
                id: data.user._id?.toString() || data.user.id?.toString() || '',
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
              // Update localStorage with fresh data
              localStorage.setItem('user', JSON.stringify(userProfile));
              set({ user: userProfile, loading: false, initialized: true });
              return;
            } catch (e: any) {
              // Token invalid, auth error, or account deactivated - clear storage
              if (e.message?.includes('401') || e.message?.includes('Authentication') || 
                  e.message?.includes('403') || e.message?.includes('deactivated')) {
                localStorage.removeItem('user');
                localStorage.removeItem('auth_token');
                set({ user: null, loading: false, initialized: true });
              } else {
                // Network error, use stored user
                set({ user, loading: false, initialized: true });
              }
              return;
            }
          } else {
            set({ user, loading: false, initialized: true });
            return;
          }
        } catch (e) {
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
        }
      }

      // Check for demo user (fallback)
      const demoUserStr = localStorage.getItem('demo_user');
      if (demoUserStr) {
        try {
          const demoUser = JSON.parse(demoUserStr);
          set({ user: demoUser, loading: false, initialized: true });
          return;
        } catch (e) {
          localStorage.removeItem('demo_user');
        }
      }

      // No user found, set to null
      set({ user: null, loading: false, initialized: true });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ user: null, loading: false, initialized: true });
    }
  },
}));
