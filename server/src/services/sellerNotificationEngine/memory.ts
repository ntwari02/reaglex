import type { SellerNotificationCopy } from './types';

const lastFingerprint = new Map<string, string>();
const MAX_ENTRIES = 5000;

function fingerprint(copy: Pick<SellerNotificationCopy, 'title' | 'message'>): string {
  return `${copy.title.trim().toLowerCase()}|${copy.message.trim().toLowerCase()}`;
}

export function memoryKey(sellerId: string, event: string, entityId?: string): string {
  return `${sellerId}:${event}:${entityId || '_'}`;
}

export function isDuplicate(key: string, copy: Pick<SellerNotificationCopy, 'title' | 'message'>): boolean {
  const prev = lastFingerprint.get(key);
  if (!prev) return false;
  return prev === fingerprint(copy);
}

export function rememberNotification(key: string, copy: Pick<SellerNotificationCopy, 'title' | 'message'>): void {
  if (lastFingerprint.size >= MAX_ENTRIES) {
    const first = lastFingerprint.keys().next().value;
    if (first) lastFingerprint.delete(first);
  }
  lastFingerprint.set(key, fingerprint(copy));
}
