import mongoose, { Document, Schema } from 'mongoose';

export type DeliveryPartnerType = 'courier' | 'in-house' | 'api';
export type DeliveryPartnerStatus = 'active' | 'inactive';
export type ApiStatus = 'connected' | 'disconnected' | 'error';

export interface IDeliveryPartner extends Document {
  name: string;
  type: DeliveryPartnerType;
  status: DeliveryPartnerStatus;
  onTimeDelivery: number;
  avgDeliveryTime: string;
  failedDeliveryRate: number;
  apiStatus: ApiStatus;
  totalShipments: number;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['courier', 'in-house', 'api'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    onTimeDelivery: { type: Number, default: 0 },
    avgDeliveryTime: { type: String, default: '-' },
    failedDeliveryRate: { type: Number, default: 0 },
    apiStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'error'],
      default: 'disconnected',
    },
    totalShipments: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DeliveryPartner = mongoose.model<IDeliveryPartner>('DeliveryPartner', deliveryPartnerSchema);
