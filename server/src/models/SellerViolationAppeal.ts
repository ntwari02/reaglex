import mongoose, { Document, Schema } from 'mongoose';

export type ViolationAppealStatus = 'pending' | 'reviewing' | 'approved' | 'denied';

export interface ISellerViolationAppeal extends Document {
  sellerId: mongoose.Types.ObjectId;
  ticketNumber: string;
  explanation: string;
  evidenceUrls: string[];
  status: ViolationAppealStatus;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sellerViolationAppealSchema = new Schema<ISellerViolationAppeal>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ticketNumber: { type: String, required: true, trim: true, maxlength: 64, index: true },
    explanation: { type: String, required: true, trim: true, maxlength: 8000 },
    evidenceUrls: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'approved', 'denied'],
      default: 'pending',
      index: true,
    },
    adminNotes: { type: String, trim: true, maxlength: 4000 },
  },
  { timestamps: true },
);

sellerViolationAppealSchema.index({ sellerId: 1, ticketNumber: 1 });

export const SellerViolationAppeal = mongoose.model<ISellerViolationAppeal>(
  'SellerViolationAppeal',
  sellerViolationAppealSchema,
);
