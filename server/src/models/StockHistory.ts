import mongoose, { Schema, Document } from 'mongoose';

export type StockChangeType = 'added' | 'removed' | 'sold';

export interface IStockHistory extends Document {
  sellerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  change: number;
  reason: string;
  type: StockChangeType;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stockHistorySchema = new Schema<IStockHistory>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    change: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['added', 'removed', 'sold'],
      required: true,
      index: true,
    },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const StockHistory = mongoose.model<IStockHistory>('StockHistory', stockHistorySchema);


