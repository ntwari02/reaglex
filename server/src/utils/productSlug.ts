import mongoose from 'mongoose';

/**
 * URL-safe slug for product detail pages (lowercase, hyphenated).
 */
export function slugifyProductSegment(input: string, maxLen = 80): string {
  const s = String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);
  return s || 'item';
}

export function defaultSlugBaseFromNameAndId(name: string, id: string): string {
  const idPart = String(id).replace(/[^a-f0-9]/gi, '').slice(-8) || 'id';
  return slugifyProductSegment(`${name}-${idPart}`);
}

export async function ensureUniqueProductSlug(
  base: string,
  excludeId?: mongoose.Types.ObjectId | string,
): Promise<string> {
  const { Product } = await import('../models/Product');
  let slug = base;
  let n = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) {
      filter._id = {
        $ne: typeof excludeId === 'string' ? new mongoose.Types.ObjectId(excludeId) : excludeId,
      };
    }
    const exists = await Product.findOne(filter).select('_id').lean();
    if (!exists) return slug;
    n += 1;
    slug = `${base}-${n}`;
    if (slug.length > 120) slug = `${slug.slice(0, 110)}-n${n}`;
  }
}

export async function ensureProductHasSlug(product: {
  _id?: string | mongoose.Types.ObjectId;
  name?: string;
  slug?: string;
}): Promise<string | undefined> {
  const { Product } = await import('../models/Product');
  const existing = (product.slug || '').trim().toLowerCase();
  if (existing) return existing;
  const name = String(product?.name || '').trim();
  const id = String(product?._id || '');
  if (!name || !id) return undefined;
  const base = defaultSlugBaseFromNameAndId(name, id);
  const slug = await ensureUniqueProductSlug(base, id);
  const idValue =
    typeof product._id === 'string' ? new mongoose.Types.ObjectId(product._id) : product._id;
  if (!idValue) return undefined;
  await Product.updateOne({ _id: idValue }, { $set: { slug } });
  return slug;
}
