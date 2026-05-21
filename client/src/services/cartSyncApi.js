import { API_BASE_URL } from '../lib/config';
import { getCartDeviceId, getCartPlatform } from '../lib/cartDevice';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', 'X-Device-Id': getCartDeviceId() };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Cart sync failed');
  return data;
}

export const cartSyncAPI = {
  async getCloudCart() {
    const res = await fetch(`${API_BASE_URL}/buyer/cart`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async syncCart({ items, mergeMode = 'merge', shippingPreviewLocation }) {
    const res = await fetch(`${API_BASE_URL}/buyer/cart/sync`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        items: (items || []).map((i) => ({
          id: i.id,
          productId: i.id,
          quantity: i.quantity,
          title: i.title,
          price: i.price,
          image: i.image,
          seller: i.seller,
        })),
        mergeMode,
        deviceId: getCartDeviceId(),
        platform: getCartPlatform(),
        shippingPreviewLocation,
      }),
    });
    return handleResponse(res);
  },
};

/** Merge local cart with cloud on login / app load (authenticated buyers). */
export async function mergeCloudCartOnAuth(getLocalState, replaceItems) {
  const token = localStorage.getItem('auth_token');
  if (!token) return;
  const { items, shippingPreviewLocation } = getLocalState();
  const res = await cartSyncAPI.syncCart({
    items,
    mergeMode: 'merge',
    shippingPreviewLocation,
  });
  if (Array.isArray(res.items)) {
    replaceItems(res.items, res.shippingPreviewLocation);
  }
}
