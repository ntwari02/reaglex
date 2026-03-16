import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  me,
  register,
  googleAuth,
  googleCallback,
  completeGoogleRegistration,
  forgotPassword,
  resetPassword,
  resetPasswordWithOtp,
  verifyEmail,
  resendVerification,
  requestVerificationOtp,
  verifyEmailWithOtp,
  emailConfig,
  verify2FA,
  setup2FAStart,
  setup2FAConfirm,
  getPendingLoginRequests,
  approvePendingRequest,
  rejectPendingRequest,
  checkPendingRequest,
  approveDeviceByEmail,
} from '../controllers/authController';
import {
  webauthnRegisterOptions,
  webauthnRegisterVerify,
  webauthnLoginOptions,
  webauthnLoginVerify,
} from '../controllers/webauthnController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rate limit: password reset requests per IP (abuse protection)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many reset attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const requestOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: { message: 'Too many code requests. Please try again in 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many verification emails. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verify2FALimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many 2FA attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { message: 'Too many sign-in attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);

// Email: config, forgot password (rate-limited), reset password, verify email
router.get('/email-config', emailConfig);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/reset-password-otp', forgotPasswordLimiter, resetPasswordWithOtp);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, resendVerification);
router.post('/request-verification-otp', requestOtpLimiter, requestVerificationOtp);
router.post('/verify-email-otp', verifyEmailWithOtp);

// 2FA for seller/admin (verify code or complete setup)
router.post('/verify-2fa', verify2FALimiter, verify2FA);
router.post('/setup-2fa/start', verify2FALimiter, setup2FAStart);
router.post('/setup-2fa/confirm', verify2FALimiter, setup2FAConfirm);

// Device session (admin/seller): pending requests, approve, reject, check, email link
router.get('/pending-login-requests', authenticate, getPendingLoginRequests);
router.post('/approve-pending-request', authenticate, approvePendingRequest);
router.post('/reject-pending-request', authenticate, rejectPendingRequest);
router.get('/check-pending-request', checkPendingRequest);
router.get('/approve-device', approveDeviceByEmail);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google/complete', completeGoogleRegistration);

// WebAuthn (biometric / passkey) routes
router.post('/webauthn/login/options', webauthnLoginOptions);
router.post('/webauthn/login/verify', webauthnLoginVerify);
router.post('/webauthn/register/options', authenticate, webauthnRegisterOptions);
router.post('/webauthn/register/verify', authenticate, webauthnRegisterVerify);

export default router;


