import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Product } from '../models/Product';
import { recordRecommendationActivity } from '../services/recommendationEmail.service';

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
      search, 
      status = 'in_stock',
      page = '1', 
      limit = '50',
      sort = 'createdAt',
      order = 'desc'
    } = req.query as {
      category?: string;
      search?: string;
      status?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: 'asc' | 'desc';
    };

    // Build filter
    const filter: any = {};
    
    // Only show in_stock products by default (buyers shouldn't see out_of_stock)
    if (status === 'in_stock' || status === 'low_stock') {
      filter.status = { $in: ['in_stock', 'low_stock'] };
    } else if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { name: regex },
        { description: regex },
        { sku: regex },
        // `tags` is an array of strings; matching the regex against any element.
        { tags: regex }
      ];
    }

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
    const product = await Product.findByIdAndUpdate(
      productId,
      { $inc: { views: 1 } },
      { new: true }
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

/**
 * Get product by ID (public endpoint for buyers)
 */
export async function getProductById(req: AuthenticatedRequest, res: Response) {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Fetch + increment views in one round-trip.
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    const product = normalizeProductMedia(updatedProduct);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.user?.id) {
      void recordRecommendationActivity({
        userId: req.user.id,
        eventType: 'product_view',
        productId,
        category: String((product as any)?.category || ''),
        tags: Array.isArray((product as any)?.tags) ? (product as any).tags : [],
      });
    }

    return res.json({
      product: {
        ...product
      }
    });
  } catch (error: any) {
    console.error('Get product by ID error:', error);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
}

