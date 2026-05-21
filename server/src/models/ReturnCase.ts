import mongoose, { Document, Schema } from 'mongoose';

export type ReturnCaseStatus =
  | 'requested'
  | 'seller_reviewing'
  | 'approved'
  | 'item_returned'
  | 'refund_processed'
  | 'rejected'
  | 'resolved';

export interface IReturnCaseEvidence {
  kind: 'image' | 'video' | 'receipt' | 'packaging' | 'document';
  url: string;
  name?: string;
  sizeBytes?: number;
  mimeType?: string;
  linkedOrderItemId?: string;
  integrityHash?: string;
  uploadedAt: Date;
}

export interface IReturnCaseMessage {
  actorRole: 'buyer' | 'seller' | 'admin' | 'system';
  actorId?: string;
  text: string;
  attachments?: string[];
  createdAt: Date;
}

export interface IReturnCase extends Document {
  caseNumber: string;
  orderId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  splitGroupKey: string;
  orderItemIds: string[];
  reasonCode: string;
  reasonLabel: string;
  description: string;
  aiSummary?: string;
  aiRewrittenDescription?: string;
  returnType: 'refund_only' | 'return_and_refund' | 'replacement' | 'exchange';
  status: ReturnCaseStatus;
  fraudSignals: {
    abuseScore: number;
    suspiciousPatterns: string[];
    consistencyWarnings: string[];
    autoApprovalRecommended: boolean;
  };
  authenticityCheck: {
    score: number;
    notes: string[];
    matchedProductMedia: boolean;
  };
  resolutionMetrics: {
    sellerDefectRate: number;
    buyerReturnFrequency: number;
    estimatedResolutionHours: number;
  };
  escrowSnapshot: {
    escrowStatus?: string;
    frozenAt?: Date;
    freezeReason?: string;
  };
  refund: {
    amount: number;
    currency: string;
    method: 'momo' | 'flutterwave_card' | 'wallet' | 'original_payment';
    etaLabel?: string;
    processedAt?: Date;
  };
  shipping: {
    returnAddress?: string;
    qrLabelUrl?: string;
    courierOptions: string[];
    selectedCourier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };
  disputeId?: mongoose.Types.ObjectId;
  evidence: IReturnCaseEvidence[];
  timeline: Array<{
    stage: ReturnCaseStatus;
    label: string;
    at: Date;
  }>;
  chat: IReturnCaseMessage[];
  postDeliveryResolution?: {
    kind: 'replacement' | 'exchange' | 'repair';
    status: 'open' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  };
  createdAt: Date;
  updatedAt: Date;
}

const evidenceSchema = new Schema<IReturnCaseEvidence>(
  {
    kind: { type: String, enum: ['image', 'video', 'receipt', 'packaging', 'document'], required: true },
    url: { type: String, required: true },
    name: { type: String },
    sizeBytes: { type: Number },
    mimeType: { type: String },
    linkedOrderItemId: { type: String },
    integrityHash: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const chatSchema = new Schema<IReturnCaseMessage>(
  {
    actorRole: { type: String, enum: ['buyer', 'seller', 'admin', 'system'], required: true },
    actorId: { type: String },
    text: { type: String, required: true },
    attachments: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const returnCaseSchema = new Schema<IReturnCase>(
  {
    caseNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    splitGroupKey: { type: String, required: true, index: true },
    orderItemIds: { type: [String], default: [] },
    reasonCode: { type: String, required: true, index: true },
    reasonLabel: { type: String, required: true },
    description: { type: String, required: true },
    aiSummary: { type: String },
    aiRewrittenDescription: { type: String },
    returnType: {
      type: String,
      enum: ['refund_only', 'return_and_refund', 'replacement', 'exchange'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['requested', 'seller_reviewing', 'approved', 'item_returned', 'refund_processed', 'rejected', 'resolved'],
      default: 'requested',
      index: true,
    },
    fraudSignals: {
      abuseScore: { type: Number, default: 0 },
      suspiciousPatterns: { type: [String], default: [] },
      consistencyWarnings: { type: [String], default: [] },
      autoApprovalRecommended: { type: Boolean, default: false },
    },
    authenticityCheck: {
      score: { type: Number, default: 50 },
      notes: { type: [String], default: [] },
      matchedProductMedia: { type: Boolean, default: false },
    },
    resolutionMetrics: {
      sellerDefectRate: { type: Number, default: 0 },
      buyerReturnFrequency: { type: Number, default: 0 },
      estimatedResolutionHours: { type: Number, default: 72 },
    },
    escrowSnapshot: {
      escrowStatus: { type: String },
      frozenAt: { type: Date },
      freezeReason: { type: String },
    },
    refund: {
      amount: { type: Number, required: true, default: 0 },
      currency: { type: String, default: 'USD' },
      method: { type: String, enum: ['momo', 'flutterwave_card', 'wallet', 'original_payment'], default: 'original_payment' },
      etaLabel: { type: String, default: '3-7 business days' },
      processedAt: { type: Date },
    },
    shipping: {
      returnAddress: { type: String },
      qrLabelUrl: { type: String },
      courierOptions: { type: [String], default: [] },
      selectedCourier: { type: String },
      trackingNumber: { type: String },
      trackingUrl: { type: String },
    },
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute' },
    evidence: { type: [evidenceSchema], default: [] },
    timeline: {
      type: [
        {
          stage: {
            type: String,
            enum: ['requested', 'seller_reviewing', 'approved', 'item_returned', 'refund_processed', 'rejected', 'resolved'],
          },
          label: { type: String, required: true },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    chat: { type: [chatSchema], default: [] },
    postDeliveryResolution: {
      kind: { type: String, enum: ['replacement', 'exchange', 'repair'] },
      status: { type: String, enum: ['open', 'approved', 'in_progress', 'completed', 'rejected'], default: 'open' },
    },
  },
  { timestamps: true },
);

returnCaseSchema.pre('validate', function preValidate() {
  if (this.caseNumber) return;
  const stamp = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  this.caseNumber = `RET-${stamp}-${rand}`;
});

returnCaseSchema.index({ buyerId: 1, createdAt: -1 });
returnCaseSchema.index({ sellerId: 1, createdAt: -1 });
returnCaseSchema.index({ orderId: 1, splitGroupKey: 1 });

export const ReturnCase = mongoose.model<IReturnCase>('ReturnCase', returnCaseSchema);

