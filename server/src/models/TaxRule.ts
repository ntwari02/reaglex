import mongoose, { Document, Schema } from 'mongoose';

export type TaxRuleType = 'standard' | 'location_based' | 'product_based' | 'seller_based';
export type TaxAppliesTo = 'all' | 'products' | 'services' | 'shipping';

export interface ITaxRule extends Document {
  name: string;
  type: TaxRuleType;
  rate: number;
  location?: string;
  category?: string;
  sellerId?: mongoose.Types.ObjectId;
  appliesTo: TaxAppliesTo;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const taxRuleSchema = new Schema<ITaxRule>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['standard', 'location_based', 'product_based', 'seller_based'],
      required: true,
    },
    rate: { type: Number, required: true },
    location: { type: String },
    category: { type: String },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    appliesTo: {
      type: String,
      enum: ['all', 'products', 'services', 'shipping'],
      default: 'all',
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true }
);

taxRuleSchema.index({ status: 1 });

export const TaxRule = mongoose.model<ITaxRule>('TaxRule', taxRuleSchema);
