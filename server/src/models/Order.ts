import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface IOrderItem {
  productId: Schema.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
}

export interface IOrderTimelineEntry {
  status: string;
  date: Date;
  time: string;
}

export type EscrowStatus =
  | 'PENDING'
  | 'ESCROW_HOLD'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'DISPUTED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'AUTO_RELEASED';

export interface IOrderPayment {
  provider?: 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel';
  flutterwaveTransactionId?: string;
  flutterwaveReference?: string;
  momoReferenceId?: string;
  momoFinancialTransactionId?: string;
  momoStatus?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  airtelTransactionId?: string;
  airtelStatus?: string;
  amount?: number;
  currency?: string;
  method?: string; // card, mobilemoney, banktransfer
  paidAt?: Date;
}

export interface IOrderEscrow {
  status: EscrowStatus;
  heldAt?: Date;
  releaseEligibleAt?: Date;
  releasedAt?: Date;
  disputeRaisedAt?: Date;
  disputeReason?: string;
  disputeResolvedAt?: Date;
  autoReleaseScheduled?: boolean;
}

export interface IOrderFees {
  platformFeePercent?: number;
  platformFeeAmount?: number;
  sellerAmount?: number;
  flutterwaveFee?: number;
}

export interface IOrderPayout {
  transferId?: string;
  transferStatus?: string;
  paidToSellerAt?: Date;
  sellerSubaccountId?: string;
}

export type ReaglexShipmentStatus = 'pending' | 'ready_for_pickup' | 'shipped' | 'delivered' | 'failed';

export interface IOrderReaglexShipping {
  version: number;
  groupKey?: string;
  sellerId?: string;
  warehouseId?: string;
  warehouseLabel?: string;
  origin?: { lat: number; lng: number; addressText?: string };
  buyerDelivery?: Record<string, string | undefined>;
  selectedShippingMethod?: string;
  distanceKm?: number;
  distanceSource?: string;
  baseFee?: number;
  ratePerKm?: number;
  handlingFee?: number;
  minShippingFee?: number;
  zoneSurcharge?: number;
  shippingTotal?: number;
  freeShippingApplied?: boolean;
  estimatedDeliveryFrom?: Date;
  estimatedDeliveryTo?: Date;
  trackingNumber?: string;
  shipmentStatus?: ReaglexShipmentStatus;
  deliveryProofUrl?: string;
}

export interface IOrder extends Document {
  sellerId: Schema.Types.ObjectId;
  buyerId: Schema.Types.ObjectId;
  orderNumber: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  items: IOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  date: Date;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentMethod: string;
  trackingNumber?: string;
  timeline: IOrderTimelineEntry[];
  payment?: IOrderPayment;
  currencySnapshot?: {
    totalUsd: number;
    totalLocal: number;
    currency: string;
    exchangeRate: number;
    timestamp: Date;
    lockedAt: Date;
  };
  escrow?: IOrderEscrow;
  fees?: IOrderFees;
  payout?: IOrderPayout;
  inventory?: {
    stockDeductedAt?: Date;
    stockRestoredAt?: Date;
    lastChangeReason?: string;
  };
  carrier?: string;
  reaglexShipping?: IOrderReaglexShipping;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    variant: { type: String },
  },
  { _id: false }
);

const orderTimelineSchema = new Schema<IOrderTimelineEntry>(
  {
    status: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
  },
  { _id: false }
);

const reaglexOrderShippingSchema = new Schema(
  {
    version: { type: Number, default: 1 },
    groupKey: { type: String },
    sellerId: { type: String },
    warehouseId: { type: String },
    warehouseLabel: { type: String },
    origin: {
      lat: Number,
      lng: Number,
      addressText: String,
    },
    buyerDelivery: { type: Schema.Types.Mixed },
    selectedShippingMethod: { type: String },
    distanceKm: { type: Number },
    distanceSource: { type: String },
    baseFee: { type: Number },
    ratePerKm: { type: Number },
    handlingFee: { type: Number },
    minShippingFee: { type: Number },
    zoneSurcharge: { type: Number },
    shippingTotal: { type: Number },
    freeShippingApplied: { type: Boolean },
    estimatedDeliveryFrom: { type: Date },
    estimatedDeliveryTo: { type: Date },
    trackingNumber: { type: String },
    shipmentStatus: {
      type: String,
      enum: ['pending', 'ready_for_pickup', 'shipped', 'delivered', 'failed'],
      default: 'pending',
    },
    deliveryProofUrl: { type: String },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    date: { type: Date, required: true },
    shippingAddress: {
      name: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: { type: String, required: true },
    carrier: { type: String, trim: true },
    trackingNumber: { type: String },
    timeline: { type: [orderTimelineSchema], default: [] },
    payment: {
      provider: { type: String },
      flutterwaveTransactionId: { type: String },
      flutterwaveReference: { type: String },
      momoReferenceId: { type: String, index: true },
      momoFinancialTransactionId: { type: String },
      momoStatus: { type: String },
      stripeCheckoutSessionId: { type: String, index: true },
      stripePaymentIntentId: { type: String },
      paypalOrderId: { type: String, index: true },
      paypalCaptureId: { type: String },
      airtelTransactionId: { type: String, index: true },
      airtelStatus: { type: String },
      amount: { type: Number },
      currency: { type: String },
      method: { type: String },
      paidAt: { type: Date },
    },
    currencySnapshot: {
      totalUsd: { type: Number },
      totalLocal: { type: Number },
      currency: { type: String },
      exchangeRate: { type: Number },
      timestamp: { type: Date },
      lockedAt: { type: Date },
    },
    escrow: {
      status: {
        type: String,
        enum: [
          'PENDING',
          'ESCROW_HOLD',
          'SHIPPED',
          'DELIVERED',
          'DISPUTED',
          'RELEASED',
          'REFUNDED',
          'AUTO_RELEASED',
        ],
        default: 'PENDING',
        index: true,
      },
      heldAt: { type: Date },
      releaseEligibleAt: { type: Date },
      releasedAt: { type: Date },
      disputeRaisedAt: { type: Date },
      disputeReason: { type: String },
      disputeResolvedAt: { type: Date },
      autoReleaseScheduled: { type: Boolean, default: true },
    },
    fees: {
      platformFeePercent: { type: Number },
      platformFeeAmount: { type: Number },
      sellerAmount: { type: Number },
      flutterwaveFee: { type: Number },
    },
    payout: {
      transferId: { type: String },
      transferStatus: { type: String },
      paidToSellerAt: { type: Date },
      sellerSubaccountId: { type: String },
    },
    inventory: {
      stockDeductedAt: { type: Date },
      stockRestoredAt: { type: Date },
      lastChangeReason: { type: String },
    },
    reaglexShipping: { type: reaglexOrderShippingSchema },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', orderSchema);


