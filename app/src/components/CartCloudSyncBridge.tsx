import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useBuyerCart } from '../store/buyerCartStore';
import { cartSyncAPI, mergeCloudCartOnAuth } from '../services/cartSyncApi';

export default function CartCloudSyncBridge() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const items = useBuyerCart((s) => s.items);
  const shippingPreviewLocation = useBuyerCart((s) => s.shippingPreviewLocation);
  const replaceItems = useBuyerCart((s) => s.replaceItems);
  const mergedRef = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runMerge = () => {
    if (!user?.id) return;
    if (mergedRef.current === user.id) return;
    mergedRef.current = user.id;
    mergeCloudCartOnAuth(() => useBuyerCart.getState(), replaceItems).catch(() => {
      mergedRef.current = null;
    });
  };

  useEffect(() => {
    if (!initialized || !user?.id) return;
    runMerge();
  }, [initialized, user?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user?.id) {
        mergedRef.current = null;
        runMerge();
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      mergedRef.current = null;
      return undefined;
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      cartSyncAPI
        .syncCart({ items, mergeMode: 'replace', shippingPreviewLocation })
        .catch(() => null);
    }, 900);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [items, shippingPreviewLocation, user?.id]);

  return null;
}
