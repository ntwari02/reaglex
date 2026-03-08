import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { generateAuthToken, generate2FAPendingToken, verify2FAPendingToken } from '../utils/generateToken';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendVerificationOtpEmail,
  sendWelcomeEmail,
  isEmailConfigured,
} from '../services/emailService';

const APP_NAME = process.env.APP_NAME || 'Reaglex';

/** Escape special regex chars so email can be used in RegExp safely */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find user by email case-insensitively (needed for Google/OAuth emails with varying casing) */
function findUserByEmailCaseInsensitive(email: string) {
  const normalized = (email || '').trim();
  if (!normalized) return User.findOne({ _id: null }); // no match
  return User.findOne({ email: new RegExp('^' + escapeRegex(normalized) + '$', 'i') });
}

const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['buyer', 'seller', 'admin']).optional().default('buyer'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function register(req: Request, res: Response) {
  
  try {
    const { fullName, email, password, role } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const isSeller = role === 'seller';

    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role,
      emailVerified: false,
      // For sellers, start as pending and unverified until government/admin approval
      sellerVerificationStatus: isSeller ? 'pending' : undefined,
      isSellerVerified: isSeller ? false : undefined,
    });

    // Send verification email (non-blocking; do not fail registration if email fails)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();
    sendVerificationEmail(user.email, user.fullName, verificationToken, '24 hours').then((r) => {
      if (!r.success) console.warn('[auth] register: verification email failed', r.error);
    }).catch((e) => console.warn('[auth] register: verification email error', e));

    // Do not issue token or log user in until email is verified
    res.status(201).json({
      message: 'Account created. Please check your email and click the verification link before you can sign in.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Failed to register user' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if user account is inactive or banned
    if (user.accountStatus === 'inactive' || user.accountStatus === 'banned') {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact support for assistance.' 
      });
    }

    // Check if user is OAuth-only (no password set)
    if (!user.passwordHash || user.passwordHash.trim() === '') {
      return res.status(400).json({ 
        message: 'This account uses Google Sign-In. Please sign in with Google instead.' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Require email verification before sign-in (Gmail verification flow)
    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before signing in. Check your inbox for the verification link, or request a new one below.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    // Record login history
    const clientIp = req.ip || req.socket.remoteAddress || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // Simple device detection from user agent
    let device = 'Unknown';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile Device';
    } else if (userAgent.includes('Windows')) {
      device = 'Windows';
    } else if (userAgent.includes('Mac')) {
      device = 'Mac';
    } else if (userAgent.includes('Linux')) {
      device = 'Linux';
    }

    // Simple browser detection
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    const deviceInfo = `${browser} on ${device}`;

    // Initialize login history if it doesn't exist
    if (!user.security.loginHistory) {
      user.security.loginHistory = [];
    }

    // Add new login entry (keep last 50 entries)
    user.security.loginHistory.unshift({
      date: new Date(),
      ip: clientIp,
      device: deviceInfo,
      userAgent: userAgent,
    });

    // Keep only last 50 login entries
    if (user.security.loginHistory.length > 50) {
      user.security.loginHistory = user.security.loginHistory.slice(0, 50);
    }

    await user.save();

    // Seller and Admin: require 2FA for extra security
    const isSellerOrAdmin = user.role === 'seller' || user.role === 'admin';
    if (isSellerOrAdmin) {
      const twoFactorEnabled = user.security?.twoFactorEnabled === true;
      const tempToken = generate2FAPendingToken({
        userId: user._id.toString(),
        purpose: twoFactorEnabled ? '2fa' : '2fa-setup',
        email: user.email,
        role: user.role,
      });
      if (twoFactorEnabled) {
        return res.status(200).json({
          requires2FA: true,
          tempToken,
          email: user.email,
          role: user.role,
        });
      }
      // Admin: must set up 2FA before first use. Seller: must set up 2FA for secure access.
      return res.status(200).json({
        requires2FASetup: true,
        tempToken,
        email: user.email,
        role: user.role,
      });
    }

    const token = generateAuthToken(user);

    res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          sellerVerificationStatus: user.sellerVerificationStatus,
          isSellerVerified: user.isSellerVerified,
          avatarUrl: user.avatarUrl,
        },
        token,
      });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.flatten() });
    }
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Failed to login' });
  }
}

/**
 * POST /api/auth/verify-2fa
 * Completes login for seller/admin after correct TOTP code.
 */
const verify2FASchema = z.object({ tempToken: z.string().min(1), code: z.string().length(6).regex(/^\d{6}$/) });
export async function verify2FA(req: Request, res: Response) {
  try {
    const { tempToken, code } = verify2FASchema.parse(req.body);
    const payload = verify2FAPendingToken(tempToken);
    if (!payload || payload.purpose !== '2fa') {
      return res.status(400).json({ message: 'Invalid or expired session. Please sign in again.' });
    }
    const user = await User.findById(payload.userId).select('+security.twoFactorSecret');
    if (!user || user.email !== payload.email) {
      return res.status(400).json({ message: 'Invalid session. Please sign in again.' });
    }
    if (!user.security?.twoFactorSecret) {
      return res.status(400).json({ message: '2FA is not set up. Please use the setup flow.' });
    }
    const valid = speakeasy.totp.verify({
      secret: user.security.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });
    if (!valid) {
      return res.status(400).json({ message: 'Invalid verification code. Try again.' });
    }
    const token = generateAuthToken(user);
    res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          sellerVerificationStatus: user.sellerVerificationStatus,
          isSellerVerified: user.isSellerVerified,
          avatarUrl: user.avatarUrl,
        },
        token,
      });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request. Code must be 6 digits.' });
    }
    console.error('Verify 2FA error:', err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
}

/**
 * POST /api/auth/setup-2fa/start
 * Start 2FA setup for seller/admin (with temp token from login). Returns QR code.
 */
export async function setup2FAStart(req: Request, res: Response) {
  try {
    const { tempToken } = z.object({ tempToken: z.string().min(1) }).parse(req.body);
    const payload = verify2FAPendingToken(tempToken);
    if (!payload || payload.purpose !== '2fa-setup') {
      return res.status(400).json({ message: 'Invalid or expired session. Please sign in again.' });
    }
    const user = await User.findById(payload.userId).select('+security.twoFactorSecret');
    if (!user || user.email !== payload.email) {
      return res.status(400).json({ message: 'Invalid session. Please sign in again.' });
    }
    let secret = user.security?.twoFactorSecret;
    if (!secret) {
      secret = speakeasy.generateSecret({
        name: `${user.fullName} (${APP_NAME})`,
        length: 32,
      }).base32;
      if (!user.security) user.security = {} as any;
      (user.security as any).twoFactorSecret = secret;
      await user.save();
    }
    const otpAuthUrl = speakeasy.otpauthURL({
      secret,
      label: encodeURIComponent(`${user.fullName} (${APP_NAME})`),
      issuer: APP_NAME,
      encoding: 'base32',
    });
    const qrCode = await QRCode.toDataURL(otpAuthUrl);
    return res.json({
      qrCode,
      manualEntryKey: secret ? secret.replace(/(.{4})/g, '$1 ').trim() : '',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request.' });
    }
    console.error('Setup 2FA start error:', err);
    return res.status(500).json({ message: 'Failed to start 2FA setup.' });
  }
}

/**
 * POST /api/auth/setup-2fa/confirm
 * Verify TOTP code and enable 2FA, then issue full auth token.
 */
const setup2FAConfirmSchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
});
export async function setup2FAConfirm(req: Request, res: Response) {
  try {
    const { tempToken, code } = setup2FAConfirmSchema.parse(req.body);
    const payload = verify2FAPendingToken(tempToken);
    if (!payload || payload.purpose !== '2fa-setup') {
      return res.status(400).json({ message: 'Invalid or expired session. Please sign in again.' });
    }
    const user = await User.findById(payload.userId).select('+security.twoFactorSecret');
    if (!user || user.email !== payload.email) {
      return res.status(400).json({ message: 'Invalid session. Please sign in again.' });
    }
    if (!user.security?.twoFactorSecret) {
      return res.status(400).json({ message: '2FA setup not started. Please request a new code from sign in.' });
    }
    const valid = speakeasy.totp.verify({
      secret: user.security.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });
    if (!valid) {
      return res.status(400).json({ message: 'Invalid verification code. Try again.' });
    }
    (user.security as any).twoFactorEnabled = true;
    (user.security as any).twoFactorMethod = 'app';
    await user.save();
    const token = generateAuthToken(user);
    res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          sellerVerificationStatus: user.sellerVerificationStatus,
          isSellerVerified: user.isSellerVerified,
          avatarUrl: user.avatarUrl,
        },
        token,
      });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request. Code must be 6 digits.' });
    }
    console.error('Setup 2FA confirm error:', err);
    return res.status(500).json({ message: 'Failed to complete 2FA setup.' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user });
}

/**
 * Initiate Google OAuth flow
 * Redirects user to Google's authorization page
 */
export async function googleAuth(req: Request, res: Response) {
  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
    // Google redirects to backend callback, then backend redirects to frontend
    const REDIRECT_URI = `${SERVER_URL}/api/auth/google/callback`;

    // Check if Google OAuth is configured (not empty and not placeholder)
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your_google_client_id')) {
      return res.status(500).json({ 
        message: 'Google OAuth not configured. GOOGLE_CLIENT_ID is missing or still has placeholder value in .env file.' 
      });
    }
    
    if (!GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET.includes('your_google_client_secret')) {
      return res.status(500).json({ 
        message: 'Google OAuth not configured. GOOGLE_CLIENT_SECRET is missing or still has placeholder value in .env file. Please get your Client Secret from Google Cloud Console and add it to server/.env' 
      });
    }

    // Get role from query parameter (optional, defaults to 'buyer')
    const role = (req.query.role as string) || 'buyer';
    
    // Validate role
    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Store role in state parameter (we'll use it in callback)
    const state = Buffer.from(JSON.stringify({ role })).toString('base64');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=openid email profile&` +
      `access_type=online&` +
      `prompt=select_account&` +
      `state=${state}`;

    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Failed to initiate Google authentication' });
  }
}

/**
 * Handle Google OAuth callback
 * Exchange authorization code for user info and create/login user
 */
export async function googleCallback(req: Request, res: Response) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=access_denied`);
    }

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=no_code`);
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
    // This must match what was sent to Google in googleAuth function
    const REDIRECT_URI = `${SERVER_URL}/api/auth/google/callback`;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${CLIENT_URL}/login?error=oauth_not_configured`);
    }

    // Decode state to get role
    let role = 'buyer';
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString());
        role = decodedState.role || 'buyer';
      } catch (e) {
        // Invalid state, use default
      }
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = await userInfoResponse.json();
    const { id: googleId, email, name, picture } = userInfo;

    // Debug: Log Google user info to verify picture is received
    console.log('Google user info:', { googleId, email, name, picture });

    if (!email) {
      return res.redirect(`${CLIENT_URL}/login?error=no_email`);
    }

    // Find user (include verification fields for email-verification check)
    let user = await User.findOne({ $or: [{ email }, { googleId }] })
      .select('+emailVerificationToken +emailVerificationExpires');

    if (user) {
      // Check if user account is inactive or banned
      if (user.accountStatus === 'inactive' || user.accountStatus === 'banned') {
        return res.redirect(`${CLIENT_URL}/login?error=account_deactivated`);
      }

      // User exists - update Google ID and profile picture
      if (!user.googleId && googleId) {
        user.googleId = googleId;
      }
      // Always update avatar with latest Google profile picture
      if (picture) {
        user.avatarUrl = picture;
        console.log('Updated user avatarUrl:', picture);
      } else {
        console.log('No picture received from Google for user:', user.email);
      }
      await user.save();

      // Buyers: no email verification when signing in with Google (Google already verified the email)
      // Sellers/admins: require email verification (link or OTP)
      if (!user.emailVerified) {
        if (user.role === 'buyer') {
          user.emailVerified = true;
          user.emailVerificationToken = undefined;
          user.emailVerificationExpires = undefined;
          await user.save();
          // Fall through to normal sign-in (no email sent, no redirect to verify page)
        } else {
          const needNewToken = !user.emailVerificationToken || !user.emailVerificationExpires || user.emailVerificationExpires < new Date();
          if (needNewToken) {
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            user.emailVerificationToken = verificationToken;
            user.emailVerificationExpires = verificationExpires;
            await user.save();
            sendVerificationEmail(user.email, user.fullName, verificationToken, '24 hours').catch((e) =>
              console.warn('[auth] Google callback: verification email failed', e)
            );
          }
          const pendingUrl = new URL(`${CLIENT_URL}/verify-email-pending`);
          pendingUrl.searchParams.set('email', user.email);
          pendingUrl.searchParams.set('source', 'google');
          return res.redirect(pendingUrl.toString());
        }
      }
    } else {
      // New user - redirect to role selection instead of creating immediately
      // Store Google info temporarily in a signed token
      const tempToken = Buffer.from(JSON.stringify({
        googleId,
        email,
        name: name || email.split('@')[0],
        picture,
        timestamp: Date.now(),
      })).toString('base64');
      
      // Redirect to role selection page with temporary token
      const redirectUrl = new URL(`${CLIENT_URL}/auth/google/select-role`);
      redirectUrl.searchParams.set('temp', tempToken);
      return res.redirect(redirectUrl.toString());
    }

    // Record login history
    const clientIp = req.ip || req.socket.remoteAddress || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    let device = 'Unknown';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile Device';
    } else if (userAgent.includes('Windows')) {
      device = 'Windows';
    } else if (userAgent.includes('Mac')) {
      device = 'Mac';
    } else if (userAgent.includes('Linux')) {
      device = 'Linux';
    }

    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    const deviceInfo = `${browser} on ${device}`;

    if (!user.security.loginHistory) {
      user.security.loginHistory = [];
    }

    user.security.loginHistory.unshift({
      date: new Date(),
      ip: clientIp,
      device: deviceInfo,
      userAgent: userAgent,
    });

    if (user.security.loginHistory.length > 50) {
      user.security.loginHistory = user.security.loginHistory.slice(0, 50);
    }

    await user.save();

    // Seller/Admin: require 2FA (same as password login)
    const isSellerOrAdmin = user.role === 'seller' || user.role === 'admin';
    if (isSellerOrAdmin) {
      const twoFactorEnabled = user.security?.twoFactorEnabled === true;
      const twoFATempToken = generate2FAPendingToken({
        userId: user._id.toString(),
        purpose: twoFactorEnabled ? '2fa' : '2fa-setup',
        email: user.email,
        role: user.role,
      });
      const redirectUrl = new URL(`${CLIENT_URL}/auth/google/callback`);
      redirectUrl.searchParams.set(twoFactorEnabled ? 'requires2FA' : 'requires2FASetup', 'true');
      redirectUrl.searchParams.set('tempToken', twoFATempToken);
      redirectUrl.searchParams.set('email', user.email);
      redirectUrl.searchParams.set('role', user.role);
      return res.redirect(redirectUrl.toString());
    }

    const token = generateAuthToken(user);
    const redirectUrl = new URL(`${CLIENT_URL}/auth/google/callback`);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('success', 'true');
    res.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('Google callback error:', error);
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
  }
}

/**
 * Complete Google OAuth registration with selected role
 * Called after user selects their role on the frontend
 */
export async function completeGoogleRegistration(req: Request, res: Response) {
  try {
    const { temp, role } = req.body;

    if (!temp || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Decode temporary token
    let googleInfo: any;
    try {
      const decoded = Buffer.from(temp, 'base64').toString();
      googleInfo = JSON.parse(decoded);
      
      // Check if token is expired (5 minutes)
      if (Date.now() - googleInfo.timestamp > 5 * 60 * 1000) {
        return res.status(400).json({ message: 'Registration token expired. Please try again.' });
      }
    } catch (e) {
      return res.status(400).json({ message: 'Invalid registration token' });
    }

    const { googleId, email, name, picture } = googleInfo;
    
    // Debug: Log Google info from temp token
    console.log('Google info from temp token:', { googleId, email, name, picture });

    // Check if user was created in the meantime
    let user = await User.findOne({ $or: [{ email }, { googleId }] })
      .select('+emailVerificationToken +emailVerificationExpires');
    
    if (user) {
      // Check if user account is inactive or banned
      if (user.accountStatus === 'inactive' || user.accountStatus === 'banned') {
        return res.status(403).json({ 
          message: 'Your account has been deactivated. Please contact support for assistance.' 
        });
      }

      // Buyers: no email verification (Google already verified). Sellers/admins: require verification.
      if (!user.emailVerified) {
        if (user.role === 'buyer') {
          user.emailVerified = true;
          user.emailVerificationToken = undefined;
          user.emailVerificationExpires = undefined;
          await user.save();
          // Fall through to return token / 2FA check below (no email, no needsVerification)
        } else {
          const needNewToken = !user.emailVerificationToken || !user.emailVerificationExpires || user.emailVerificationExpires < new Date();
          if (needNewToken) {
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            user.emailVerificationToken = verificationToken;
            user.emailVerificationExpires = verificationExpires;
            await user.save();
            sendVerificationEmail(user.email, user.fullName, verificationToken, '24 hours').catch((e) =>
              console.warn('[auth] Google complete: verification email failed', e)
            );
          }
          return res.json({
            success: true,
            needsVerification: true,
            email: user.email,
            message: 'Please verify your email. We sent a link to your inbox.',
          });
        }
      }

      // User already exists and is verified - update profile picture and login
      if (picture) {
        user.avatarUrl = picture;
        console.log('Updating existing user avatarUrl to:', picture);
        await user.save();
        console.log('User saved with avatarUrl:', user.avatarUrl);
      } else {
        console.log('Warning: No picture in temp token for existing user');
      }
      // Seller/Admin: require 2FA (same as password login)
      const isSellerOrAdmin = user.role === 'seller' || user.role === 'admin';
      if (isSellerOrAdmin) {
        const twoFactorEnabled = user.security?.twoFactorEnabled === true;
        const twoFATempToken = generate2FAPendingToken({
          userId: user._id.toString(),
          purpose: twoFactorEnabled ? '2fa' : '2fa-setup',
          email: user.email,
          role: user.role,
        });
        return res.json({
          success: true,
          requires2FA: twoFactorEnabled,
          requires2FASetup: !twoFactorEnabled,
          tempToken: twoFATempToken,
          email: user.email,
          role: user.role,
        });
      }
      const token = generateAuthToken(user);
      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          sellerVerificationStatus: user.sellerVerificationStatus,
          isSellerVerified: user.isSellerVerified,
          avatarUrl: user.avatarUrl,
        },
      });
    }

    // Create new user with selected role. Buyers: no email verification (Google verified). Sellers: require verification.
    const isSeller = role === 'seller';
    const isBuyer = role === 'buyer';
    console.log('Creating new user with Google picture:', picture);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user = await User.create({
      fullName: name || email.split('@')[0],
      email,
      googleId,
      passwordHash: '', // OAuth users don't need password
      role,
      avatarUrl: picture || undefined,
      emailVerified: isBuyer, // Buyer: trust Google. Seller/admin: require verification.
      emailVerificationToken: isBuyer ? undefined : verificationToken,
      emailVerificationExpires: isBuyer ? undefined : verificationExpires,
      sellerVerificationStatus: isSeller ? 'pending' : undefined,
      isSellerVerified: isSeller ? false : undefined,
    });
    console.log('User created with avatarUrl:', user.avatarUrl);

    if (!isBuyer) {
      sendVerificationEmail(user.email, user.fullName, verificationToken, '24 hours').then((r) => {
        if (!r.success) console.warn('[auth] Google register: verification email failed', r.error);
      }).catch((e) => console.warn('[auth] Google register: verification email error', e));
    }

    if (isBuyer) {
      const token = generateAuthToken(user);
      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          sellerVerificationStatus: user.sellerVerificationStatus,
          isSellerVerified: user.isSellerVerified,
          avatarUrl: user.avatarUrl,
        },
      });
    }
    return res.status(201).json({
      success: true,
      needsVerification: true,
      email: user.email,
      message: 'Account created. Please check your email and click the verification link before signing in.',
    });
  } catch (error: any) {
    console.error('Complete Google registration error:', error);
    res.status(500).json({ message: 'Failed to complete registration' });
  }
}

const forgotPasswordSchema = z.object({ email: z.string().email() });
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/auth/forgot-password
 * Sends a password reset email with a secure token. Rate-limited at route level.
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email }).select('_id fullName email passwordHash');
    if (!user) {
      // Do not reveal whether email exists
      return res.status(200).json({ message: 'If an account exists with this email, you will receive a reset link shortly.' });
    }

    if (!user.passwordHash || user.passwordHash.trim() === '') {
      return res.status(200).json({ message: 'If an account exists with this email, you will receive a reset link shortly.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await PasswordResetToken.deleteMany({ userId: user._id });
    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt,
    });

    const result = await sendPasswordResetEmail(
      user.email,
      user.fullName,
      token,
      '1 hour'
    );

    if (!result.success) {
      console.error('[auth] forgotPassword send email failed:', result.error);
      return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }

    return res.status(200).json({ message: 'If an account exists with this email, you will receive a reset link shortly.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
  }
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

/**
 * POST /api/auth/reset-password
 * Validates token and sets new password.
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const resetDoc = await PasswordResetToken.findOne({
      token,
      used: { $ne: true },
      expiresAt: { $gt: new Date() },
    }).populate('userId', 'email passwordHash');

    if (!resetDoc || !resetDoc.userId) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
    }

    const user = await User.findById((resetDoc.userId as any)._id);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    user.security.lastPasswordChangeAt = new Date();
    await user.save();

    resetDoc.used = true;
    await resetDoc.save();

    return res.status(200).json({ message: 'Password has been reset. You can now sign in.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request. Token and password (min 6 characters) are required.' });
    }
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
}

/**
 * GET /api/auth/verify-email?token=...
 * Verifies email using token sent on signup.
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const token = (req.query.token as string)?.trim();
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link.' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    sendWelcomeEmail(user.email, user.fullName).catch((e) => console.warn('[auth] welcome email error', e));

    return res.status(200).json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err: any) {
    console.error('Verify email error:', err);
    return res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
}

/**
 * POST /api/auth/resend-verification
 * Resends verification email for the authenticated user or by email in body.
 * Security: does not reveal whether an account exists (same response for valid/invalid email when unauthenticated).
 */
export async function resendVerification(req: Request, res: Response) {
  const genericSuccess = 'If an account exists with this email, you will receive a verification link shortly.';
  try {
    const email = (req.body?.email as string)?.trim();
    let user: InstanceType<typeof User> | null = null;
    if (email) {
      user = await findUserByEmailCaseInsensitive(email).exec();
      if (!user) {
        return res.status(200).json({ message: genericSuccess });
      }
    } else if ((req as AuthenticatedRequest).user?.id) {
      user = await User.findById((req as AuthenticatedRequest).user!.id);
      if (!user) {
        return res.status(400).json({ message: 'User not found.' });
      }
    } else {
      return res.status(400).json({ message: 'Email is required or sign in first.' });
    }
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified. You can sign in.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    user.emailVerificationToken = token;
    user.emailVerificationExpires = expiresAt;
    await user.save();

    const result = await sendVerificationEmail(user.email, user.fullName, token, '24 hours');
    if (!result.success) {
      return res.status(500).json({ message: 'Failed to send verification email. Try again later.' });
    }
    return res.status(200).json({ message: 'Verification email sent. Check your inbox.' });
  } catch (err: any) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Failed to resend verification email.' });
  }
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * POST /api/auth/request-verification-otp
 * Sends a 6-digit OTP to the user's email for verification (alternative to link).
 * Security: same generic response when account not found to avoid email enumeration.
 */
const OTP_GENERIC_RESPONSE = 'If an account exists with this email, you will receive a verification code shortly.';
export async function requestVerificationOtp(req: Request, res: Response) {
  try {
    const email = (req.body?.email as string)?.trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    const user = await findUserByEmailCaseInsensitive(email).select('+emailVerificationOtp +emailVerificationOtpExpires').exec();
    if (!user) {
      return res.status(200).json({ message: OTP_GENERIC_RESPONSE });
    }
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified. You can sign in.' });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    user.emailVerificationOtp = code;
    user.emailVerificationOtpExpires = expiresAt;
    await user.save();
    const result = await sendVerificationOtpEmail(user.email, user.fullName, code, '10 minutes');
    if (!result.success) {
      return res.status(500).json({ message: 'Failed to send verification code. Try again later.' });
    }
    return res.status(200).json({ message: 'Verification code sent to your email. It expires in 10 minutes.' });
  } catch (err: any) {
    console.error('Request verification OTP error:', err);
    return res.status(500).json({ message: 'Failed to send verification code.' });
  }
}

/**
 * POST /api/auth/verify-email-otp
 * Verifies email using the 6-digit OTP and marks user as verified.
 */
export async function verifyEmailWithOtp(req: Request, res: Response) {
  try {
    const schema = z.object({ email: z.string().email(), code: z.string().length(6) });
    const { email, code } = schema.parse(req.body);
    const user = await findUserByEmailCaseInsensitive(email).select('+emailVerificationOtp +emailVerificationOtpExpires').exec();
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or code.' });
    }
    if (user.emailVerified) {
      return res.status(200).json({ message: 'Email verified successfully. You can now sign in.' });
    }
    if (!user.emailVerificationOtp || !user.emailVerificationOtpExpires) {
      return res.status(400).json({ message: 'No verification code was sent. Request a new code.' });
    }
    if (user.emailVerificationOtpExpires < new Date()) {
      user.emailVerificationOtp = undefined;
      user.emailVerificationOtpExpires = undefined;
      await user.save();
      return res.status(400).json({ message: 'Verification code expired. Request a new code.' });
    }
    if (user.emailVerificationOtp !== code) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpires = undefined;
    await user.save();
    sendWelcomeEmail(user.email, user.fullName).catch((e) => console.warn('[auth] welcome email error', e));
    return res.status(200).json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Email and a 6-digit code are required.' });
    }
    console.error('Verify email OTP error:', err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
}

/**
 * GET /api/auth/email-config
 * Check if email (SMTP) is configured (for frontend to show/hide email features).
 */
export function emailConfig(_req: Request, res: Response) {
  return res.json({ configured: isEmailConfigured() });
}


