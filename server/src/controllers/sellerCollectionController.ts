import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Collection, ICollection } from '../models/Collection';
import { Product } from '../models/Product';

// Helper to generate a slug from a name
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Map request body (snake_case) to Collection document fields
function mapBodyToCollectionFields(body: any, collectionType?: 'manual' | 'smart') {
  const mapped: any = {};

  if (body.name !== undefined) mapped.name = body.name;
  if (body.slug !== undefined) mapped.slug = body.slug;
  if (body.description !== undefined) mapped.description = body.description;
  if (body.image_url !== undefined) mapped.imageUrl = body.image_url;
  if (body.cover_image_url !== undefined) mapped.coverImageUrl = body.cover_image_url;
  if (body.type !== undefined) mapped.type = body.type;
  if (body.sort_order !== undefined) mapped.sortOrder = body.sort_order;
  if (body.visibility !== undefined) mapped.visibility = body.visibility;
  if (body.is_active !== undefined) mapped.isActive = body.is_active;
  if (body.is_featured !== undefined) mapped.isFeatured = body.is_featured;
  if (body.is_draft !== undefined) mapped.isDraft = body.is_draft;
  if (body.is_trending !== undefined) mapped.isTrending = body.is_trending;
  if (body.is_seasonal !== undefined) mapped.isSeasonal = body.is_seasonal;
  if (body.is_sale !== undefined) mapped.isSale = body.is_sale;
  if (body.seo_title !== undefined) mapped.seoTitle = body.seo_title;
  if (body.seo_description !== undefined) mapped.seoDescription = body.seo_description;
  if (body.placement !== undefined) mapped.placement = body.placement;
  if (body.placement_priority !== undefined) mapped.placementPriority = body.placement_priority;
  if (body.published_at !== undefined) mapped.publishedAt = body.published_at;
  if (body.scheduled_publish_at !== undefined)
    mapped.scheduledPublishAt = body.scheduled_publish_at;

  // Strict type separation: Manual collections only have productIds, Automated only have conditions
  const type = body.type || collectionType;
  if (type === 'manual') {
    // Manual: only productIds, clear conditions
    if (body.product_ids !== undefined && Array.isArray(body.product_ids)) {
      mapped.productIds = body.product_ids.length > 0
        ? body.product_ids.map((id: string) => new mongoose.Types.ObjectId(id))
        : [];
    } else {
      mapped.productIds = []; // Ensure empty array if not provided
    }
    mapped.conditions = []; // Clear conditions for manual collections
  } else if (type === 'smart') {
    // Automated: only conditions, clear productIds
    if (body.conditions !== undefined && Array.isArray(body.conditions)) {
      mapped.conditions = body.conditions;
    } else {
      mapped.conditions = []; // Ensure empty array if not provided
    }
    mapped.productIds = []; // Clear productIds for automated collections
  }

  return mapped;
}

// Resolve products for automated collections based on rules
async function resolveAutomatedCollectionProducts(
  conditions: any[],
  sellerId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  if (!conditions || conditions.length === 0) {
    return [];
  }

  // Build MongoDB query filter
  const filter: any = {
    sellerId: sellerId,
    status: 'in_stock', // Only include active products
  };

  // Apply each condition (AND logic - all conditions must match)
  conditions.forEach((condition) => {
    switch (condition.type) {
      case 'tag':
        if (condition.operator === 'contains' && condition.value) {
          filter.tags = { $in: [condition.value] };
        } else if (condition.operator === 'equals' && condition.value) {
          filter.tags = condition.value;
        }
        break;

      case 'price':
        if (condition.operator === 'greater_than' && condition.value) {
          filter.price = { ...filter.price, $gt: parseFloat(condition.value) };
        } else if (condition.operator === 'less_than' && condition.value) {
          filter.price = { ...filter.price, $lt: parseFloat(condition.value) };
        } else if (condition.operator === 'between' && condition.min && condition.max) {
          filter.price = {
            ...filter.price,
            $gte: parseFloat(condition.min),
            $lte: parseFloat(condition.max),
          };
        }
        break;

      case 'title':
        if (condition.operator === 'contains' && condition.value) {
          filter.name = { $regex: condition.value, $options: 'i' };
        }
        break;

      case 'stock':
        if (condition.operator === 'in_stock') {
          filter.stock = { $gt: 0 };
        } else if (condition.operator === 'out_of_stock') {
          filter.stock = { $eq: 0 };
        }
        break;

      case 'category':
        if (condition.value) {
          filter.category = condition.value;
        }
        break;
    }
  });

  // Execute query and return product IDs
  const products = await Product.find(filter as any).select('_id').lean();
  return products.map((p) => p._id as mongoose.Types.ObjectId);
}

// Calculate product count for a collection
async function calculateProductCount(
  collection: any,
  sellerId: mongoose.Types.ObjectId
): Promise<number> {
  if (collection.type === 'manual') {
    return collection.productIds?.length || 0;
  } else if (collection.type === 'smart') {
    const productIds = await resolveAutomatedCollectionProducts(
      collection.conditions || [],
      sellerId
    );
    return productIds.length;
  }
  return 0;
}

// GET /api/seller/collections
export async function getSellerCollections(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);

    const collections = await Collection.find({ sellerId: sellerObjectId } as any)
      .sort({ updatedAt: -1 })
      .lean();

    // Calculate product counts for each collection
    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const productCount = await calculateProductCount(collection, sellerObjectId);
        return {
          ...collection,
          productCount,
        };
      })
    );

    return res.json({ collections: collectionsWithCounts });
  } catch (err: any) {
    console.error('Error fetching seller collections:', err);
    return res.status(500).json({ message: 'Failed to fetch collections' });
  }
}

// POST /api/seller/collections
export async function createSellerCollection(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { name, type } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!type || (type !== 'manual' && type !== 'smart')) {
      return res.status(400).json({ message: 'Collection type must be "manual" or "smart"' });
    }

    let slug: string | undefined = req.body.slug;
    if (!slug) {
      slug = generateSlug(name);
    }

    const fields = mapBodyToCollectionFields({ ...req.body, slug }, type);

    // Ensure collections are created as Draft by default
    if (fields.isDraft === undefined) {
      fields.isDraft = true;
    }

    // Initialize empty arrays based on type
    if (type === 'manual') {
      fields.productIds = fields.productIds || [];
      fields.conditions = [];
    } else if (type === 'smart') {
      fields.conditions = fields.conditions || [];
      fields.productIds = [];
    }

    const createdResult = await Collection.create(
      {
        sellerId: sellerObjectId,
        ...fields,
      } as any
    );
    
    // Collection.create() can return an array, so get the first element
    const created = Array.isArray(createdResult) ? createdResult[0] : createdResult;

    // Calculate product count
    const productCount = await calculateProductCount(created, sellerObjectId);
    const createdWithCount = { ...(created as any).toObject(), productCount };

    return res.status(201).json({ collection: createdWithCount });
  } catch (err: any) {
    console.error('Error creating seller collection:', err);
    return res.status(500).json({ message: 'Failed to create collection' });
  }
}

// PATCH /api/seller/collections/:collectionId
export async function updateSellerCollection(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { collectionId } = req.params;

    const collectionObjectId = new mongoose.Types.ObjectId(collectionId);

    // Get existing collection to check type
    const existing = await Collection.findOne({
      _id: collectionObjectId,
      sellerId: sellerObjectId,
    } as any).lean();

    if (!existing) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const collectionType = req.body.type || existing.type;
    const fields = mapBodyToCollectionFields(req.body, collectionType);

    // Validate publishing rules
    if (fields.isDraft === false || (req.body.is_draft === false && existing.isDraft)) {
      // Attempting to publish
      if (collectionType === 'manual') {
        // Manual collections need at least one product
        const productIds = fields.productIds || existing.productIds || [];
        if (productIds.length === 0) {
          return res.status(400).json({
            message: 'Cannot publish manual collection without products. Please add at least one product.',
          });
        }
      } else if (collectionType === 'smart') {
        // Automated collections need at least one rule
        const conditions = fields.conditions || existing.conditions || [];
        if (conditions.length === 0) {
          return res.status(400).json({
            message: 'Cannot publish automated collection without rules. Please add at least one rule.',
          });
        }
      }
    }

    const updated = await Collection.findOneAndUpdate(
      { _id: collectionObjectId, sellerId: sellerObjectId } as any,
      { $set: fields } as any,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Calculate product count
    const productCount = await calculateProductCount(updated, sellerObjectId);
    const updatedWithCount = { ...updated, productCount };

    return res.json({ collection: updatedWithCount });
  } catch (err: any) {
    console.error('Error updating seller collection:', err);
    return res.status(500).json({ message: 'Failed to update collection' });
  }
}

// DELETE /api/seller/collections/:collectionId
export async function deleteSellerCollection(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { collectionId } = req.params;

    const collectionObjectId = new mongoose.Types.ObjectId(collectionId);

    const deleted = await Collection.findOneAndDelete(
      {
        _id: collectionObjectId,
        sellerId: sellerObjectId,
      } as any
    ).lean();

    if (!deleted) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting seller collection:', err);
    return res.status(500).json({ message: 'Failed to delete collection' });
  }
}

// GET /api/seller/collections/:collectionId/products
export async function getCollectionProducts(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { collectionId } = req.params;
    const collectionObjectId = new mongoose.Types.ObjectId(collectionId);

    const collection = await Collection.findOne({
      _id: collectionObjectId,
      sellerId: sellerObjectId,
    } as any).lean();

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    let productIds: mongoose.Types.ObjectId[] = [];

    if (collection.type === 'manual') {
      // Manual: return stored product IDs
      productIds = (collection.productIds || []) as unknown as mongoose.Types.ObjectId[];
    } else if (collection.type === 'smart') {
      // Automated: resolve products dynamically
      productIds = await resolveAutomatedCollectionProducts(
        collection.conditions || [],
        sellerObjectId
      );
    }

    // Fetch product details
    const products = await Product.find({
      _id: { $in: productIds },
      sellerId: sellerObjectId,
    } as any).lean();

    return res.json({ products });
  } catch (err: any) {
    console.error('Error fetching collection products:', err);
    return res.status(500).json({ message: 'Failed to fetch collection products' });
  }
}

// POST /api/seller/collections/:collectionId/products
export async function addProductToCollection(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { collectionId } = req.params;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: 'product_id is required' });
    }

    const collectionObjectId = new mongoose.Types.ObjectId(collectionId);
    const productObjectId = new mongoose.Types.ObjectId(product_id);

    // Verify collection exists and is manual type
    const collection = await Collection.findOne({
      _id: collectionObjectId,
      sellerId: sellerObjectId,
    } as any);

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.type !== 'manual') {
      return res.status(400).json({
        message: 'Cannot add products to automated collections. Use rules instead.',
      });
    }

    // Verify product belongs to seller
    const product = await Product.findOne({
      _id: productObjectId,
      sellerId: sellerObjectId,
    } as any);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Add product if not already in collection
    const productIds = (collection.productIds || []) as unknown as mongoose.Types.ObjectId[];
    if (!productIds.some((id) => id.toString() === productObjectId.toString())) {
      productIds.push(productObjectId as any);
      collection.productIds = productIds as any;
      await collection.save();
    }

    return res.json({ success: true, productCount: productIds.length });
  } catch (err: any) {
    console.error('Error adding product to collection:', err);
    return res.status(500).json({ message: 'Failed to add product to collection' });
  }
}

// DELETE /api/seller/collections/:collectionId/products/:productId
export async function removeProductFromCollection(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { collectionId, productId } = req.params;

    const collectionObjectId = new mongoose.Types.ObjectId(collectionId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    // Verify collection exists and is manual type
    const collection = await Collection.findOne({
      _id: collectionObjectId,
      sellerId: sellerObjectId,
    } as any);

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.type !== 'manual') {
      return res.status(400).json({
        message: 'Cannot remove products from automated collections. Modify rules instead.',
      });
    }

    // Remove product from collection
    const productIds = collection.productIds || [];
    collection.productIds = productIds.filter(
      (id) => id.toString() !== productObjectId.toString()
    );
    await collection.save();

    return res.json({ success: true, productCount: collection.productIds.length });
  } catch (err: any) {
    console.error('Error removing product from collection:', err);
    return res.status(500).json({ message: 'Failed to remove product from collection' });
  }
}

// PATCH /api/seller/collections/:collectionId/products/reorder
export async function reorderCollectionProducts(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { collectionId } = req.params;
    const { product_ids } = req.body;

    if (!product_ids || !Array.isArray(product_ids)) {
      return res.status(400).json({ message: 'product_ids array is required' });
    }

    const collectionObjectId = new mongoose.Types.ObjectId(collectionId);

    // Verify collection exists and is manual type
    const collection = await Collection.findOne({
      _id: collectionObjectId,
      sellerId: sellerObjectId,
    } as any);

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.type !== 'manual') {
      return res.status(400).json({
        message: 'Cannot reorder products in automated collections.',
      });
    }

    // Update product order
    collection.productIds = product_ids.map((id: string) => new mongoose.Types.ObjectId(id)) as any;
    await collection.save();

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error reordering collection products:', err);
    return res.status(500).json({ message: 'Failed to reorder collection products' });
  }
}

// POST /api/seller/collections/preview (for new collections)
export async function previewCollectionRules(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { conditions } = req.body;

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return res.json({ products: [], totalCount: 0 });
    }

    // Resolve products based on provided conditions
    const productIds = await resolveAutomatedCollectionProducts(conditions, sellerObjectId);

    // Fetch product details (limit to 50 for preview)
    const products = await Product.find({
      _id: { $in: productIds.slice(0, 50) },
      sellerId: sellerObjectId,
    } as any).lean();

    return res.json({ products, totalCount: productIds.length });
  } catch (err: any) {
    console.error('Error previewing collection rules:', err);
    return res.status(500).json({ message: 'Failed to preview collection rules' });
  }
}

// POST /api/seller/collections/:collectionId/preview
export async function previewCollectionProducts(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { collectionId } = req.params;
    const { conditions } = req.body; // Optional: preview with different conditions

    const collectionObjectId = new mongoose.Types.ObjectId(collectionId);

    const collection = await Collection.findOne({
      _id: collectionObjectId,
      sellerId: sellerObjectId,
    } as any).lean();

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Use provided conditions or collection's conditions
    const rulesToUse = conditions || collection.conditions || [];

    if (collection.type === 'smart' && rulesToUse.length === 0) {
      return res.json({ products: [] });
    }

    // Resolve products
    const productIds = await resolveAutomatedCollectionProducts(rulesToUse, sellerObjectId);

    // Fetch product details (limit to 50 for preview)
    const products = await Product.find({
      _id: { $in: productIds.slice(0, 50) },
      sellerId: sellerObjectId,
    } as any).lean();

    return res.json({ products, totalCount: productIds.length });
  } catch (err: any) {
    console.error('Error previewing collection products:', err);
    return res.status(500).json({ message: 'Failed to preview collection products' });
  }
}


