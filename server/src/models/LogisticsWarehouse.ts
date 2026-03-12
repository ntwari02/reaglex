import mongoose, { Document, Schema } from 'mongoose';

export interface ILogisticsWarehouse extends Document {
  name: string;
  location: string;
  totalStock: number;
  lowStockItems: number;
  inboundShipments: number;
  outboundShipments: number;
  damagedItems: number;
  createdAt: Date;
  updatedAt: Date;
}

const logisticsWarehouseSchema = new Schema<ILogisticsWarehouse>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    totalStock: { type: Number, default: 0 },
    lowStockItems: { type: Number, default: 0 },
    inboundShipments: { type: Number, default: 0 },
    outboundShipments: { type: Number, default: 0 },
    damagedItems: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const LogisticsWarehouse = mongoose.model<ILogisticsWarehouse>('LogisticsWarehouse', logisticsWarehouseSchema);
