import mongoose, { Document, Schema } from 'mongoose';

export type AutomationRuleStatus = 'active' | 'inactive';

export interface INotificationAutomationRule extends Document {
  name: string;
  condition: string;
  trigger: string;
  notificationType: string;
  status: AutomationRuleStatus;
  createdAt: Date;
  updatedAt: Date;
}

const notificationAutomationRuleSchema = new Schema<INotificationAutomationRule>(
  {
    name: { type: String, required: true, trim: true },
    condition: { type: String, required: true, trim: true },
    trigger: { type: String, required: true, trim: true },
    notificationType: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

export const NotificationAutomationRule = mongoose.model<INotificationAutomationRule>(
  'NotificationAutomationRule',
  notificationAutomationRuleSchema
);
