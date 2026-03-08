import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
const TWOFA_PENDING_EXPIRY = '5m';

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  phone?: string;
}

export interface TwoFAPendingPayload {
  userId: string;
  purpose: '2fa' | '2fa-setup';
  email: string;
  role: string;
}

export function generateAuthToken(user: IUser): string {
  const payload: AuthTokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
  };

  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };

  return jwt.sign(payload, JWT_SECRET, options);
}

/** Short-lived token for 2FA step or 2FA setup (seller/admin). */
export function generate2FAPendingToken(payload: TwoFAPendingPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TWOFA_PENDING_EXPIRY });
}

export function verify2FAPendingToken(token: string): TwoFAPendingPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TwoFAPendingPayload & { purpose: string };
    if (decoded.purpose !== '2fa' && decoded.purpose !== '2fa-setup') return null;
    return decoded;
  } catch {
    return null;
  }
}


