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
  verifyEmail,
  resendVerification,
  requestVerificationOtp,
  verifyEmailWithOtp,
  emailConfig,
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

// Email: forgot password (rate-limited), reset password, verify email
router.get('/email-config', emailConfig);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/request-verification-otp', requestOtpLimiter, requestVerificationOtp);
router.post('/verify-email-otp', verifyEmailWithOtp);

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


