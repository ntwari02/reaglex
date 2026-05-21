import mongoose, { Document, Schema } from 'mongoose';

export type CartDevicePlatform = 'web' | 'mobile' | 'desktop';

export interface ICloudCartLine {
  productId: string;
  variantId?: string;
  quantity: number;
  title: string;
  price: number;
  image?: string;
  seller?: string;
  updatedAt?: Date;
}

export interface ICartDeviceSession {
  deviceId: string;
  platform: CartDevicePlatform;
  userAgent?: string;
  lastSyncAt: Date;
  itemCount: number;
}

export interface IBuyerCloudCart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICloudCartLine[];
  deviceSessions: ICartDeviceSession[];
  shippingPreviewLocation?: {
    country: string;
    city: string;
    state?: string;
    zip?: string;
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartLineSchema = new Schema<ICloudCartLine>(
  {
    productId: { type: String, required: true },
    variantId: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1, max: 999 },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    seller: { type: String, default: 'Seller' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const deviceSessionSchema = new Schema<ICartDeviceSession>(
  {
    deviceId: { type: String, required: true },
    platform: { type: String, enum: ['web', 'mobile', 'desktop'], default: 'web' },
    userAgent: { type: String, default: '' },
    lastSyncAt: { type: Date, default: Date.now },
    itemCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const buyerCloudCartSchema = new Schema<IBuyerCloudCart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartLineSchema], default: [] },
    deviceSessions: { type: [deviceSessionSchema], default: [] },
    shippingPreviewLocation: {
      country: { type: String, default: 'RW' },
      city: { type: String, default: 'Kigali' },
      state: { type: String, default: '' },
      zip: { type: String, default: '' },
    },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const BuyerCloudCart = mongoose.model<IBuyerCloudCart>('BuyerCloudCart', buyerCloudCartSchema);
