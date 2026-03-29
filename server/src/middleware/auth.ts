import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '../utils/generateToken';
import { User } from '../models/User';
import { ActiveSession } from '../models/ActiveSession';
import { noteUserRequest } from '../services/systemMonitor.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
// Updating `ActiveSession.lastActiveAt` performs a DB write.
// Throttle this to reduce latency under load.
const SESSION_TOUCH_MIN_MS =
  Number(process.env.SESSION_TOUCH_MIN_MS) || 5 * 60 * 1000; // 5 minutes

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
  // Some routes directly access these properties on AuthenticatedRequest.
  // Keep them permissive to avoid route-level TS errors.
  body: any;
  params: any;
  query: any;
  file?: any;
  files?: any;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload & { jti?: string };
    
    // Check if user account is still active
    const user = await User.findById(decoded.id).select('accountStatus role');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Block inactive or banned users from accessing protected routes
    if (user.accountStatus === 'inactive' || user.accountStatus === 'banned') {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact support for assistance.' 
      });
    }

    // Admin/Seller: single device session – token must match active session
    if ((user.role === 'admin' || user.role === 'seller') && decoded.jti) {
      const session = await ActiveSession.findOne({ userId: decoded.id });
      if (!session || session.tokenId !== decoded.jti) {
        return res.status(401).json({
          message: 'Your session was replaced by another device. Please sign in again.',
          code: 'SESSION_REPLACED',
        });
      }
      const lastActiveAtMs = session.lastActiveAt?.getTime?.() || 0;
      if (Date.now() - lastActiveAtMs > SESSION_TOUCH_MIN_MS) {
        session.lastActiveAt = new Date();
        await session.save();
      }
    }
    
    req.user = decoded;
    noteUserRequest(String(decoded.id), decoded.role);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token', code: 'AUTH_INVALID' });
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    next();
  };
}

/**
 * Attach `req.user` when a valid JWT is present; otherwise continue (guest).
 * Invalid/expired tokens are ignored so the route can still run as guest.
 */
export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload & { jti?: string };
    const user = await User.findById(decoded.id).select('accountStatus role');
    if (!user) {
      return next();
    }
    if (user.accountStatus === 'inactive' || user.accountStatus === 'banned') {
      return next();
    }

    if ((user.role === 'admin' || user.role === 'seller') && decoded.jti) {
      const session = await ActiveSession.findOne({ userId: decoded.id });
      if (!session || session.tokenId !== decoded.jti) {
        return next();
      }
      const lastActiveAtMs = session.lastActiveAt?.getTime?.() || 0;
      if (Date.now() - lastActiveAtMs > SESSION_TOUCH_MIN_MS) {
        session.lastActiveAt = new Date();
        await session.save();
      }
    }

    req.user = decoded;
  } catch {
    // treat as guest
  }

  next();
}


