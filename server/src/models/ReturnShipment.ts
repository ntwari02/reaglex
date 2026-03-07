import mongoose, { Document, Schema } from 'mongoose';

export type ReturnStatus = 'pending' | 'pickup_scheduled' | 'in_transit' | 'received' | 'refunded';

export interface IReturnShipment extends Document {
  returnNumber: string;
  orderId: string;
  customerName: string;
  status: ReturnStatus;
  returnReason: string;
  pickupDriver?: string;
  refundAmount: number;
  returnCost: number;
  createdAt: Date;
  updatedAt: Date;
}

const returnShipmentSchema = new Schema<IReturnShipment>(
  {
    returnNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    orderId: { type: String, required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'pickup_scheduled', 'in_transit', 'received', 'refunded'],
      default: 'pending',
      index: true,
    },
    returnReason: { type: String, required: true, trim: true },
    pickupDriver: { type: String, trim: true },
    refundAmount: { type: Number, default: 0 },
    returnCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

returnShipmentSchema.index({ returnNumber: 'text', orderId: 'text' });

export const ReturnShipment = mongoose.model<IReturnShipment>('ReturnShipment', returnShipmentSchema);
