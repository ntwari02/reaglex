/**
 * In-memory auth token mirror for synchronous headers (matches web localStorage reads in fetch).
 * Persisted copy lives in AsyncStorage; hydrate on boot via `setAuthTokenMemory`.
 */
let authToken: string | null = null;

export function setAuthTokenMemory(token: string | null): void {
  authToken = token;
}

export function getAuthTokenSync(): string | null {
  return authToken;
}
