import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketMessage {
  _id?: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: 'seller' | 'admin' | 'support';
  message: string;
  attachments?: string[]; // File URLs
  isInternal?: boolean; // Internal notes visible only to admins
  createdAt: Date;
  readAt?: Date;
  readBy?: mongoose.Types.ObjectId[];
}

export interface ISupportTicket extends Document {
  ticketNumber: string; // Auto-generated unique ticket number
  sellerId: mongoose.Types.ObjectId;
  subject: string;
  category: 'technical' | 'billing' | 'account' | 'product' | 'payout' | 'verification' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  description: string;
  messages: ITicketMessage[];
  assignedTo?: mongoose.Types.ObjectId; // Admin/support staff
  tags?: string[];
  relatedOrderId?: mongoose.Types.ObjectId;
  relatedProductId?: mongoose.Types.ObjectId;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  satisfactionRating?: number; // 1-5 stars
  satisfactionFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketMessageSchema = new Schema<ITicketMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: {
      type: String,
      enum: ['seller', 'admin', 'support'],
      required: true,
    },
    message: { type: String, required: true },
    attachments: { type: [String], default: [] },
    isInternal: { type: Boolean, default: false },
    readAt: { type: Date },
    readBy: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: {
      type: String,
      required: false, // Will be auto-generated in pre-save hook
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['technical', 'billing', 'account', 'product', 'payout', 'verification', 'other'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    description: { type: String, required: true },
    messages: { type: [ticketMessageSchema], default: [] },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: { type: [String], default: [] },
    relatedOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    relatedProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    satisfactionRating: { type: Number, min: 1, max: 5 },
    satisfactionFeedback: { type: String },
  },
  { timestamps: true }
);

// Generate unique ticket number before saving
supportTicketSchema.pre('save', async function () {
  // Only generate ticket number for new documents
  if (!this.isNew) {
    return;
  }
  
  // Skip if ticket number already exists
  if (this.ticketNumber) {
    return;
  }
  
  let ticketNumber: string = '';
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (exists && attempts < maxAttempts) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    ticketNumber = `TKT-${timestamp}-${random}`;
    
    try {
      const existing = await mongoose.models.SupportTicket?.findOne({ ticketNumber }).lean();
      exists = !!existing;
    } catch (error) {
      // If model not found, assume it doesn't exist
      exists = false;
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique ticket number');
  }
  
  this.ticketNumber = ticketNumber;
});

// Indexes for better query performance
supportTicketSchema.index({ sellerId: 1, status: 1 });
supportTicketSchema.index({ sellerId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);

