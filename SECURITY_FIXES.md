# Security Fixes Applied (2026-05-24)

## Critical

| Issue | Fix |
|--------|-----|
| Public `admin` registration | `register` only allows `buyer` \| `seller`; `admin` removed from schema |
| Guest order tracking IDOR | `GET /api/track/:id` requires matching `email` or `phone` query for guests |
| Weak/missing `JWT_SECRET` | Production **exits on startup** if unset or `dev_secret`; centralized `getJwtSecret()` |
| `server/env` in git | Added to `.gitignore`; removed from index with `git rm --cached` (rotate secrets if it was ever pushed) |

## High

| Issue | Fix |
|--------|-----|
| JWT in approval URL | Device approval sets **httpOnly cookie**; redirect without token; client uses `GET /auth/session-bootstrap` |
| Insecure auth cookies | `authCookieOptions()` → `secure: true` in production |
| Socket JWT fallback | WebSocket + live commerce use `getJwtSecret()` |

## Medium

| Issue | Fix |
|--------|-----|
| `/track/my-orders` shadowed | Route order fixed (`/my-orders` before `/:identifier`) |
| Rate limits | Added for guest track, coupon validate, payment complete, reset-password, check-pending-request |
| Helmet | Stricter API headers + HSTS in production |
| Morgan | `combined` in production |

## Manual follow-up (you must do)

1. **Rotate all secrets** if `server/env` was committed or shared (MongoDB, JWT, Stripe, Resend, etc.).
2. Set **`JWT_SECRET`** on Render to a long random string (64+ chars).
3. **Redeploy** API after env updates.
4. Guest tracking UI: when wiring `OrderTracking.jsx` to the API, call  
   `GET /api/track/:orderNumber?email=...` or `?phone=...`  
   Logged-in buyers can use `Authorization` header without email/phone.
5. **localStorage `auth_token`** remains for SPA compatibility; mitigated with httpOnly cookie + CSP hardening. Full cookie-only auth is a larger follow-up.

## New endpoints

- `GET /api/auth/session-bootstrap` — returns `{ user, token }` when httpOnly cookie is present (after device approval).
