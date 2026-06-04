import { endSellerLiveKeepalive, endSellerLiveSession } from '../services/liveSessionCleanup';

let hostingSessionId = null;
let ending = false;

export function registerSellerLiveHost(sessionId) {
  if (!sessionId) return;
  hostingSessionId = String(sessionId);
}

export function getSellerLiveHostId() {
  return hostingSessionId;
}

export function clearSellerLiveHost(sessionId) {
  if (!sessionId || hostingSessionId === String(sessionId)) {
    hostingSessionId = null;
  }
}

/**
 * End live for all buyers — call when seller leaves studio, any route, or closes browser.
 */
export async function endSellerLiveHost(reason = 'seller_left') {
  const sessionId = hostingSessionId;
  if (!sessionId || ending) return false;

  ending = true;
  hostingSessionId = null;

  try {
    await endSellerLiveSession(sessionId);
    window.dispatchEvent(
      new CustomEvent('rx-seller-live-ended', { detail: { sessionId, reason } })
    );
    return true;
  } catch {
    endSellerLiveKeepalive(sessionId);
    return false;
  } finally {
    ending = false;
  }
}

export function endSellerLiveHostSync() {
  const sessionId = hostingSessionId;
  if (!sessionId) return;
  hostingSessionId = null;
  endSellerLiveKeepalive(sessionId);
}
