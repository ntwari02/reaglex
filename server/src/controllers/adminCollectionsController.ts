import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Collection } from '../models/Collection';
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

/** Map DB collection to list/dashboard shape (id, title, type, status, visibility, products, views, createdAt) */
function toListShape(c: any): Record<string, unknown> {
  const id = toId(c);
  const type = c.type === 'smart' ? 'automated' : 'manual';
  const status = c.isDraft ? 'draft' : 'active';
  const placement = c.placement || {};
  let visibility: string = 'hidden';
  if (placement.homepage_featured || placement.homepage_banner || placement.homepage_tabs) visibility = 'homepage';
  else if (c.scheduledPublishAt && new Date(c.scheduledPublishAt) > new Date()) visibility = 'scheduled';
  const products = c.productCount ?? (Array.isArray(c.productIds) ? c.productIds.length : 0);
  return {
    id,
    _id: id,
    title: c.name,
    name: c.name,
    type,
    status,
    visibility,
    products,
    views: 0,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '',
    slug: c.slug,
    description: c.description,
    isActive: c.isActive,
    isDraft: c.isDraft,
    sortOrder: c.sortOrder,
    placement: c.placement,
    scheduledPublishAt: c.scheduledPublishAt ? new Date(c.scheduledPublishAt).toISOString() : null,
    publishedAt: c.publishedAt ? new Date(c.publishedAt).toISOString() : null,
    imageUrl: c.imageUrl,
    coverImageUrl: c.coverImageUrl,
    conditions: c.conditions,
    productIds: c.productIds,
    sellerId: c.sellerId ? toId(c.sellerId) : null,
  };
}

/** GET /api/admin/collections/dashboard */
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const [
      totalCollections,
      activeCollections,
      draftCollections,
      automatedCollections,
      manualCollections,
      homepageCount,
      allCollections,
    ] = await Promise.all([
      Collection.countDocuments({}),
      Collection.countDocuments({ isActive: true, isDraft: { $ne: true } }),
      Collection.countDocuments({ isDraft: true }),
      Collection.countDocuments({ type: 'smart' }),
      Collection.countDocuments({ type: 'manual' }),
      Collection.countDocuments({ 'placement.homepage_featured': true }),
      Collection.find({}).sort({ updatedAt: -1 }).limit(10).lean(),
    ]);

    const mostViewed = allCollections[0]?.name ?? '—';
    const performance = await Collection.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).then((r) => r.map((x: any) => ({ date: x._id, value: x.count })));

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const found = performance.find((p: { date: string }) => p.date === dateStr);
      return { date: dateStr, value: found ? found.value : 0 };
    });

    res.json({
      stats: {
        totalCollections,
        activeCollections,
        draftCollections,
        automatedCollections,
        manualCollections,
        homepageCollections: homepageCount,
        mostViewed,
      },
      performance: last7,
      mostViewedCollections: allCollections.slice(0, 5).map((c: any) => ({
        name: c.name,
        views: 0,
        products: c.productCount ?? (Array.isArray(c.productIds) ? c.productIds.length : 0),
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch dashboard' });
  }
}

/** GET /api/admin/collections/permissions - list permission templates for collections (admin has full access) */
export async function getPermissions(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const permissions = [
      { id: '1', name: 'Create collections', description: 'Create new product collections', roles: { admin: true, manager: true, editor: true } },
      { id: '2', name: 'Edit collections', description: 'Edit existing collections', roles: { admin: true, manager: true, editor: true } },
      { id: '3', name: 'Delete collections', description: 'Delete collections', roles: { admin: true, manager: false, editor: false } },
      { id: '4', name: 'Manage placement', description: 'Feature collections on homepage', roles: { admin: true, manager: true, editor: false } },
    ];
    res.json({ permissions });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch permissions' });
  }
}

/** GET /api/admin/collections - list with filters */
export async function getCollections(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const status = (req.query.status as string)?.trim() || '';
    const type = (req.query.type as string)?.trim() || '';
    const visibility = (req.query.visibility as string)?.trim() || '';
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) query.name = new RegExp(search, 'i');
    if (status === 'active') query.isActive = true;
    if (status === 'draft') query.isDraft = true;
    if (type === 'manual') query.type = 'manual';
    if (type === 'automated') query.type = 'smart';
    if (visibility === 'homepage') query['placement.homepage_featured'] = true;
    if (visibility === 'scheduled') query.scheduledPublishAt = { $gt: new Date() };

    const [list, total] = await Promise.all([
      Collection.find(query).lean().sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Collection.countDocuments(query),
    ]);

    const collections = list.map((c: any) => toListShape(c));
    res.json({
      collections,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch collections' });
  }
}

/** GET /api/admin/collections/:collectionId */
export async function getCollection(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const c = await Collection.findById(req.params.collectionId).lean();
    if (!c) return res.status(404).json({ message: 'Collection not found' });
    const out = toListShape(c);
    (out as any).sortOrder = (c as any).sortOrder;
    res.json({ collection: { ...out, ...(c as any) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch collection' });
  }
}

/** POST /api/admin/collections */
export async function createCollection(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    let sellerId = body.sellerId as string | undefined;
    if (!sellerId) {
      const firstUser = await User.findOne({ role: 'seller' }).select('_id').lean();
      sellerId = firstUser?._id?.toString();
    }
    if (!sellerId) {
      const anyUser = await User.findOne().select('_id').lean();
      sellerId = anyUser?._id?.toString();
    }
    if (!sellerId) return res.status(400).json({ message: 'No seller available. Create a user first or pass sellerId.' });

    const type = (body.type as string) === 'automated' ? 'smart' : 'manual';
    const doc: any = {
      sellerId: new mongoose.Types.ObjectId(sellerId),
      name: (body.name as string) || (body.title as string) || 'Untitled Collection',
      description: body.description as string,
      type,
      isActive: body.status !== 'draft',
      isDraft: body.status === 'draft',
      sortOrder: (body.sortOrder as string) || 'manual',
      productIds: body.productIds || [],
      conditions: body.conditions || [],
      placement: body.placement || {},
      placementPriority: body.placementPriority ?? 0,
      scheduledPublishAt: body.scheduledPublishAt ? new Date(body.scheduledPublishAt as string) : undefined,
      imageUrl: body.imageUrl as string,
      coverImageUrl: body.coverImageUrl as string,
      seoTitle: body.seoTitle as string,
      seoDescription: body.seoDescription as string,
    };
    if (Array.isArray(doc.conditions) && doc.conditions.length) {
      doc.conditions = doc.conditions.map((cond: any) => ({
        type: cond.type || 'product',
        field: cond.field,
        operator: cond.operator,
        value: cond.value,
        min: cond.min,
        max: cond.max,
      }));
    }
    doc.productCount = Array.isArray(doc.productIds) ? doc.productIds.length : 0;
    const collection = await (Collection as any).create(doc as any);
    const c = (collection as any).toObject();
    res.status(201).json({ collection: toListShape(c) });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create collection' });
  }
}

/** PATCH /api/admin/collections/:collectionId */
export async function updateCollection(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const update: any = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.title !== undefined) update.name = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.type !== undefined) update.type = body.type === 'automated' ? 'smart' : body.type;
    if (body.status !== undefined) {
      update.isDraft = body.status === 'draft';
      update.isActive = body.status !== 'draft';
    }
    if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;
    if (body.sort_order !== undefined) update.sortOrder = body.sort_order;
    if (body.placement !== undefined) update.placement = body.placement;
    if (body.placementPriority !== undefined) update.placementPriority = body.placementPriority;
    if (body.scheduledPublishAt !== undefined) update.scheduledPublishAt = body.scheduledPublishAt ? new Date(body.scheduledPublishAt as string) : null;
    if (body.publishedAt !== undefined) update.publishedAt = body.publishedAt ? new Date(body.publishedAt as string) : null;
    if (body.imageUrl !== undefined) update.imageUrl = body.imageUrl;
    if (body.coverImageUrl !== undefined) update.coverImageUrl = body.coverImageUrl;
    if (body.productIds !== undefined) {
      update.productIds = body.productIds;
      update.productCount = Array.isArray(body.productIds) ? body.productIds.length : 0;
    }
    if (body.conditions !== undefined) update.conditions = body.conditions;
    if (body.seoTitle !== undefined) update.seoTitle = body.seoTitle;
    if (body.seoDescription !== undefined) update.seoDescription = body.seoDescription;

    const collection = await Collection.findByIdAndUpdate(req.params.collectionId, { $set: update }, { new: true, runValidators: true }).lean();
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.json({ collection: toListShape(collection as any) });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update collection' });
  }
}

/** DELETE /api/admin/collections/:collectionId */
export async function deleteCollection(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const deleted = await Collection.findByIdAndDelete(req.params.collectionId);
    if (!deleted) return res.status(404).json({ message: 'Collection not found' });
    res.json({ message: 'Collection deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete collection' });
  }
}

/** GET /api/admin/collections/:collectionId/analytics - placeholder metrics */
export async function getCollectionAnalytics(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const collection = await Collection.findById(req.params.collectionId).lean();
    if (!collection) return res.status(404).json({ message: 'Collection not found' });

    const getDateString = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };
    const performance = [
      { date: getDateString(6), value: 0 },
      { date: getDateString(5), value: 0 },
      { date: getDateString(4), value: 0 },
      { date: getDateString(3), value: 0 },
      { date: getDateString(2), value: 0 },
      { date: getDateString(1), value: 0 },
      { date: getDateString(0), value: 0 },
    ];

    res.json({
      collectionId: req.params.collectionId,
      collectionName: (collection as any).name,
      metrics: { totalViews: 0, clickThroughRate: 0, salesGenerated: 0 },
      performance,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch analytics' });
  }
}
