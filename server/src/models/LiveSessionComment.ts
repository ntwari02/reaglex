import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveSessionComment extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  guestId?: string;
  displayName: string;
  text: string;
  isSellerReply: boolean;
  replyToId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const liveSessionCommentSchema = new Schema<ILiveSessionComment>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'LiveCommerceSession', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    guestId: { type: String },
    displayName: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    isSellerReply: { type: Boolean, default: false },
    replyToId: { type: Schema.Types.ObjectId, ref: 'LiveSessionComment' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

liveSessionCommentSchema.index({ sessionId: 1, createdAt: -1 });

export const LiveSessionComment = mongoose.model<ILiveSessionComment>(
  'LiveSessionComment',
  liveSessionCommentSchema
);
