import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Product } from '../models/Product';
import { User } from '../models/User';
import mongoose from 'mongoose';

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

function toId(doc: { _id: mongoose.Types.ObjectId }): string {
  return doc._id.toString();
}

/** Map Product document to admin list shape (id, name, sku, image, category, sellerName, stock, price, status, visibility, dateAdded, sales, rating, hasDiscount, etc.) */
function toListShape(p: any): Record<string, unknown> {
  const id = toId(p);
  const statusMap: Record<string, string> = {
    in_stock: 'active',
    low_stock: 'active',
    out_of_stock: 'out_of_stock',
  };
  const status = statusMap[p.status] || 'active';
  const discount = p.discount ?? 0;
  const price = p.price ?? 0;
  const discountPrice = discount > 0 ? Math.round(price * (1 - discount / 100) * 100) / 100 : undefined;
  return {
    id,
    _id: id,
    name: p.name,
    sku: p.sku,
    image: Array.isArray(p.images) && p.images[0] ? p.images[0] : '',
    category: p.category || '',
    brand: '', // Product model has no brand
    sellerId: p.sellerId ? toId(p.sellerId) : null,
    sellerName: p.sellerName || '',
    stock: p.stock ?? 0,
    price,
    discountPrice,
    discountPercent: discount,
    status,
    visibility: 'published', // Product has no draft; all are published
    dateAdded: p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
    sales: 0, // Not stored on Product; could aggregate from Order later
    rating: 0, // Not stored on Product; could aggregate from ProductReview later
    hasDiscount: discount > 0,
    description: p.description,
    views: p.views ?? 0,
    discount: p.discount,
    images: p.images,
    variants: p.variants,
    tiers: p.tiers,
  };
}

/** GET /api/admin/products/dashboard */
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const [total, outOfStock, inStock, lowStock] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: 'out_of_stock' }),
      Product.countDocuments({ status: 'in_stock' }),
      Product.countDocuments({ status: 'low_stock' }),
    ]);
    const published = total; // no draft in schema
    const draft = 0;
    res.json({
      totalProducts: total,
      outOfStock,
      published,
      draft,
      inStock,
      lowStock,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch dashboard' });
  }
}

/** GET /api/admin/products/facets - distinct categories and sellers for filters */
export async function getProductFacets(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const [categories, sellers] = await Promise.all([
      Product.distinct('category', {}).then((c) => (c || []).filter(Boolean).sort()),
      Product.aggregate([
        { $match: { sellerId: { $exists: true, $ne: null } } },
        { $lookup: { from: 'users', localField: 'sellerId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $group: { _id: '$sellerId', name: { $first: { $ifNull: ['$user.fullName', '$user.email'] } } } },
        { $project: { id: { $toString: '$_id' }, name: 1, _id: 0 } },
      ]),
    ]);
    res.json({ categories, sellers });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch facets' });
  }
}

/** GET /api/admin/products - list with filters, pagination, sort */
export async function getProducts(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const category = (req.query.category as string)?.trim() || '';
    const status = (req.query.status as string)?.trim() || '';
    const visibility = (req.query.visibility as string)?.trim() || '';
    const sellerId = (req.query.sellerId as string)?.trim() || '';
    const minPrice = req.query.minPrice != null ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice != null ? Number(req.query.maxPrice) : null;
    const minStock = req.query.minStock != null ? Number(req.query.minStock) : null;
    const maxStock = req.query.maxStock != null ? Number(req.query.maxStock) : null;
    const hasDiscount = req.query.hasDiscount as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const sortBy = (req.query.sortBy as string) || 'date_desc';
    const skip = (page - 1) * limit;

    const query: any = {};
    if (category && category !== 'all') query.category = category;
    if (sellerId) query.sellerId = new mongoose.Types.ObjectId(sellerId);
    if (status && status !== 'all') {
      if (status === 'active') query.status = { $in: ['in_stock', 'low_stock'] };
      else if (status === 'out_of_stock') query.status = 'out_of_stock';
      else if (status === 'inactive') query.status = 'out_of_stock'; // treat inactive as out_of_stock
      else query.status = status;
    }
    if (minPrice != null && !isNaN(minPrice)) {
      query.price = query.price || {};
      (query.price as any).$gte = minPrice;
    }
    if (maxPrice != null && !isNaN(maxPrice)) {
      query.price = query.price || {};
      (query.price as any).$lte = maxPrice;
    }
    if (minStock != null && !isNaN(minStock)) {
      query.stock = query.stock || {};
      (query.stock as any).$gte = minStock;
    }
    if (maxStock != null && !isNaN(maxStock)) {
      query.stock = query.stock || {};
      (query.stock as any).$lte = maxStock;
    }
    if (hasDiscount === 'has') query.discount = { $gt: 0 };
    if (hasDiscount === 'none') query.$or = [{ discount: { $exists: false } }, { discount: 0 }];
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { sku: regex },
        { description: regex },
        { category: regex },
        { tags: regex },
      ];
    }

    const sortObj: any = {};
    switch (sortBy) {
      case 'name_asc': sortObj.name = 1; break;
      case 'name_desc': sortObj.name = -1; break;
      case 'price_asc': sortObj.price = 1; break;
      case 'price_desc': sortObj.price = -1; break;
      case 'date_asc': sortObj.createdAt = 1; break;
      case 'date_desc': sortObj.createdAt = -1; break;
      case 'stock_asc': sortObj.stock = 1; break;
      case 'stock_desc': sortObj.stock = -1; break;
      case 'sales_asc': case 'sales_desc': case 'rating_asc': case 'rating_desc':
        sortObj.createdAt = -1;
        break;
      default:
        sortObj.createdAt = -1;
    }

    const [list, total] = await Promise.all([
      Product.find(query)
        .populate('sellerId', 'fullName email')
        .lean()
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    const products = list.map((p: any) => {
      const out = toListShape(p);
      out.sellerName = (p.sellerId as any)?.fullName || (p.sellerId as any)?.email || '';
      return out;
    });

    res.json({
      products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch products' });
  }
}

/** GET /api/admin/products/:productId */
export async function getProduct(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const p = await Product.findById(req.params.productId).populate('sellerId', 'fullName email').lean();
    if (!p) return res.status(404).json({ message: 'Product not found' });
    const out = toListShape(p);
    (out as any).sellerName = (p as any).sellerId?.fullName || (p as any).sellerId?.email || '';
    (out as any).description = (p as any).description;
    (out as any).seoTitle = (p as any).seoTitle;
    (out as any).seoDescription = (p as any).seoDescription;
    res.json({ product: out });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch product' });
  }
}

/** GET /api/admin/products/:productId/metadata - isolated promo/shipping/policy fields */
export async function getProductMetadata(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const productId = String(req.params.productId || '');
    const p = await Product.findById(productId)
      .select(
        [
          'name',
          'sku',
          'couponCode',
          'campaignLabel',
          'offerEndsAt',
          'shippingInfo',
          'returnPolicy',
          'securityNote',
          'paymentSafetyNote',
          'serviceCommitments',
          'detailSections',
          'sizeGuide',
        ].join(' ')
      )
      .lean();
    if (!p) return res.status(404).json({ message: 'Product not found' });
    res.json({
      productId,
      product: {
        id: productId,
        _id: productId,
        name: (p as any).name || '',
        sku: (p as any).sku || '',
        couponCode: (p as any).couponCode || '',
        campaignLabel: (p as any).campaignLabel || '',
        offerEndsAt: (p as any).offerEndsAt || null,
        shippingInfo: (p as any).shippingInfo || {},
        returnPolicy: (p as any).returnPolicy || {},
        securityNote: (p as any).securityNote || '',
        paymentSafetyNote: (p as any).paymentSafetyNote || '',
        serviceCommitments: Array.isArray((p as any).serviceCommitments) ? (p as any).serviceCommitments : [],
        detailSections: Array.isArray((p as any).detailSections) ? (p as any).detailSections : [],
        sizeGuide: (p as any).sizeGuide || {},
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch product metadata' });
  }
}

function cleanText(v: unknown, maxLen: number) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return '';
  return s.slice(0, maxLen);
}

function cleanDate(v: unknown) {
  if (v == null || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function cleanRows(v: unknown) {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      const item = (row || {}) as Record<string, unknown>;
      const sizeLabel = cleanText(item.sizeLabel, 24);
      const circumferenceMmRaw = item.circumferenceMm;
      const circumferenceMm =
        circumferenceMmRaw == null || circumferenceMmRaw === ''
          ? undefined
          : Number(circumferenceMmRaw);
      if (!sizeLabel) return null;
      return {
        sizeLabel,
        circumferenceMm: Number.isFinite(circumferenceMm as number) ? circumferenceMm : undefined,
      };
    })
    .filter(Boolean);
}

/** PATCH /api/admin/products/:productId/metadata - isolated promo/shipping/policy fields */
export async function updateProductMetadata(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const productId = String(req.params.productId || '');
    const body = (req.body || {}) as Record<string, unknown>;

    const update: any = {};
    if (body.couponCode !== undefined) update.couponCode = cleanText(body.couponCode, 48);
    if (body.campaignLabel !== undefined) update.campaignLabel = cleanText(body.campaignLabel, 64);
    if (body.offerEndsAt !== undefined) update.offerEndsAt = cleanDate(body.offerEndsAt);

    if (body.shippingInfo !== undefined) {
      const si = (body.shippingInfo || {}) as Record<string, unknown>;
      update.shippingInfo = {
        costLabel: cleanText(si.costLabel, 80),
        estimatedDeliveryLabel: cleanText(si.estimatedDeliveryLabel, 80),
        freeShipping: typeof si.freeShipping === 'boolean' ? si.freeShipping : undefined,
      };
    }

    if (body.returnPolicy !== undefined) {
      const rp = (body.returnPolicy || {}) as Record<string, unknown>;
      update.returnPolicy = {
        label: cleanText(rp.label, 80),
        details: cleanText(rp.details, 400),
      };
    }

    if (body.securityNote !== undefined) update.securityNote = cleanText(body.securityNote, 240);
    if (body.paymentSafetyNote !== undefined) update.paymentSafetyNote = cleanText(body.paymentSafetyNote, 240);
    if (body.serviceCommitments !== undefined) {
      const commitments = Array.isArray(body.serviceCommitments) ? body.serviceCommitments : [];
      update.serviceCommitments = commitments
        .map((entry) => {
          const c = (entry || {}) as Record<string, unknown>;
          const title = cleanText(c.title, 60);
          if (!title) return null;
          return {
            title,
            description: cleanText(c.description, 180),
            icon: cleanText(c.icon, 24),
          };
        })
        .filter(Boolean);
    }
    if (body.detailSections !== undefined) {
      const sections = Array.isArray(body.detailSections) ? body.detailSections : [];
      update.detailSections = sections
        .map((entry) => {
          const d = (entry || {}) as Record<string, unknown>;
          const title = cleanText(d.title, 60);
          if (!title) return null;
          return {
            title,
            content: cleanText(d.content, 1200),
          };
        })
        .filter(Boolean);
    }
    if (body.sizeGuide !== undefined) {
      const sg = (body.sizeGuide || {}) as Record<string, unknown>;
      update.sizeGuide = {
        chartImageUrl: cleanText(sg.chartImageUrl, 500),
        circumferenceNote: cleanText(sg.circumferenceNote, 240),
        rows: cleanRows(sg.rows),
      };
    }

    // Only allow updating the isolated keys above.
    const allowedKeys = [
      'couponCode',
      'campaignLabel',
      'offerEndsAt',
      'shippingInfo',
      'returnPolicy',
      'securityNote',
      'paymentSafetyNote',
      'serviceCommitments',
      'detailSections',
      'sizeGuide',
    ];
    const payloadKeys = Object.keys(body || {});
    const hasUnexpected = payloadKeys.some((k) => !allowedKeys.includes(k));
    if (hasUnexpected) {
      return res.status(400).json({ message: 'Only marketing/shipping/policy metadata fields are allowed on this endpoint' });
    }

    const updated = await Product.findByIdAndUpdate(
      productId,
      { $set: update },
      { new: true, runValidators: true },
    )
      .select(
        [
          'couponCode',
          'campaignLabel',
          'offerEndsAt',
          'shippingInfo',
          'returnPolicy',
          'securityNote',
          'paymentSafetyNote',
          'serviceCommitments',
          'detailSections',
          'sizeGuide',
        ].join(' ')
      )
      .lean();

    if (!updated) return res.status(404).json({ message: 'Product not found' });
    return res.json({
      success: true,
      productId,
      product: {
        couponCode: (updated as any).couponCode || '',
        campaignLabel: (updated as any).campaignLabel || '',
        offerEndsAt: (updated as any).offerEndsAt || null,
        shippingInfo: (updated as any).shippingInfo || {},
        returnPolicy: (updated as any).returnPolicy || {},
        securityNote: (updated as any).securityNote || '',
        paymentSafetyNote: (updated as any).paymentSafetyNote || '',
        serviceCommitments: Array.isArray((updated as any).serviceCommitments) ? (updated as any).serviceCommitments : [],
        detailSections: Array.isArray((updated as any).detailSections) ? (updated as any).detailSections : [],
        sizeGuide: (updated as any).sizeGuide || {},
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update product metadata' });
  }
}

/** POST /api/admin/products */
export async function createProduct(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    let sellerId = body.sellerId as string | undefined;
    if (!sellerId) {
      const first = await User.findOne({ role: 'seller' }).select('_id').lean();
      sellerId = first?._id?.toString();
    }
    if (!sellerId) {
      const anyUser = await User.findOne().select('_id').lean();
      sellerId = anyUser?._id?.toString();
    }
    if (!sellerId) return res.status(400).json({ message: 'No seller available. Pass sellerId or create a seller user.' });

    const doc: any = {
      sellerId: new mongoose.Types.ObjectId(sellerId),
      name: (body.name as string) || 'Untitled Product',
      category: body.category as string,
      description: body.description as string,
      sku: (body.sku as string) || `SKU-${Date.now()}`,
      stock: typeof body.stock === 'number' ? body.stock : parseInt(String(body.stock), 10) || 0,
      price: typeof body.price === 'number' ? body.price : parseFloat(String(body.price)) || 0,
      discount: typeof body.discount === 'number' ? body.discount : parseFloat(String(body.discount || 0)) || 0,
      status: body.status as string || 'in_stock',
      images: body.images || [],
      variants: body.variants || [],
      tiers: body.tiers || [],
      weight: body.weight != null ? body.weight : undefined,
      location: body.location as string,
      seoTitle: body.seoTitle as string,
      seoDescription: body.seoDescription as string,
      seoKeywords: body.seoKeywords as string,
      tags: body.tags || [],
      moq: body.moq != null ? body.moq : undefined,
    };
    if (!['in_stock', 'low_stock', 'out_of_stock'].includes(doc.status)) doc.status = 'in_stock';

    const product = await (Product as any).create(doc as any);
    const p = (product as any).toObject();
    const out = toListShape(p);
    const populated = await Product.findById((product as any)._id).populate('sellerId', 'fullName email').lean();
    (out as any).sellerName = (populated as any)?.sellerId?.fullName || (populated as any)?.sellerId?.email || '';
    res.status(201).json({ product: out });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create product' });
  }
}

/** PATCH /api/admin/products/:productId */
export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const update: any = {};
    const allowed = ['name', 'category', 'description', 'sku', 'stock', 'price', 'discount', 'status', 'images', 'variants', 'tiers', 'weight', 'location', 'seoTitle', 'seoDescription', 'seoKeywords', 'tags', 'moq', 'sellerId'];
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === 'sellerId' && body[key]) (update as any).sellerId = new mongoose.Types.ObjectId(body[key] as string);
      else (update as any)[key] = body[key];
    }
    if (body.status && !['in_stock', 'low_stock', 'out_of_stock'].includes(body.status as string)) {
      if ((body.status as string) === 'active') update.status = 'in_stock';
      else if ((body.status as string) === 'out_of_stock') update.status = 'out_of_stock';
      else if ((body.status as string) === 'inactive') update.status = 'out_of_stock';
    }

    const product = await Product.findByIdAndUpdate(req.params.productId, { $set: update }, { new: true, runValidators: true })
      .populate('sellerId', 'fullName email')
      .lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const out = toListShape(product as any);
    (out as any).sellerName = (product as any).sellerId?.fullName || (product as any).sellerId?.email || '';
    res.json({ product: out });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update product' });
  }
}

/** DELETE /api/admin/products/:productId */
export async function deleteProduct(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const deleted = await Product.findByIdAndDelete(req.params.productId);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete product' });
  }
}

/** POST /api/admin/products/bulk - bulk update or delete */
export async function bulkProducts(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as { productIds: string[]; action: string; payload?: any };
    const { productIds, action, payload } = body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'productIds array required' });
    }
    const ids = productIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
    if (ids.length === 0) return res.status(400).json({ message: 'No valid product IDs' });

    if (action === 'delete') {
      const result = await Product.deleteMany({ _id: { $in: ids } });
      return res.json({ message: `${result.deletedCount} product(s) deleted`, deletedCount: result.deletedCount });
    }

    const update: any = {};
    if (action === 'disable' || action === 'out_of_stock') update.status = 'out_of_stock';
    if (action === 'set_discount' && typeof payload?.discount === 'number') update.discount = payload.discount;
    if (action === 'change_category' && payload?.category != null) update.category = payload.category;
    if (action === 'change_seller' && payload?.sellerId) update.sellerId = new mongoose.Types.ObjectId(payload.sellerId);

    if (Object.keys(update).length === 0) return res.status(400).json({ message: 'No update for action' });
    const result = await Product.updateMany({ _id: { $in: ids } }, { $set: update });
    res.json({ message: `${result.modifiedCount} product(s) updated`, modifiedCount: result.modifiedCount });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to bulk update' });
  }
}

/** GET /api/admin/products/:productId/analytics - views and placeholder metrics */
export async function getProductAnalytics(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const product = await Product.findById(req.params.productId).select('name views createdAt').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({
      productId: req.params.productId,
      productName: (product as any).name,
      views: (product as any).views ?? 0,
      metrics: { totalViews: (product as any).views ?? 0, sales: 0, revenue: 0 },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch analytics' });
  }
}

/** GET /api/admin/products/:productId/logs - placeholder activity log */
export async function getProductLogs(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const product = await Product.findById(req.params.productId).select('name updatedAt').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const logs = [
      { id: '1', action: 'updated', at: (product as any).updatedAt, by: 'System', details: 'Product record updated' },
    ];
    res.json({ productId: req.params.productId, logs });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch logs' });
  }
}
