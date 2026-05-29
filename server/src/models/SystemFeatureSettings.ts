import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemFeatureAuditEntry {
  at: Date;
  actorUserId: string;
  actorEmail?: string;
  changes: Array<{ key: string; from: boolean; to: boolean }>;
  unlockVerified: boolean;
}

export interface ISystemFeatureSettings extends Document {
  singletonKey: string;
  /** Explicit overrides only — absent key means default ON from registry. */
  overrides: Record<string, boolean>;
  auditLog: ISystemFeatureAuditEntry[];
  updatedAt: Date;
  createdAt: Date;
}

const auditEntrySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    actorUserId: { type: String, required: true },
    actorEmail: { type: String },
    changes: [
      {
        key: { type: String, required: true },
        from: { type: Boolean, required: true },
        to: { type: Boolean, required: true },
      },
    ],
    unlockVerified: { type: Boolean, default: false },
  },
  { _id: false },
);

const systemFeatureSettingsSchema = new Schema<ISystemFeatureSettings>(
  {
    singletonKey: { type: String, default: 'platform', unique: true, index: true },
    overrides: { type: Schema.Types.Mixed, default: {} },
    auditLog: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true },
);

export const SystemFeatureSettings = mongoose.model<ISystemFeatureSettings>(
  'SystemFeatureSettings',
  systemFeatureSettingsSchema,
);

const SINGLETON_KEY = 'platform';

export async function getSystemFeatureSettingsDoc() {
  let doc = await SystemFeatureSettings.findOne({ singletonKey: SINGLETON_KEY });
  if (!doc) {
    doc = await SystemFeatureSettings.create({ singletonKey: SINGLETON_KEY, overrides: {} });
  }
  return doc;
}
