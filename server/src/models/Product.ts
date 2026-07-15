import mongoose, { Schema, Document, HydratedDocument } from 'mongoose';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type PublicationStatus = 'published' | 'pending_verification' | 'draft';
export type ListingMode = 'live' | 'upcoming';

export interface ProductVariant {
  color?: string;
  size?: string;
  sku: string;
  stock: number;
  /** Canonical USD unit price when this variant differs from base product.price. */
  priceUsd?: number;
  compareAtPriceUsd?: number;
  /** Optional commerce-facing metadata (PDP swatches/thumbnails/badges). */
  label?: string;
  thumbnailUrl?: string;
  swatchHex?: string;
  badge?: string; // e.g. "Trending", "Best seller"
  sortOrder?: number;
}

export interface TieredPrice {
  minQty: number;
  maxQty?: number;
  price: number;
}

export interface IProduct extends Document {
  sellerId: mongoose.Types.ObjectId;
  name: string;
  /** SEO URL segment; unique when set (e.g. `nike-air-max-9a3f2c1d`). */
  slug?: string;
  category?: string;
  /** Denormalized storefront category slug (e.g. `home-garden`) for SEO URLs + filters */
  categorySlug?: string;
  /** GTIN / EAN / UPC when available — Google Merchant / Shopping */
  gtin?: string;
  description?: string;
  weight?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tags?: string[];
  sku: string;
  stock: number;
  /** Canonical unit price in USD (accounting / checkout base). */
  price: number;
  /** ISO 4217 — currency the seller used when entering the list price. */
  listingCurrency?: string;
  /** Whole-number amount the seller entered in listingCurrency (for display / audit). */
  listingPriceAmount?: number;
  /** USD→listing rate snapshot at last listing save (how many listing units per 1 USD). */
  listingExchangeRate?: number;
  discount?: number;
  moq?: number;
  status: InventoryStatus;
  /** Buyer storefront visibility — pending_verification when seller KYC is incomplete. */
  publicationStatus?: PublicationStatus;
  /** `upcoming` = visible in drops / notify list; not purchasable until launchAt. */
  listingMode?: ListingMode;
  /** When listingMode is upcoming — product goes live at this time. */
  launchAt?: Date;
  location?: string;
  images?: string[];
  /** Optional product hero video. */
  videoUrl?: string;
  /** Legacy single image (older data). */
  image?: string;
  variants?: ProductVariant[];
  sizes?: string[];
  colors?: string[];
  sizeGuide?: {
    chartImageUrl?: string;
    circumferenceNote?: string;
    rows?: Array<{ sizeLabel: string; circumferenceMm?: number }>;
  };
  tiers?: TieredPrice[];
  views?: number;
  /** Total "saved" count (wishlist/likes). */
  wishlistCount?: number;
  /** Total units sold (best-effort counter, updated on paid orders). */
  soldCount?: number;
  /** Optional struck-through/original price (USD). */
  compareAtPrice?: number;
  /** Optional coupon code shown on PDP (display-only). */
  couponCode?: string;
  /** Optional campaign label/badge (e.g. "Spring Sale"). */
  campaignLabel?: string;
  /** Optional offer expiry; when in the future, PDP can show countdown. */
  offerEndsAt?: Date;
  /** Optional shipping / policy / trust metadata for PDP. */
  shippingInfo?: {
    costLabel?: string;
    estimatedDeliveryLabel?: string;
    freeShipping?: boolean;
  };
  returnPolicy?: {
    label?: string;
    details?: string;
  };
  securityNote?: string;
  paymentSafetyNote?: string;
  serviceCommitments?: Array<{ title: string; description?: string; icon?: string }>;
  detailSections?: Array<{ title: string; content?: string }>;
  spacillyProductId?: string;
  /** Ships from this warehouse for Spacilly grouped shipping (seller-defined). */
  warehouseId?: string;
  fulfillmentType?: 'shipping' | 'pickup' | 'digital' | 'service';
  verificationSummary?: {
    status: 'unverified' | 'pending' | 'verified' | 'flagged' | 'rejected';
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    trustBand?: 'high' | 'medium' | 'low';
    submissionAllowed?: boolean;
    hasIdentifier: boolean;
    lastCheckedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    category: { type: String, trim: true },
    categorySlug: { type: String, trim: true, lowercase: true, index: true, sparse: true },
    gtin: { type: String, trim: true, sparse: true },
    description: { type: String, trim: true },
    weight: { type: Number },
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    seoKeywords: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    sku: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    listingCurrency: { type: String, trim: true, default: 'USD' },
    listingPriceAmount: { type: Number },
    listingExchangeRate: { type: Number },
    discount: { type: Number, default: 0 },
    moq: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
      index: true,
    },
    publicationStatus: {
      type: String,
      enum: ['published', 'pending_verification', 'draft'],
      default: 'published',
      index: true,
    },
    listingMode: {
      type: String,
      enum: ['live', 'upcoming'],
      default: 'live',
      index: true,
    },
    launchAt: { type: Date, index: true, sparse: true },
    location: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    videoUrl: { type: String, trim: true },
    image: { type: String, trim: true },
    variants: [
      {
        color: { type: String, trim: true },
        size: { type: String, trim: true },
        sku: { type: String, required: true, trim: true },
        stock: { type: Number, required: true, default: 0 },
        priceUsd: { type: Number, min: 0 },
        compareAtPriceUsd: { type: Number, min: 0 },
        label: { type: String, trim: true },
        thumbnailUrl: { type: String, trim: true },
        swatchHex: { type: String, trim: true },
        badge: { type: String, trim: true },
        sortOrder: { type: Number },
      },
    ],
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    sizeGuide: {
      chartImageUrl: { type: String, trim: true },
      circumferenceNote: { type: String, trim: true },
      rows: [
        {
          sizeLabel: { type: String, trim: true, required: true },
          circumferenceMm: { type: Number },
        },
      ],
    },
    tiers: [
      {
        minQty: { type: Number, required: true },
        maxQty: { type: Number },
        price: { type: Number, required: true },
      },
    ],
    views: { type: Number, default: 0, index: true },
    wishlistCount: { type: Number, default: 0, index: true },
    soldCount: { type: Number, default: 0, index: true },
    compareAtPrice: { type: Number },
    couponCode: { type: String, trim: true },
    campaignLabel: { type: String, trim: true },
    offerEndsAt: { type: Date },
    shippingInfo: {
      costLabel: { type: String, trim: true },
      estimatedDeliveryLabel: { type: String, trim: true },
      freeShipping: { type: Boolean, default: false },
    },
    returnPolicy: {
      label: { type: String, trim: true },
      details: { type: String, trim: true },
    },
    securityNote: { type: String, trim: true },
    paymentSafetyNote: { type: String, trim: true },
    serviceCommitments: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        icon: { type: String, trim: true },
      },
    ],
    detailSections: [
      {
        title: { type: String, required: true, trim: true },
        content: { type: String, trim: true },
      },
    ],
    spacillyProductId: { type: String, trim: true, unique: true, sparse: true, index: true },
    warehouseId: { type: String, trim: true, default: 'default', index: true },
    fulfillmentType: {
      type: String,
      enum: ['shipping', 'pickup', 'digital', 'service'],
      default: 'shipping',
      index: true,
    },
    verificationSummary: {
      status: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'flagged', 'rejected'],
        default: 'unverified',
        index: true,
      },
      score: { type: Number, default: 0 },
      riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
      trustBand: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
      submissionAllowed: { type: Boolean, default: false },
      hasIdentifier: { type: Boolean, default: false },
      lastCheckedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Indexes to keep /api/products fast under concurrency
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ publicationStatus: 1, createdAt: -1 });
productSchema.index({ sellerId: 1, publicationStatus: 1 });
productSchema.index({ 'verificationSummary.status': 1, createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ soldCount: -1, createdAt: -1 });
productSchema.index({ wishlistCount: -1, createdAt: -1 });
productSchema.index({ categorySlug: 1, status: 1, createdAt: -1 });

function generateSpacillyProductId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RX-PROD-${Date.now().toString(36).toUpperCase()}${rand}`;
}

productSchema.pre('validate', function assignSpacillyProductId() {
  if (!this.spacillyProductId) this.spacillyProductId = generateSpacillyProductId();
});

productSchema.pre('validate', async function ensureSlug() {
  const doc = this as HydratedDocument<IProduct>;
  const name = String(doc.name || '').trim();
  if (!name) return;
  const slugExisting = String(doc.slug || '').trim().toLowerCase();
  if (slugExisting) return;
  const idStr = doc._id ? String(doc._id) : new mongoose.Types.ObjectId().toString();
  const { defaultSlugBaseFromNameAndId, ensureUniqueProductSlug } = await import('../utils/productSlug');
  const base = defaultSlugBaseFromNameAndId(name, idStr);
  doc.slug = await ensureUniqueProductSlug(base, doc._id);
});

productSchema.pre('validate', async function syncCategorySlug() {
  const doc = this as HydratedDocument<IProduct>;
  const { resolveCategorySlugFromProductLabel } = await import('../constants/storefrontCategories');
  const cat = String(doc.category || '').trim();
  if (!cat) {
    doc.categorySlug = undefined;
    return;
  }
  doc.categorySlug = resolveCategorySlugFromProductLabel(cat);
});


export const Product = mongoose.model<IProduct>('Product', productSchema);


