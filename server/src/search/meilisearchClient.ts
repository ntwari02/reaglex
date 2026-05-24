/**
 * Optional Meilisearch client — works without MEILISEARCH_HOST (MongoDB fallback).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MeiliClient = any;

let cached: MeiliClient | null | undefined;

export function isMeilisearchEnabled(): boolean {
  return Boolean(process.env.MEILISEARCH_HOST?.trim());
}

export function getMeilisearchClient(): MeiliClient | null {
  if (cached !== undefined) return cached;

  const host = process.env.MEILISEARCH_HOST?.trim();
  if (!host) {
    cached = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MeiliSearch } = require('meilisearch');
    cached = new MeiliSearch({
      host,
      apiKey: process.env.MEILISEARCH_API_KEY || undefined,
    });
  } catch (e) {
    console.warn('[intelligence-search] Meilisearch unavailable:', (e as Error).message);
    cached = null;
  }
  return cached;
}

export const INTELLIGENCE_INDEX = 'admin_intelligence';

export async function ensureIntelligenceIndex(): Promise<boolean> {
  const client = getMeilisearchClient();
  if (!client) return false;

  try {
    await client.createIndex(INTELLIGENCE_INDEX, { primaryKey: 'id' }).catch(() => {});
    const index = client.index(INTELLIGENCE_INDEX);
    await index.updateSearchableAttributes([
      'searchText',
      'title',
      'subtitle',
      'entityType',
      'metadata',
    ]);
    await index.updateFilterableAttributes(['entityType', 'status', 'module']);
    await index.updateSortableAttributes(['updatedAt']);
    return true;
  } catch (e) {
    console.warn('[intelligence-search] index setup failed:', (e as Error).message);
    return false;
  }
}
