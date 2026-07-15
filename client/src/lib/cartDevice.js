const DEVICE_KEY = 'spacilly_device_id';

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getCartDeviceId() {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** web | mobile | desktop — for cross-device cart sync metadata */
export function getCartPlatform() {
  if (typeof window === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  if (isMobileUa || (isCoarsePointer && narrow)) return 'mobile';
  if (window.innerWidth >= 1024 && !isMobileUa) return 'desktop';
  return 'web';
}
