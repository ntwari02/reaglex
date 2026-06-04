import { create } from 'zustand';
import type { Profile } from '../types';
import { useToastStore } from './toastStore';
import { authAPI } from '../lib/api';
import { endSellerLiveOnLogout } from '../services/liveSessionCleanup';
import { clearAuthSession } from '../lib/clearAuthSession';
import { isValidRole } from '../lib/authRouting';

let lastSessionReplacedToastAt = 0;

function mapBackendUserToProfile(data: any): Profile {
  return {
    id: data.id?.toString() || data._id?.toString() || '',
    email: data.email,
    email_verified: data.emailVerified ?? true,
    full_name: data.fullName,
    role: data.role,
    adminAccess: data.adminAccess,
    seller_status: data.sellerVerificationStatus,
    seller_verified: data.isSellerVerified,
    kyc_verified: data.kycVerified ?? false,
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

  setUser: (user) => set({ user, loading: false, initialized: true }),

  setUserAndToken: (user, token) => {
    if (!isValidRole(user.role)) {
      void clearAuthSession();
      set({ user: null, loading: false, initialized: true });
      return;
    }
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, loading: false, initialized: true });
  },

  signOut: async (reason) => {
    try {
      await endSellerLiveOnLogout();
    } catch {
      /* best-effort */
    }
    if (reason === 'SESSION_REPLACED') {
      const now = Date.now();
      if (now - lastSessionReplacedToastAt > 3000) {
        useToastStore
          .getState()
          .showToast('Your session was replaced by another device. Please sign in again.', 'warning', 5000);
        lastSessionReplacedToastAt = now;
      }
    }
    await clearAuthSession();
    set({ user: null, loading: false, initialized: true });
  },

  login: async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);

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
        if (!isValidRole(userProfile.role)) {
          await clearAuthSession();
          return { success: false, error: 'Invalid account role. Please contact support.' };
        }
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(userProfile));
        set({ user: userProfile, loading: false, initialized: true });
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
        await clearAuthSession();
        set({ user: null, loading: false, initialized: true });
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
        const userProfile = mapBackendUserToProfile(result.user);
        if (!isValidRole(userProfile.role)) {
          await clearAuthSession();
          return { success: false, error: 'Invalid account role.' };
        }
        localStorage.setItem('user', JSON.stringify(userProfile));
        set({ user: userProfile, loading: false, initialized: true });
      }
      return { success: true };
    } catch (error: any) {
      console.error('Biometric login error:', error);
      return { success: false, error: error.message || 'Biometric sign-in failed.' };
    }
  },

  demoLogin: (email: string, name?: string) => {
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

    localStorage.setItem('demo_user', JSON.stringify(demoUser));
    set({ user: demoUser, loading: false, initialized: true });
  },

  initialize: async () => {
    const initToken = localStorage.getItem('auth_token');
    const isStale = () => localStorage.getItem('auth_token') !== initToken;

    set({ loading: true });

    try {
      const token = initToken;
      if (token) {
        try {
          const data = await authAPI.getCurrentUser();
          if (isStale()) {
            set({ loading: false, initialized: true });
            return;
          }

          const userProfile = mapBackendUserToProfile(data.user);
          if (!isValidRole(userProfile.role)) {
            await clearAuthSession();
            set({ user: null, loading: false, initialized: true });
            return;
          }

          localStorage.setItem('user', JSON.stringify(userProfile));
          set({ user: userProfile, loading: false, initialized: true });
          return;
        } catch (e: any) {
          if (isStale()) {
            set({ loading: false, initialized: true });
            return;
          }
          const isAuthFailure =
            e?.status === 401 ||
            e?.status === 403 ||
            e?.code === 'SESSION_REPLACED' ||
            e.message?.includes('401') ||
            e.message?.includes('Authentication') ||
            e.message?.includes('403') ||
            e.message?.includes('deactivated') ||
            e.message?.includes('session was replaced');

          if (isAuthFailure) {
            await useAuthStore
              .getState()
              .signOut(e?.code === 'SESSION_REPLACED' ? 'SESSION_REPLACED' : undefined);
            return;
          }

          // Never trust stale localStorage role on network/server errors.
          await clearAuthSession();
          set({ user: null, loading: false, initialized: true });
          return;
        }
      }

      const demoUserStr = localStorage.getItem('demo_user');
      if (demoUserStr) {
        try {
          const demoUser = JSON.parse(demoUserStr) as Profile;
          if (isStale()) {
            set({ loading: false, initialized: true });
            return;
          }
          set({ user: demoUser, loading: false, initialized: true });
          return;
        } catch {
          localStorage.removeItem('demo_user');
        }
      }

      if (isStale()) {
        set({ loading: false, initialized: true });
        return;
      }
      set({ user: null, loading: false, initialized: true });
    } catch (error) {
      if (isStale()) {
        set({ loading: false, initialized: true });
        return;
      }
      console.error('Error initializing auth:', error);
      await clearAuthSession();
      set({ user: null, loading: false, initialized: true });
    }
  },
}));
