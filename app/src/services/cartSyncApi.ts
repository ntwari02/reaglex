import { API_BASE_URL } from '../lib/config';
import { getAuthTokenSync } from '../storage/authMemory';
import { getCartDeviceId, getCartPlatform } from '../lib/cartDevice';
import type { CartLine } from '../store/buyerCartStore';

async function authHeaders() {
  const token = getAuthTokenSync();
  const deviceId = await getCartDeviceId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Id': deviceId,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Cart sync failed');
  return data as T;
}

export const cartSyncAPI = {
  async syncCart(params: {
    items: CartLine[];
    mergeMode?: 'merge' | 'replace';
    shippingPreviewLocation?: { country: string; city: string; state?: string; zip?: string };
  }) {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/buyer/cart/sync`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        items: params.items.map((i) => ({
          id: i.id,
          productId: i.id,
          quantity: i.quantity,
          title: i.title,
          price: i.price,
          image: i.image,
          seller: i.seller,
        })),
        mergeMode: params.mergeMode ?? 'merge',
        deviceId: await getCartDeviceId(),
        platform: getCartPlatform(),
        shippingPreviewLocation: params.shippingPreviewLocation,
      }),
    });
    return handleResponse<{
      items: CartLine[];
      shippingPreviewLocation?: { country: string; city: string; state?: string; zip?: string };
    }>(res);
  },
};

export async function mergeCloudCartOnAuth(
  getLocal: () => { items: CartLine[]; shippingPreviewLocation: { country: string; city: string; state: string; zip: string } },
  replaceItems: (items: CartLine[], loc?: { country: string; city: string; state?: string; zip?: string }) => void,
) {
  if (!getAuthTokenSync()) return;
  const local = getLocal();
  const res = await cartSyncAPI.syncCart({
    items: local.items,
    mergeMode: 'merge',
    shippingPreviewLocation: local.shippingPreviewLocation,
  });
  if (Array.isArray(res.items)) replaceItems(res.items, res.shippingPreviewLocation);
}
