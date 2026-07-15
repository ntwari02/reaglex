import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'packed'
  | 'paused'
  | 'ready_for_pickup'
  | 'pickup_confirmed'
  | 'paid'
  | 'booked'
  | 'in_progress'
  | 'shipped'
  | 'delivered'
  | 'completed'
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
  | 'PICKUP_CONFIRMED'
  | 'DIGITAL_CONFIRMED'
  | 'SERVICE_CONFIRMED'
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
  productAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  sellerReserve?: number;
  releasedProductAmount?: number;
  releasedShippingAmount?: number;
  releasedTaxAmount?: number;
  releasedSellerReserve?: number;
  heldAt?: Date;
  releaseEligibleAt?: Date;
  releasedAt?: Date;
  refundedAmount?: number;
  lastRefundAt?: Date;
  disputeRaisedAt?: Date;
  disputeReason?: string;
  disputeResolvedAt?: Date;
  autoReleaseScheduled?: boolean;
  trustScore?: {
    buyer: number;
    seller: number;
    riskTier?: 'low' | 'medium' | 'high';
    autoReview?: boolean;
    evaluatedAt?: Date;
  };
  insurance?: {
    enabled: boolean;
    plan: 'delivery_protection';
    premium: number;
    currency: string;
    coverageTypes: Array<'damaged' | 'lost' | 'late'>;
    compensationCap: number;
    status: 'active' | 'claimed' | 'expired' | 'rejected';
    claimedAt?: Date;
    claimReason?: string;
  };
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

export type SpacillyShipmentStatus = 'pending' | 'ready_for_pickup' | 'shipped' | 'delivered' | 'failed';

export interface IOrderSpacillyShipping {
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
  shipmentStatus?: SpacillyShipmentStatus;
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
  spacillyShipping?: IOrderSpacillyShipping;
  orderOptimization?: {
    strategy: 'lowest_cost' | 'fastest_delivery' | 'green_shipping';
    aiConfidence: number;
    estimatedSavings: number;
  };
  fulfillment?: {
    type: 'shipping' | 'pickup' | 'digital' | 'service';
    pickupLocationId?: string;
    pickupTime?: Date;
    pickupLocker?: string;
    pickupLocation?: {
      id?: string;
      name?: string;
      openingHours?: string;
      coordinates?: number[];
      readyInMinutes?: number;
      distanceKm?: number;
    };
    carrierOptions?: Array<{
      carrier: string;
      service: string;
      estimatedDays: number;
      cost: number;
      confidence: number;
      score: number;
    }>;
    recommendedCarrier?: {
      carrier: string;
      service: string;
    };
    batchActionHistory?: Array<{
      action: 'print_labels' | 'ship' | 'package';
      at: Date;
      actorId: string;
    }>;
  };
  pickup?: {
    code?: string;
    qrToken?: string;
    otp?: string;
    expiresAt?: Date;
    arrivedAt?: Date;
    arrivalMeta?: {
      vehicleColor?: string;
      vehicleModel?: string;
      plate?: string;
      parkingSlot?: string;
    };
    verification?: {
      qr: boolean;
      otp: boolean;
      gps: boolean;
      face?: boolean;
      sellerScan?: boolean;
    };
    locker?: {
      lockerId?: string;
      pin?: string;
      placedAt?: Date;
      openedAt?: Date;
    };
  };
  deliveryPrediction?: {
    expected: Date;
    confidence: number;
    factors?: {
      weather?: number;
      traffic?: number;
      historicalDelays?: number;
    };
  };
  postDelivery?: {
    satisfactionResponses?: Array<{
      productId: string;
      sentiment: string;
      comment?: string;
      at: Date;
    }>;
    lastSatisfactionCheckAt?: Date;
  };
  autoCompletion?: {
    deliveredAt?: Date;
    eligibleAt?: Date;
    state?: 'scheduled' | 'blocked' | 'completed';
    reason?: string;
    reminderStagesSent?: Array<'d1' | 'd2' | 'final'>;
    lastReminderSentAt?: Date;
    completedAt?: Date;
    completionSource?: 'buyer_confirmed' | 'auto_system' | 'admin';
  };
  deliverySLA?: {
    estimatedDeliveryAt?: Date;
    penalties?: Array<{
      code: 'stale_fulfillment' | 'late_delivery' | 'severe_delay';
      points: number;
      appliedAt: Date;
      note?: string;
    }>;
    lastEvaluatedAt?: Date;
  };
  cancellationIntelligence?: {
    predictedReason?: string;
    predictedConfidence?: number;
    retentionOffers?: Array<'size_exchange' | 'shipping_speed_upgrade' | 'coupon'>;
    riskScore?: number;
    pausedAt?: Date;
    pauseReason?: string;
  };
  paymentIntelligence?: {
    optimizer?: {
      selectedGateway?: string;
      reason?: string;
      alternatives?: Array<{ gateway: string; score: number; reason: string }>;
      evaluatedAt?: Date;
    };
    splitPayment?: { enabled: boolean; installments: number };
    paymentSchedule?: Array<{
      installment: number;
      amount: number;
      dueDate: string;
      status: 'due_now' | 'scheduled' | 'paid' | 'overdue';
      paidAt?: Date;
    }>;
    bnpl?: {
      provider: string;
      installments: number;
      aprPercent: number;
      totalWithInterest: number;
      schedule: Array<{
        installment: number;
        amount: number;
        dueDate: string;
        status: string;
      }>;
      status?: 'pending' | 'approved' | 'rejected' | 'completed';
      approvedAt?: Date;
    };
    crypto?: {
      asset: 'BTC' | 'USDT';
      network: string;
      depositAddress: string;
      status: 'awaiting_confirmation' | 'confirmed' | 'expired';
      escrowCompatible: boolean;
      txRef?: string;
      confirmedAt?: Date;
    };
  };
  evidence?: {
    media: Array<{
      type: 'video' | 'image' | 'document';
      url: string;
      uploadedBy: 'buyer' | 'seller' | 'admin';
      uploadedAt: Date;
      note?: string;
    }>;
    hash?: string;
    verificationStatus?: 'unverified' | 'verified' | 'tampered';
    lastUpdatedAt?: Date;
  };
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

const spacillyOrderShippingSchema = new Schema(
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
      enum: [
        'pending',
        'processing',
        'packed',
        'paused',
        'ready_for_pickup',
        'pickup_confirmed',
        'paid',
        'booked',
        'in_progress',
        'shipped',
        'delivered',
        'completed',
        'cancelled',
      ],
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
          'PICKUP_CONFIRMED',
          'DIGITAL_CONFIRMED',
          'SERVICE_CONFIRMED',
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
      refundedAmount: { type: Number, default: 0 },
      lastRefundAt: { type: Date },
      disputeRaisedAt: { type: Date },
      disputeReason: { type: String },
      disputeResolvedAt: { type: Date },
      autoReleaseScheduled: { type: Boolean, default: true },
      productAmount: { type: Number, default: 0 },
      shippingAmount: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      sellerReserve: { type: Number, default: 0 },
      releasedProductAmount: { type: Number, default: 0 },
      releasedShippingAmount: { type: Number, default: 0 },
      releasedTaxAmount: { type: Number, default: 0 },
      releasedSellerReserve: { type: Number, default: 0 },
      trustScore: {
        buyer: { type: Number, min: 0, max: 100 },
        seller: { type: Number, min: 0, max: 100 },
        riskTier: { type: String, enum: ['low', 'medium', 'high'] },
        autoReview: { type: Boolean, default: false },
        evaluatedAt: { type: Date },
      },
      insurance: {
        enabled: { type: Boolean, default: false },
        plan: { type: String, enum: ['delivery_protection'], default: 'delivery_protection' },
        premium: { type: Number, default: 0 },
        currency: { type: String, default: 'USD' },
        coverageTypes: {
          type: [String],
          default: ['damaged', 'lost', 'late'],
          enum: ['damaged', 'lost', 'late'],
        },
        compensationCap: { type: Number, default: 0 },
        status: { type: String, enum: ['active', 'claimed', 'expired', 'rejected'], default: 'active' },
        claimedAt: { type: Date },
        claimReason: { type: String },
      },
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
    spacillyShipping: { type: spacillyOrderShippingSchema },
    orderOptimization: {
      strategy: { type: String, enum: ['lowest_cost', 'fastest_delivery', 'green_shipping'] },
      aiConfidence: { type: Number },
      estimatedSavings: { type: Number },
    },
    fulfillment: {
      type: { type: String, enum: ['shipping', 'pickup', 'digital', 'service'], default: 'shipping' },
      pickupLocationId: { type: String },
      pickupTime: { type: Date },
      pickupLocker: { type: String },
      pickupLocation: {
        id: { type: String },
        name: { type: String },
        openingHours: { type: String },
        coordinates: { type: [Number], default: [] },
        readyInMinutes: { type: Number },
        distanceKm: { type: Number },
      },
      carrierOptions: {
        type: [
          new Schema(
            {
              carrier: { type: String, required: true },
              service: { type: String, required: true },
              estimatedDays: { type: Number, required: true },
              cost: { type: Number, required: true },
              confidence: { type: Number, required: true },
              score: { type: Number, required: true },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
      recommendedCarrier: {
        carrier: { type: String },
        service: { type: String },
      },
      batchActionHistory: {
        type: [
          new Schema(
            {
              action: { type: String, enum: ['print_labels', 'ship', 'package'], required: true },
              at: { type: Date, default: Date.now },
              actorId: { type: String, required: true },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
    },
    pickup: {
      code: { type: String },
      qrToken: { type: String },
      otp: { type: String },
      expiresAt: { type: Date },
      arrivedAt: { type: Date },
      arrivalMeta: {
        vehicleColor: { type: String },
        vehicleModel: { type: String },
        plate: { type: String },
        parkingSlot: { type: String },
      },
      verification: {
        qr: { type: Boolean, default: false },
        otp: { type: Boolean, default: false },
        gps: { type: Boolean, default: false },
        face: { type: Boolean, default: false },
        sellerScan: { type: Boolean, default: false },
      },
      locker: {
        lockerId: { type: String },
        pin: { type: String },
        placedAt: { type: Date },
        openedAt: { type: Date },
      },
    },
    deliveryPrediction: {
      expected: { type: Date },
      confidence: { type: Number },
      factors: {
        weather: { type: Number },
        traffic: { type: Number },
        historicalDelays: { type: Number },
      },
    },
    postDelivery: {
      satisfactionResponses: {
        type: [
          new Schema(
            {
              productId: { type: String, required: true },
              sentiment: { type: String, required: true },
              comment: { type: String },
              at: { type: Date, default: Date.now },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
      lastSatisfactionCheckAt: { type: Date },
    },
    autoCompletion: {
      deliveredAt: { type: Date },
      eligibleAt: { type: Date, index: true },
      state: { type: String, enum: ['scheduled', 'blocked', 'completed'], default: 'scheduled', index: true },
      reason: { type: String },
      reminderStagesSent: {
        type: [{ type: String, enum: ['d1', 'd2', 'final'] }],
        default: [],
      },
      lastReminderSentAt: { type: Date },
      completedAt: { type: Date },
      completionSource: { type: String, enum: ['buyer_confirmed', 'auto_system', 'admin'] },
    },
    deliverySLA: {
      estimatedDeliveryAt: { type: Date, index: true },
      penalties: {
        type: [
          new Schema(
            {
              code: {
                type: String,
                enum: ['stale_fulfillment', 'late_delivery', 'severe_delay'],
                required: true,
              },
              points: { type: Number, required: true },
              appliedAt: { type: Date, default: Date.now },
              note: { type: String },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
      lastEvaluatedAt: { type: Date },
    },
    cancellationIntelligence: {
      predictedReason: { type: String },
      predictedConfidence: { type: Number },
      retentionOffers: {
        type: [String],
        enum: ['size_exchange', 'shipping_speed_upgrade', 'coupon'],
        default: [],
      },
      riskScore: { type: Number, min: 0, max: 100 },
      pausedAt: { type: Date },
      pauseReason: { type: String },
    },
    paymentIntelligence: {
      optimizer: {
        selectedGateway: { type: String },
        reason: { type: String },
        alternatives: { type: Schema.Types.Mixed },
        evaluatedAt: { type: Date },
      },
      splitPayment: {
        enabled: { type: Boolean, default: false },
        installments: { type: Number },
      },
      paymentSchedule: {
        type: [
          new Schema(
            {
              installment: { type: Number },
              amount: { type: Number },
              dueDate: { type: String },
              status: { type: String },
              paidAt: { type: Date },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
      bnpl: { type: Schema.Types.Mixed },
      crypto: { type: Schema.Types.Mixed },
    },
    evidence: {
      media: {
        type: [
          new Schema(
            {
              type: { type: String, enum: ['video', 'image', 'document'], required: true },
              url: { type: String, required: true },
              uploadedBy: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
              uploadedAt: { type: Date, default: Date.now },
              note: { type: String },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
      hash: { type: String },
      verificationStatus: { type: String, enum: ['unverified', 'verified', 'tampered'], default: 'unverified' },
      lastUpdatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', orderSchema);


