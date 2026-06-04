import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { deleteImage } = require('../../config/cloudinary');
import { Product } from '../models/Product';
import { ProductVerification } from '../models/ProductVerification';
import { assertCanCreateProduct } from '../services/subscriptionEntitlements.service';
import { Warehouse } from '../models/Warehouse';
import { StockHistory } from '../models/StockHistory';
import {
  evaluateProductTrustForSeller,
  runProductVerification,
} from '../services/productVerification.service';
import type { TrustDraftInput } from '../services/trustVerification.engine';
import { convertListingToUsd, isSupportedDisplayCurrency } from '../services/exchangeRate.service';
import {
  isSellerKycVerified,
  resolvePublicationStatusForSeller,
} from '../services/sellerKyc.service';

const CATEGORY_ATTRIBUTES = {
  size_and_color: [
    'clothing', 'fashion', 'apparel', 'shoes', 'footwear',
    'bags', 'accessories', 'sportswear', 'kids fashion',
    'men fashion', 'women fashion', 'kids clothing',
    'traditional wear', 'uniforms', 'swimwear',
    'jerseys', 'jackets', 'shirts', 'dresses', 'trousers',
    'suits', 'hoodies', 'sweaters', 'shorts', 'skirts',
    'coats', 'lingerie', 'underwear', 'socks', 'ties',
  ],
  color_only: [
    'furniture', 'home decor', 'paint', 'car accessories',
    'phone cases', 'covers', 'curtains', 'bedding',
    'wall art', 'rugs', 'cushions', 'stationery',
    'school supplies',
  ],
  size_only: [
    'tires', 'rings', 'belts', 'hats', 'caps',
    'helmets', 'gloves', 'watches',
  ],
} as const;

function categoryNeedsSize(category?: string) {
  if (!category) return false;
  const cat = String(category).toLowerCase().trim();
  const all = [...CATEGORY_ATTRIBUTES.size_and_color, ...CATEGORY_ATTRIBUTES.size_only];
  return all.some((c) => cat.includes(c) || c.includes(cat));
}

function categoryNeedsColor(category?: string) {
  if (!category) return false;
  const cat = String(category).toLowerCase().trim();
  const all = [...CATEGORY_ATTRIBUTES.size_and_color, ...CATEGORY_ATTRIBUTES.color_only];
  return all.some((c) => cat.includes(c) || c.includes(cat));
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => String(v || '').trim())
    .filter(Boolean);
}

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

type VariantPricingCtx = {
  listingCurrency: string;
  listingExchangeRate: number;
};

/** Seller variant rows → canonical Product.variants (optional per-variant USD price). */
function normalizeProductVariants(
  raw: unknown,
  ctx: VariantPricingCtx,
): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const currency = String(ctx.listingCurrency || 'USD').trim().toUpperCase();
  const rate = Number(ctx.listingExchangeRate) > 0 ? Number(ctx.listingExchangeRate) : 1;

  const rows = raw
    .map((v: any, idx: number) => {
      const sku = String(v?.sku || '').trim();
      if (!sku) return null;
      const stock = Math.max(0, Math.round(Number(v?.stock) || 0));

      const toUsd = (listingAmount: number) => {
        const amt = Math.round(listingAmount);
        if (amt <= 0) return undefined;
        if (currency === 'USD') return Math.round(amt * 100) / 100;
        return Math.round((amt / rate) * 100) / 100;
      };

      let priceUsd: number | undefined;
      const storedUsd = Number(v?.priceUsd);
      if (Number.isFinite(storedUsd) && storedUsd > 0) {
        priceUsd = Math.round(storedUsd * 100) / 100;
      } else if (v?.listingPriceAmount != null && v?.listingPriceAmount !== '') {
        priceUsd = toUsd(Number(v.listingPriceAmount));
      } else if (v?.price != null && v?.price !== '') {
        priceUsd = toUsd(Number(v.price));
      }

      let compareAtPriceUsd: number | undefined;
      const storedCompare = Number(v?.compareAtPriceUsd);
      if (Number.isFinite(storedCompare) && storedCompare > 0) {
        compareAtPriceUsd = Math.round(storedCompare * 100) / 100;
      } else if (v?.compareAtListingAmount != null && v?.compareAtListingAmount !== '') {
        compareAtPriceUsd = toUsd(Number(v.compareAtListingAmount));
      }

      return {
        color: v?.color ? String(v.color).trim() : undefined,
        size: v?.size ? String(v.size).trim() : undefined,
        sku,
        stock,
        ...(priceUsd != null ? { priceUsd } : {}),
        ...(compareAtPriceUsd != null ? { compareAtPriceUsd } : {}),
        label: v?.label ? String(v.label).trim() : undefined,
        thumbnailUrl: v?.thumbnailUrl ? String(v.thumbnailUrl).trim() : undefined,
        swatchHex: v?.swatchHex ? String(v.swatchHex).trim() : undefined,
        badge: v?.badge ? String(v.badge).trim() : undefined,
        sortOrder: Number.isFinite(Number(v?.sortOrder)) ? Number(v.sortOrder) : idx,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  return rows.length ? rows : undefined;
}

function deriveColorsFromVariants(variants: Array<Record<string, unknown>> | undefined): string[] {
  if (!Array.isArray(variants)) return [];
  const colors: string[] = [];
  variants.forEach((v) => {
    const c = String(v?.color || '').trim();
    if (c && !colors.includes(c)) colors.push(c);
  });
  return colors;
}

function deriveSizesFromVariants(variants: Array<Record<string, unknown>> | undefined): string[] {
  if (!Array.isArray(variants)) return [];
  const sizes: string[] = [];
  variants.forEach((v) => {
    const s = String(v?.size || '').trim();
    if (s && !sizes.includes(s)) sizes.push(s);
  });
  return sizes;
}

/** Attach product image URLs to variants missing thumbnailUrl (same order as seller upload). */
function attachVariantThumbnailsFromImages(
  variants: Array<Record<string, unknown>> | undefined,
  images: unknown,
): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(variants) || !variants.length) return variants;
  const imgs = Array.isArray(images) ? images.filter(Boolean).map(String) : [];
  if (!imgs.length) return variants;
  return variants.map((v, i) => {
    if (v?.thumbnailUrl) return v;
    return { ...v, thumbnailUrl: imgs[i % imgs.length] };
  });
}

function mergeUniqueStrings(...lists: string[][]): string[] {
  const out: string[] = [];
  lists.forEach((list) => {
    list.forEach((item) => {
      const t = String(item || '').trim();
      if (t && !out.includes(t)) out.push(t);
    });
  });
  return out;
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
    const productIds = products.map((p) => p._id).filter(Boolean);
    const verificationRows =
      productIds.length > 0
        ? await ProductVerification.find({ productId: { $in: productIds } })
            .select('productId aiChecks.videoProofUrl aiChecks.videoProofUploaded')
            .lean()
        : [];
    const verificationByProduct = new Map(
      verificationRows.map((row) => [String(row.productId), row]),
    );
    const productsWithVerification = products.map((p) => {
      const ver = verificationByProduct.get(String(p._id));
      const videoProofUrl =
        (typeof ver?.aiChecks?.videoProofUrl === 'string' && ver.aiChecks.videoProofUrl.trim()) ||
        (typeof (p as any).videoUrl === 'string' && (p as any).videoUrl.trim()) ||
        undefined;
      return {
        ...p,
        videoProofUrl,
        videoProofUploaded: Boolean(ver?.aiChecks?.videoProofUploaded || videoProofUrl),
      };
    });
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
    
    return res.json({ products: productsWithVerification });
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
}

async function syncProductProofVideo(productId: mongoose.Types.ObjectId, videoProofUrl?: string) {
  const url = typeof videoProofUrl === 'string' ? videoProofUrl.trim() : '';
  if (!url) return;
  await Product.findByIdAndUpdate(productId, { $set: { videoUrl: url } });
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
      videoUrl,
      compareAtPrice,
      couponCode,
      campaignLabel,
      offerEndsAt,
      shippingInfo,
      returnPolicy,
      securityNote,
      paymentSafetyNote,
      serviceCommitments,
      detailSections,
      sizeGuide,
      seoTitle,
      seoDescription,
      seoKeywords,
      warehouseId,
      verification: verificationBody,
      sizes,
      colors,
      listingMode: listingModeRaw,
      launchAt: launchAtRaw,
    } = req.body;

    const listingMode = listingModeRaw === 'upcoming' ? 'upcoming' : 'live';
    const launchAt =
      listingMode === 'upcoming' && launchAtRaw
        ? new Date(launchAtRaw)
        : undefined;
    if (listingMode === 'upcoming' && (!launchAt || Number.isNaN(launchAt.getTime()))) {
      return res.status(400).json({ message: 'launchAt is required for upcoming products' });
    }

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

    const limitCheck = await assertCanCreateProduct(String(sellerId));
    if (!limitCheck.ok) {
      if (limitCheck.code === 'PRODUCT_LIMIT' && limitCheck.entitlements) {
        const { deliverSellerNotification } = await import('../services/sellerNotificationService');
        void deliverSellerNotification(
          'subscription_limit_reached',
          {
            sellerId: String(sellerId),
            affectedCount: limitCheck.entitlements.productCount,
            planName: limitCheck.entitlements.tierName,
          },
          String(sellerId),
        );
      }
      return res.status(403).json({
        message: limitCheck.message,
        code: limitCheck.code,
        entitlements: limitCheck.entitlements,
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

    const normalizedVariantsRaw = normalizeProductVariants(variants, {
      listingCurrency: canonical.listingCurrency,
      listingExchangeRate: canonical.listingExchangeRate,
    });
    const normalizedVariants = attachVariantThumbnailsFromImages(normalizedVariantsRaw, images);
    const derivedColors = deriveColorsFromVariants(normalizedVariants);
    const derivedSizes = deriveSizesFromVariants(normalizedVariants);
    const normalizedSizes = mergeUniqueStrings(
      categoryNeedsSize(category) ? normalizeStringArray(sizes) : [],
      derivedSizes,
    );
    const normalizedColors = mergeUniqueStrings(
      categoryNeedsColor(category) ? normalizeStringArray(colors) : [],
      derivedColors,
    );

    const kycVerified = await isSellerKycVerified(sellerId);
    const publicationStatus = resolvePublicationStatusForSeller(kycVerified);

    const product = await Product.create({
      sellerId,
      name,
      category,
      description,
      weight,
      sku,
      stock: listingMode === 'upcoming' ? Math.max(0, Number(stock) || 0) : stock ?? 0,
      price: canonical.priceUsd,
      listingCurrency: canonical.listingCurrency,
      listingPriceAmount: canonical.listingPriceAmount,
      listingExchangeRate: canonical.listingExchangeRate,
      discount,
      moq,
      status: listingMode === 'upcoming' ? 'out_of_stock' : status || 'in_stock',
      listingMode,
      launchAt,
      publicationStatus,
      location,
      variants: normalizedVariants,
      sizes: normalizedSizes,
      colors: normalizedColors,
      tiers,
      images,
      videoUrl,
      compareAtPrice,
      couponCode,
      campaignLabel,
      offerEndsAt,
      shippingInfo,
      returnPolicy,
      securityNote,
      paymentSafetyNote,
      serviceCommitments,
      detailSections,
      sizeGuide,
      seoTitle,
      seoDescription,
      seoKeywords,
      warehouseId: wid,
    });

    const { enqueueIntelligenceIndex } = await import('../queues/intelligenceIndex.queue');
    enqueueIntelligenceIndex('product', String(product._id), 'created');

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
    await syncProductProofVideo(product._id as mongoose.Types.ObjectId, vDraft.videoProofUrl);

    const productOut = await Product.findById(product._id).lean();
    return res.status(201).json({
      product: productOut,
      kycVerified,
      publicationStatus,
      visibilityWarning: !kycVerified
        ? 'Product saved as PENDING VERIFICATION. It is hidden from buyers until you complete identity verification (Settings → Profile).'
        : undefined,
    });
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
      'sizes',
      'colors',
      'sizeGuide',
      'tiers',
      'images',
      'videoUrl',
      'compareAtPrice',
      'couponCode',
      'campaignLabel',
      'offerEndsAt',
      'shippingInfo',
      'returnPolicy',
      'securityNote',
      'paymentSafetyNote',
      'serviceCommitments',
      'detailSections',
      'warehouseId',
    ] as const;

  for (const field of updatableFields) {
      if (field in req.body) {
        (existing as any)[field] = req.body[field];
      }
    }

    if ('listingMode' in req.body) {
      const mode = (req.body as { listingMode?: string }).listingMode === 'upcoming' ? 'upcoming' : 'live';
      (existing as any).listingMode = mode;
      if (mode === 'upcoming') {
        (existing as any).status = 'out_of_stock';
      }
    }
    if ('launchAt' in req.body) {
      const raw = (req.body as { launchAt?: string }).launchAt;
      (existing as any).launchAt = raw ? new Date(raw) : undefined;
    }
    if ((existing as any).listingMode === 'upcoming' && !(existing as any).launchAt) {
      return res.status(400).json({ message: 'launchAt is required for upcoming products' });
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

    if (!categoryNeedsSize(existing.category || '')) {
      const derivedSizes = deriveSizesFromVariants((existing as any).variants);
      (existing as any).sizes = derivedSizes.length ? derivedSizes : [];
    } else {
      (existing as any).sizes = mergeUniqueStrings(
        normalizeStringArray((existing as any).sizes),
        deriveSizesFromVariants((existing as any).variants),
      );
    }

    if ('variants' in req.body) {
      const imgs = (req.body as any).images ?? (existing as any).images;
      const normalizedRaw = normalizeProductVariants((req.body as any).variants, {
        listingCurrency: (existing as any).listingCurrency || 'USD',
        listingExchangeRate: (existing as any).listingExchangeRate || 1,
      });
      (existing as any).variants = attachVariantThumbnailsFromImages(normalizedRaw, imgs);
    }

    if (!categoryNeedsColor(existing.category || '')) {
      const derivedColors = deriveColorsFromVariants((existing as any).variants);
      (existing as any).colors = derivedColors.length ? derivedColors : [];
    } else {
      (existing as any).colors = mergeUniqueStrings(
        normalizeStringArray((existing as any).colors),
        deriveColorsFromVariants((existing as any).variants),
      );
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

    const kycVerified = await isSellerKycVerified(sellerId);
    if (!kycVerified) {
      (existing as any).publicationStatus = 'pending_verification';
    } else if ((existing as any).publicationStatus === 'pending_verification') {
      (existing as any).publicationStatus = 'published';
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
      await syncProductProofVideo(existing._id as mongoose.Types.ObjectId, v.videoProofUrl);
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
    return res.json({
      product: out,
      kycVerified,
      publicationStatus: out?.publicationStatus,
      visibilityWarning: !kycVerified
        ? 'Product remains PENDING VERIFICATION and hidden from buyers until identity verification is complete.'
        : undefined,
    });
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


