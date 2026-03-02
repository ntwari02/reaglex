import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'buyer' | 'seller' | 'admin';
export type SellerVerificationStatus = 'pending' | 'approved' | 'rejected';
export type ProfileVisibility = 'public' | 'private' | 'friends';
export type Theme = 'light' | 'dark' | 'auto';
export type TwoFactorMethod = 'email' | 'sms' | 'app' | null;

export interface IAddress {
  label: string; // e.g., "Home", "Work"
  street: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface IPaymentMethod {
  type: 'card' | 'bank' | 'mobile_money' | 'crypto';
  provider?: string; // e.g., "Visa", "MTN Mobile Money"
  last4?: string; // Last 4 digits of card/account
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  billingAddress?: IAddress;
}

export interface INotificationSettings {
  email: {
    orderUpdates: boolean;
    promotions: boolean;
    securityAlerts: boolean;
    newsletter: boolean;
  };
  push: {
    orderUpdates: boolean;
    promotions: boolean;
    messages: boolean;
    securityAlerts: boolean;
  };
  sms: {
    orderUpdates: boolean;
    securityAlerts: boolean;
    promotions: boolean;
  };
}

export interface IPrivacySettings {
  profileVisibility: ProfileVisibility;
  showEmail: boolean;
  showPhone: boolean;
  allowMessages: boolean;
  showActivity: boolean;
}

export interface IUserPreferences {
  theme: Theme;
  language: string; // ISO 639-1 code, e.g., "en", "fr"
  currency: string; // ISO 4217 code, e.g., "RWF", "USD"
}

export interface ILoginHistory {
  date: Date;
  ip: string;
  location?: string;
  device?: string;
  userAgent?: string;
}

export interface ISecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: TwoFactorMethod;
  twoFactorSecret?: string; // TOTP secret for authenticator apps
  lastPasswordChangeAt: Date;
  loginHistory?: ILoginHistory[];
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  dateOfBirth?: Date;
  addresses: IAddress[];
  paymentMethods: IPaymentMethod[];
  notifications: INotificationSettings;
  privacy: IPrivacySettings;
  preferences: IUserPreferences;
  security: ISecuritySettings;
  // OAuth fields
  googleId?: string;
  // Seller-specific fields
  sellerVerificationStatus?: SellerVerificationStatus;
  isSellerVerified?: boolean;
    // Account status
    accountStatus?: 'active' | 'pending' | 'banned' | 'warned' | 'inactive';
  warningCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    label: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    type: {
      type: String,
      enum: ['card', 'bank', 'mobile_money', 'crypto'],
      required: true,
    },
    provider: { type: String },
    last4: { type: String },
    expiryMonth: { type: Number },
    expiryYear: { type: Number },
    isDefault: { type: Boolean, default: false },
    billingAddress: { type: addressSchema },
  },
  { _id: false }
);

const notificationSettingsSchema = new Schema<INotificationSettings>(
  {
    email: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
    },
    push: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      messages: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
    },
    sms: {
      orderUpdates: { type: Boolean, default: false },
      securityAlerts: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const privacySettingsSchema = new Schema<IPrivacySettings>(
  {
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'friends'],
      default: 'public',
    },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    allowMessages: { type: Boolean, default: true },
    showActivity: { type: Boolean, default: true },
  },
  { _id: false }
);

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light',
    },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'RWF' },
  },
  { _id: false }
);

const loginHistorySchema = new Schema<ILoginHistory>(
  {
    date: { type: Date, required: true, default: Date.now },
    ip: { type: String, required: true },
    location: { type: String },
    device: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
);

const securitySettingsSchema = new Schema<ISecuritySettings>(
  {
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorMethod: {
      type: String,
      enum: ['email', 'sms', 'app', null],
      default: null,
    },
    twoFactorSecret: { type: String, select: false }, // Don't include in default queries for security
    lastPasswordChangeAt: { type: Date, default: Date.now },
    loginHistory: { type: [loginHistorySchema], default: [] },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String }, // Optional for OAuth users
    googleId: { type: String, unique: true, sparse: true }, // Sparse index allows multiple nulls
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 500 },
    location: { type: String },
    website: { type: String },
    dateOfBirth: { type: Date },
    addresses: { type: [addressSchema], default: [] },
    paymentMethods: { type: [paymentMethodSchema], default: [] },
    notifications: {
      type: notificationSettingsSchema,
      default: () => ({}),
    },
    privacy: {
      type: privacySettingsSchema,
      default: () => ({}),
    },
    preferences: {
      type: userPreferencesSchema,
      default: () => ({}),
    },
    security: {
      type: securitySettingsSchema,
      default: () => ({
        twoFactorEnabled: false,
        twoFactorMethod: null,
        lastPasswordChangeAt: new Date(),
      }),
    },
    // When a user is a seller, they must be reviewed/approved
    sellerVerificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isSellerVerified: {
      type: Boolean,
      default: false,
    },
    // User account status
    accountStatus: {
      type: String,
      enum: ['active', 'pending', 'banned', 'warned', 'inactive'],
      default: 'active',
    },
    warningCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);


