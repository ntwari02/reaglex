import { useEffect, useRef } from 'react';
import type { AdminIdentityKyc, MicroblinkRegionInfo } from '@/components/admin/AdminMicroblinkKycPanel';

export type SellerKycUpdatedEventDetail = {
  sellerId: string;
  phase: 'document' | 'face' | 'platform';
  verificationStatus?: string;
  kyc?: Record<string, unknown>;
  productsPublished?: number;
  identityKyc: AdminIdentityKyc | null;
  microblink: MicroblinkRegionInfo;
  updatedAt: string;
};

type ApplyPayload = (detail: SellerKycUpdatedEventDetail) => void;

/**
 * Subscribes to WebSocket-backed seller KYC updates for a single seller (admin views).
 */
export function useAdminSellerKycRealtime(
  sellerId: string | undefined,
  enabled: boolean,
  onUpdate: ApplyPayload,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || !sellerId) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SellerKycUpdatedEventDetail>).detail;
      if (!detail || detail.sellerId !== sellerId) return;
      onUpdateRef.current(detail);
    };

    window.addEventListener('sellerKycUpdated', handler);
    return () => window.removeEventListener('sellerKycUpdated', handler);
  }, [sellerId, enabled]);
}
