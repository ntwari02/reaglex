import { z } from 'zod';

// Profile validation schemas
export const storeInfoSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(100, 'Store name must be less than 100 characters'),
  storeDescription: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100).optional(),
  businessType: z.string().optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  businessPhone: z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format').optional(),
  businessEmail: z.string().email('Invalid email address').optional(),
  businessAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  workingHours: z.object({
    monday: z.string().optional(),
    tuesday: z.string().optional(),
    wednesday: z.string().optional(),
    thursday: z.string().optional(),
    friday: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
  }).optional(),
  contactEmail: z.string().email('Invalid email address').optional(),
  contactPhone: z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format').optional(),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  socialMedia: z.object({
    facebook: z.string().url('Invalid URL format').optional().or(z.literal('')),
    twitter: z.string().url('Invalid URL format').optional().or(z.literal('')),
    instagram: z.string().url('Invalid URL format').optional().or(z.literal('')),
    linkedin: z.string().url('Invalid URL format').optional().or(z.literal('')),
  }).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    address: z.string().optional(),
  }).optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters (ISO 4217)').optional(),
  language: z.string().optional(),
});

// Password validation
export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Bank account validation
export const bankAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required').max(100),
  accountNumber: z.string().min(4, 'Account number must be at least 4 characters').max(50),
  routingNumber: z.string().min(4, 'Routing number must be at least 4 characters').max(20).optional(),
  accountHolderName: z.string().min(2, 'Account holder name is required').max(100),
  accountType: z.enum(['checking', 'savings']),
  country: z.string().min(2, 'Country is required').max(100),
  currency: z.string().length(3, 'Currency must be 3 characters (ISO 4217)'),
  swiftCode: z.string().max(11, 'SWIFT code must be 11 characters or less').optional(),
  iban: z.string().max(34, 'IBAN must be 34 characters or less').optional(),
  isDefault: z.boolean(),
  password: z.string().min(1, 'Password is required for security'),
});

// Mobile money validation
export const mobileMoneySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  number: z.string().min(4, 'Mobile money number is required').max(20),
  accountHolderName: z.string().min(2, 'Account holder name is required').max(100),
  country: z.string().min(2, 'Country is required'),
  currency: z.string().length(3, 'Currency must be 3 characters (ISO 4217)'),
  password: z.string().min(1, 'Password is required for security'),
});

// Payout schedule validation
export const payoutScheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  minimumPayoutAmount: z.number().min(0, 'Minimum payout amount must be 0 or greater'),
  autoPayout: z.boolean(),
});

// Policy validation
export const policySchema = z.object({
  shippingPolicy: z.string().max(10000, 'Policy must be less than 10000 characters').optional(),
  returnPolicy: z.string().max(10000, 'Policy must be less than 10000 characters').optional(),
  refundPolicy: z.string().max(10000, 'Policy must be less than 10000 characters').optional(),
  storeTerms: z.string().max(10000, 'Policy must be less than 10000 characters').optional(),
});

// Team member validation
export const teamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required').max(100),
  access: z.array(z.string()).min(1, 'At least one permission is required'),
});

// Notification preferences validation
export const notificationPreferencesSchema = z.object({
  email: z.object({
    newOrders: z.boolean(),
    newMessages: z.boolean(),
    newReviews: z.boolean(),
    newDisputes: z.boolean(),
    lowStock: z.boolean(),
    paymentReceived: z.boolean(),
    marketing: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
  }),
  sms: z.object({
    newOrders: z.boolean(),
    newDisputes: z.boolean(),
    paymentReceived: z.boolean(),
    securityAlerts: z.boolean().optional(),
  }),
  push: z.object({
    enabled: z.boolean(),
    newOrders: z.boolean(),
    newMessages: z.boolean(),
    newReviews: z.boolean().optional(),
    newDisputes: z.boolean().optional(),
    lowStock: z.boolean().optional(),
  }),
  frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
  quietHours: z.object({
    enabled: z.boolean().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  timezone: z.string().optional(),
});

// Helper function to check password strength
export const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong' | 'very-strong'; score: number } => {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (password.length >= 16) score += 1;
  
  if (score <= 2) return { strength: 'weak', score };
  if (score <= 4) return { strength: 'medium', score };
  if (score <= 6) return { strength: 'strong', score };
  return { strength: 'very-strong', score };
};

// Phone number validation helper
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

// IBAN validation helper
export const validateIBAN = (iban: string): boolean => {
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
};

// SWIFT code validation helper
export const validateSWIFT = (swift: string): boolean => {
  const swiftRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return swiftRegex.test(swift);
};

