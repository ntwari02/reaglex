import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Profile } from '../types';
import { useToastStore } from './toastStore';
import { authAPI } from '../lib/api';
import { setAuthTokenMemory } from '../storage/authMemory';

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
  setUserAndToken: (user: Profile, token: string) => Promise<void>;
  signOut: (reason?: 'SESSION_REPLACED') => Promise<void>;
  initialize: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<
    | { success: true }
    | { success: false; error?: string }
    | { success: false; requires2FA: true; tempToken: string; email: string; role: string }
    | { success: false; requires2FASetup: true; tempToken: string; email: string; role: string }
    | { success: false; code: 'EMAIL_NOT_VERIFIED'; email: string; error?: string }
  >;
  loginWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  demoLogin: (email: string, name?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user, loading: false }),

  setUserAndToken: async (user, token) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setAuthTokenMemory(token);
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
    await Promise.all([
      AsyncStorage.removeItem('demo_user'),
      AsyncStorage.removeItem('user'),
      AsyncStorage.removeItem('auth_token'),
    ]);
    setAuthTokenMemory(null);
    set({ user: null });
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
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(userProfile));
        setAuthTokenMemory(data.token);
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
        await Promise.all([AsyncStorage.removeItem('user'), AsyncStorage.removeItem('auth_token')]);
        setAuthTokenMemory(null);
        set({ user: null });
      }
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  },

  loginWithBiometric: async () => ({
    success: false,
    error: 'Biometric sign-in is not enabled on this device build.',
  }),

  demoLogin: async (email: string, name?: string) => {
    const demoUser: Profile = {
      id: 'demo-user-' + Date.now(),
      email,
      full_name: name || email.split('@')[0],
      avatar_url: undefined,
      role: 'buyer',
      phone: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem('demo_user', JSON.stringify(demoUser));
    set({ user: demoUser, loading: false });
  },

  initialize: async () => {
    const initToken = await AsyncStorage.getItem('auth_token');
    setAuthTokenMemory(initToken);
    const isStale = () =>
      AsyncStorage.getItem('auth_token').then((t) => t !== initToken);

    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const token = await AsyncStorage.getItem('auth_token');

          if (token) {
            setAuthTokenMemory(token);
            try {
              const data = await authAPI.getCurrentUser();
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
              if (await isStale()) {
                set({ loading: false, initialized: true });
                return;
              }
              await AsyncStorage.setItem('user', JSON.stringify(userProfile));
              set({ user: userProfile, loading: false, initialized: true });
              return;
            } catch (e: any) {
              if (await isStale()) {
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
                await useAuthStore
                  .getState()
                  .signOut(e?.code === 'SESSION_REPLACED' ? 'SESSION_REPLACED' : undefined);
                set({ user: null, loading: false, initialized: true });
              } else {
                set({ user, loading: false, initialized: true });
              }
              return;
            }
          } else {
            if (await isStale()) {
              set({ loading: false, initialized: true });
              return;
            }
            set({ user, loading: false, initialized: true });
            return;
          }
        } catch {
          if (await isStale()) {
            set({ loading: false, initialized: true });
            return;
          }
          await Promise.all([AsyncStorage.removeItem('user'), AsyncStorage.removeItem('auth_token')]);
        }
      }

      const demoUserStr = await AsyncStorage.getItem('demo_user');
      if (demoUserStr) {
        try {
          const demoUser = JSON.parse(demoUserStr);
          if (await isStale()) {
            set({ loading: false, initialized: true });
            return;
          }
          set({ user: demoUser, loading: false, initialized: true });
          return;
        } catch {
          await AsyncStorage.removeItem('demo_user');
        }
      }

      if (await isStale()) {
        set({ loading: false, initialized: true });
        return;
      }
      set({ user: null, loading: false, initialized: true });
    } catch (error) {
      if (await isStale()) {
        set({ loading: false, initialized: true });
        return;
      }
      console.error('Error initializing auth:', error);
      set({ user: null, loading: false, initialized: true });
    }
  },
}));
