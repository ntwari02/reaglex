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
  price: number;
  discount?: number;
  moq?: number;
  status: InventoryStatus;
  location?: string;
  images?: string[];
  variants?: ProductVariant[];
  tiers?: TieredPrice[];
  views?: number;
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
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', productSchema);


