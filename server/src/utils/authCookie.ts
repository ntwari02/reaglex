import type { CookieOptions } from 'express';

/** HttpOnly session cookie for JWT (used with credentials: 'include' on the client). */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
