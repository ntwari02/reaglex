import { Response } from 'express';
import { z } from 'zod';
import path from 'path';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User, IAddress, IPaymentMethod } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

// Validation schemas
const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional().or(z.literal('')),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  dateOfBirth: z.union([z.string(), z.date()]).optional(),
});

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  zipCode: z.string().min(1),
  country: z.string().min(1),
  isDefault: z.boolean().optional(),
});

const paymentMethodSchema = z.object({
  type: z.enum(['card', 'bank', 'mobile_money', 'crypto']),
  provider: z.string().optional(),
  last4: z.string().optional(),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(2020).optional(),
  isDefault: z.boolean().optional(),
  billingAddress: addressSchema.optional(),
});

const notificationSettingsSchema = z.object({
  email: z
    .object({
      orderUpdates: z.boolean().optional(),
      promotions: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
      newsletter: z.boolean().optional(),
    })
    .optional(),
  push: z
    .object({
      orderUpdates: z.boolean().optional(),
      promotions: z.boolean().optional(),
      messages: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
    })
    .optional(),
  sms: z
    .object({
      orderUpdates: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
      promotions: z.boolean().optional(),
    })
    .optional(),
});

const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  allowMessages: z.boolean().optional(),
  showActivity: z.boolean().optional(),
});

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().min(2).max(5).optional(),
  currency: z.string().min(3).max(3).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

/**
 * Get current user's profile
 */
export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (err: any) {
    console.error('Get profile error:', err);
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
}

/**
 * Get public profile by user ID (respects privacy settings)
 */
export async function getPublicProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-passwordHash -paymentMethods -addresses');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check privacy settings
    if (user.privacy.profileVisibility === 'private') {
      return res.status(403).json({ message: 'Profile is private' });
    }

    // Build response based on privacy settings
    const publicProfile: any = {
      id: user._id,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      website: user.website,
      createdAt: user.createdAt,
    };

    if (user.privacy.showEmail) {
      publicProfile.email = user.email;
    }
    if (user.privacy.showPhone) {
      publicProfile.phone = user.phone;
    }

    return res.json({ user: publicProfile });
  } catch (err: any) {
    console.error('Get public profile error:', err);
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
}

/**
 * Update user profile (partial update)
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validatedData = updateProfileSchema.parse(req.body);

    // Convert dateOfBirth string to Date if provided
    const updateData: any = { ...validatedData };
    if (updateData.dateOfBirth && typeof updateData.dateOfBirth === 'string') {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
}

/**
 * Add or update address
 */
export async function addAddress(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validatedAddress = addressSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If this is set as default, unset other defaults
    if (validatedAddress.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    user.addresses.push(validatedAddress as IAddress);
    await user.save();

    return res.status(201).json({
      message: 'Address added successfully',
      addresses: user.addresses,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Add address error:', err);
    return res.status(500).json({ message: 'Failed to add address' });
  }
}

/**
 * Update address by index
 */
export async function updateAddress(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { index } = req.params;
    const addressIndex = parseInt(index, 10);

    if (isNaN(addressIndex) || addressIndex < 0) {
      return res.status(400).json({ message: 'Invalid address index' });
    }

    const validatedAddress = addressSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (addressIndex >= user.addresses.length) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If this is set as default, unset other defaults
    if (validatedAddress.isDefault) {
      user.addresses.forEach((addr, idx) => {
        if (idx !== addressIndex) {
          addr.isDefault = false;
        }
      });
    }

    user.addresses[addressIndex] = validatedAddress as IAddress;
    await user.save();

    return res.json({
      message: 'Address updated successfully',
      addresses: user.addresses,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Update address error:', err);
    return res.status(500).json({ message: 'Failed to update address' });
  }
}

/**
 * Delete address by index
 */
export async function deleteAddress(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { index } = req.params;
    const addressIndex = parseInt(index, 10);

    if (isNaN(addressIndex) || addressIndex < 0) {
      return res.status(400).json({ message: 'Invalid address index' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (addressIndex >= user.addresses.length) {
      return res.status(404).json({ message: 'Address not found' });
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    return res.json({
      message: 'Address deleted successfully',
      addresses: user.addresses,
    });
  } catch (err: any) {
    console.error('Delete address error:', err);
    return res.status(500).json({ message: 'Failed to delete address' });
  }
}

/**
 * Add payment method
 */
export async function addPaymentMethod(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validatedPayment = paymentMethodSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If this is set as default, unset other defaults
    if (validatedPayment.isDefault) {
      user.paymentMethods.forEach((pm) => {
        pm.isDefault = false;
      });
    }

    user.paymentMethods.push(validatedPayment as IPaymentMethod);
    await user.save();

    return res.status(201).json({
      message: 'Payment method added successfully',
      paymentMethods: user.paymentMethods,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Add payment method error:', err);
    return res.status(500).json({ message: 'Failed to add payment method' });
  }
}

/**
 * Update payment method by index
 */
export async function updatePaymentMethod(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { index } = req.params;
    const paymentIndex = parseInt(index, 10);

    if (isNaN(paymentIndex) || paymentIndex < 0) {
      return res.status(400).json({ message: 'Invalid payment method index' });
    }

    const validatedPayment = paymentMethodSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (paymentIndex >= user.paymentMethods.length) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    // If this is set as default, unset other defaults
    if (validatedPayment.isDefault) {
      user.paymentMethods.forEach((pm, idx) => {
        if (idx !== paymentIndex) {
          pm.isDefault = false;
        }
      });
    }

    user.paymentMethods[paymentIndex] = validatedPayment as IPaymentMethod;
    await user.save();

    return res.json({
      message: 'Payment method updated successfully',
      paymentMethods: user.paymentMethods,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Update payment method error:', err);
    return res.status(500).json({ message: 'Failed to update payment method' });
  }
}

/**
 * Delete payment method by index
 */
export async function deletePaymentMethod(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { index } = req.params;
    const paymentIndex = parseInt(index, 10);

    if (isNaN(paymentIndex) || paymentIndex < 0) {
      return res.status(400).json({ message: 'Invalid payment method index' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (paymentIndex >= user.paymentMethods.length) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    user.paymentMethods.splice(paymentIndex, 1);
    await user.save();

    return res.json({
      message: 'Payment method deleted successfully',
      paymentMethods: user.paymentMethods,
    });
  } catch (err: any) {
    console.error('Delete payment method error:', err);
    return res.status(500).json({ message: 'Failed to delete payment method' });
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validatedSettings = notificationSettingsSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Merge settings
    if (validatedSettings.email) {
      user.notifications.email = { ...user.notifications.email, ...validatedSettings.email };
    }
    if (validatedSettings.push) {
      user.notifications.push = { ...user.notifications.push, ...validatedSettings.push };
    }
    if (validatedSettings.sms) {
      user.notifications.sms = { ...user.notifications.sms, ...validatedSettings.sms };
    }

    await user.save();

    return res.json({
      message: 'Notification settings updated successfully',
      notifications: user.notifications,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Update notification settings error:', err);
    return res.status(500).json({ message: 'Failed to update notification settings' });
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validatedSettings = privacySettingsSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Merge privacy settings
    user.privacy = { ...user.privacy, ...validatedSettings };
    await user.save();

    return res.json({
      message: 'Privacy settings updated successfully',
      privacy: user.privacy,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Update privacy settings error:', err);
    return res.status(500).json({ message: 'Failed to update privacy settings' });
  }
}

/**
 * Update user preferences
 */
export async function updatePreferences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validatedPreferences = preferencesSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Merge preferences
    user.preferences = { ...user.preferences, ...validatedPreferences };
    await user.save();

    return res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Update preferences error:', err);
    return res.status(500).json({ message: 'Failed to update preferences' });
  }
}

/**
 * Change password
 */
export async function changePassword(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and security settings
    user.passwordHash = newPasswordHash;
    user.security.lastPasswordChangeAt = new Date();
    await user.save();

    return res.json({ message: 'Password changed successfully' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Failed to change password' });
  }
}

/**
 * Verify password for security-sensitive operations
 */
export async function verifyPassword(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const verifyPasswordSchema = z.object({
      password: z.string().min(1, 'Password is required'),
    });

    const { password } = verifyPasswordSchema.parse(req.body);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    return res.json({ message: 'Password verified successfully', verified: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Verify password error:', err);
    return res.status(500).json({ message: 'Failed to verify password' });
  }
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Generate the URL path for the uploaded file
    const avatarUrl = `/uploads/profile/${path.basename(file.path)}`;

    // Update user's avatar URL
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatarUrl } },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
      user,
    });
  } catch (err: any) {
    console.error('Upload avatar error:', err);
    return res.status(500).json({ message: 'Failed to upload avatar' });
  }
}

/**
 * Update security settings (2FA)
 */
export async function updateSecuritySettings(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const securitySchema = z.object({
      twoFactorEnabled: z.boolean().optional(),
      twoFactorMethod: z.enum(['email', 'sms', 'app']).nullable().optional(),
    });

    const validatedSettings = securitySchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If disabling 2FA, clear the method and secret
    if (validatedSettings.twoFactorEnabled === false) {
      user.security.twoFactorEnabled = false;
      user.security.twoFactorMethod = null;
      user.security.twoFactorSecret = undefined;
    } else {
      if (validatedSettings.twoFactorEnabled !== undefined) {
        user.security.twoFactorEnabled = validatedSettings.twoFactorEnabled;
      }
      if (validatedSettings.twoFactorMethod !== undefined) {
        user.security.twoFactorMethod = validatedSettings.twoFactorMethod;
      }
    }

    await user.save();

    return res.json({
      message: 'Security settings updated successfully',
      security: {
        twoFactorEnabled: user.security.twoFactorEnabled,
        twoFactorMethod: user.security.twoFactorMethod,
        lastPasswordChangeAt: user.security.lastPasswordChangeAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Update security settings error:', err);
    return res.status(500).json({ message: 'Failed to update security settings' });
  }
}

/**
 * Generate 2FA QR code for authenticator app setup
 */
export async function generate2FAQR(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user.id).select('+security.twoFactorSecret');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a secret if one doesn't exist
    let secret = user.security.twoFactorSecret;
    if (!secret) {
      secret = speakeasy.generateSecret({
        name: `${user.fullName} (${process.env.APP_NAME || 'E-Commerce'})`,
        length: 32,
      }).base32;
      
      user.security.twoFactorSecret = secret;
      await user.save();
    }

    // Generate QR code
    const otpAuthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: encodeURIComponent(`${user.fullName} (${process.env.APP_NAME || 'E-Commerce'})`),
      issuer: process.env.APP_NAME || 'E-Commerce',
      encoding: 'base32',
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return res.json({
      qrCode: qrCodeDataUrl,
      secret: secret, // For manual entry if QR code can't be scanned
      manualEntryKey: secret ? secret.replace(/(.{4})/g, '$1 ').trim() : '', // Formatted for manual entry
    });
  } catch (err: any) {
    console.error('Generate 2FA QR error:', err);
    return res.status(500).json({ message: 'Failed to generate QR code' });
  }
}

/**
 * Verify 2FA code and enable 2FA
 */
export async function verifyAndEnable2FA(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const verifySchema = z.object({
      token: z.string().length(6, 'Token must be 6 digits'),
    });

    const { token } = verifySchema.parse(req.body);

    const user = await User.findById(req.user.id).select('+security.twoFactorSecret');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.security.twoFactorSecret) {
      return res.status(400).json({ message: '2FA secret not found. Please generate QR code first.' });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.security.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps (60 seconds) before/after current time
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code. Please try again.' });
    }

    // Enable 2FA
    user.security.twoFactorEnabled = true;
    user.security.twoFactorMethod = 'app';
    await user.save();

    return res.json({
      message: 'Two-factor authentication enabled successfully',
      security: {
        twoFactorEnabled: user.security.twoFactorEnabled,
        twoFactorMethod: user.security.twoFactorMethod,
        lastPasswordChangeAt: user.security.lastPasswordChangeAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Verify 2FA error:', err);
    return res.status(500).json({ message: 'Failed to verify 2FA code' });
  }
}

/**
 * Disable 2FA
 */
export async function disable2FA(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user.id).select('+security.twoFactorSecret');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Disable 2FA and clear secret
    user.security.twoFactorEnabled = false;
    user.security.twoFactorMethod = null;
    user.security.twoFactorSecret = undefined;
    await user.save();

    return res.json({
      message: 'Two-factor authentication disabled successfully',
      security: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        lastPasswordChangeAt: user.security.lastPasswordChangeAt,
      },
    });
  } catch (err: any) {
    console.error('Disable 2FA error:', err);
    return res.status(500).json({ message: 'Failed to disable 2FA' });
  }
}

/**
 * Get 2FA status
 */
export async function get2FAStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      twoFactorEnabled: user.security.twoFactorEnabled,
      twoFactorMethod: user.security.twoFactorMethod,
    });
  } catch (err: any) {
    console.error('Get 2FA status error:', err);
    return res.status(500).json({ message: 'Failed to get 2FA status' });
  }
}

/**
 * Get login history
 */
export async function getLoginHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const loginHistory = user.security.loginHistory || [];
    
    // Format dates and return
    const formattedHistory = loginHistory.map((entry) => ({
      date: entry.date,
      ip: entry.ip,
      location: entry.location || 'Unknown',
      device: entry.device || 'Unknown',
    }));

    return res.json({
      loginHistory: formattedHistory,
    });
  } catch (err: any) {
    console.error('Get login history error:', err);
    return res.status(500).json({ message: 'Failed to get login history' });
  }
}

