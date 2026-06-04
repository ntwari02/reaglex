import mongoose, { Document, Schema } from 'mongoose';

/** Platform-wide intelligence search settings (super admin). */
export interface IAdminIntelligenceConfig extends Document {
  key: string;
  /** Master switch — when false, no admin can use Gemini assist even if opted in */
  platformAiEnabled: boolean;
  updatedAt: Date;
}

const schema = new Schema<IAdminIntelligenceConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    platformAiEnabled: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const AdminIntelligenceConfig = mongoose.model<IAdminIntelligenceConfig>(
  'AdminIntelligenceConfig',
  schema,
);
