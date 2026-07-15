/**
 * Tiny IndexedDB wrapper (no extra deps). Used to:
 *  - persist drafts (offline-first forms)
 *  - queue API mutations made while offline so the SW / page can replay them
 *  - cache lightweight key/value pairs (last seen home feed, etc.)
 */

const DB_NAME = 'spacilly-pwa';
const DB_VERSION = 1;

export type StoreName = 'kv' | 'queue' | 'drafts';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
      if (!db.objectStoreNames.contains('queue')) {
        const s = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T = unknown>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T> | void,
): Promise<T | void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const s = tx.objectStore(store);
    let result: any;
    try {
      const r = fn(s);
      if (r && typeof (r as any).onsuccess !== 'undefined') {
        (r as IDBRequest<T>).onsuccess = () => {
          result = (r as IDBRequest<T>).result;
        };
        (r as IDBRequest<T>).onerror = () => reject((r as IDBRequest<T>).error);
      } else if (r && typeof (r as any).then === 'function') {
        (r as Promise<T>).then((v) => (result = v)).catch(reject);
      }
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  const v = await withStore<T>('kv', 'readonly', (s) => s.get(key));
  return v as T | undefined;
}

export async function idbSet<T = unknown>(key: string, value: T): Promise<void> {
  await withStore('kv', 'readwrite', (s) => s.put(value as any, key));
}

export async function idbDel(key: string): Promise<void> {
  await withStore('kv', 'readwrite', (s) => s.delete(key));
}

export async function draftSet(key: string, value: unknown): Promise<void> {
  await withStore('drafts', 'readwrite', (s) => s.put(value as any, key));
}

export async function draftGet<T = unknown>(key: string): Promise<T | undefined> {
  return (await withStore<T>('drafts', 'readonly', (s) => s.get(key))) as T | undefined;
}

export async function draftDel(key: string): Promise<void> {
  await withStore('drafts', 'readwrite', (s) => s.delete(key));
}

// ----- Offline write queue -----

export type QueuedRequest = {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  createdAt: number;
  attempt: number;
  lastError?: string;
};

export async function enqueueRequest(req: Omit<QueuedRequest, 'createdAt' | 'attempt'>): Promise<void> {
  await withStore('queue', 'readwrite', (s) =>
    s.add({
      ...req,
      createdAt: Date.now(),
      attempt: 0,
    } as QueuedRequest),
  );
}

export async function listQueue(): Promise<QueuedRequest[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const store = tx.objectStore('queue');
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []) as QueuedRequest[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteQueued(id: number): Promise<void> {
  await withStore('queue', 'readwrite', (s) => s.delete(id));
}

export async function updateQueued(id: number, patch: Partial<QueuedRequest>): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as QueuedRequest | undefined;
      if (!existing) {
        resolve();
        return;
      }
      const merged = { ...existing, ...patch, id };
      const putReq = store.put(merged);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
