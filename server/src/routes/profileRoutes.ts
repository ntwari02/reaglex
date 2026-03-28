import { Router } from 'express';
import { authenticate } from '../middleware/auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadAvatar: uploadAvatarMiddleware } = require('../../config/cloudinary');
import {
  getProfile,
  getPublicProfile,
  updateProfile,
  uploadAvatar,
  addAddress,
  updateAddress,
  deleteAddress,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  updateNotificationSettings,
  updatePrivacySettings,
  updatePreferences,
  changePassword,
  verifyPassword,
  updateSecuritySettings,
  generate2FAQR,
  verifyAndEnable2FA,
  disable2FA,
  get2FAStatus,
  getLoginHistory,
} from '../controllers/profileController';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// Profile CRUD
router.get('/me', getProfile);
router.get('/public/:userId', getPublicProfile);
router.patch('/me', updateProfile);
// Avatar upload
router.post('/me/avatar', uploadAvatarMiddleware, uploadAvatar);

// Address management
router.post('/me/addresses', addAddress);
router.put('/me/addresses/:index', updateAddress);
router.delete('/me/addresses/:index', deleteAddress);

// Payment method management
router.post('/me/payment-methods', addPaymentMethod);
router.put('/me/payment-methods/:index', updatePaymentMethod);
router.delete('/me/payment-methods/:index', deletePaymentMethod);

// Settings management
router.patch('/me/notifications', updateNotificationSettings);
router.patch('/me/privacy', updatePrivacySettings);
router.patch('/me/preferences', updatePreferences);
router.patch('/me/security', updateSecuritySettings);

// Password management
router.post('/me/change-password', changePassword);
router.post('/me/verify-password', verifyPassword);

// 2FA management
router.get('/me/2fa/status', get2FAStatus);
router.get('/me/2fa/qr', generate2FAQR);
router.post('/me/2fa/verify', verifyAndEnable2FA);
router.post('/me/2fa/disable', disable2FA);

// Login history
router.get('/me/login-history', getLoginHistory);

export default router;

