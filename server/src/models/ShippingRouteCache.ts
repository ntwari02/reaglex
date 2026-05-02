import mongoose, { Document, Schema } from 'mongoose';

export interface IShippingRouteCache extends Document {
  cacheKey: string;
  distanceKm: number;
  source: 'openrouteservice' | 'haversine';
  expiresAt: Date;
  createdAt: Date;
}

const shippingRouteCacheSchema = new Schema<IShippingRouteCache>(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    distanceKm: { type: Number, required: true },
    source: {
      type: String,
      enum: ['openrouteservice', 'haversine'],
      required: true,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const ShippingRouteCache = mongoose.model<IShippingRouteCache>(
  'ShippingRouteCache',
  shippingRouteCacheSchema
);
