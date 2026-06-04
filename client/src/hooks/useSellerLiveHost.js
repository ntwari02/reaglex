import { useEffect } from 'react';
import {
  registerSellerLiveHost,
  clearSellerLiveHost,
  endSellerLiveHost,
} from '../live/sellerLiveHost';

/**
 * Register seller as live host while on studio page; end when component unmounts.
 */
export function useSellerLiveHost(sessionId, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled || !sessionId) return undefined;

    registerSellerLiveHost(sessionId);

    return () => {
      void endSellerLiveHost('studio_unmount');
      clearSellerLiveHost(sessionId);
    };
  }, [sessionId, enabled]);
}
