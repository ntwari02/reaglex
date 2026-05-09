import mongoose, { Schema, Document } from 'mongoose';

export interface IApiConfiguration extends Document {
  apiId: string;
  config: Record<string, unknown>;
  auditLogs: Array<{
    at: Date;
    actor: string;
    action: string;
    summary: string;
  }>;
  lastTestAt?: Date;
  lastTestOk?: boolean;
  lastTestMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const apiAuditLogSchema = new Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    actor: { type: String, required: true, default: 'admin' },
    action: { type: String, required: true },
    summary: { type: String, required: true },
  },
  { _id: false }
);

const apiConfigurationSchema = new Schema<IApiConfiguration>(
  {
    apiId: { type: String, required: true, unique: true, index: true },
    config: { type: Schema.Types.Mixed, default: {} },
    auditLogs: { type: [apiAuditLogSchema], default: [] },
    lastTestAt: { type: Date },
    lastTestOk: { type: Boolean },
    lastTestMessage: { type: String },
  },
  { timestamps: true }
);

export const ApiConfiguration =
  mongoose.models.ApiConfiguration ||
  mongoose.model<IApiConfiguration>('ApiConfiguration', apiConfigurationSchema);

