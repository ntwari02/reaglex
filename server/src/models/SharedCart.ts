import mongoose, { Document, Schema } from 'mongoose';

export type SharedCartMemberRole = 'editor' | 'viewer';

export interface ISharedCartMember {
  userId: mongoose.Types.ObjectId;
  role: SharedCartMemberRole;
}

export interface ISharedCartItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  variantId?: string;
}

export interface ISharedCart extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  members: ISharedCartMember[];
  items: ISharedCartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const sharedCartSchema = new Schema<ISharedCart>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, default: 'Shared Cart' },
    members: {
      type: [
        new Schema<ISharedCartMember>(
          {
            userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            role: { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    items: {
      type: [
        new Schema<ISharedCartItem>(
          {
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, min: 1, max: 999, default: 1 },
            variantId: { type: String, trim: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

sharedCartSchema.index({ ownerId: 1, createdAt: -1 });
sharedCartSchema.index({ 'members.userId': 1 });

export const SharedCart = mongoose.model<ISharedCart>('SharedCart', sharedCartSchema);
