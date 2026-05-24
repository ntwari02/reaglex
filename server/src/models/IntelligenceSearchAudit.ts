import mongoose, { Schema } from 'mongoose';

export interface IIntelligenceSearchAudit {
  adminId: mongoose.Types.ObjectId;
  query: string;
  intent: string;
  resultCount: number;
  engine: string;
  ip?: string;
  createdAt: Date;
}

const schema = new Schema<IIntelligenceSearchAudit>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    query: { type: String, required: true, maxlength: 256 },
    intent: { type: String, default: 'general' },
    resultCount: { type: Number, default: 0 },
    engine: { type: String, default: 'mongodb' },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ createdAt: -1 });

export const IntelligenceSearchAudit = mongoose.model<IIntelligenceSearchAudit>(
  'IntelligenceSearchAudit',
  schema,
);

export async function logIntelligenceSearch(opts: {
  adminId: string;
  query: string;
  intent: string;
  resultCount: number;
  engine: string;
  ip?: string;
}): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(opts.adminId)) return;
    await IntelligenceSearchAudit.create({
      adminId: new mongoose.Types.ObjectId(opts.adminId),
      query: opts.query.slice(0, 256),
      intent: opts.intent,
      resultCount: opts.resultCount,
      engine: opts.engine,
      ip: opts.ip,
    });
  } catch {
    /* non-blocking */
  }
}
