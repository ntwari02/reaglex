import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Product } from '../models/Product';
import {
  STOREFRONT_CATEGORIES,
  buildCategorySlugFilter,
  getCategoryBySlug,
} from '../constants/storefrontCategories';

/** Public catalog taxonomy for nav + HTML sitemap */
export async function listCategories(_req: AuthenticatedRequest, res: Response) {
  try {
    return res.json({
      categories: STOREFRONT_CATEGORIES.map((c) => ({
        slug: c.slug,
        name: c.displayName,
        description: c.seoDescription,
      })),
    });
  } catch (err) {
    console.error('listCategories', err);
    return res.status(500).json({ message: 'Failed to list categories' });
  }
}

/** Category landing metadata + product count for SEO pages */
export async function getCategoryPublic(req: AuthenticatedRequest, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const def = getCategoryBySlug(slug);
    const filter: Record<string, unknown> = buildCategorySlugFilter(slug) || { categorySlug: slug };
    const baseFilter = {
      status: { $in: ['in_stock', 'low_stock'] },
      ...filter,
    };
    const productCount = await Product.countDocuments(baseFilter);

    if (!def && productCount === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json({
      category: def
        ? { slug: def.slug, name: def.displayName, description: def.seoDescription, productCount }
        : {
            slug,
            name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: `Browse products in this category on Spacilly.`,
            productCount,
          },
    });
  } catch (err) {
    console.error('getCategoryPublic', err);
    return res.status(500).json({ message: 'Failed to load category' });
  }
}
