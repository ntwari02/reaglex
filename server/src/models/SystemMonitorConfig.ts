import mongoose, { Document, Schema } from 'mongoose';

export interface IAlertNotificationContacts {
  emails: string[];
  phones: string[];
  slackWebhookUrl?: string;
}

export interface ISystemMonitorConfig extends Document {
  key: string;
  monitoringEnabled: boolean;
  cpuWarn: number;
  cpuCritical: number;
  ramWarn: number;
  ramCritical: number;
  diskWarn: number;
  diskCritical: number;
  errorRateWarn: number;
  apiSlowWarnMs: number;
  apiSlowCriticalMs: number;
  sensitivity: 'strict' | 'normal' | 'relaxed';
  notifications: IAlertNotificationContacts & {
    notifyOnCritical: boolean;
    notifyOnWarning: boolean;
    cooldownMinutes: number;
  };
  /** alert dedupe key → ISO timestamp */
  lastNotifiedAt: Record<string, string>;
  updatedAt: Date;
}

const systemMonitorConfigSchema = new Schema<ISystemMonitorConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    monitoringEnabled: { type: Boolean, default: true },
    cpuWarn: { type: Number, default: 70 },
    cpuCritical: { type: Number, default: 85 },
    ramWarn: { type: Number, default: 80 },
    ramCritical: { type: Number, default: 92 },
    diskWarn: { type: Number, default: 85 },
    diskCritical: { type: Number, default: 95 },
    errorRateWarn: { type: Number, default: 5 },
    apiSlowWarnMs: { type: Number, default: 1000 },
    apiSlowCriticalMs: { type: Number, default: 3000 },
    sensitivity: { type: String, enum: ['strict', 'normal', 'relaxed'], default: 'normal' },
    notifications: {
      emails: { type: [String], default: [] },
      phones: { type: [String], default: [] },
      slackWebhookUrl: { type: String, default: '' },
      notifyOnCritical: { type: Boolean, default: true },
      notifyOnWarning: { type: Boolean, default: true },
      cooldownMinutes: { type: Number, default: 30 },
    },
    lastNotifiedAt: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const SystemMonitorConfig = mongoose.model<ISystemMonitorConfig>(
  'SystemMonitorConfig',
  systemMonitorConfigSchema,
);
