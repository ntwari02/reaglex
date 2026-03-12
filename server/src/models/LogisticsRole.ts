import mongoose, { Document, Schema } from 'mongoose';

export interface ILogisticsRolePermissions {
  manageDrivers: boolean;
  viewOrders: boolean;
  editOrders: boolean;
  manageWarehouses: boolean;
  editShippingRates: boolean;
  viewAnalytics: boolean;
}

export interface ILogisticsRole extends Document {
  name: string;
  permissions: ILogisticsRolePermissions;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const permissionsSchema = new Schema<ILogisticsRolePermissions>(
  {
    manageDrivers: { type: Boolean, default: false },
    viewOrders: { type: Boolean, default: false },
    editOrders: { type: Boolean, default: false },
    manageWarehouses: { type: Boolean, default: false },
    editShippingRates: { type: Boolean, default: false },
    viewAnalytics: { type: Boolean, default: false },
  },
  { _id: false }
);

const logisticsRoleSchema = new Schema<ILogisticsRole>(
  {
    name: { type: String, required: true, trim: true },
    permissions: { type: permissionsSchema, required: true, default: () => ({}) },
    userCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const LogisticsRole = mongoose.model<ILogisticsRole>('LogisticsRole', logisticsRoleSchema);
