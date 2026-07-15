/**
 * Web Push (PWA) subscription helper.
 *
 * Lifecycle:
 *  1. `registerServiceWorker()` — registers /sw.js on app boot.
 *  2. `isWebPushSupported()` — feature detection.
 *  3. `subscribeWebPush()` — requests permission and subscribes the user.
 *  4. `unsubscribeWebPush()` — opt-out at any time.
 *
 * The browser permission prompt is gated behind a user gesture; never call
 * `subscribeWebPush()` automatically — only from a button/toggle.
 */

import { API_BASE_URL } from './config';

const SW_URL = '/sw.js';
const SUBSCRIBED_KEY = 'spacilly-web-push-subscribed';

export type WebPushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) return null;
  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
      try {
        navigator.serviceWorker.addEventListener('message', (event) => {
          const data = event?.data;
          if (data?.type === 'SPACILLY_NAVIGATE' && typeof data.url === 'string') {
            try {
              const url = new URL(data.url, window.location.origin);
              if (url.origin === window.location.origin) {
                window.history.pushState({}, '', url.pathname + url.search + url.hash);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            } catch {
              /* ignore */
            }
          }
        });
      } catch {
        /* ignore */
      }
      return reg;
    } catch (e) {
      console.warn('[webPush] service worker registration failed', e);
      return null;
    }
  })();

  return registrationPromise;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  return headers;
}

let cachedConfig: WebPushConfig | null = null;
export async function getWebPushConfig(): Promise<WebPushConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch(`${API_BASE_URL}/push/web/config`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return { enabled: false, publicKey: null };
    const data = (await res.json()) as WebPushConfig;
    cachedConfig = {
      enabled: Boolean(data.enabled),
      publicKey: data.publicKey ? String(data.publicKey) : null,
    };
    return cachedConfig;
  } catch {
    return { enabled: false, publicKey: null };
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;
  try {
    const sub = await reg.pushManager.getSubscription();
    return sub || null;
  } catch {
    return null;
  }
}

export async function subscribeWebPush(): Promise<
  | { success: true; subscription: PushSubscription }
  | { success: false; reason: string }
> {
  if (!isWebPushSupported()) return { success: false, reason: 'unsupported' };

  const cfg = await getWebPushConfig();
  if (!cfg.enabled || !cfg.publicKey) {
    return { success: false, reason: 'server_not_configured' };
  }

  const reg = await registerServiceWorker();
  if (!reg) return { success: false, reason: 'no_service_worker' };

  if (Notification.permission === 'denied') {
    return { success: false, reason: 'permission_denied' };
  }
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { success: false, reason: 'permission_denied' };
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      });
    } catch (e: any) {
      return { success: false, reason: String(e?.message || 'subscribe_failed') };
    }
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/push/web/subscribe`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        reason: String((err as any)?.message || `http_${res.status}`),
      };
    }
    try {
      localStorage.setItem(SUBSCRIBED_KEY, '1');
    } catch {
      /* ignore */
    }
    return { success: true, subscription: sub };
  } catch (e: any) {
    return { success: false, reason: String(e?.message || 'network_error') };
  }
}

export async function unsubscribeWebPush(): Promise<boolean> {
  const reg = await registerServiceWorker();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      localStorage.removeItem(SUBSCRIBED_KEY);
    } catch {
      /* ignore */
    }
    return true;
  }
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/push/web/unsubscribe`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(SUBSCRIBED_KEY);
  } catch {
    /* ignore */
  }
  return true;
}

export function hasOptedInLocally(): boolean {
  try {
    return localStorage.getItem(SUBSCRIBED_KEY) === '1';
  } catch {
    return false;
  }
}
