import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouse extends Document {
  sellerId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  capacity: number;
  currentStock: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true },
    currentStock: { type: Number, required: true, default: 0 },
    isDefault: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

export const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);


