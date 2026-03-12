import mongoose, { Document, Schema } from 'mongoose';

export type IntegrationType = 'api' | 'webhook';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface ILogisticsIntegration extends Document {
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  lastSync?: Date;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const logisticsIntegrationSchema = new Schema<ILogisticsIntegration>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['api', 'webhook'],
      required: true,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error'],
      default: 'disconnected',
      index: true,
    },
    lastSync: { type: Date },
    errorCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const LogisticsIntegration = mongoose.model<ILogisticsIntegration>(
  'LogisticsIntegration',
  logisticsIntegrationSchema
);
