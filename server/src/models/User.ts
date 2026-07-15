import mongoose, { Document, Schema } from 'mongoose';
import type { SpacillySellerShippingConfig } from '../types/spacillyShipping.types';

export type UserRole = 'buyer' | 'seller' | 'admin';

export type AdminStaffTier = 'super' | 'scoped';

export interface IAdminAccess {
  tier: AdminStaffTier;
  /** Permission scopes when tier is scoped; empty when super */
  scopes: string[];
  preset?: string;
  label?: string;
  createdBy?: mongoose.Types.ObjectId;
  require2FA?: boolean;
  lastScopeChangeAt?: Date;
}
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
  currency?: string; // ISO 4217 code when set or pinned
  /** When true, buyer chose currency in UI; otherwise show prices from IP/geo (AliExpress-style). */
  currencyUserPinned?: boolean;
  /** Opt-in Gemini help inside admin intelligence search (Ctrl+K) */
  intelligenceAiAssist?: boolean;
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
  /** Sub-role for admin staff (finance, support, etc.) — only when role === admin */
  adminAccess?: IAdminAccess;
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
  // Email verification (optional flow)
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  emailVerificationOtp?: string;
  emailVerificationOtpExpires?: Date;
  passwordResetOtp?: string;
  passwordResetOtpExpires?: Date;
  // Seller-specific fields
  sellerVerificationStatus?: SellerVerificationStatus;
  isSellerVerified?: boolean;
  /** Admin-approved permission to host live commerce sessions */
  liveCommerceApproved?: boolean;
    // Account status
    accountStatus?: 'active' | 'pending' | 'banned' | 'warned' | 'inactive';
  warningCount?: number;
  /** Unique shareable code for the marketing referral program */
  referralCode?: string;
  /** User who referred this account (reward triggers on referee's first paid order) */
  referredBy?: mongoose.Types.ObjectId;
  /** Spacilly marketplace shipping (sellers): warehouses, zones, methods, fees. */
  spacillySellerShipping?: SpacillySellerShippingConfig;
  rewards?: {
    points: number;
    lifetimePoints: number;
    lastEarnedAt?: Date;
  };
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
    currency: { type: String },
    currencyUserPinned: { type: Boolean, default: false },
    intelligenceAiAssist: { type: Boolean, default: false },
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

const spacillyWarehouseSchema = new Schema(
  {
    warehouseId: { type: String, required: true, trim: true },
    label: { type: String, default: 'Warehouse' },
    address: { type: String, default: '', trim: true },
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    pickupAvailable: { type: Boolean, default: false },
  },
  { _id: false }
);

const spacillyShippingDefaultsSchema = new Schema(
  {
    baseFee: { type: Number, default: 5 },
    ratePerKm: { type: Number, default: 0.35 },
    handlingFee: { type: Number, default: 0 },
    minShippingFee: { type: Number, default: 3 },
    freeShippingThreshold: { type: Number },
  },
  { _id: false }
);

const spacillyZoneSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: '' },
    countryCodes: [{ type: String, uppercase: true, trim: true }],
    surcharge: { type: Number, default: 0 },
  },
  { _id: false }
);

const spacillyMethodSchema = new Schema(
  {
    key: { type: String, enum: ['standard', 'express', 'overnight', 'pickup', 'free', 'flat_rate', 'local_delivery'], required: true },
    enabled: { type: Boolean, default: true },
    label: { type: String, trim: true },
    description: { type: String, trim: true },
    distanceMultiplier: { type: Number, default: 1.0 },
    flatFee: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
    maxRadiusKm: { type: Number, default: 20 },
    estimatedDays: { type: Number, default: 3 },
    etaDaysMin: { type: Number, default: 3 },
    etaDaysMax: { type: Number, default: 7 },
    baseFee: { type: Number },
    ratePerKm: { type: Number },
    handlingFee: { type: Number },
    minShippingFee: { type: Number },
    freeShippingThreshold: { type: Number },
    expressDistanceMultiplier: { type: Number },
    pickupFee: { type: Number, default: 0 },
  },
  { _id: false }
);

const spacillySellerShippingSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    currency: { type: String, default: 'USD' },
    warehouses: { type: [spacillyWarehouseSchema], default: [] },
    defaults: { type: spacillyShippingDefaultsSchema, default: () => ({}) },
    zones: { type: [spacillyZoneSchema], default: [] },
    methods: { type: [spacillyMethodSchema], default: [] },
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
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    emailVerificationOtp: { type: String, select: false },
    emailVerificationOtpExpires: { type: Date, select: false },
    passwordResetOtp: { type: String, select: false },
    passwordResetOtpExpires: { type: Date, select: false },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    adminAccess: {
      tier: { type: String, enum: ['super', 'scoped'], default: 'scoped' },
      scopes: { type: [String], default: [] },
      preset: { type: String },
      label: { type: String },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      require2FA: { type: Boolean, default: true },
      lastScopeChangeAt: { type: Date },
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
    liveCommerceApproved: {
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
    referralCode: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      index: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    spacillySellerShipping: { type: spacillySellerShippingSchema },
    rewards: {
      points: { type: Number, default: 0 },
      lifetimePoints: { type: Number, default: 0 },
      lastEarnedAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);


