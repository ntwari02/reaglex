import mongoose, { Schema, Document } from 'mongoose';

export type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutMethod = 'mobile_money' | 'bank_transfer' | 'paypal' | 'flutterwave';

export interface IAffiliateLink extends Document {
  affiliateId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  customCode?: string; // Custom tracking code
  url: string; // Full affiliate URL
  clicks: number;
  conversions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAffiliateCommission extends Document {
  affiliateId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  linkId: mongoose.Types.ObjectId;
  orderAmount: number; // Total order amount
  commissionRate: number; // Percentage (e.g., 10 for 10%)
  commissionAmount: number; // Calculated commission
  status: CommissionStatus;
  category?: string;
  notes?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAffiliatePayout extends Document {
  affiliateId: mongoose.Types.ObjectId;
  amount: number;
  status: PayoutStatus;
  method: PayoutMethod;
  accountDetails: {
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
    mobileNumber?: string;
    provider?: string; // For mobile money
    email?: string; // For PayPal
  };
  transactionId?: string;
  commissionIds: mongoose.Types.ObjectId[]; // Commissions included in this payout
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAffiliate extends Document {
  userId: mongoose.Types.ObjectId;
  affiliateCode: string; // Unique code for this affiliate
  status: AffiliateStatus;
  commissionRates: {
    default: number; // Default commission rate
    categories: {
      [category: string]: number; // Category-specific rates
    };
  };
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number; // Total earned (including paid)
  paidEarnings: number; // Total paid out
  pendingEarnings: number; // Pending approval/payment
  payoutMethod?: PayoutMethod;
  payoutAccountDetails?: {
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
    mobileNumber?: string;
    provider?: string;
    email?: string;
  };
  minimumPayout: number; // Minimum amount before payout (default: 20)
  notes?: string; // Admin notes
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId; // Admin who approved
  createdAt: Date;
  updatedAt: Date;
}

const affiliateLinkSchema = new Schema<IAffiliateLink>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    customCode: { type: String, trim: true },
    url: { type: String, required: true, trim: true },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for tracking
affiliateLinkSchema.index({ affiliateId: 1, productId: 1 });
affiliateLinkSchema.index({ url: 1 });

const affiliateCommissionSchema = new Schema<IAffiliateCommission>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    linkId: { type: Schema.Types.ObjectId, ref: 'AffiliateLink', required: true },
    orderAmount: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'reversed'],
      default: 'pending',
      index: true,
    },
    category: { type: String, trim: true },
    notes: { type: String, trim: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for queries
affiliateCommissionSchema.index({ affiliateId: 1, status: 1 });
affiliateCommissionSchema.index({ orderId: 1 }); // Prevent duplicate commissions for same order
affiliateCommissionSchema.index({ createdAt: -1 });

const affiliatePayoutSchema = new Schema<IAffiliatePayout>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    method: {
      type: String,
      enum: ['mobile_money', 'bank_transfer', 'paypal', 'flutterwave'],
      required: true,
    },
    accountDetails: {
      accountNumber: { type: String, trim: true },
      accountName: { type: String, trim: true },
      bankName: { type: String, trim: true },
      mobileNumber: { type: String, trim: true },
      provider: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    transactionId: { type: String, trim: true },
    commissionIds: [{ type: Schema.Types.ObjectId, ref: 'AffiliateCommission' }],
    processedAt: { type: Date },
    failureReason: { type: String, trim: true },
  },
  { timestamps: true }
);

affiliatePayoutSchema.index({ affiliateId: 1, status: 1 });
affiliatePayoutSchema.index({ createdAt: -1 });

const affiliateSchema = new Schema<IAffiliate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    affiliateCode: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    commissionRates: {
      default: { type: Number, default: 5 }, // Default 5%
      categories: { type: Map, of: Number, default: {} },
    },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    paidEarnings: { type: Number, default: 0 },
    pendingEarnings: { type: Number, default: 0 },
    payoutMethod: {
      type: String,
      enum: ['mobile_money', 'bank_transfer', 'paypal', 'flutterwave'],
    },
    payoutAccountDetails: {
      accountNumber: { type: String, trim: true },
      accountName: { type: String, trim: true },
      bankName: { type: String, trim: true },
      mobileNumber: { type: String, trim: true },
      provider: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    minimumPayout: { type: Number, default: 20 },
    notes: { type: String, trim: true },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Generate unique affiliate code before saving
affiliateSchema.pre('save', async function (next: any) {
  if (!this.isNew || this.affiliateCode) {
    return next();
  }

  // Generate code from user ID or random
  let code: string = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    // Generate 6-8 character code
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const userIdStr = this.userId.toString().substring(0, 4).toUpperCase();
    code = `${userIdStr}${random}`;
    
    const existing = await mongoose.model('Affiliate').findOne({ affiliateCode: code });
    exists = !!existing;
    attempts++;
  }

  if (exists) {
    return next(new Error('Failed to generate unique affiliate code'));
  }

  this.affiliateCode = code;
  next();
});

export const Affiliate = mongoose.model<IAffiliate>('Affiliate', affiliateSchema);
export const AffiliateLink = mongoose.model<IAffiliateLink>('AffiliateLink', affiliateLinkSchema);
export const AffiliateCommission = mongoose.model<IAffiliateCommission>('AffiliateCommission', affiliateCommissionSchema);
export const AffiliatePayout = mongoose.model<IAffiliatePayout>('AffiliatePayout', affiliatePayoutSchema);

