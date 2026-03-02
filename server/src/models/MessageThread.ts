import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageAttachment {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
  type?: 'file' | 'voice' | 'image'; // Type of attachment
  duration?: number; // Duration in seconds for voice notes
}

export interface IMessageReaction {
  emoji: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IMessage extends Document {
  threadId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderType: 'seller' | 'buyer';
  content: string;
  attachments: IMessageAttachment[];
  readBy: mongoose.Types.ObjectId[];
  readAt?: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  editedAt?: Date;
  replyTo?: mongoose.Types.ObjectId; // Reference to message being replied to
  forwardedFrom?: {
    threadId: mongoose.Types.ObjectId;
    messageId: mongoose.Types.ObjectId;
    originalSender: mongoose.Types.ObjectId;
  };
  reactions: IMessageReaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageThread extends Document {
  sellerId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  subject: string;
  type: 'rfq' | 'message' | 'order';
  relatedOrderId?: mongoose.Types.ObjectId;
  relatedRfqId?: mongoose.Types.ObjectId;
  status: 'active' | 'archived' | 'resolved' | 'closed';
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCount: number;
  sellerUnreadCount: number;
  buyerUnreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const messageAttachmentSchema = new Schema<IMessageAttachment>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['file', 'voice', 'image'], default: 'file' },
    duration: { type: Number }, // Duration in seconds for voice notes
  },
  { _id: false }
);

const messageReactionSchema = new Schema<IMessageReaction>(
  {
    emoji: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    threadId: { type: Schema.Types.ObjectId, ref: 'MessageThread', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderType: { type: String, enum: ['seller', 'buyer'], required: true },
    content: { type: String, required: false, trim: true, default: '' }, // Optional - allow empty for media-only messages (validated at application level)
    attachments: { type: [messageAttachmentSchema], default: [] },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readAt: { type: Date },
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read'],
      default: 'sent',
      index: true,
    },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    editedAt: { type: Date },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    forwardedFrom: {
      threadId: { type: Schema.Types.ObjectId, ref: 'MessageThread' },
      messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
      originalSender: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    reactions: { type: [messageReactionSchema], default: [] },
  },
  { timestamps: true }
);

const messageThreadSchema = new Schema<IMessageThread>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, enum: ['rfq', 'message', 'order'], default: 'message', index: true },
    relatedOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    relatedRfqId: { type: Schema.Types.ObjectId },
    status: {
      type: String,
      enum: ['active', 'archived', 'resolved', 'closed'],
      default: 'active',
      index: true,
    },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, maxlength: 200 },
    unreadCount: { type: Number, default: 0 },
    sellerUnreadCount: { type: Number, default: 0 },
    buyerUnreadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for efficient queries
messageThreadSchema.index({ sellerId: 1, status: 1, lastMessageAt: -1 });
messageThreadSchema.index({ buyerId: 1, status: 1, lastMessageAt: -1 });
messageThreadSchema.index({ sellerId: 1, buyerId: 1 });
messageSchema.index({ threadId: 1, createdAt: -1 });

export const MessageThread = mongoose.model<IMessageThread>('MessageThread', messageThreadSchema);
export const Message = mongoose.model<IMessage>('Message', messageSchema);

