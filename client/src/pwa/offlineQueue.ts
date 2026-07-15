/**
 * Offline action queue.
 *
 * Workflow:
 *  1. Service worker intercepts a non-GET API call while offline and posts
 *     a `SPACILLY_QUEUE_REQUEST` message to active clients.
 *  2. The page persists the request into IndexedDB via `enqueueRequest`.
 *  3. When connection returns (or the SW receives a background sync event)
 *     we replay each queued request in order, dropping ones that succeed
 *     and retrying transient failures with exponential backoff.
 */

import {
  deleteQueued,
  enqueueRequest,
  listQueue,
  updateQueued,
  type QueuedRequest,
} from './idb';

let flushing = false;
let listenerInstalled = false;

const subscribers = new Set<(state: { pending: number; flushing: boolean }) => void>();

async function notify() {
  const pending = (await listQueue()).length;
  for (const fn of subscribers) {
    try {
      fn({ pending, flushing });
    } catch {
      /* ignore */
    }
  }
}

export function subscribeQueue(
  fn: (state: { pending: number; flushing: boolean }) => void,
): () => void {
  subscribers.add(fn);
  void notify();
  return () => subscribers.delete(fn);
}

export async function queueWriteRequest(input: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}): Promise<void> {
  await enqueueRequest(input);
  await notify();
  // Best-effort: hint browser to wake the SW when we come back online.
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-ignore — older types don't include sync
      await reg.sync?.register('spacilly-offline-queue');
    } catch {
      /* ignore */
    }
  }
}

async function replayOne(item: QueuedRequest): Promise<'success' | 'retry' | 'drop'> {
  try {
    const res = await fetch(item.url, {
      method: item.method,
      headers: item.headers,
      body: item.body,
      credentials: 'include',
    });
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) {
      return res.ok ? 'success' : 'drop';
    }
    return 'retry';
  } catch {
    return 'retry';
  }
}

export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  if (flushing) return { flushed: 0, remaining: (await listQueue()).length };
  flushing = true;
  await notify();
  let flushed = 0;
  try {
    const items = await listQueue();
    for (const item of items) {
      if (!navigator.onLine) break;
      const outcome = await replayOne(item);
      if (outcome === 'success' || outcome === 'drop') {
        await deleteQueued(item.id!);
        flushed += 1;
      } else {
        const nextAttempt = (item.attempt || 0) + 1;
        if (nextAttempt > 6) {
          await deleteQueued(item.id!);
        } else {
          await updateQueued(item.id!, {
            attempt: nextAttempt,
            lastError: 'retry',
          });
          // Stop after a transient failure so we don't burn battery.
          break;
        }
      }
    }
    const remaining = (await listQueue()).length;
    return { flushed, remaining };
  } finally {
    flushing = false;
    await notify();
  }
}

/**
 * Installs message listeners (SW → page) and online/offline listeners so
 * the queue automatically flushes whenever it can.
 */
export function installOfflineQueueBridge() {
  if (listenerInstalled || typeof window === 'undefined') return;
  listenerInstalled = true;

  navigator.serviceWorker?.addEventListener?.('message', (event) => {
    const data = (event as MessageEvent).data;
    if (!data) return;
    if (data.type === 'SPACILLY_QUEUE_REQUEST' && data.request) {
      void queueWriteRequest(data.request);
    } else if (data.type === 'SPACILLY_FLUSH_QUEUE') {
      void flushQueue();
    }
  });

  window.addEventListener('online', () => {
    void flushQueue();
  });

  // First-mount flush if we already have queued items.
  setTimeout(() => {
    if (navigator.onLine) void flushQueue();
  }, 1500);
}
