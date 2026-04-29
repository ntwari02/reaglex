import mongoose, { Document, Schema } from 'mongoose';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'flagged' | 'rejected';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface IProductVerification extends Document {
  productId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  reaglexProductId: string;
  identifiers: {
    barcode?: string;
    ean?: string;
    upc?: string;
    qrCode?: string;
    serialNumber?: string;
    imei?: string;
    rfid?: string;
    nfc?: string;
  };
  externalChecks: {
    provider: string;
    matchedTitle?: boolean;
    matchedBrand?: boolean;
    matchedModel?: boolean;
    matchedCategory?: boolean;
    confidence?: number;
    raw?: Record<string, unknown>;
    checkedAt?: Date;
  }[];
  aiChecks: {
    imageSimilarityScore?: number;
    categoryConsistencyScore?: number;
    stolenImageSuspected?: boolean;
    videoProofUploaded?: boolean;
    labelProofUploaded?: boolean;
    notes?: string[];
    checkedAt?: Date;
  };
  verificationScore: number;
  riskLevel: RiskLevel;
  status: VerificationStatus;
  suspiciousFlags: string[];
  manualReview: {
    required: boolean;
    status: 'not_required' | 'queued' | 'in_review' | 'approved' | 'rejected';
    reviewerId?: mongoose.Types.ObjectId;
    notes?: string;
    reviewedAt?: Date;
  };
  printableQrUrl?: string;
  auditTrail: {
    actorId?: mongoose.Types.ObjectId;
    action: string;
    note?: string;
    at: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const productVerificationSchema = new Schema<IProductVerification>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reaglexProductId: { type: String, required: true, index: true },
    identifiers: {
      barcode: { type: String, trim: true },
      ean: { type: String, trim: true },
      upc: { type: String, trim: true },
      qrCode: { type: String, trim: true },
      serialNumber: { type: String, trim: true },
      imei: { type: String, trim: true },
      rfid: { type: String, trim: true },
      nfc: { type: String, trim: true },
    },
    externalChecks: {
      type: [
        {
          provider: { type: String, required: true, trim: true },
          matchedTitle: { type: Boolean },
          matchedBrand: { type: Boolean },
          matchedModel: { type: Boolean },
          matchedCategory: { type: Boolean },
          confidence: { type: Number },
          raw: { type: Schema.Types.Mixed },
          checkedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    aiChecks: {
      imageSimilarityScore: { type: Number, default: 0 },
      categoryConsistencyScore: { type: Number, default: 0 },
      stolenImageSuspected: { type: Boolean, default: false },
      videoProofUploaded: { type: Boolean, default: false },
      labelProofUploaded: { type: Boolean, default: false },
      notes: { type: [String], default: [] },
      checkedAt: { type: Date },
    },
    verificationScore: { type: Number, default: 0, index: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
    status: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'flagged', 'rejected'],
      default: 'unverified',
      index: true,
    },
    suspiciousFlags: { type: [String], default: [] },
    manualReview: {
      required: { type: Boolean, default: false, index: true },
      status: {
        type: String,
        enum: ['not_required', 'queued', 'in_review', 'approved', 'rejected'],
        default: 'not_required',
        index: true,
      },
      reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
      notes: { type: String },
      reviewedAt: { type: Date },
    },
    printableQrUrl: { type: String, trim: true },
    auditTrail: {
      type: [
        {
          actorId: { type: Schema.Types.ObjectId, ref: 'User' },
          action: { type: String, required: true },
          note: { type: String },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

productVerificationSchema.index({ sellerId: 1, status: 1, riskLevel: 1, updatedAt: -1 });
productVerificationSchema.index({ suspiciousFlags: 1 });

export const ProductVerification = mongoose.model<IProductVerification>(
  'ProductVerification',
  productVerificationSchema,
);

