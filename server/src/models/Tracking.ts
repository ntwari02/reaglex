import mongoose, { Schema, Document } from 'mongoose';

export type TrackingStatus =
  | 'pending'
  | 'payment_verified'
  | 'seller_confirmed'
  | 'packed'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'returned';

export type ShippingMethod = 'standard' | 'express' | 'priority';
export type PackageType = 'Standard Box' | 'Envelope' | 'Large Box' | 'Pallet';

export interface ITrackingEvent extends Document {
  orderId: mongoose.Types.ObjectId;
  shipmentId?: mongoose.Types.ObjectId;
  status: TrackingStatus;
  location: string;
  description: string;
  courier?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  metadata?: {
    [key: string]: any;
  };
}

export interface ICourier extends Document {
  name: string;
  logo?: string;
  phone?: string;
  email?: string;
  website?: string;
  trackingUrl?: string; // URL template for external tracking
  isActive: boolean;
}

export interface IShipment extends Document {
  orderId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  trackingNumber: string; // Unique tracking number
  status: TrackingStatus;
  courierId?: mongoose.Types.ObjectId;
  courierName?: string; // Fallback if courier not in system
  shippingMethod: ShippingMethod;
  packageType: PackageType;
  weight: number; // in kg
  dimensions: {
    length: number; // in cm
    width: number;
    height: number;
  };
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  deliveryPerson?: string;
  deliveryImage?: string; // URL to delivery proof image
  deliverySignature?: string; // Signature data
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: Date;
  };
  failedDeliveryReason?: string;
  failedDeliveryAttempts: number;
  items: Array<{
    productId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    image?: string;
  }>;
  events: mongoose.Types.ObjectId[]; // References to TrackingEvent
  createdAt: Date;
  updatedAt: Date;
}

const trackingEventSchema = new Schema<ITrackingEvent>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment' },
    status: {
      type: String,
      enum: [
        'pending',
        'payment_verified',
        'seller_confirmed',
        'packed',
        'shipped',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed_delivery',
        'returned',
      ],
      required: true,
      index: true,
    },
    location: { type: String, required: true },
    description: { type: String, required: true },
    courier: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Indexes for efficient queries
trackingEventSchema.index({ orderId: 1, timestamp: -1 });
trackingEventSchema.index({ shipmentId: 1, timestamp: -1 });

const courierSchema = new Schema<ICourier>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    logo: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const shipmentSchema = new Schema<IShipment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trackingNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    status: {
      type: String,
      enum: [
        'pending',
        'payment_verified',
        'seller_confirmed',
        'packed',
        'shipped',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed_delivery',
        'returned',
      ],
      default: 'pending',
      index: true,
    },
    courierId: { type: Schema.Types.ObjectId, ref: 'Courier' },
    courierName: { type: String, trim: true },
    shippingMethod: {
      type: String,
      enum: ['standard', 'express', 'priority'],
      default: 'standard',
    },
    packageType: {
      type: String,
      enum: ['Standard Box', 'Envelope', 'Large Box', 'Pallet'],
      default: 'Standard Box',
    },
    weight: { type: Number, required: true }, // in kg
    dimensions: {
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    estimatedDelivery: { type: Date, index: true },
    actualDelivery: { type: Date },
    deliveryPerson: { type: String, trim: true },
    deliveryImage: { type: String, trim: true },
    deliverySignature: { type: String, trim: true },
    currentLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      timestamp: { type: Date },
    },
    failedDeliveryReason: { type: String, trim: true },
    failedDeliveryAttempts: { type: Number, default: 0 },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        image: { type: String },
      },
    ],
    events: [{ type: Schema.Types.ObjectId, ref: 'TrackingEvent' }],
  },
  { timestamps: true }
);

// Generate unique tracking number before saving
shipmentSchema.pre('save', async function (next: any) {
  if (!this.isNew || this.trackingNumber) {
    return next();
  }

  // Generate tracking number: TRK + timestamp + random
  let trackingNumber: string = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    trackingNumber = `TRK${timestamp}${random}`.toUpperCase();

    const existing = await mongoose.model('Shipment').findOne({ trackingNumber });
    exists = !!existing;
    attempts++;
  }

  if (exists) {
    return next(new Error('Failed to generate unique tracking number'));
  }

  this.trackingNumber = trackingNumber;
  next();
});

// Indexes
shipmentSchema.index({ orderId: 1, status: 1 });
// trackingNumber already has a unique index from unique: true, no need for explicit index
shipmentSchema.index({ sellerId: 1, status: 1 });

export const TrackingEvent = mongoose.model<ITrackingEvent>('TrackingEvent', trackingEventSchema);
export const Courier = mongoose.model<ICourier>('Courier', courierSchema);
export const Shipment = mongoose.model<IShipment>('Shipment', shipmentSchema);

