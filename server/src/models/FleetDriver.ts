import mongoose, { Document, Schema } from 'mongoose';

export type DriverStatus = 'active' | 'offline' | 'on-delivery';

export interface IFleetDriver extends Document {
  name: string;
  phone: string;
  vehicle: string;
  status: DriverStatus;
  onTimeDelivery: number;
  totalDeliveries: number;
  avgDeliveryTime: string;
  currentLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fleetDriverSchema = new Schema<IFleetDriver>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    vehicle: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'offline', 'on-delivery'],
      default: 'offline',
      index: true,
    },
    onTimeDelivery: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    avgDeliveryTime: { type: String, default: '-' },
    currentLocation: { type: String, trim: true },
  },
  { timestamps: true }
);

export const FleetDriver = mongoose.model<IFleetDriver>('FleetDriver', fleetDriverSchema);
