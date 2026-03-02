import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  phone?: string;
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


