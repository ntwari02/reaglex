import mongoose, { Document, Schema } from 'mongoose';

export type ExceptionType = 'failed_delivery' | 'delayed' | 'lost' | 'damaged' | 'sla_breach';
export type ExceptionStatus = 'open' | 'investigating' | 'resolved';

export interface ILogisticsException extends Document {
  type: ExceptionType;
  shipmentId: string;
  orderId: string;
  partner: string;
  description: string;
  status: ExceptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const logisticsExceptionSchema = new Schema<ILogisticsException>(
  {
    type: {
      type: String,
      enum: ['failed_delivery', 'delayed', 'lost', 'damaged', 'sla_breach'],
      required: true,
      index: true,
    },
    shipmentId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    partner: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

logisticsExceptionSchema.index({ shipmentId: 'text', orderId: 'text' });

export const LogisticsException = mongoose.model<ILogisticsException>(
  'LogisticsException',
  logisticsExceptionSchema
);
