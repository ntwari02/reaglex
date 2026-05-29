import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformFeeRange {
  min: number;
  max: number;
}

export interface IPlatformShippingPolicy extends Document {
  marketCode: string;
  marketName: string;
  currency: string;
  /** Sellers configure warehouse + rates; zones & cities are platform-managed. */
  sellerCanDefineZones: boolean;
  feeLimits: {
    baseFee: IPlatformFeeRange;
    ratePerKm: IPlatformFeeRange;
    handlingFee: IPlatformFeeRange;
    minShippingFee: IPlatformFeeRange;
  };
  etaLimits: { min: number; max: number };
  enabledMethods: string[];
  platformFreeShippingThreshold?: number;
  defaultWarehouseCountry: string;
  defaultWarehouseCity: string;
  buyerLocationPickerEnabled: boolean;
  codEnabled: boolean;
  /** VAT/sales tax rate applied at checkout preview (0.18 = 18%). Rwanda VAT is often 18%. */
  salesTaxRate: number;
  updatedAt: Date;
}

const rangeSchema = new Schema(
  { min: { type: Number, required: true }, max: { type: Number, required: true } },
  { _id: false },
);

const platformShippingPolicySchema = new Schema<IPlatformShippingPolicy>(
  {
    marketCode: { type: String, default: 'RW', uppercase: true, trim: true },
    marketName: { type: String, default: 'Rwanda', trim: true },
    currency: { type: String, default: 'RWF', uppercase: true, trim: true },
    sellerCanDefineZones: { type: Boolean, default: false },
    feeLimits: {
      baseFee: { type: rangeSchema, default: () => ({ min: 500, max: 8000 }) },
      ratePerKm: { type: rangeSchema, default: () => ({ min: 50, max: 800 }) },
      handlingFee: { type: rangeSchema, default: () => ({ min: 0, max: 3000 }) },
      minShippingFee: { type: rangeSchema, default: () => ({ min: 500, max: 5000 }) },
    },
    etaLimits: { min: { type: Number, default: 1 }, max: { type: Number, default: 21 } },
    enabledMethods: {
      type: [String],
      default: ['standard', 'express', 'pickup'],
    },
    platformFreeShippingThreshold: { type: Number, default: 50000 },
    defaultWarehouseCountry: { type: String, default: 'RW', uppercase: true },
    defaultWarehouseCity: { type: String, default: 'Kigali', trim: true },
    buyerLocationPickerEnabled: { type: Boolean, default: true },
    codEnabled: { type: Boolean, default: true },
    salesTaxRate: { type: Number, default: 0.18, min: 0, max: 1 },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const PlatformShippingPolicy = mongoose.model<IPlatformShippingPolicy>(
  'PlatformShippingPolicy',
  platformShippingPolicySchema,
);
