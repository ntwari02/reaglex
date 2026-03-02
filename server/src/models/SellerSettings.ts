import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkingHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface IStorePolicies {
  shippingPolicy?: string;
  returnPolicy?: string;
  refundPolicy?: string;
  storeTerms?: string;
}

export interface ISellerPayoutMethod {
  method: 'bank_transfer' | 'mobile_money' | 'paypal' | 'crypto';
  bankName?: string;
  accountNumber?: string; // Stored encrypted
  routingNumber?: string; // Stored encrypted
  accountHolderName?: string;
  accountType?: 'checking' | 'savings';
  country?: string;
  currency?: string; // ISO 4217 currency code
  swiftCode?: string; // For international transfers
  iban?: string; // For international accounts
  paypalEmail?: string;
  mobileMoneyProvider?: string;
  mobileMoneyNumber?: string;
  cryptoWallet?: string;
  isDefault: boolean;
  // Verification status
  verificationStatus: 'pending' | 'verified' | 'failed' | 'unverified';
  verificationCode?: string; // For micro-deposit verification
  verifiedAt?: Date;
  addedAt: Date;
  lastModifiedAt?: Date;
  // Security
  requiresPasswordConfirmation?: boolean;
}

export interface ITeamMember {
  userId?: mongoose.Types.ObjectId; // Reference to User if they have an account
  name: string;
  email: string;
  role: string; // e.g., 'Sales Rep', 'Warehouse', 'Finance', 'Admin'
  access: string[]; // Array of permission strings like ['orders', 'rfqs', 'customers', 'inventory', 'fulfilment', 'everything']
  status: 'pending' | 'active' | 'inactive'; // Invitation status
  invitedAt?: Date;
  joinedAt?: Date;
}

export interface IVerificationDocuments {
  businessLicense?: string | null; // File URL
  isoCert?: string | null; // File URL
  auditReport?: string | null; // File URL
  uploadedAt?: Date;
}

export interface IVerificationStatus {
  status: 'pending' | 'verified' | 'rejected' | 'under_review';
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId; // Admin who verified
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId; // Admin who rejected
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId; // Admin currently reviewing
  lastReviewedAt?: Date;
}

export interface IPayoutSchedule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: number; // 0-6 (Sunday-Saturday) for weekly/biweekly
  dayOfMonth?: number; // 1-31 for monthly
  nextPayoutDate?: Date;
  lastPayoutDate?: Date;
  minimumPayoutAmount?: number; // Minimum balance required for payout
  autoPayout?: boolean; // Whether to automatically process payouts
}

export interface INotificationPreferences {
  email: {
    newOrders: boolean;
    newMessages: boolean;
    newReviews: boolean;
    newDisputes: boolean;
    lowStock: boolean;
    paymentReceived: boolean;
    marketing?: boolean;
    securityAlerts?: boolean;
  };
  sms: {
    newOrders: boolean;
    newDisputes: boolean;
    paymentReceived: boolean;
    securityAlerts?: boolean;
  };
  push: {
    enabled: boolean;
    newOrders: boolean;
    newMessages: boolean;
    newReviews?: boolean;
    newDisputes?: boolean;
    lowStock?: boolean;
  };
  frequency?: 'instant' | 'daily' | 'weekly';
  quietHours?: {
    enabled: boolean;
    start?: string; // HH:mm format
    end?: string; // HH:mm format
  };
  timezone?: string;
}

export interface IStoreContact {
  email?: string;
  phone?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export interface IStoreSettings {
  timezone?: string;
  currency?: string; // ISO 4217
  language?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  categories?: string[];
}

export interface ISellerSettings extends Document {
  sellerId: mongoose.Types.ObjectId;
  // Store Information
  storeName?: string;
  storeLogo?: string;
  storeBanner?: string;
  storeDescription?: string;
  isVisible?: boolean;
  workingHours?: IWorkingHours;
  // Business Information
  businessName?: string;
  businessType?: string; // LLC, Corporation, Sole Proprietorship, etc.
  taxId?: string;
  registrationNumber?: string;
  businessAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  businessPhone?: string;
  businessEmail?: string;
  // Store Policies
  policies?: IStorePolicies;
  // Payout Methods
  payoutMethods?: ISellerPayoutMethod[];
  // Allowed Categories (for future use)
  allowedCategories?: string[];
  // Team Members
  teamMembers?: ITeamMember[];
  // Verification Documents
  verificationDocuments?: IVerificationDocuments;
  // Verification Status (for admin/government review)
  verificationStatus?: IVerificationStatus;
  // Payout Schedule
  payoutSchedule?: IPayoutSchedule;
  // Notification Preferences
  notificationPreferences?: INotificationPreferences;
  // Store Contact Information
  storeContact?: IStoreContact;
  // Store Settings
  storeSettings?: IStoreSettings;
  createdAt: Date;
  updatedAt: Date;
}

const workingHoursSchema = new Schema<IWorkingHours>(
  {
    monday: { type: String },
    tuesday: { type: String },
    wednesday: { type: String },
    thursday: { type: String },
    friday: { type: String },
    saturday: { type: String },
    sunday: { type: String },
  },
  { _id: false }
);

const storePoliciesSchema = new Schema<IStorePolicies>(
  {
    shippingPolicy: { type: String },
    returnPolicy: { type: String },
    refundPolicy: { type: String },
    storeTerms: { type: String },
  },
  { _id: false }
);

const businessAddressSchema = new Schema(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const sellerPayoutMethodSchema = new Schema<ISellerPayoutMethod>(
  {
    method: {
      type: String,
      enum: ['bank_transfer', 'mobile_money', 'paypal', 'crypto'],
      required: true,
    },
    bankName: { type: String },
    accountNumber: { type: String }, // Will be encrypted before saving
    routingNumber: { type: String }, // Will be encrypted before saving
    accountHolderName: { type: String },
    accountType: {
      type: String,
      enum: ['checking', 'savings'],
    },
    country: { type: String },
    currency: { type: String }, // ISO 4217 code
    swiftCode: { type: String },
    iban: { type: String },
    paypalEmail: { type: String },
    mobileMoneyProvider: { type: String },
    mobileMoneyNumber: { type: String },
    cryptoWallet: { type: String },
    isDefault: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed', 'unverified'],
      default: 'pending',
    },
    verificationCode: { type: String }, // For micro-deposit verification
    verifiedAt: { type: Date },
    addedAt: { type: Date, default: Date.now },
    lastModifiedAt: { type: Date },
    requiresPasswordConfirmation: { type: Boolean, default: false },
  },
  { _id: true }
);

const teamMemberSchema = new Schema<ITeamMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    access: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive'],
      default: 'pending',
    },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date },
  },
  { _id: true }
);

const verificationDocumentsSchema = new Schema<IVerificationDocuments>(
  {
    businessLicense: { type: String },
    isoCert: { type: String },
    auditReport: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const payoutScheduleSchema = new Schema<IPayoutSchedule>(
  {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly',
    },
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday, 6 = Saturday
    dayOfMonth: { type: Number, min: 1, max: 31 },
    nextPayoutDate: { type: Date },
    lastPayoutDate: { type: Date },
    minimumPayoutAmount: { type: Number, default: 0 },
    autoPayout: { type: Boolean, default: true },
  },
  { _id: false }
);

const notificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    email: {
      newOrders: { type: Boolean, default: true },
      newMessages: { type: Boolean, default: true },
      newReviews: { type: Boolean, default: true },
      newDisputes: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      paymentReceived: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      securityAlerts: { type: Boolean, default: true },
    },
    sms: {
      newOrders: { type: Boolean, default: false },
      newDisputes: { type: Boolean, default: true },
      paymentReceived: { type: Boolean, default: false },
      securityAlerts: { type: Boolean, default: true },
    },
    push: {
      enabled: { type: Boolean, default: true },
      newOrders: { type: Boolean, default: true },
      newMessages: { type: Boolean, default: true },
      newReviews: { type: Boolean, default: true },
      newDisputes: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
    },
    frequency: {
      type: String,
      enum: ['instant', 'daily', 'weekly'],
      default: 'instant',
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String }, // HH:mm format
      end: { type: String }, // HH:mm format
    },
    timezone: { type: String },
  },
  { _id: false }
);

const storeContactSchema = new Schema<IStoreContact>(
  {
    email: { type: String },
    phone: { type: String },
    website: { type: String },
    socialMedia: {
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      linkedin: { type: String },
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
  },
  { _id: false }
);

const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    timezone: { type: String },
    currency: { type: String }, // ISO 4217
    language: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    categories: { type: [String], default: [] },
  },
  { _id: false }
);

const sellerSettingsSchema = new Schema<ISellerSettings>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Store Information
    storeName: { type: String, trim: true },
    storeLogo: { type: String },
    storeBanner: { type: String },
    storeDescription: { type: String, maxlength: 2000 },
    isVisible: { type: Boolean, default: true },
    workingHours: { type: workingHoursSchema },
    // Business Information
    businessName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    taxId: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    businessAddress: { type: businessAddressSchema },
    businessPhone: { type: String, trim: true },
    businessEmail: { type: String, trim: true, lowercase: true },
    // Store Policies
    policies: { type: storePoliciesSchema },
    // Payout Methods
    payoutMethods: { type: [sellerPayoutMethodSchema], default: [] },
    // Allowed Categories
    allowedCategories: { type: [String], default: [] },
    // Team Members
    teamMembers: { type: [teamMemberSchema], default: [] },
    // Verification Documents
    verificationDocuments: { type: verificationDocumentsSchema },
    // Verification Status (for admin/government review)
    verificationStatus: {
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'under_review'],
        default: 'pending',
      },
      verifiedAt: { type: Date },
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      rejectedAt: { type: Date },
      rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      rejectionReason: { type: String },
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      lastReviewedAt: { type: Date },
    },
    // Payout Schedule
    payoutSchedule: { type: payoutScheduleSchema },
  },
  { timestamps: true }
);

export const SellerSettings = mongoose.model<ISellerSettings>(
  'SellerSettings',
  sellerSettingsSchema
);

