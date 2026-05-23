import { API_BASE_URL } from '../lib/config';
import { liveCommerceApi } from './liveCommerceApi';

/**
 * End a live session (seller host left studio / app / logout).
 */
export async function endSellerLiveSession(sessionId) {
  if (!sessionId) return;
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  try {
    await liveCommerceApi.endStream(sessionId);
  } catch {
    await fetch(`${API_BASE_URL}/live-commerce/session/${sessionId}/stream/end`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * End seller's active live before logout.
 */
export async function endSellerLiveOnLogout() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  let user;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return;
  }
  if (!user || user.role !== 'seller') return;

  let sessionId = null;
  try {
    const status = await liveCommerceApi.getSellerLiveStatus();
    sessionId = status?.activeSession?.id || null;
  } catch {
    return;
  }

  if (!sessionId) return;
  await endSellerLiveSession(sessionId);
}

export function endSellerLiveKeepalive(sessionId) {
  const token = localStorage.getItem('auth_token');
  if (!token || !sessionId) return;
  void fetch(`${API_BASE_URL}/live-commerce/session/${sessionId}/stream/end`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    keepalive: true,
  }).catch(() => {});
}
