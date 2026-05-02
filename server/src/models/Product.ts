import mongoose, { Schema, Document } from 'mongoose';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductVariant {
  color?: string;
  size?: string;
  sku: string;
  stock: number;
}

export interface TieredPrice {
  minQty: number;
  maxQty?: number;
  price: number;
}

export interface IProduct extends Document {
  sellerId: mongoose.Types.ObjectId;
  name: string;
  category?: string;
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
  location?: string;
  images?: string[];
  variants?: ProductVariant[];
  tiers?: TieredPrice[];
  views?: number;
  reaglexProductId?: string;
  /** Ships from this warehouse for Reaglex grouped shipping (seller-defined). */
  warehouseId?: string;
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
    category: { type: String, trim: true },
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
    location: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    variants: [
      {
        color: { type: String, trim: true },
        size: { type: String, trim: true },
        sku: { type: String, required: true, trim: true },
        stock: { type: Number, required: true, default: 0 },
      },
    ],
    tiers: [
      {
        minQty: { type: Number, required: true },
        maxQty: { type: Number },
        price: { type: Number, required: true },
      },
    ],
    views: { type: Number, default: 0, index: true },
    reaglexProductId: { type: String, trim: true, unique: true, sparse: true, index: true },
    warehouseId: { type: String, trim: true, default: 'default', index: true },
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
productSchema.index({ 'verificationSummary.status': 1, createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' });

function generateReaglexProductId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RX-PROD-${Date.now().toString(36).toUpperCase()}${rand}`;
}

productSchema.pre('validate', function assignReaglexProductId() {
  if (!this.reaglexProductId) this.reaglexProductId = generateReaglexProductId();
});

export const Product = mongoose.model<IProduct>('Product', productSchema);


