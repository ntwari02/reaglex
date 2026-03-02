import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Product } from '../models/Product';

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
        { tags: { $in: [regex] } }
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

    // Fetch products
    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    return res.json({
      products,
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

    // Increment view count
    const result = await Product.updateOne(
      { _id: productId },
      { $inc: { views: 1 } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get updated product to return current view count
    const product = await Product.findById(productId).select('views').lean();
    
    return res.json({ 
      success: true, 
      views: product?.views || 0 
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

    const product = await Product.findById(productId).lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment views when product is fetched
    await Product.updateOne({ _id: productId }, { $inc: { views: 1 } });

    return res.json({ 
      product: {
        ...product,
        views: (product.views || 0) + 1, // Return incremented value
      }
    });
  } catch (error: any) {
    console.error('Get product by ID error:', error);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
}

