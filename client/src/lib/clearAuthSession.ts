import { queryClient } from './queryClient';

const AUTH_LOCAL_KEYS = [
  'auth_token',
  'user',
  'demo_user',
  'reaglex_auth_remember',
] as const;

const LEGACY_CHAT_KEY = 'reaglex_unified_assistant_chat';
const CHAT_KEY_PREFIX = 'reaglex_assistant_chat_';

/** Remove assistant chat blobs for all users on this device. */
export function clearAssistantChatStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key === LEGACY_CHAT_KEY || key.startsWith(CHAT_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* best-effort */
  }
}

export function getAssistantChatStorageKey(userId: string | null | undefined): string {
  if (userId) return `${CHAT_KEY_PREFIX}${userId}`;
  return `${CHAT_KEY_PREFIX}guest`;
}

function clearAuthSessionStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('reaglex_auth') ||
        key.startsWith('auth_') ||
        key.includes('auth_token')
      ) {
        keys.push(key);
      }
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    /* best-effort */
  }
}

/** Full logout: tokens, profile cache, per-user chats, react-query cache. */
export async function clearAuthSession(options?: { keepRememberMe?: boolean }): Promise<void> {
  clearAssistantChatStorage();
  clearAuthSessionStorage();

  if (typeof window !== 'undefined') {
    AUTH_LOCAL_KEYS.forEach((key) => {
      if (options?.keepRememberMe && key === 'reaglex_auth_remember') return;
      window.localStorage.removeItem(key);
    });
  }

  queryClient.clear();
}
