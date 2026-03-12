import mongoose, { Document, Schema } from 'mongoose';

export type ZoneType = 'local' | 'national' | 'international';
export type RateType = 'flat' | 'weight' | 'distance' | 'dynamic';

export interface IShippingZone extends Document {
  name: string;
  type: ZoneType;
  rateType: RateType;
  baseRate: number;
  freeShippingThreshold?: number;
  codAvailable: boolean;
  countries?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const shippingZoneSchema = new Schema<IShippingZone>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['local', 'national', 'international'],
      required: true,
      index: true,
    },
    rateType: {
      type: String,
      enum: ['flat', 'weight', 'distance', 'dynamic'],
      required: true,
    },
    baseRate: { type: Number, required: true },
    freeShippingThreshold: { type: Number },
    codAvailable: { type: Boolean, default: false },
    countries: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

export const ShippingZone = mongoose.model<IShippingZone>('ShippingZone', shippingZoneSchema);
