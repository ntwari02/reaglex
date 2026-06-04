import mongoose, { Schema, Document } from 'mongoose';

export interface ISellerAdvertisingLead extends Document {
  sellerId?: mongoose.Types.ObjectId;
  companyName: string;
  email: string;
  budget?: string;
  adType: string;
  message?: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const sellerAdvertisingLeadSchema = new Schema<ISellerAdvertisingLead>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    budget: { type: String, trim: true, maxlength: 64 },
    adType: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 4000 },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new', index: true },
  },
  { timestamps: true },
);

export const SellerAdvertisingLead = mongoose.model<ISellerAdvertisingLead>(
  'SellerAdvertisingLead',
  sellerAdvertisingLeadSchema,
);
