/**
 * categoryAdjacencyEngine.ts — read-side helpers for the category graph.
 *
 * Provides:
 *   - `expandCategories(seedCats, depth)` → seed + their highest-weight
 *     neighbours, decayed by depth. Used to broaden personalisation
 *     without spamming unrelated categories.
 *   - `getNeighbours(cat)` → top 5 neighbours.
 *   - `bootstrapManual(cat, neighbours)` → admin-curated edges.
 */

import { CategoryAdjacency } from '../../models/CategoryAdjacency';

export interface ExpandedCategory {
  category: string;
  weight: number; // 1.0 for seed, lower for graph-reached
  depth: number;
}

let cache: Map<string, Array<{ category: string; weight: number }>> = new Map();
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

async function loadAdjacencyCache(): Promise<void> {
  if (cache.size > 0 && Date.now() - cachedAt < CACHE_MS) return;
  cache = new Map();
  const docs = await CategoryAdjacency.find({}).select('category neighbours').lean();
  for (const d of docs as any[]) {
    cache.set(d.category, (d.neighbours || []).map((n: any) => ({ category: n.category, weight: Number(n.weight) || 0 })));
  }
  cachedAt = Date.now();
}

export function invalidateAdjacencyCache(): void {
  cache.clear();
  cachedAt = 0;
}

export async function getNeighbours(category: string): Promise<Array<{ category: string; weight: number }>> {
  if (!category) return [];
  await loadAdjacencyCache();
  return cache.get(category.toLowerCase().trim()) || [];
}

/**
 * Breadth-first expansion of seed categories up to `depth` levels deep.
 * The seed always has weight 1.0; first-level neighbours inherit the
 * adjacency weight; deeper levels are halved per hop.
 */
export async function expandCategories(
  seedCats: string[],
  depth = 1,
): Promise<ExpandedCategory[]> {
  if (!seedCats?.length) return [];
  await loadAdjacencyCache();

  const seen = new Map<string, ExpandedCategory>();
  for (const seed of seedCats) {
    const c = String(seed || '').toLowerCase().trim();
    if (!c) continue;
    seen.set(c, { category: c, weight: 1, depth: 0 });
  }

  const queue: Array<{ cat: string; level: number; parentWeight: number }> = Array.from(
    seen.keys(),
  ).map((c) => ({ cat: c, level: 0, parentWeight: 1 }));

  while (queue.length) {
    const { cat, level, parentWeight } = queue.shift()!;
    if (level >= depth) continue;
    const neighbours = cache.get(cat) || [];
    for (const n of neighbours) {
      const next = String(n.category || '').toLowerCase().trim();
      if (!next || seen.has(next)) continue;
      const weight = parentWeight * Math.min(1, n.weight) * 0.5; // halved per hop
      if (weight <= 0.05) continue;
      seen.set(next, { category: next, weight, depth: level + 1 });
      queue.push({ cat: next, level: level + 1, parentWeight: weight });
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.weight - a.weight);
}

/**
 * Admin / setup helper — explicitly set neighbours for a category. Marks
 * them as `manual` so the auto-recompute job will keep them in place.
 */
export async function bootstrapManual(
  category: string,
  neighbours: Array<{ category: string; weight: number }>,
): Promise<void> {
  const c = String(category || '').toLowerCase().trim();
  if (!c) return;
  await CategoryAdjacency.findOneAndUpdate(
    { category: c },
    {
      $set: {
        neighbours: neighbours.map((n) => ({
          category: String(n.category || '').toLowerCase().trim(),
          weight: Math.max(0, Math.min(1, n.weight)),
          source: 'manual' as const,
        })),
        recomputedAt: new Date(),
      },
      $setOnInsert: { category: c },
    },
    { upsert: true },
  );
  invalidateAdjacencyCache();
}
