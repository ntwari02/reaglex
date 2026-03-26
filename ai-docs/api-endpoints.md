# API Endpoints (Reference)

> Base URL: `{API_ORIGIN}/api` where `API_ORIGIN` is the backend (e.g. `http://localhost:5000` or production host).  
> **Auth:** Most protected routes expect `Authorization: Bearer <jwt>` (and may use cookies in some flows).

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |

## Auth (`/api/auth`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/register` | Create account |
| POST | `/login` | Returns JWT (and 2FA flows for seller/admin when enabled) |
| GET | `/me` | **Auth** — current user |
| POST | `/forgot-password`, `/reset-password`, `/reset-password-otp` | Password reset |
| GET/POST | `/verify-email`, `/resend-verification`, `/request-verification-otp`, `/verify-email-otp` | Email verification |
| POST | `/verify-2fa`, `/setup-2fa/start`, `/setup-2fa/confirm` | 2FA |
| GET/POST | `/pending-login-requests`, `/approve-pending-request`, `/reject-pending-request`, `/check-pending-request`, `/approve-device` | Device approval |
| GET | `/google` | Start Google OAuth |
| GET | `/google/callback` | OAuth callback |
| POST | `/google/complete` | Complete registration after Google |
| POST | `/webauthn/login/options`, `/webauthn/login/verify` | WebAuthn |
| POST | `/webauthn/register/options`, `/webauthn/register/verify` | **Auth** WebAuthn register |

## Profile (`/api/profile`)

| Method | Path | Auth |
|--------|------|------|
| GET/PATCH | `/me` | Yes |
| POST | `/me/avatar` | Yes (multipart) |
| GET | `/public/:userId` | Public |
| Various | `/me/addresses`, `/me/payment-methods`, `/me/notifications`, `/me/privacy`, `/me/preferences`, `/me/change-password`, `/me/security`, `/me/2fa/*`, `/me/login-history`, `/me/verify-password` | Yes |

## Products — public (`/api/products`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | No — list/filter |
| POST | `/:productId/view` | No — view tracking |
| GET | `/:productId` | No — detail |

## Buyer orders (`/api/orders`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/` | Yes — create order |
| GET | `/` | Yes — list buyer orders |
| GET | `/:orderId` | Yes |
| PATCH | `/:orderId/cancel` | Yes |
| GET | `/track/:orderNumber` | **Public** — track by order number |

## Payments (`/api/payments`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/initialize` | Yes — `{ orderId }` |
| GET | `/verify` | Query: `transaction_id`, `order_id` |
| POST | `/orders/:orderId/confirm-delivery` | Yes — buyer confirms receipt / escrow release |
| (Additional routes in file) | escrow/dispute admin — see `paymentRoutes.ts` | Varies |

## Tracking (`/api/track`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/:identifier` | Public |
| GET | `/my-orders` | Yes |
| POST | `/events` | Seller/Admin |
| PATCH | `/shipments/:shipmentId/location` | Seller/Admin |
| POST | `/shipments/:shipmentId/confirm-delivery`, `/failed-delivery` | Seller/Admin |

## Seller — core (`/api/seller`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/dashboard/stats` | Seller |
| GET | `/orders` | Seller |
| GET | `/orders/:orderId` | Seller |
| PATCH | `/orders/:orderId/status` | Seller |
| PATCH | `/orders/:orderId/tracking` | Seller |
| GET/POST/PATCH/DELETE | `/collections/*` | Seller |
| POST | `/collections/upload-images` | Seller (multipart) |

## Seller inventory (`/api/seller/inventory`)

| Method | Path | Auth |
|--------|------|------|
| GET/POST/PUT/DELETE | `/products`, `/products/:id`, `/products/bulk-update`, `/products/upload-images` | Seller |
| GET/POST/PATCH/DELETE | `/warehouses/*` | Seller |
| GET | `/stock-history` | Seller |

## Seller settings (`/api/seller/settings`)

Seller-only store/settings (see `sellerSettingsRoutes.ts`).

## Seller subscription & analytics

- `/api/seller/subscription/*`
- `/api/seller/analytics/*`

## Seller disputes, support, KB, account health, notifications, inbox

- `/api/seller/disputes/*`
- `/api/seller/support/*`
- `/api/seller/knowledge-base/*`
- `/api/seller/account-health/*`
- `/api/seller/notifications/*`
- `/api/seller/inbox/*`

## Buyer inbox & disputes

- `/api/buyer/inbox/*`
- `/api/buyer/disputes/*`

## Admin (`/api/admin` + sub-routers)

All require **admin** role (see each router).

- `/api/admin` — users, buyers, sellers (see `adminRoutes.ts`)
- `/api/admin/finance/*`
- `/api/admin/support/*`
- `/api/admin/logistics/*`
- `/api/admin/notifications/*`
- `/api/admin/marketing/*`
- `/api/admin/reviews/*`
- `/api/admin/collections/*`
- `/api/admin/products/*`
- `/api/admin/orders/*`

## Assistant

| Method | Path | Auth |
|--------|------|------|
| POST | `/assistant/chat` | Optional JWT — body `{ message: string }` — text-only Gemini + injected `ai-docs` |
| POST | `/ai/chat` | Optional JWT — body `{ message: string }` — **agent** with tools: `suggestProducts`, `getTrackingInfo`, `updateShippingAddress`, `cancelOrder`, `initializeOrderPayment`. Response may include `products[]` (cards) and `payment` `{ paymentLink, orderId, amount, currency }`. Order tools enforce buyer/seller/admin ownership in code. |
| POST | `/ai/agent` | Optional JWT — body `{ message: string, currentPath?: string }` — **unified** agent with tools: `productInquiry`, `myOrderActions`, `manageShipping`, `getStoreData`. Server enforces role/ownership on every tool execution. Response may include `products[]` and a natural `reply`. |

**Env:** `GEMINI_API_KEY` required; optional `GEMINI_AGENT_MODEL` (default `gemini-1.5-pro` for `/ai/chat`), or `GEMINI_MODEL` fallback.

## Affiliate, blog, webhooks, SEO

- `/api/affiliate/*`
- `/api/blog/*`
- `/api/webhooks/*`
- SEO routes mounted at app level (see `seoRoutes.ts`)
