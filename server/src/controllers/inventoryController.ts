import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { deleteImage } = require('../../config/cloudinary');
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { StockHistory } from '../models/StockHistory';
import {
  evaluateProductTrustForSeller,
  runProductVerification,
} from '../services/productVerification.service';
import type { TrustDraftInput } from '../services/trustVerification.engine';
import { convertListingToUsd, isSupportedDisplayCurrency } from '../services/exchangeRate.service';

function mapVerificationBody(v: unknown): Partial<TrustDraftInput> {
  if (!v || typeof v !== 'object') return {};
  const o = v as Record<string, unknown>;
  return {
    barcode: typeof o.barcode === 'string' ? o.barcode : undefined,
    qrCode: typeof o.qrCode === 'string' ? o.qrCode : undefined,
    serialNumber: typeof o.serialNumber === 'string' ? o.serialNumber : undefined,
    imei: typeof o.imei === 'string' ? o.imei : undefined,
    videoProofUploaded: Boolean(o.videoProofUploaded),
    videoProofUrl: typeof o.videoProofUrl === 'string' ? o.videoProofUrl : undefined,
    videoImageSimilarity: typeof o.videoImageSimilarity === 'number' ? o.videoImageSimilarity : undefined,
    labelProofUploaded: Boolean(o.labelProofUploaded),
    imageSimilarityScore: typeof o.imageSimilarityScore === 'number' ? o.imageSimilarityScore : 0,
    stolenImageSuspected: Boolean(o.stolenImageSuspected),
    scanPassed: Boolean(o.scanPassed),
  };
}

// Helper to get sellerId from JWT payload
function getSellerId(req: AuthenticatedRequest): mongoose.Types.ObjectId | null {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
}

type CanonicalListingOk = {
  ok: true;
  priceUsd: number;
  listingCurrency: string;
  listingPriceAmount: number;
  listingExchangeRate: number;
};
type CanonicalListingErr = { ok: false; message: string };

/**
 * Maps seller listing input (currency + whole amount) to canonical USD `price` for storage.
 */
async function computeCanonicalListingPricing(body: {
  listingCurrency?: unknown;
  listingPriceAmount?: unknown;
  price?: unknown;
}): Promise<CanonicalListingOk | CanonicalListingErr> {
  const listingCurrency = String(body.listingCurrency ?? 'USD')
    .trim()
    .toUpperCase();
  if (!isSupportedDisplayCurrency(listingCurrency)) {
    return { ok: false, message: 'Unsupported listing currency' };
  }
  let listingPriceAmount: number;
  if (body.listingPriceAmount != null && body.listingPriceAmount !== '') {
    listingPriceAmount = Math.round(Number(body.listingPriceAmount));
  } else if (body.price != null && body.price !== '') {
    listingPriceAmount = Math.round(Number(body.price));
  } else {
    return { ok: false, message: 'Valid listing price is required' };
  }
  if (!Number.isFinite(listingPriceAmount) || listingPriceAmount <= 0) {
    return { ok: false, message: 'Valid listing price is required' };
  }
  if (listingCurrency !== 'USD') {
    const conv = await convertListingToUsd(listingPriceAmount, listingCurrency);
    return {
      ok: true,
      priceUsd: conv.usd,
      listingCurrency,
      listingPriceAmount,
      listingExchangeRate: conv.rate,
    };
  }
  const priceUsd = Math.round(listingPriceAmount * 100) / 100;
  return {
    ok: true,
    priceUsd,
    listingCurrency: 'USD',
    listingPriceAmount,
    listingExchangeRate: 1,
  };
}

// ===== Products =====

export async function listProducts(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { search, status } = req.query as { search?: string; status?: string };

    // Query by sellerId - MongoDB should handle ObjectId matching automatically
    const filter: any = { sellerId: sellerId };

    if (status) {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { sku: regex }];
    }

    console.log(`[DEBUG] Querying products for sellerId: ${sellerId} (type: ${sellerId.constructor.name})`);
    console.log(`[DEBUG] Filter:`, JSON.stringify(filter, null, 2));
    
    const products = await Product.find(filter as any).sort({ createdAt: -1 }).lean();
    console.log(`[DEBUG] Found ${products.length} products for seller ${sellerId}`);
    
    // Debug: Check what's actually in the database
    if (products.length === 0) {
      const totalProducts = await Product.countDocuments({});
      console.log(`[DEBUG] Total products in database: ${totalProducts}`);
      if (totalProducts > 0) {
        const sampleProduct = await Product.findOne({}).lean();
        if (sampleProduct) {
          console.log(`[DEBUG] Sample product sellerId: ${sampleProduct.sellerId} (type: ${sampleProduct.sellerId?.constructor?.name || typeof sampleProduct.sellerId})`);
          console.log(`[DEBUG] Your sellerId: ${sellerId} (type: ${sellerId.constructor.name})`);
          console.log(`[DEBUG] Match check: ${sampleProduct.sellerId?.toString() === sellerId.toString()}`);
        }
      }
    }
    
    return res.json({ products });
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const {
      name,
      category,
      description,
      weight,
      sku,
      stock,
      price,
      discount,
      moq,
      status,
      location,
      variants,
      tiers,
      images,
      seoTitle,
      seoDescription,
      seoKeywords,
      warehouseId,
      verification: verificationBody,
    } = req.body;

    const hasListingAmount =
      (req.body as any).listingPriceAmount != null && (req.body as any).listingPriceAmount !== '';
    if (!name || !sku || (price == null && !hasListingAmount)) {
      return res.status(400).json({ message: 'name, sku and price are required' });
    }

    const trustEval = await evaluateProductTrustForSeller(
      String(sellerId),
      {
        name,
        category,
        description,
        images: images || [],
      },
      mapVerificationBody(verificationBody),
      undefined,
    );
    if (!trustEval.submissionAllowed) {
      return res.status(400).json({
        message: 'Product verification failed. Fix the issues below before submitting.',
        verification: trustEval,
      });
    }

    const vDraft = mapVerificationBody(verificationBody);

    const wid =
      warehouseId != null && String(warehouseId).trim()
        ? String(warehouseId).trim().slice(0, 64)
        : 'default';

    const canonical = await computeCanonicalListingPricing(req.body as any);
    if (!canonical.ok) {
      return res.status(400).json({ message: canonical.message });
    }

    const product = await Product.create({
      sellerId,
      name,
      category,
      description,
      weight,
      sku,
      stock: stock ?? 0,
      price: canonical.priceUsd,
      listingCurrency: canonical.listingCurrency,
      listingPriceAmount: canonical.listingPriceAmount,
      listingExchangeRate: canonical.listingExchangeRate,
      discount,
      moq,
      status: status || 'in_stock',
      location,
      variants,
      tiers,
      images,
      seoTitle,
      seoDescription,
      seoKeywords,
      warehouseId: wid,
    });

    // Optional: create initial stock history record if stock > 0
    if (product.stock > 0) {
      await StockHistory.create({
        sellerId,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        change: product.stock,
        reason: 'Initial stock',
        type: 'added',
        date: new Date(),
      });
    }

    await runProductVerification({
      productId: String(product._id),
      sellerId: String(sellerId),
      actorId: req.user?.id,
      identifiers: {
        barcode: vDraft.barcode,
        qrCode: vDraft.qrCode,
        serialNumber: vDraft.serialNumber,
        imei: vDraft.imei,
      },
      aiInput: {
        videoProofUploaded: vDraft.videoProofUploaded,
        videoProofUrl: vDraft.videoProofUrl,
        videoImageSimilarity: vDraft.videoImageSimilarity,
        labelProofUploaded: vDraft.labelProofUploaded,
        imageSimilarityScore: vDraft.imageSimilarityScore,
        stolenImageSuspected: vDraft.stolenImageSuspected,
        scanPassed: vDraft.scanPassed,
      },
    });

    const productOut = await Product.findById(product._id).lean();
    return res.status(201).json({ product: productOut });
  } catch (err: any) {
    console.error('Create product error:', err);
    return res.status(500).json({ message: 'Failed to create product' });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { id } = req.params;

  try {
    const existing = await Product.findOne({ _id: id, sellerId });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const prevStock = existing.stock;

    const updatableFields = [
      'name',
      'category',
      'description',
      'weight',
      'seoTitle',
      'seoDescription',
      'seoKeywords',
      'sku',
      'stock',
      'discount',
      'moq',
      'status',
      'location',
      'variants',
      'tiers',
      'images',
      'warehouseId',
    ] as const;

  for (const field of updatableFields) {
      if (field in req.body) {
        (existing as any)[field] = req.body[field];
      }
    }

    if ('listingCurrency' in req.body || 'listingPriceAmount' in req.body || 'price' in req.body) {
      const merged = {
        listingCurrency:
          'listingCurrency' in req.body
            ? (req.body as any).listingCurrency
            : (existing as any).listingCurrency || 'USD',
        listingPriceAmount:
          'listingPriceAmount' in req.body
            ? (req.body as any).listingPriceAmount
            : (existing as any).listingPriceAmount ?? (req.body as any).price ?? existing.price,
        price: 'price' in req.body ? (req.body as any).price : existing.price,
      };
      const canonical = await computeCanonicalListingPricing(merged);
      if (!canonical.ok) {
        return res.status(400).json({ message: canonical.message });
      }
      (existing as any).price = canonical.priceUsd;
      (existing as any).listingCurrency = canonical.listingCurrency;
      (existing as any).listingPriceAmount = canonical.listingPriceAmount;
      (existing as any).listingExchangeRate = canonical.listingExchangeRate;
    }

    const verificationBody = (req.body as any).verification;
    if (verificationBody !== undefined) {
      const trustEval = await evaluateProductTrustForSeller(
        String(sellerId),
        {
          name: existing.name,
          category: existing.category,
          description: existing.description,
          images: (existing.images || []) as string[],
        },
        mapVerificationBody(verificationBody),
        String(existing._id),
      );
      if (!trustEval.submissionAllowed) {
        return res.status(400).json({
          message: 'Product verification failed. Fix the issues below before submitting.',
          verification: trustEval,
        });
      }
    }

    await existing.save();

    if (verificationBody !== undefined) {
      const v = mapVerificationBody(verificationBody);
      await runProductVerification({
        productId: String(existing._id),
        sellerId: String(sellerId),
        actorId: req.user?.id,
        identifiers: {
          barcode: v.barcode,
          qrCode: v.qrCode,
          serialNumber: v.serialNumber,
          imei: v.imei,
        },
        aiInput: {
          videoProofUploaded: v.videoProofUploaded,
          videoProofUrl: v.videoProofUrl,
          videoImageSimilarity: v.videoImageSimilarity,
          labelProofUploaded: v.labelProofUploaded,
          imageSimilarityScore: v.imageSimilarityScore,
          stolenImageSuspected: v.stolenImageSuspected,
          scanPassed: v.scanPassed,
        },
      });
    }

    // Record stock history if stock changed
    if (typeof req.body.stock === 'number' && req.body.stock !== prevStock) {
      const change = req.body.stock - prevStock;
      await StockHistory.create({
        sellerId,
        productId: existing._id,
        productName: existing.name,
        sku: existing.sku,
        change,
        reason: 'Manual stock adjustment',
        type: change >= 0 ? 'added' : 'removed',
        date: new Date(),
      });
    }

    const out = await Product.findById(existing._id).lean();
    return res.json({ product: out });
  } catch (err: any) {
    console.error('Update product error:', err);
    return res.status(500).json({ message: 'Failed to update product' });
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { id } = req.params;

  try {
    const existing = await Product.findOne({ _id: id, sellerId });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (existing.images?.length) {
      await Promise.all(existing.images.map((url) => deleteImage(url)));
    }

    await existing.deleteOne();

    return res.json({ message: 'Product deleted' });
  } catch (err: any) {
    console.error('Delete product error:', err);
    return res.status(500).json({ message: 'Failed to delete product' });
  }
}

// Simple bulk update for stock; can be expanded as needed
export async function bulkUpdateProducts(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { updates } = req.body as {
    updates: { id: string; stock?: number; price?: number; status?: string }[];
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ message: 'No updates provided' });
  }

  try {
    const results: any[] = [];

    for (const update of updates) {
      const product = await Product.findOne({ _id: update.id, sellerId });
      if (!product) continue;

      const prevStock = product.stock;

      if (typeof update.stock === 'number') {
        product.stock = update.stock;
      }
      if (typeof update.price === 'number') {
        product.price = update.price;
      }
      if (update.status) {
        product.status = update.status as any;
      }

      await product.save();

      if (typeof update.stock === 'number' && update.stock !== prevStock) {
        const change = update.stock - prevStock;
        await StockHistory.create({
          sellerId,
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          change,
          reason: 'Bulk stock update',
          type: change >= 0 ? 'added' : 'removed',
          date: new Date(),
        });
      }

      results.push(product);
    }

    return res.json({ products: results });
  } catch (err: any) {
    console.error('Bulk update products error:', err);
    return res.status(500).json({ message: 'Failed to bulk update products' });
  }
}

// ===== Warehouses =====

export async function listWarehouses(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const warehouses = await Warehouse.find({ sellerId }).sort({ createdAt: -1 });
  return res.json({ warehouses });
}

export async function createWarehouse(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { name, address, capacity, currentStock, isDefault } = req.body;

    if (!name || !address || capacity == null) {
      return res.status(400).json({ message: 'name, address and capacity are required' });
    }

    const warehouse = await Warehouse.create({
      sellerId,
      name,
      address,
      capacity,
      currentStock: currentStock ?? 0,
      isDefault: !!isDefault,
    });

    // If this warehouse is marked as default, unset default on other warehouses for this seller
    if (warehouse.isDefault) {
      await Warehouse.updateMany(
        { sellerId, _id: { $ne: warehouse._id } },
        { $set: { isDefault: false } }
      );
    }

    return res.status(201).json({ warehouse });
  } catch (err: any) {
    console.error('Create warehouse error:', err);
    return res.status(500).json({ message: 'Failed to create warehouse' });
  }
}

export async function updateWarehouse(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { id } = req.params;

  try {
    const warehouse = await Warehouse.findOne({ _id: id, sellerId });
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const updatableFields = ['name', 'address', 'capacity', 'currentStock', 'isDefault'] as const;
    for (const field of updatableFields) {
      if (field in req.body) {
        (warehouse as any)[field] = req.body[field];
      }
    }

    await warehouse.save();

    // If set as default, clear default flag from other warehouses of this seller
    if (warehouse.isDefault) {
      await Warehouse.updateMany(
        { sellerId, _id: { $ne: warehouse._id } },
        { $set: { isDefault: false } }
      );
    }
    return res.json({ warehouse });
  } catch (err: any) {
    console.error('Update warehouse error:', err);
    return res.status(500).json({ message: 'Failed to update warehouse' });
  }
}

export async function deleteWarehouse(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { id } = req.params;

  try {
    const deleted = await Warehouse.findOneAndDelete({ _id: id, sellerId });
    if (!deleted) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    return res.json({ message: 'Warehouse deleted' });
  } catch (err: any) {
    console.error('Delete warehouse error:', err);
    return res.status(500).json({ message: 'Failed to delete warehouse' });
  }
}

// ===== Stock history =====

// Temporary helper endpoint to transfer all products to current seller (for testing)
export async function transferAllProductsToMe(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const result = await Product.updateMany(
      {},
      { $set: { sellerId: sellerId } }
    );
    
    console.log(`[TRANSFER] Transferred ${result.modifiedCount} products to seller ${sellerId}`);
    return res.json({ 
      message: `Transferred ${result.modifiedCount} products to your account`,
      modifiedCount: result.modifiedCount 
    });
  } catch (err: any) {
    console.error('Error transferring products:', err);
    return res.status(500).json({ message: 'Failed to transfer products', error: err.message });
  }
}

export async function listStockHistory(req: AuthenticatedRequest, res: Response) {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { type, from, to } = req.query as {
    type?: string;
    from?: string;
    to?: string;
  };

  const filter: any = { sellerId };

  if (type) {
    filter.type = type;
  }

  if (from || to) {
    filter.date = {};
    if (from) {
      filter.date.$gte = new Date(from);
    }
    if (to) {
      filter.date.$lte = new Date(to);
    }
  }

  const history = await StockHistory.find(filter).sort({ date: -1 });
  return res.json({ history });
}


