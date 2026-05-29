import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Product } from '../models/Product';
import { ProductReview } from '../models/ProductReview';
import { ProductWishlist } from '../models/ProductWishlist';
import { ProductVerification } from '../models/ProductVerification';
import { recordRecommendationActivity } from '../services/recommendationEmail.service';
import { buyerVisibleProductFilter, isProductBuyerVisible } from '../utils/publicProductQuery';
import { ensureProductHasSlug } from '../utils/productSlug';
import { buildCategorySlugFilter } from '../constants/storefrontCategories';

/** Public product listing & detail (buyer-visible + SEO slugs). */

function normalizeMediaUrl(maybeUrl: unknown): unknown {
  if (typeof maybeUrl !== 'string') return maybeUrl;
  const s = maybeUrl.trim();
  if (!s) return s;

  // If the DB stored absolute server URLs (localhost or current API host), convert to relative path.
  // Frontend resolves these using VITE_SERVER_URL.
  const serverUrl = (process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
  const localhostOrigins = ['http://localhost:5000', 'https://localhost:5000', 'http://127.0.0.1:5000', 'https://127.0.0.1:5000'];
  for (const origin of localhostOrigins) {
    if (s.startsWith(origin)) return s.slice(origin.length) || '/';
  }
  if (serverUrl && s.startsWith(serverUrl)) return s.slice(serverUrl.length) || '/';

  return maybeUrl;
}

function normalizeProductMedia(product: any) {
  if (!product) return product;

  if (Array.isArray(product.images)) {
    product.images = product.images.map(normalizeMediaUrl);
  }

  // Some older data may store a single `image` field.
  if (typeof product.image === 'string') {
    product.image = normalizeMediaUrl(product.image);
  }
  if (typeof product.videoUrl === 'string') {
    product.videoUrl = normalizeMediaUrl(product.videoUrl) as string;
  }
  if (Array.isArray(product.variants)) {
    product.variants = product.variants.map((variant: any) => ({
      ...variant,
      thumbnailUrl: normalizeMediaUrl(variant?.thumbnailUrl),
    }));
  }
  if (product?.sizeGuide?.chartImageUrl) {
    product.sizeGuide.chartImageUrl = normalizeMediaUrl(product.sizeGuide.chartImageUrl);
  }

  return product;
}

/**
 * List all products (public endpoint for buyers)
 * Supports filtering by category, search, and pagination
 */
export async function listProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const { 
      category, 
      categorySlug,
      search, 
      status = 'in_stock',
      page = '1', 
      limit = '50',
      sort = 'createdAt',
      order = 'desc'
    } = req.query as {
      category?: string;
      categorySlug?: string;
      search?: string;
      status?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: 'asc' | 'desc';
    };

    const extra: Record<string, unknown> = {};

    if (status && status !== 'in_stock' && status !== 'low_stock') {
      extra.status = status;
    }

    const slugFilter = categorySlug ? buildCategorySlugFilter(String(categorySlug)) : null;
    if (slugFilter) {
      Object.assign(extra, slugFilter);
    } else if (category) {
      extra.category = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      extra.$or = [
        { name: regex },
        { description: regex },
        { sku: regex },
        { tags: regex },
      ];
    }

    const filter = buyerVisibleProductFilter(extra);

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortObj: any = {};
    if (sort === 'price') {
      sortObj.price = order === 'asc' ? 1 : -1;
    } else if (sort === 'views') {
      sortObj.views = order === 'asc' ? 1 : -1;
    } else if (sort === 'createdAt') {
      sortObj.createdAt = order === 'asc' ? 1 : -1;
    } else {
      sortObj.createdAt = -1; // Default: newest first
    }

    // Fetch products + total count in parallel to reduce latency.
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const normalizedProducts = products.map((p) => normalizeProductMedia(p));

    return res.json({
      products: normalizedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('List products error:', error);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
}

/**
 * Track product view (increment view count)
 * This can be called by anyone (buyers viewing products)
 */
export async function trackProductView(req: AuthenticatedRequest, res: Response) {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Increment view count and return the updated view count in one round-trip.
    const existing = await Product.findById(productId).select('views publicationStatus').lean();
    if (!existing || !isProductBuyerVisible(existing)) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { $inc: { views: 1 } },
      { new: true },
    )
      .select('views')
      .lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (req.user?.id) {
      void recordRecommendationActivity({
        userId: req.user.id,
        eventType: 'product_view',
        productId,
      });
    }

    return res.json({
      success: true, 
      views: product.views || 0 
    });
  } catch (error: any) {
    console.error('Track product view error:', error);
    return res.status(500).json({ message: 'Failed to track product view' });
  }
}

async function enrichAndSendProduct(
  req: AuthenticatedRequest,
  res: Response,
  leanProduct: Record<string, unknown> | null,
  productIdForAnalytics: string,
) {
  const product = normalizeProductMedia(leanProduct) as Record<string, unknown> | null;

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const userId = req.user?.id ? new mongoose.Types.ObjectId(String(req.user.id)) : null;
  const pid = new mongoose.Types.ObjectId(String(productIdForAnalytics));

  const [reviewAgg, reviewGalleryAgg, wishlistedDoc, wishlistCountFromDb, verificationDoc] = await Promise.all([
    ProductReview.aggregate([
      { $match: { productId: pid, status: 'approved' } },
      {
        $group: {
          _id: '$productId',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]),
    ProductReview.aggregate([
      { $match: { productId: pid, status: 'approved', images: { $exists: true, $ne: [] } } },
      { $sort: { createdAt: -1 } },
      { $limit: 18 },
      { $project: { _id: 1, rating: 1, customerName: 1, createdAt: 1, images: 1, message: 1 } },
    ]),
    userId ? ProductWishlist.findOne({ userId, productId: pid }).select('_id').lean() : Promise.resolve(null),
    (product as any)?.wishlistCount == null
      ? ProductWishlist.countDocuments({ productId: pid })
      : Promise.resolve(Number((product as any).wishlistCount || 0)),
    ProductVerification.findOne({ productId: pid }).select('aiChecks.videoProofUploaded aiChecks.videoProofUrl').lean(),
  ]);

  const avgRating = Number(reviewAgg?.[0]?.avgRating || 0);
  const reviewCount = Number(reviewAgg?.[0]?.reviewCount || 0);
  const wishlistCount = Number(wishlistCountFromDb || 0);
  const wishlisted = !!wishlistedDoc;

  if (req.user?.id) {
    void recordRecommendationActivity({
      userId: req.user.id,
      eventType: 'product_view',
      productId: productIdForAnalytics,
      category: String((product as any)?.category || ''),
      tags: Array.isArray((product as any)?.tags) ? (product as any).tags : [],
    });
  }

  const verificationVideoUrl =
    typeof verificationDoc?.aiChecks?.videoProofUrl === 'string'
      ? normalizeMediaUrl(verificationDoc.aiChecks.videoProofUrl)
      : undefined;
  const hasDirectVideo =
    typeof (product as any)?.videoUrl === 'string' && String((product as any).videoUrl).trim().length > 0;

  return res.json({
    product: {
      ...product,
      ...(hasDirectVideo ? {} : verificationVideoUrl ? { videoUrl: verificationVideoUrl } : {}),
      verificationVideoUrl,
      verificationVideoUploaded: Boolean(verificationDoc?.aiChecks?.videoProofUploaded),
      ratingAverage: avgRating || (product as any)?.averageRating || (product as any)?.rating || 0,
      reviewCount: reviewCount || (product as any)?.totalReviews || (product as any)?.reviewCount || 0,
      wishlistCount,
      wishlisted,
      soldCount: Number((product as any)?.soldCount || 0),
      reviewGallery: Array.isArray(reviewGalleryAgg)
        ? reviewGalleryAgg.map((r: any) => ({
            id: String(r?._id || ''),
            rating: Number(r?.rating || 0),
            customerName: String(r?.customerName || ''),
            createdAt: r?.createdAt,
            message: String(r?.message || ''),
            images: Array.isArray(r?.images) ? r.images : [],
          }))
        : [],
    },
  });
}

/**
 * Get product by ID (public endpoint for buyers)
 */
export async function getProductById(req: AuthenticatedRequest, res: Response) {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { views: 1 } },
      { new: true },
    ).lean();

    if (!updatedProduct || !isProductBuyerVisible(updatedProduct)) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const slug = await ensureProductHasSlug(updatedProduct as any);
    if (slug) (updatedProduct as any).slug = slug;

    return await enrichAndSendProduct(req, res, updatedProduct as any, productId);
  } catch (error: any) {
    console.error('Get product by ID error:', error);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
}

/**
 * Get product by SEO slug (/product/:slug)
 */
export async function getProductBySlug(req: AuthenticatedRequest, res: Response) {
  try {
    const slug = String(req.params.slug || '')
      .trim()
      .toLowerCase();
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 140) {
      return res.status(400).json({ message: 'Invalid slug' });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } },
      { new: true },
    ).lean();

    if (!updatedProduct && mongoose.Types.ObjectId.isValid(slug)) {
      return await getProductById({ ...req, params: { productId: slug } } as AuthenticatedRequest, res);
    }

    if (!updatedProduct || !isProductBuyerVisible(updatedProduct)) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const idStr = String((updatedProduct as any)._id);
    const ensured = await ensureProductHasSlug(updatedProduct as any);
    if (ensured) (updatedProduct as any).slug = ensured;

    return await enrichAndSendProduct(req, res, updatedProduct as any, idStr);
  } catch (error: any) {
    console.error('Get product by slug error:', error);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
}

/**
 * Toggle wishlist (like/save) for the authenticated user.
 * Returns current wishlisted state and the updated total count.
 */
export async function toggleWishlist(req: AuthenticatedRequest, res: Response) {
  try {
    const { isSystemFeatureEnabled } = await import('../services/systemFeatureSettings.service');
    if (!(await isSystemFeatureEnabled('product_wishlist'))) {
      return res.status(503).json({ message: 'Wishlist is temporarily disabled', code: 'FEATURE_DISABLED' });
    }

    const { productId } = req.params;
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const uid = new mongoose.Types.ObjectId(String(req.user.id));
    const pid = new mongoose.Types.ObjectId(String(productId));

    const existing = await ProductWishlist.findOne({ userId: uid, productId: pid }).select('_id').lean();
    let wishlisted = false;

    if (existing) {
      await ProductWishlist.deleteOne({ _id: existing._id });
      await Product.updateOne({ _id: pid }, { $inc: { wishlistCount: -1 } });
      wishlisted = false;
    } else {
      await ProductWishlist.create({ userId: uid, productId: pid });
      await Product.updateOne({ _id: pid }, { $inc: { wishlistCount: 1 } });
      wishlisted = true;
    }

    const count = await ProductWishlist.countDocuments({ productId: pid });
    // Best-effort reconcile the cached counter.
    await Product.updateOne({ _id: pid }, { $set: { wishlistCount: count } });

    return res.json({ success: true, wishlisted, wishlistCount: count });
  } catch (error: any) {
    // Handle duplicate key race gracefully (user double-taps).
    if (String(error?.code) === '11000') {
      return res.status(409).json({ message: 'Wishlist update conflict. Please retry.' });
    }
    console.error('Toggle wishlist error:', error);
    return res.status(500).json({ message: 'Failed to update wishlist' });
  }
}

/**
 * List authenticated user's wishlist with product details.
 * GET /api/products/wishlist/mine
 */
export async function listUserWishlist(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const { isSystemFeatureEnabled } = await import('../services/systemFeatureSettings.service');
    if (!(await isSystemFeatureEnabled('product_wishlist'))) {
      return res.json({ success: true, items: [] });
    }
    const uid = new mongoose.Types.ObjectId(String(req.user.id));
    const rows = await ProductWishlist.find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const productIds = rows.map((r) => r.productId);
    const products = await Product.find({ _id: { $in: productIds }, ...buyerVisibleProductFilter() })
      .select('name slug price images averageRating totalReviews sellerId category')
      .lean();
    const pmap = new Map(products.map((p) => [String(p._id), p]));

    const items = rows
      .map((row) => {
        const p = pmap.get(String(row.productId));
        if (!p) return null;
        const primaryImg = Array.isArray((p as any).images)
          ? (p as any).images.find((i: { is_primary?: boolean }) => i?.is_primary) || (p as any).images[0]
          : null;
        return {
          id: String(row._id),
          product_id: String(p._id),
          created_at: row.createdAt,
          product: {
            id: String(p._id),
            title: (p as any).name,
            name: (p as any).name,
            slug: (p as any).slug,
            price: (p as any).price,
            image: primaryImg?.url || primaryImg?.secure_url || null,
            images: (p as any).images,
            averageRating: (p as any).averageRating,
            reviewCount: (p as any).totalReviews,
            category: (p as any).category,
          },
        };
      })
      .filter(Boolean);

    return res.json({ success: true, items });
  } catch (error: any) {
    console.error('List wishlist error:', error);
    return res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
}

/**
 * Get wishlist status/count for a product.
 * Guest users receive `{ wishlisted: false }` with the global count.
 */
export async function getWishlistStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    const pid = new mongoose.Types.ObjectId(String(productId));
    const userId = req.user?.id ? new mongoose.Types.ObjectId(String(req.user.id)) : null;

    const [count, existing] = await Promise.all([
      ProductWishlist.countDocuments({ productId: pid }),
      userId ? ProductWishlist.findOne({ userId, productId: pid }).select('_id').lean() : Promise.resolve(null),
    ]);

    return res.json({ success: true, wishlistCount: count, wishlisted: !!existing });
  } catch (error: any) {
    console.error('Get wishlist status error:', error);
    return res.status(500).json({ message: 'Failed to fetch wishlist status' });
  }
}

