import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

export type KycStepId = 'phone' | 'email' | 'document' | 'face' | 'business';

export type SellerVerificationDisplayStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface SellerKycStep {
  id: KycStepId;
  label: string;
  completed: boolean;
  required: boolean;
}

export interface SellerKycStatus {
  kycVerified: boolean;
  verificationStatus: SellerVerificationDisplayStatus;
  platformApproved: boolean;
  identityStep: string;
  steps: SellerKycStep[];
  completedRequired: number;
  totalRequired: number;
  progressPercent: number;
  estimatedMinutes: number;
  productsPendingPublication: number;
  onboarding: {
    showMandatoryModal: boolean;
    completeLaterAllowed: boolean;
    completeLaterAt?: string;
  };
}

export type SellerKycUpdatedEventDetail = {
  sellerId: string;
  phase: 'document' | 'face' | 'platform';
  verificationStatus: SellerVerificationDisplayStatus;
  kyc: SellerKycStatus;
  productsPublished?: number;
  identityKyc?: unknown;
  microblink?: unknown;
  updatedAt: string;
};

const VERIFIED_TOAST =
  'Verification completed successfully. Your products can now be published on Spacilly.';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function mapPlatformStatusToAuth(
  verificationStatus: SellerVerificationDisplayStatus,
): { seller_status?: 'pending' | 'approved' | 'rejected'; seller_verified?: boolean; kyc_verified?: boolean } {
  if (verificationStatus === 'VERIFIED') {
    return { seller_status: 'approved', seller_verified: true, kyc_verified: true };
  }
  if (verificationStatus === 'REJECTED') {
    return { seller_status: 'rejected', seller_verified: false, kyc_verified: false };
  }
  if (verificationStatus === 'UNDER_REVIEW') {
    return { seller_status: 'pending', seller_verified: false, kyc_verified: false };
  }
  return { seller_status: 'pending', seller_verified: false, kyc_verified: false };
}

export function sellerVerificationBadgeLabel(
  verificationStatus?: SellerVerificationDisplayStatus | null,
  fallbackSellerStatus?: string,
): string {
  switch (verificationStatus) {
    case 'VERIFIED':
      return 'Verified Seller';
    case 'UNDER_REVIEW':
      return 'Seller (Under Review)';
    case 'REJECTED':
      return 'Seller (Verification Rejected)';
    case 'PENDING':
      return 'Seller (Verification Required)';
    default:
      if (fallbackSellerStatus === 'approved') return 'Verified Seller';
      if (fallbackSellerStatus === 'rejected') return 'Seller (Verification Rejected)';
      return 'Seller (Pending Verification)';
  }
}

export function useSellerKycStatus(enabled = true, userId?: string) {
  const [status, setStatus] = useState<SellerKycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevVerificationRef = useRef<SellerVerificationDisplayStatus | null>(null);
  const prevKycVerifiedRef = useRef<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/seller/kyc/status`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load verification status');
      setStatus(data as SellerKycStatus);
      const loaded = data as SellerKycStatus;
      if (prevVerificationRef.current === null) {
        prevVerificationRef.current = loaded.verificationStatus;
      }
      if (prevKycVerifiedRef.current === null) {
        prevKycVerifiedRef.current = loaded.kycVerified;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const applyRealtimePayload = useCallback((detail: SellerKycUpdatedEventDetail) => {
    if (!detail.kyc) return;

    const prevStatus = prevVerificationRef.current;
    const prevKycVerified = prevKycVerifiedRef.current;
    const nextStatus = detail.verificationStatus ?? detail.kyc.verificationStatus;
    const nextKycVerified = detail.kyc.kycVerified;
    setStatus(detail.kyc);
    setLoading(false);
    prevVerificationRef.current = nextStatus;
    prevKycVerifiedRef.current = nextKycVerified;

    const authUser = useAuthStore.getState().user;
    if (authUser) {
      useAuthStore.getState().setUser({
        ...authUser,
        ...mapPlatformStatusToAuth(nextStatus),
        kyc_verified: nextKycVerified,
      });
    }

    if (nextKycVerified && !prevKycVerified) {
      useToastStore.getState().showToast(VERIFIED_TOAST, 'success', 8000);
    }

    if ((detail.productsPublished ?? 0) > 0 || (nextKycVerified && !prevKycVerified)) {
      window.dispatchEvent(
        new CustomEvent('sellerProductsPublished', {
          detail: { productsPublished: detail.productsPublished ?? 0 },
        }),
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SellerKycUpdatedEventDetail>).detail;
      if (!detail || detail.sellerId !== userId) return;
      applyRealtimePayload(detail);
    };

    window.addEventListener('sellerKycUpdated', handler);
    return () => window.removeEventListener('sellerKycUpdated', handler);
  }, [enabled, userId, applyRealtimePayload]);

  const startOnboarding = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/seller/kyc/onboarding/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to start verification');
    setStatus(data as SellerKycStatus);
    prevVerificationRef.current = (data as SellerKycStatus).verificationStatus;
    return data as SellerKycStatus;
  }, []);

  const completeLater = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/seller/kyc/onboarding/complete-later`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to save');
    setStatus(data as SellerKycStatus);
    prevVerificationRef.current = (data as SellerKycStatus).verificationStatus;
    return data as SellerKycStatus;
  }, []);

  return {
    status,
    loading,
    error,
    refresh,
    startOnboarding,
    completeLater,
    verificationStatus: status?.verificationStatus ?? 'PENDING',
    showModal: Boolean(status?.onboarding?.showMandatoryModal && !status?.kycVerified),
    showBanner: Boolean(status && !status.kycVerified),
    showCompleteKycCta: Boolean(status && !status.kycVerified),
  };
}
