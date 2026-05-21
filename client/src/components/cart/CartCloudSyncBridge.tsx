import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { cartSyncAPI, mergeCloudCartOnAuth } from '../../services/cartSyncApi';

/**
 * Keeps buyer cart in sync across phone / laptop / desktop when logged in.
 * - On login: merge local cart with cloud (union of line items).
 * - On changes: debounced push to cloud.
 */
export default function CartCloudSyncBridge() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const items = useBuyerCart((s) => s.items);
  const shippingPreviewLocation = useBuyerCart((s) => s.shippingPreviewLocation);
  const replaceItems = useBuyerCart((s) => s.replaceItems);
  const mergedForUserRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!initialized || !user?.id) return;
    if (mergedForUserRef.current === user.id) return;
    mergedForUserRef.current = user.id;

    mergeCloudCartOnAuth(() => useBuyerCart.getState(), replaceItems).catch(() => {
      mergedForUserRef.current = null;
    });
  }, [initialized, user?.id, user?.role, replaceItems]);

  useEffect(() => {
    if (!user?.id) {
      mergedForUserRef.current = null;
      return undefined;
    }
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      cartSyncAPI
        .syncCart({
          items,
          mergeMode: 'replace',
          shippingPreviewLocation,
        })
        .catch(() => null);
    }, 900);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [items, shippingPreviewLocation, user?.id]);

  return null;
}
