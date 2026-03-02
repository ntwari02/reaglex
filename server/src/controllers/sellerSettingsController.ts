import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  SellerSettings,
  ISellerSettings,
  ISellerPayoutMethod,
  ITeamMember,
  IVerificationDocuments,
} from '../models/SellerSettings';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { encrypt, decrypt, maskAccountNumber, maskRoutingNumber } from '../utils/encryption';

// Helper to get seller ID from request
const getSellerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

// Validation schemas
const updateStoreInfoSchema = z.object({
  storeName: z.string().min(1).max(100).optional(),
  storeLogo: z.string().optional().or(z.literal('')),
  storeBanner: z.string().optional().or(z.literal('')),
  storeDescription: z.string().max(2000).optional(),
  isVisible: z.boolean().optional(),
  workingHours: z
    .object({
      monday: z.string().optional(),
      tuesday: z.string().optional(),
      wednesday: z.string().optional(),
      thursday: z.string().optional(),
      friday: z.string().optional(),
      saturday: z.string().optional(),
      sunday: z.string().optional(),
    })
    .optional(),
});

const updateBusinessInfoSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  businessType: z.string().optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  businessAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal('')),
});

const updatePoliciesSchema = z.object({
  shippingPolicy: z.string().optional(),
  returnPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  storeTerms: z.string().optional(),
});

const payoutMethodSchema = z.object({
  method: z.enum(['bank_transfer', 'mobile_money', 'paypal', 'crypto']),
  bankName: z.string().min(1).max(100).optional(),
  accountNumber: z.string().min(4).max(50).optional(),
  routingNumber: z.string().min(4).max(20).optional(),
  accountHolderName: z.string().min(2).max(100).optional(),
  accountType: z.enum(['checking', 'savings']).optional(),
  country: z.string().max(100).optional(),
  currency: z.string().length(3).optional(), // ISO 4217
  swiftCode: z.string().max(11).optional(),
  iban: z.string().max(34).optional(),
  paypalEmail: z.string().email().optional().or(z.literal('')),
  mobileMoneyProvider: z.string().optional(),
  mobileMoneyNumber: z.string().optional(),
  cryptoWallet: z.string().optional(),
  isDefault: z.boolean().optional(),
  password: z.string().min(6).optional(), // For password confirmation
});

// Get seller settings
export async function getSellerSettings(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let settings = await SellerSettings.findOne({ sellerId });

    // If no settings exist, create default one
    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        isVisible: true,
        payoutMethods: [],
        allowedCategories: [],
      });
    }

    return res.json({ settings });
  } catch (error: any) {
    console.error('Get seller settings error:', error);
    return res.status(500).json({ message: 'Failed to get seller settings' });
  }
}

// Update store information
export async function updateStoreInfo(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = updateStoreInfoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const updateData = validation.data;

    let settings = await SellerSettings.findOne({ sellerId });

    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        ...updateData,
      });
    } else {
      // Update only provided fields
      if (updateData.storeName !== undefined) {
        settings.storeName = updateData.storeName;
      }
      if (updateData.storeLogo !== undefined) {
        settings.storeLogo = updateData.storeLogo;
      }
      if (updateData.storeBanner !== undefined) {
        settings.storeBanner = updateData.storeBanner;
      }
      if (updateData.storeDescription !== undefined) {
        settings.storeDescription = updateData.storeDescription;
      }
      if (updateData.isVisible !== undefined) {
        settings.isVisible = updateData.isVisible;
      }
      if (updateData.workingHours !== undefined) {
        settings.workingHours = {
          ...settings.workingHours,
          ...updateData.workingHours,
        };
      }
      await settings.save();
    }

    return res.json({
      message: 'Store information updated successfully',
      settings,
    });
  } catch (error: any) {
    console.error('Update store info error:', error);
    return res.status(500).json({ message: 'Failed to update store information' });
  }
}

// Update business information
export async function updateBusinessInfo(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = updateBusinessInfoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const updateData = validation.data;

    let settings = await SellerSettings.findOne({ sellerId });

    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        ...updateData,
      });
    } else {
      // Update only provided fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] !== undefined) {
          (settings as any)[key] = updateData[key as keyof typeof updateData];
        }
      });
      await settings.save();
    }

    return res.json({
      message: 'Business information updated successfully',
      settings,
    });
  } catch (error: any) {
    console.error('Update business info error:', error);
    return res.status(500).json({ message: 'Failed to update business information' });
  }
}

// Update store policies
export async function updateStorePolicies(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = updatePoliciesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const updateData = validation.data;

    let settings = await SellerSettings.findOne({ sellerId });

    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        policies: updateData,
      });
    } else {
      if (!settings.policies) {
        settings.policies = {};
      }
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] !== undefined) {
          (settings!.policies as any)[key] =
            updateData[key as keyof typeof updateData];
        }
      });
      await settings.save();
    }

    return res.json({
      message: 'Store policies updated successfully',
      settings,
    });
  } catch (error: any) {
    console.error('Update store policies error:', error);
    return res.status(500).json({ message: 'Failed to update store policies' });
  }
}

// Get payout methods
export async function getPayoutMethods(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let settings = await SellerSettings.findOne({ sellerId });

    if (!settings) {
      return res.json({ payoutMethods: [] });
    }

    // Decrypt and mask sensitive information before sending
    const maskedMethods = (settings.payoutMethods || []).map((method) => {
      const masked = { ...(method as any) };
      
      // Decrypt and mask account numbers
      if (method.accountNumber) {
        try {
          const decrypted = decrypt(method.accountNumber);
          masked.accountNumber = maskAccountNumber(decrypted);
        } catch (e) {
          // If decryption fails, it might be stored in plain text (legacy)
          masked.accountNumber = maskAccountNumber(method.accountNumber);
        }
      }
      if (method.routingNumber) {
        try {
          const decrypted = decrypt(method.routingNumber);
          masked.routingNumber = maskRoutingNumber(decrypted);
        } catch (e) {
          masked.routingNumber = maskRoutingNumber(method.routingNumber);
        }
      }
      if (method.mobileMoneyNumber) {
        try {
          const decrypted = decrypt(method.mobileMoneyNumber);
          masked.mobileMoneyNumber = maskAccountNumber(decrypted);
        } catch (e) {
          masked.mobileMoneyNumber = maskAccountNumber(method.mobileMoneyNumber);
        }
      }
      
      // In development mode, include verification code for testing
    if (process.env.NODE_ENV === 'development' && method.verificationStatus === 'pending' && method.verificationCode) {
      masked.verificationCode = method.verificationCode; // Show code in dev mode for testing
    } else {
      delete masked.verificationCode;
    }
    
      return masked;
    });

    return res.json({ payoutMethods: maskedMethods });
  } catch (error: any) {
    console.error('Get payout methods error:', error);
    return res.status(500).json({ message: 'Failed to get payout methods' });
  }
}

// Add payout method
export async function addPayoutMethod(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify password if provided (for security)
    if (req.body.password) {
      const user = await User.findById(sellerId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const isPasswordValid = await bcrypt.compare(req.body.password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password. Password confirmation required for adding financial accounts.' });
      }
    }

    const validation = payoutMethodSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const methodData = validation.data;

    // Validate bank account requirements
    if (methodData.method === 'bank_transfer') {
      if (!methodData.accountNumber || !methodData.routingNumber || !methodData.bankName) {
        return res.status(400).json({
          message: 'Bank name, account number, and routing number are required for bank transfers',
        });
      }
    }

    // Check account limit (max 5 bank accounts)
    let settings = await SellerSettings.findOne({ sellerId });
    if (settings && settings.payoutMethods) {
      const bankAccounts = settings.payoutMethods.filter(
        (m) => m.method === 'bank_transfer'
      );
      if (bankAccounts.length >= 5) {
        return res.status(400).json({
          message: 'Maximum of 5 bank accounts allowed. Please remove an existing account first.',
        });
      }
    }

    // Encrypt sensitive data
    const encryptedAccountNumber = methodData.accountNumber
      ? encrypt(methodData.accountNumber)
      : undefined;
    const encryptedRoutingNumber = methodData.routingNumber
      ? encrypt(methodData.routingNumber)
      : undefined;
    const encryptedMobileMoneyNumber = methodData.mobileMoneyNumber
      ? encrypt(methodData.mobileMoneyNumber)
      : undefined;

    // Generate verification code (simulate micro-deposit: 2 random amounts between 0.01 and 0.99)
    const verificationCode = methodData.method === 'bank_transfer'
      ? `${(Math.random() * 0.98 + 0.01).toFixed(2)}-${(Math.random() * 0.98 + 0.01).toFixed(2)}`
      : undefined;

    const methodDataWithDefaults: ISellerPayoutMethod = {
      method: methodData.method,
      bankName: methodData.bankName,
      accountNumber: encryptedAccountNumber,
      routingNumber: encryptedRoutingNumber,
      accountHolderName: methodData.accountHolderName,
      accountType: methodData.accountType,
      country: methodData.country,
      currency: methodData.currency,
      swiftCode: methodData.swiftCode,
      iban: methodData.iban,
      paypalEmail: methodData.paypalEmail,
      mobileMoneyProvider: methodData.mobileMoneyProvider,
      mobileMoneyNumber: encryptedMobileMoneyNumber,
      cryptoWallet: methodData.cryptoWallet,
      isDefault: methodData.isDefault ?? false,
      verificationStatus: 'pending',
      verificationCode: verificationCode,
      addedAt: new Date(),
      requiresPasswordConfirmation: true,
    };

    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        payoutMethods: [methodDataWithDefaults],
      });
    } else {
      if (!settings.payoutMethods) {
        settings.payoutMethods = [];
      }

      // If this is set as default, unset other defaults
      if (methodDataWithDefaults.isDefault) {
        settings.payoutMethods.forEach((m) => {
          m.isDefault = false;
        });
      }

      settings.payoutMethods.push(methodDataWithDefaults);
      await settings.save();
    }

    // Return masked version
    if (!settings.payoutMethods || settings.payoutMethods.length === 0) {
      return res.status(500).json({ message: 'Failed to retrieve added payout method' });
    }
    const addedMethod = settings.payoutMethods[settings.payoutMethods.length - 1];
    const masked = { ...(addedMethod as any) };
    
    // Decrypt and mask for display
    if (addedMethod.accountNumber) {
      const decrypted = decrypt(addedMethod.accountNumber);
      masked.accountNumber = maskAccountNumber(decrypted);
    }
    if (addedMethod.routingNumber) {
      const decrypted = decrypt(addedMethod.routingNumber);
      masked.routingNumber = maskRoutingNumber(decrypted);
    }
    if (addedMethod.mobileMoneyNumber) {
      const decrypted = decrypt(addedMethod.mobileMoneyNumber);
      masked.mobileMoneyNumber = maskAccountNumber(decrypted);
    }
    
    // Don't send verification code in response (security)
    delete masked.verificationCode;

    return res.json({
      message: 'Payout method added successfully. Please verify your account using the verification code sent to your bank.',
      payoutMethod: masked,
      requiresVerification: true,
      verificationInstructions: methodData.method === 'bank_transfer'
        ? 'Two small deposits will be sent to your account. Enter the amounts to verify.'
        : undefined,
    });
  } catch (error: any) {
    console.error('Add payout method error:', error);
    return res.status(500).json({ message: 'Failed to add payout method' });
  }
}

// Update payout method
export async function updatePayoutMethod(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { methodId } = req.params;
    const validation = payoutMethodSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const updateData = validation.data;

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings || !settings.payoutMethods) {
      return res.status(404).json({ message: 'Payout method not found' });
    }

    const methodIndex = settings.payoutMethods.findIndex(
      (m: any) => m._id && m._id.toString() === methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({ message: 'Payout method not found' });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      settings.payoutMethods.forEach((m, idx) => {
        if (idx !== methodIndex) {
          m.isDefault = false;
        }
      });
    }

    // Update the method
    if (!settings.payoutMethods) {
      return res.status(404).json({ message: 'Payout method not found' });
    }
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] !== undefined) {
        (settings.payoutMethods![methodIndex] as any)[key] =
          updateData[key as keyof typeof updateData];
      }
    });

    await settings.save();

    // Return masked version
    const updatedMethod = settings.payoutMethods[methodIndex];
    const masked = { ...(updatedMethod as any) };
    if (masked.accountNumber) {
      masked.accountNumber = `****${masked.accountNumber.slice(-4)}`;
    }
    if (masked.routingNumber) {
      masked.routingNumber = `****${masked.routingNumber.slice(-4)}`;
    }
    if (masked.mobileMoneyNumber) {
      masked.mobileMoneyNumber = `****${masked.mobileMoneyNumber.slice(-4)}`;
    }

    return res.json({
      message: 'Payout method updated successfully',
      payoutMethod: masked,
    });
  } catch (error: any) {
    console.error('Update payout method error:', error);
    return res.status(500).json({ message: 'Failed to update payout method' });
  }
}

// Delete payout method
export async function deletePayoutMethod(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Require password confirmation for deleting financial accounts
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ 
        message: 'Password confirmation required to delete financial accounts' 
      });
    }

    const user = await User.findById(sellerId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password. Password confirmation required for deleting financial accounts.' });
    }

    const { methodId } = req.params;

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings || !settings.payoutMethods) {
      return res.status(404).json({ message: 'Payout method not found' });
    }

    const methodIndex = settings.payoutMethods.findIndex(
      (m: any) => m._id && m._id.toString() === methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({ message: 'Payout method not found' });
    }

    settings.payoutMethods.splice(methodIndex, 1);
    await settings.save();

    return res.json({ message: 'Payout method deleted successfully' });
  } catch (error: any) {
    console.error('Delete payout method error:', error);
    return res.status(500).json({ message: 'Failed to delete payout method' });
  }
}

// Note: regenerateVerificationCode endpoint is kept for backward compatibility but not needed for new verification method

// Verify bank account (account details confirmation method)
export async function verifyPayoutMethod(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { methodId } = req.params;
    const { confirmAccountDetails, password } = req.body;

    // Require password confirmation for security
    if (!password) {
      return res.status(400).json({
        message: 'Password confirmation is required to verify bank account',
      });
    }

    // Verify password
    const user = await User.findById(sellerId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password. Password confirmation required for verifying financial accounts.' });
    }

    // Require confirmation checkbox
    if (!confirmAccountDetails) {
      return res.status(400).json({
        message: 'Please confirm that the account details are correct',
      });
    }

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings || !settings.payoutMethods) {
      return res.status(404).json({ message: 'Payout method not found' });
    }

    const methodIndex = settings.payoutMethods.findIndex(
      (m: any) => m._id && m._id.toString() === methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({ message: 'Payout method not found' });
    }

    const method = settings.payoutMethods[methodIndex];

    // Verify the account
    method.verificationStatus = 'verified';
    method.verifiedAt = new Date();
    method.verificationCode = undefined; // Clear any old verification code

    await settings.save();

    // Return masked version
    const masked = { ...(method as any) };
    if (method.accountNumber) {
      try {
        const decrypted = decrypt(method.accountNumber);
        masked.accountNumber = maskAccountNumber(decrypted);
      } catch (e) {
        masked.accountNumber = maskAccountNumber(method.accountNumber);
      }
    }
    if (method.routingNumber) {
      try {
        const decrypted = decrypt(method.routingNumber);
        masked.routingNumber = maskRoutingNumber(decrypted);
      } catch (e) {
        masked.routingNumber = maskRoutingNumber(method.routingNumber);
      }
    }
    delete masked.verificationCode;

    return res.json({
      message: 'Bank account verified successfully',
      payoutMethod: masked,
    });
  } catch (error: any) {
    console.error('Verify payout method error:', error);
    return res.status(500).json({ message: 'Failed to verify payout method' });
  }
}

// ===== Mobile Money Management =====

export async function getMobileMoney(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings) {
      return res.json({ mobileMoney: null });
    }

    const mobileMoney = (settings.payoutMethods || []).find(
      (method) => method.method === 'mobile_money'
    );

    if (!mobileMoney) {
      return res.json({ mobileMoney: null });
    }

    // Decrypt and mask sensitive information
    const masked = { ...(mobileMoney as any) };
    if (mobileMoney.mobileMoneyNumber) {
      try {
        const decrypted = decrypt(mobileMoney.mobileMoneyNumber);
        masked.mobileMoneyNumber = maskAccountNumber(decrypted);
      } catch (e) {
        masked.mobileMoneyNumber = maskAccountNumber(mobileMoney.mobileMoneyNumber);
      }
    }
    delete masked.verificationCode;

    return res.json({ mobileMoney: masked });
  } catch (error: any) {
    console.error('Get mobile money error:', error);
    return res.status(500).json({ message: 'Failed to get mobile money account' });
  }
}

export async function addOrUpdateMobileMoney(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { mobileMoneyProvider, mobileMoneyNumber, accountHolderName, country, currency, password } = req.body;

    // Verify password if provided
    if (password) {
      const user = await User.findById(sellerId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password. Password confirmation required for adding financial accounts.' });
      }
    }

    if (!mobileMoneyProvider) {
      return res.status(400).json({ message: 'Mobile money provider is required' });
    }

    let settings = await SellerSettings.findOne({ sellerId });
    if (!settings) {
      settings = await SellerSettings.create({ sellerId });
    }

    // Check if mobile money already exists
    const existingIndex = settings.payoutMethods?.findIndex(
      (m) => m.method === 'mobile_money'
    ) ?? -1;
    
    // If updating and no number provided, keep existing number
    // Otherwise, require the number
    let encryptedNumber: string | undefined;
    if (mobileMoneyNumber) {
      encryptedNumber = encrypt(mobileMoneyNumber);
    } else if (existingIndex >= 0 && settings.payoutMethods) {
      // Keep existing encrypted number when updating without providing new number
      encryptedNumber = settings.payoutMethods[existingIndex].mobileMoneyNumber;
    } else {
      // New account requires a number
      return res.status(400).json({ message: 'Mobile money number is required' });
    }

    // Preserve verification status and dates if updating
    let verificationStatus: 'pending' | 'verified' | 'failed' | 'unverified' = 'pending';
    let addedAt = new Date();
    let verifiedAt: Date | undefined = undefined;
    
    if (existingIndex >= 0 && settings.payoutMethods) {
      const existing = settings.payoutMethods[existingIndex];
      verificationStatus = existing.verificationStatus;
      addedAt = existing.addedAt;
      verifiedAt = existing.verifiedAt;
    }

    const mobileMoneyData: ISellerPayoutMethod = {
      method: 'mobile_money',
      mobileMoneyProvider,
      mobileMoneyNumber: encryptedNumber!,
      accountHolderName: accountHolderName || undefined,
      country: country || undefined,
      currency: currency || 'USD',
      isDefault: false,
      verificationStatus,
      addedAt,
      verifiedAt,
      lastModifiedAt: new Date(),
      requiresPasswordConfirmation: true,
    };

    if (existingIndex >= 0 && settings.payoutMethods) {
      // Update existing
      settings.payoutMethods[existingIndex] = {
        ...settings.payoutMethods[existingIndex],
        ...mobileMoneyData,
        lastModifiedAt: new Date(),
      };
    } else {
      // Add new
      if (!settings.payoutMethods) {
        settings.payoutMethods = [];
      }
      settings.payoutMethods.push(mobileMoneyData);
    }

    await settings.save();

    // Return masked version
    const updated = await SellerSettings.findOne({ sellerId });
    const mobileMoney = updated?.payoutMethods?.find((m) => m.method === 'mobile_money');
    if (mobileMoney) {
      const masked = { ...(mobileMoney as any) };
      if (mobileMoney.mobileMoneyNumber) {
        try {
          const decrypted = decrypt(mobileMoney.mobileMoneyNumber);
          masked.mobileMoneyNumber = maskAccountNumber(decrypted);
        } catch (e) {
          masked.mobileMoneyNumber = maskAccountNumber(mobileMoney.mobileMoneyNumber);
        }
      }
      delete masked.verificationCode;

      return res.json({
        message: 'Mobile money account updated successfully',
        mobileMoney: masked,
      });
    }

    return res.json({ message: 'Mobile money account updated successfully' });
  } catch (error: any) {
    console.error('Add/update mobile money error:', error);
    return res.status(500).json({ message: 'Failed to update mobile money account' });
  }
}

export async function deleteMobileMoney(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Require password confirmation for deleting financial accounts
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ 
        message: 'Password confirmation required to delete financial accounts' 
      });
    }

    const user = await User.findById(sellerId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password. Password confirmation required for deleting financial accounts.' });
    }

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings || !settings.payoutMethods) {
      return res.status(404).json({ message: 'Mobile money account not found' });
    }

    const methodIndex = settings.payoutMethods.findIndex(
      (m: any) => m.method === 'mobile_money'
    );

    if (methodIndex === -1) {
      return res.status(404).json({ message: 'Mobile money account not found' });
    }

    settings.payoutMethods.splice(methodIndex, 1);
    await settings.save();

    return res.json({ message: 'Mobile money account deleted successfully' });
  } catch (error: any) {
    console.error('Delete mobile money error:', error);
    return res.status(500).json({ message: 'Failed to delete mobile money account' });
  }
}

// ===== Payout Schedule Management =====

function calculateNextPayoutDate(frequency: string, dayOfWeek?: number, dayOfMonth?: number): Date {
  const now = new Date();
  const nextDate = new Date(now);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      if (dayOfWeek !== undefined) {
        const daysUntilNext = (dayOfWeek - now.getDay() + 7) % 7 || 7;
        nextDate.setDate(now.getDate() + daysUntilNext);
      } else {
        nextDate.setDate(now.getDate() + 7);
      }
      break;
    case 'biweekly':
      if (dayOfWeek !== undefined) {
        const daysUntilNext = (dayOfWeek - now.getDay() + 14) % 14 || 14;
        nextDate.setDate(now.getDate() + daysUntilNext);
      } else {
        nextDate.setDate(now.getDate() + 14);
      }
      break;
    case 'monthly':
      if (dayOfMonth !== undefined) {
        nextDate.setMonth(now.getMonth() + 1);
        nextDate.setDate(dayOfMonth);
        // If day doesn't exist in next month (e.g., Feb 31), set to last day
        if (nextDate.getDate() !== dayOfMonth) {
          nextDate.setDate(0); // Last day of previous month
        }
      } else {
        nextDate.setMonth(now.getMonth() + 1);
        nextDate.setDate(1);
      }
      break;
    default:
      nextDate.setDate(now.getDate() + 7);
  }

  return nextDate;
}

export async function getPayoutSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings || !settings.payoutSchedule) {
      // Return default schedule
      const defaultSchedule = {
        frequency: 'weekly' as const,
        dayOfWeek: 1, // Monday
        nextPayoutDate: calculateNextPayoutDate('weekly', 1),
        minimumPayoutAmount: 0,
        autoPayout: true,
      };
      return res.json({ payoutSchedule: defaultSchedule });
    }

    // Calculate next payout if not set or if it's in the past
    let nextPayoutDate = settings.payoutSchedule.nextPayoutDate;
    if (!nextPayoutDate || new Date(nextPayoutDate) < new Date()) {
      nextPayoutDate = calculateNextPayoutDate(
        settings.payoutSchedule.frequency,
        settings.payoutSchedule.dayOfWeek,
        settings.payoutSchedule.dayOfMonth
      );
    }

    return res.json({
      payoutSchedule: {
        ...(settings.payoutSchedule as any),
        nextPayoutDate,
      },
    });
  } catch (error: any) {
    console.error('Get payout schedule error:', error);
    return res.status(500).json({ message: 'Failed to get payout schedule' });
  }
}

export async function updatePayoutSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { frequency, dayOfWeek, dayOfMonth, minimumPayoutAmount, autoPayout } = req.body;

    if (!frequency || !['daily', 'weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return res.status(400).json({ message: 'Invalid frequency. Must be daily, weekly, biweekly, or monthly' });
    }

    let settings = await SellerSettings.findOne({ sellerId });
    if (!settings) {
      settings = await SellerSettings.create({ sellerId });
    }

    // Calculate next payout date
    const nextPayoutDate = calculateNextPayoutDate(frequency, dayOfWeek, dayOfMonth);

    settings.payoutSchedule = {
      frequency,
      dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      nextPayoutDate,
      lastPayoutDate: settings.payoutSchedule?.lastPayoutDate,
      minimumPayoutAmount: minimumPayoutAmount ?? settings.payoutSchedule?.minimumPayoutAmount ?? 0,
      autoPayout: autoPayout !== undefined ? autoPayout : (settings.payoutSchedule?.autoPayout ?? true),
    };

    await settings.save();

    return res.json({
      message: 'Payout schedule updated successfully',
      payoutSchedule: settings.payoutSchedule,
    });
  } catch (error: any) {
    console.error('Update payout schedule error:', error);
    return res.status(500).json({ message: 'Failed to update payout schedule' });
  }
}

// ===== Team Management =====

const teamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.string().min(1).max(50),
  access: z.array(z.string()).default([]),
});

// Helper function to map role to default access permissions
function getDefaultAccessForRole(role: string): string[] {
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('admin')) {
    return ['everything'];
  } else if (roleLower.includes('sales') || roleLower.includes('rep')) {
    return ['orders', 'rfqs', 'customers'];
  } else if (roleLower.includes('warehouse')) {
    return ['inventory', 'fulfilment'];
  } else if (roleLower.includes('finance')) {
    return ['payouts', 'invoices', 'financial'];
  } else if (roleLower.includes('customer service') || roleLower.includes('support')) {
    return ['orders', 'customers', 'messages'];
  }
  
  // Default: return empty array, user can customize
  return [];
}

// Get team members
export async function getTeamMembers(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings) {
      return res.json({ teamMembers: [] });
    }

    return res.json({ teamMembers: settings.teamMembers || [] });
  } catch (error: any) {
    console.error('Get team members error:', error);
    return res.status(500).json({ message: 'Failed to get team members' });
  }
}

// Add team member
export async function addTeamMember(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = teamMemberSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    // Check if email already exists
    let settings = await SellerSettings.findOne({ sellerId });
    if (settings && settings.teamMembers) {
      const existingMember = settings.teamMembers.find(
        (m: any) => m.email.toLowerCase() === validation.data.email.toLowerCase()
      );
      if (existingMember) {
        return res.status(400).json({ message: 'Team member with this email already exists' });
      }
    }

    // Auto-assign access based on role if not provided
    const access = validation.data.access.length > 0 
      ? validation.data.access 
      : getDefaultAccessForRole(validation.data.role);

    const memberData: ITeamMember = {
      name: validation.data.name,
      email: validation.data.email,
      role: validation.data.role,
      access,
      status: 'pending',
      invitedAt: new Date(),
    };

    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        teamMembers: [memberData],
      });
    } else {
      if (!settings.teamMembers) {
        settings.teamMembers = [];
      }
      settings.teamMembers.push(memberData);
      await settings.save();
    }

    // Reload settings to get the _id of the newly created member
    const updatedSettings = await SellerSettings.findOne({ sellerId });
    if (!updatedSettings || !updatedSettings.teamMembers || updatedSettings.teamMembers.length === 0) {
      return res.status(500).json({ message: 'Failed to retrieve created team member' });
    }

    // Find the newly created member by email (since we just added it)
    const createdMember = updatedSettings.teamMembers.find(
      (m: any) => m.email === memberData.email && m.invitedAt
    ) || updatedSettings.teamMembers[updatedSettings.teamMembers.length - 1];

    return res.status(201).json({
      message: 'Team member invited successfully',
      teamMember: createdMember,
    });
  } catch (error: any) {
    console.error('Add team member error:', error);
    return res.status(500).json({ message: 'Failed to add team member' });
  }
}

// Update team member
export async function updateTeamMember(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { memberId } = req.params;
    const validation = teamMemberSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings || !settings.teamMembers) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    const memberIndex = settings.teamMembers.findIndex(
      (m: any) => m._id && m._id.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    // Update the member
    Object.keys(validation.data).forEach((key) => {
      if (validation.data[key as keyof typeof validation.data] !== undefined) {
        (settings.teamMembers![memberIndex] as any)[key] =
          validation.data[key as keyof typeof validation.data];
      }
    });

    await settings.save();

    return res.json({
      message: 'Team member updated successfully',
      teamMember: settings.teamMembers[memberIndex],
    });
  } catch (error: any) {
    console.error('Update team member error:', error);
    return res.status(500).json({ message: 'Failed to update team member' });
  }
}

// Delete team member
export async function deleteTeamMember(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { memberId } = req.params;

    const settings = await SellerSettings.findOne({ sellerId });
    if (!settings || !settings.teamMembers) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    const memberIndex = settings.teamMembers.findIndex(
      (m: any) => m._id && m._id.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    settings.teamMembers.splice(memberIndex, 1);
    await settings.save();

    return res.json({ message: 'Team member deleted successfully' });
  } catch (error: any) {
    console.error('Delete team member error:', error);
    return res.status(500).json({ message: 'Failed to delete team member' });
  }
}

// Get available access permissions
export async function getAvailablePermissions(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const permissions = [
      'orders',
      'rfqs',
      'customers',
      'inventory',
      'fulfilment',
      'payouts',
      'invoices',
      'financial',
      'messages',
      'settings',
      'everything',
    ];
    return res.json({ permissions });
  } catch (error: any) {
    console.error('Get permissions error:', error);
    return res.status(500).json({ message: 'Failed to get permissions' });
  }
}

// ===== Verification Documents =====

const verificationDocumentsSchema = z.object({
  businessLicense: z.string().nullable().optional(),
  isoCert: z.string().nullable().optional(),
  auditReport: z.string().nullable().optional(),
});

// Get verification documents
export async function getVerificationDocuments(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const settings = await SellerSettings.findOne({ sellerId }).select('verificationDocuments verificationStatus');
    if (!settings) {
      return res.json({
        verificationDocuments: null,
        verificationStatus: { status: 'pending' },
      });
    }

    return res.json({
      verificationDocuments: settings.verificationDocuments || null,
      verificationStatus: settings.verificationStatus || { status: 'pending' },
    });
  } catch (error: any) {
    console.error('Get verification documents error:', error);
    return res.status(500).json({ message: 'Failed to get verification documents' });
  }
}

// Update verification documents
export async function updateVerificationDocuments(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = verificationDocumentsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const documentsData: IVerificationDocuments = {
      ...validation.data,
      uploadedAt: new Date(),
    };

    let settings = await SellerSettings.findOne({ sellerId });
    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        verificationDocuments: documentsData,
        verificationStatus: {
          status: 'pending',
        },
      });
    } else {
      // Handle document removal (null values) and updates
      const updatedDocuments: any = {
        ...settings.verificationDocuments,
      };
      
      // Update or remove documents based on the provided data
      Object.keys(documentsData).forEach((key) => {
        if (documentsData[key as keyof IVerificationDocuments] === null || documentsData[key as keyof IVerificationDocuments] === undefined) {
          // Remove the document field
          delete updatedDocuments[key];
        } else {
          // Update the document field
          updatedDocuments[key] = documentsData[key as keyof IVerificationDocuments];
        }
      });
      
      // Only update uploadedAt if there are actual changes (not just deletions)
      const hasNewUploads = Object.values(documentsData).some(
        (value) => value !== null && value !== undefined
      );
      
      settings.verificationDocuments = {
        ...updatedDocuments,
        uploadedAt: hasNewUploads ? new Date() : settings.verificationDocuments?.uploadedAt || new Date(),
      };
      
      // Reset verification status to pending when new documents are uploaded (not when removing)
      if (hasNewUploads) {
        if (!settings.verificationStatus) {
          settings.verificationStatus = {
            status: 'pending',
          };
        } else {
          settings.verificationStatus.status = 'pending';
          settings.verificationStatus.rejectionReason = undefined;
        }
      }
      await settings.save();
    }

    return res.json({
      message: 'Verification documents updated successfully',
      verificationDocuments: settings.verificationDocuments,
      verificationStatus: settings.verificationStatus,
    });
  } catch (error: any) {
    console.error('Update verification documents error:', error);
    return res.status(500).json({ message: 'Failed to update verification documents' });
  }
}

// ===== Notification Preferences =====

const notificationPreferencesSchema = z.object({
  email: z.object({
    newOrders: z.boolean().optional(),
    newMessages: z.boolean().optional(),
    newReviews: z.boolean().optional(),
    newDisputes: z.boolean().optional(),
    lowStock: z.boolean().optional(),
    paymentReceived: z.boolean().optional(),
    marketing: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
  }).optional(),
  sms: z.object({
    newOrders: z.boolean().optional(),
    newDisputes: z.boolean().optional(),
    paymentReceived: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
  }).optional(),
  push: z.object({
    enabled: z.boolean().optional(),
    newOrders: z.boolean().optional(),
    newMessages: z.boolean().optional(),
    newReviews: z.boolean().optional(),
    newDisputes: z.boolean().optional(),
    lowStock: z.boolean().optional(),
  }).optional(),
  frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
  quietHours: z.object({
    enabled: z.boolean().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  timezone: z.string().optional(),
});

// Get notification preferences
export async function getNotificationPreferences(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const settings = await SellerSettings.findOne({ sellerId }).select('notificationPreferences');
    if (!settings) {
      return res.json({
        notificationPreferences: null,
      });
    }

    return res.json({
      notificationPreferences: settings.notificationPreferences || null,
    });
  } catch (error: any) {
    console.error('Get notification preferences error:', error);
    return res.status(500).json({ message: 'Failed to get notification preferences' });
  }
}

// Update notification preferences
export async function updateNotificationPreferences(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = notificationPreferencesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    let settings = await SellerSettings.findOne({ sellerId });
    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        notificationPreferences: validation.data as any,
      });
    } else {
      settings.notificationPreferences = {
        ...settings.notificationPreferences,
        ...validation.data,
      } as any;
      await settings.save();
    }

    return res.json({
      message: 'Notification preferences updated successfully',
      notificationPreferences: settings.notificationPreferences,
    });
  } catch (error: any) {
    console.error('Update notification preferences error:', error);
    return res.status(500).json({ message: 'Failed to update notification preferences' });
  }
}

// ===== Store Contact =====

const storeContactSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  socialMedia: z.object({
    facebook: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    instagram: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
  }).optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }).optional(),
});

// Get store contact
export async function getStoreContact(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const settings = await SellerSettings.findOne({ sellerId }).select('storeContact');
    if (!settings) {
      return res.json({
        storeContact: null,
      });
    }

    return res.json({
      storeContact: settings.storeContact || null,
    });
  } catch (error: any) {
    console.error('Get store contact error:', error);
    return res.status(500).json({ message: 'Failed to get store contact' });
  }
}

// Update store contact
export async function updateStoreContact(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = storeContactSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    let settings = await SellerSettings.findOne({ sellerId });
    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        storeContact: validation.data as any,
      });
    } else {
      settings.storeContact = {
        ...settings.storeContact,
        ...validation.data,
      } as any;
      await settings.save();
    }

    return res.json({
      message: 'Store contact updated successfully',
      storeContact: settings.storeContact,
    });
  } catch (error: any) {
    console.error('Update store contact error:', error);
    return res.status(500).json({ message: 'Failed to update store contact' });
  }
}

// ===== Store Settings =====

const storeSettingsSchema = z.object({
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  language: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  categories: z.array(z.string()).optional(),
});

// Get store settings
export async function getStoreSettings(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const settings = await SellerSettings.findOne({ sellerId }).select('storeSettings');
    if (!settings) {
      return res.json({
        storeSettings: null,
      });
    }

    return res.json({
      storeSettings: settings.storeSettings || null,
    });
  } catch (error: any) {
    console.error('Get store settings error:', error);
    return res.status(500).json({ message: 'Failed to get store settings' });
  }
}

// Update store settings
export async function updateStoreSettings(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = storeSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    let settings = await SellerSettings.findOne({ sellerId });
    if (!settings) {
      settings = await SellerSettings.create({
        sellerId,
        storeSettings: validation.data as any,
      });
    } else {
      settings.storeSettings = {
        ...settings.storeSettings,
        ...validation.data,
      } as any;
      await settings.save();
    }

    return res.json({
      message: 'Store settings updated successfully',
      storeSettings: settings.storeSettings,
    });
  } catch (error: any) {
    console.error('Update store settings error:', error);
    return res.status(500).json({ message: 'Failed to update store settings' });
  }
}

