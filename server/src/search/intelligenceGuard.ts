/** Protects DB and API from abusive or expensive intelligence searches. */

export const INTEL_MAX_QUERY_LENGTH = 100;
export const INTEL_MIN_QUERY_LENGTH = 2;
export const INTEL_MAX_RESULTS = 32;
export const INTEL_MAX_GRAPH_EXPAND = 10;
export const INTEL_MAX_REGISTRY_PER_TYPE = 5;
export const INTEL_SEARCH_TIMEOUT_MS = 7000;
export const INTEL_MAX_GRAPH_SEEDS = 5;

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizeIntelligenceQuery(
  raw: string,
): { ok: true; query: string } | { ok: false; message: string } {
  let q = String(raw || '')
    .replace(CONTROL_CHARS, '')
    .trim();

  if (!q) {
    return { ok: false, message: 'Enter a search term' };
  }
  if (q.length < INTEL_MIN_QUERY_LENGTH) {
    return { ok: false, message: `Type at least ${INTEL_MIN_QUERY_LENGTH} characters` };
  }
  if (q.length > INTEL_MAX_QUERY_LENGTH) {
    q = q.slice(0, INTEL_MAX_QUERY_LENGTH);
  }
  return { ok: true, query: q };
}

export function withSearchTimeout<T>(promise: Promise<T>, ms = INTEL_SEARCH_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Search timed out — try a more specific term')), ms),
    ),
  ]);
}

export function shouldRunGraphExpansion(
  allowGraph: boolean,
  primaryHitCount: number,
): boolean {
  if (!allowGraph) return false;
  if (primaryHitCount === 0) return false;
  if (primaryHitCount >= 14) return false;
  return true;
}
