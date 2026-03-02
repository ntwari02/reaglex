import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { generateAuthToken } from '../utils/generateToken';
import { AuthenticatedRequest } from '../middleware/auth';

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
      // For sellers, start as pending and unverified until government/admin approval
      sellerVerificationStatus: isSeller ? 'pending' : undefined,
      isSellerVerified: isSeller ? false : undefined,
    });

    const token = generateAuthToken(user);

    // Send token as both JSON and HTTP-only cookie for flexibility
    res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // set true behind HTTPS/proxy in production
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          sellerVerificationStatus: user.sellerVerificationStatus,
          isSellerVerified: user.isSellerVerified,
        },
        token,
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

    // Find user
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

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

    // Generate JWT token
    const token = generateAuthToken(user);

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

    // Existing user - redirect to frontend with token in URL (avatarUrl is already updated above)
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
    let user = await User.findOne({ $or: [{ email }, { googleId }] });
    
    if (user) {
      // Check if user account is inactive or banned
      if (user.accountStatus === 'inactive' || user.accountStatus === 'banned') {
        return res.status(403).json({ 
          message: 'Your account has been deactivated. Please contact support for assistance.' 
        });
      }

      // User already exists - update profile picture and login
      if (picture) {
        user.avatarUrl = picture;
        console.log('Updating existing user avatarUrl to:', picture);
        await user.save();
        console.log('User saved with avatarUrl:', user.avatarUrl);
      } else {
        console.log('Warning: No picture in temp token for existing user');
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

    // Create new user with selected role
    const isSeller = role === 'seller';
    console.log('Creating new user with Google picture:', picture);
    user = await User.create({
      fullName: name || email.split('@')[0],
      email,
      googleId,
      passwordHash: '', // OAuth users don't need password
      role,
      avatarUrl: picture || undefined, // Save picture if available
      sellerVerificationStatus: isSeller ? 'pending' : undefined,
      isSellerVerified: isSeller ? false : undefined,
    });
    console.log('User created with avatarUrl:', user.avatarUrl);

    // Generate JWT token
    const token = generateAuthToken(user);

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

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        sellerVerificationStatus: user.sellerVerificationStatus,
        isSellerVerified: user.isSellerVerified,
      },
    });
  } catch (error: any) {
    console.error('Complete Google registration error:', error);
    res.status(500).json({ message: 'Failed to complete registration' });
  }
}


