import { create } from 'zustand';
import type { Profile } from '../types';
import { useToastStore } from './toastStore';

let lastSessionReplacedToastAt = 0;

function mapBackendUserToProfile(data: any): Profile {
  return {
    id: data.id?.toString() || data._id?.toString() || '',
    email: data.email,
    email_verified: data.emailVerified ?? true,
    full_name: data.fullName,
    role: data.role,
    seller_status: data.sellerVerificationStatus,
    seller_verified: data.isSellerVerified,
    phone: data.phone,
    avatar_url: data.avatarUrl,
    created_at: data.createdAt || new Date().toISOString(),
    updated_at: data.updatedAt || new Date().toISOString(),
  };
}

interface AuthState {
  user: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: Profile | null) => void;
  /** Set user and token after 2FA verify/setup or direct login */
  setUserAndToken: (user: Profile, token: string) => void;
  signOut: (reason?: 'SESSION_REPLACED') => Promise<void>;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<
    | { success: true }
    | { success: false; error?: string }
    | { success: false; requires2FA: true; tempToken: string; email: string; role: string }
    | { success: false; requires2FASetup: true; tempToken: string; email: string; role: string }
    | { success: false; code: 'EMAIL_NOT_VERIFIED'; email: string; error?: string }
  >;
  loginWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  demoLogin: (email: string, name?: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user, loading: false }),

  setUserAndToken: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    // Ensure route guards consider the user ready immediately.
    set({ user, loading: false, initialized: true });
  },

  signOut: async (reason) => {
    if (reason === 'SESSION_REPLACED') {
      const now = Date.now();
      if (now - lastSessionReplacedToastAt > 3000) {
        useToastStore
          .getState()
          .showToast('Your session was replaced by another device. Please sign in again.', 'warning', 5000);
        lastSessionReplacedToastAt = now;
      }
    }
    localStorage.removeItem('demo_user');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    set({ user: null });
  },

  login: async (email: string, password: string) => {
    try {
      const { authAPI } = await import('../lib/api');
      const data = await authAPI.login(email, password);

      // Seller/Admin with 2FA required: no token yet, caller must handle 2FA step
      if ('requires2FA' in data && data.requires2FA) {
        return {
          success: false,
          requires2FA: true,
          tempToken: data.tempToken,
          email: data.email,
          role: data.role,
        } as any;
      }
      if ('requires2FASetup' in data && data.requires2FASetup) {
        return {
          success: false,
          requires2FASetup: true,
          tempToken: data.tempToken,
          email: data.email,
          role: data.role,
        } as any;
      }

      if ('token' in data && data.token && 'user' in data && data.user) {
        const userProfile = mapBackendUserToProfile(data.user);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(userProfile));
        set({ user: userProfile, loading: false });
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server.' };
    } catch (error: any) {
      console.error('Login error:', error);
      if (error?.code === 'EMAIL_NOT_VERIFIED' && error?.email) {
        return {
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          email: String(error.email),
          error: error.message || 'Please verify your email before signing in.',
        };
      }
      if (error.message?.includes('deactivated')) {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        set({ user: null });
      }
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  },

  loginWithBiometric: async () => {
    try {
      const { loginWithWebAuthn } = await import('../lib/webauthn');
      const result = await loginWithWebAuthn();
      if (!result.success) {
        return { success: false, error: result.error || 'Biometric sign-in failed.' };
      }
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
      }
      if (result.user) {
        const userProfile: Profile = {
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
        localStorage.setItem('user', JSON.stringify(userProfile));
        set({ user: userProfile, loading: false });
      }
      return { success: true };
    } catch (error: any) {
      console.error('Biometric login error:', error);
      return { success: false, error: error.message || 'Biometric sign-in failed.' };
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
      const initToken = localStorage.getItem('auth_token');
      const isStale = () => localStorage.getItem('auth_token') !== initToken;

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
                email_verified: data.user.emailVerified ?? true,
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
              // If another flow updated the token while we were fetching, don't overwrite.
              if (isStale()) {
                set({ loading: false, initialized: true });
                return;
              }
              localStorage.setItem('user', JSON.stringify(userProfile));
              set({ user: userProfile, loading: false, initialized: true });
              return;
            } catch (e: any) {
              // Token invalid, auth error, or account deactivated - clear storage
              if (isStale()) {
                set({ loading: false, initialized: true });
                return;
              }
              if (
                e?.status === 401 ||
                e?.status === 403 ||
                e?.code === 'SESSION_REPLACED' ||
                e.message?.includes('401') ||
                e.message?.includes('Authentication') ||
                e.message?.includes('403') ||
                e.message?.includes('deactivated') ||
                e.message?.includes('session was replaced')
              ) {
                await useAuthStore.getState().signOut(e?.code === 'SESSION_REPLACED' ? 'SESSION_REPLACED' : undefined);
                set({ user: null, loading: false, initialized: true });
              } else {
                // Network error, use stored user
                set({ user, loading: false, initialized: true });
              }
              return;
            }
          } else {
            if (isStale()) {
              set({ loading: false, initialized: true });
              return;
            }
            set({ user, loading: false, initialized: true });
            return;
          }
        } catch (e) {
          if (isStale()) {
            set({ loading: false, initialized: true });
            return;
          }
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
        }
      }

      // Check for demo user (fallback)
      const demoUserStr = localStorage.getItem('demo_user');
      if (demoUserStr) {
        try {
          const demoUser = JSON.parse(demoUserStr);
          if (isStale()) {
            set({ loading: false, initialized: true });
            return;
          }
          set({ user: demoUser, loading: false, initialized: true });
          return;
        } catch (e) {
          localStorage.removeItem('demo_user');
        }
      }

      // No user found, set to null
      if (isStale()) {
        // Token/user changed since initialize started; don't wipe the verified user.
        set({ loading: false, initialized: true });
        return;
      }
      set({ user: null, loading: false, initialized: true });
    } catch (error) {
      // If token changed while we were initializing, avoid overriding the latest auth state.
      if (isStale()) {
        set({ loading: false, initialized: true });
        return;
      }
      console.error('Error initializing auth:', error);
      set({ user: null, loading: false, initialized: true });
    }
  },
}));
