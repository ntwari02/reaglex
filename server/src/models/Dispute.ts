import mongoose, { Document, Schema } from 'mongoose';

export interface IDisputeEvidence {
  type: 'photo' | 'document' | 'message' | 'receipt' | 'video' | 'other';
  url: string;
  description?: string;
  uploadedAt: Date;
}

export interface IDispute extends Document {
  disputeNumber: string;
  orderId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  type: 'refund' | 'return' | 'quality' | 'delivery' | 'other';
  reason: string;
  description: string;
  status: 'new' | 'under_review' | 'seller_response' | 'buyer_response' | 'approved' | 'rejected' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence: IDisputeEvidence[];
  sellerResponse?: string;
  sellerResponseAt?: Date;
  buyerResponse?: string;
  buyerResponseAt?: Date;
  adminDecision?: string;
  adminDecisionAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolution?: string;
  responseDeadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const disputeEvidenceSchema = new Schema<IDisputeEvidence>(
  {
    type: {
      type: String,
      enum: ['photo', 'document', 'message', 'receipt', 'video', 'other'],
      required: true,
    },
    url: { type: String, required: true },
    description: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const disputeSchema = new Schema<IDispute>(
  {
    disputeNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['refund', 'return', 'quality', 'delivery', 'other'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['new', 'under_review', 'seller_response', 'buyer_response', 'approved', 'rejected', 'resolved'],
      default: 'new',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    evidence: { type: [disputeEvidenceSchema], default: [] },
    sellerResponse: { type: String },
    sellerResponseAt: { type: Date },
    buyerResponse: { type: String },
    buyerResponseAt: { type: Date },
    adminDecision: { type: String },
    adminDecisionAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolution: { type: String },
    responseDeadline: { type: Date, index: true },
  },
  { timestamps: true }
);

// Generate unique dispute number before saving
disputeSchema.pre('save', async function () {
  if (!this.isNew || this.disputeNumber) {
    return;
  }
  
  let disputeNumber: string = '';
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (exists && attempts < maxAttempts) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    disputeNumber = `DSP-${timestamp}-${random}`;
    
    try {
      const existing = await mongoose.models.Dispute?.findOne({ disputeNumber }).lean();
      exists = !!existing;
    } catch (error) {
      exists = false;
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique dispute number');
  }
  
  this.disputeNumber = disputeNumber;
});

// Indexes
disputeSchema.index({ sellerId: 1, status: 1 });
disputeSchema.index({ sellerId: 1, createdAt: -1 });

export const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);

