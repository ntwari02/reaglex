# Roles & Permissions

> **Verified against:** `server/src/middleware/auth.ts` (`authenticate`, `authorize`), route mounts in `server/index.ts`.

## Roles in JWT

Stored in token payload as `role`: `buyer` | `seller` | `admin` (and legacy handling as needed).

## Guest (unauthenticated)

- **No JWT** — treated as guest for assistant context.
- **Can use (typical):**
  - `GET /api/products`, `GET /api/products/:id`, `POST /api/products/:productId/view`
  - `GET /api/orders/track/:orderNumber` (public tracking)
  - `GET /api/track/:identifier` (public tracking)
  - `GET /api/blog/*` (as exposed), SEO routes
  - `POST /api/assistant/chat` (AI help; no user-specific data without login)
- **Cannot:** create orders, pay, access profile, seller/admin APIs.

## Buyer

- **Auth:** `authenticate` on protected routes.
- **Can use (examples):**
  - `POST /api/orders` — create order
  - `GET /api/orders`, `GET /api/orders/:orderId`, `PATCH /api/orders/:orderId/cancel`
  - `POST /api/payments/initialize` (own orders)
  - `POST /api/payments/orders/:orderId/confirm-delivery` (own)
  - `GET /api/profile/*` (own profile)
  - `GET /api/buyer/inbox/*`
  - `GET /api/track/my-orders` (authenticated)
- **Cannot:** seller routes (`/api/seller/*`), admin routes (`/api/admin/*`), inventory CRUD.

## Seller

- **Auth + role:** `authenticate` + `authorize('seller')` on seller namespaces.
- **Examples:**
  - `GET|PATCH /api/seller/orders`, tracking updates
  - `GET /api/seller/dashboard/stats`
  - `GET|POST|PATCH|DELETE /api/seller/collections/*`
  - `GET|POST|PUT|DELETE /api/seller/inventory/products/*`, warehouses, stock
  - `GET /api/seller/analytics/*`, subscription, settings, disputes, support, inbox
  - `POST /api/track/events`, shipment location updates (with `authorize('seller','admin')` where applicable)
- **Cannot:** arbitrary admin user management, global admin settings, other sellers’ private data (unless API allows — assume store-scoped).

## Admin

- **Auth + role:** `authorize('admin')` on `/api/admin/*` branches.
- **Examples:** users, sellers, orders dashboard, finance, logistics, marketing, reviews, collections, products, notifications.
- **Cannot:** bypass MongoDB business rules; still subject to auth and validation.

## Assistant (AI)

- **Endpoint:** `POST /api/assistant/chat` with optional `Authorization: Bearer <token>`.
- Server infers **guest | buyer | seller | admin** from JWT for prompt grounding.
- Assistant must **not** instruct users to call endpoints they cannot access.
