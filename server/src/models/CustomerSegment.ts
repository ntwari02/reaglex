import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerSegment extends Document {
  name: string;
  filters: string[];
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const customerSegmentSchema = new Schema<ICustomerSegment>(
  {
    name: { type: String, required: true, trim: true },
    filters: [{ type: String }],
    userCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CustomerSegment = mongoose.model<ICustomerSegment>(
  'CustomerSegment',
  customerSegmentSchema
);
