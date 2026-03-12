const STORAGE_KEY = 'reaglex_device_id';

/** Persistent device id for session security (admin/seller single-device). */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = [
        navigator.userAgent.slice(0, 32),
        Date.now().toString(36),
        Math.random().toString(36).slice(2, 12),
      ].join('_');
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'unknown_' + Date.now();
  }
}
