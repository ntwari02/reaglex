# Production readiness — buyer, seller, admin

Last updated: 2026-06-02

## Buyer (storefront)

| Area | Status | Notes |
|------|--------|-------|
| Product detail + variants | Ready | PDP syncs seller colors/images/SKU; cart stores `variantSku` |
| Cart / checkout | Ready | Checkout sends `variant_id`; server applies variant `priceUsd` |
| Payments — Stripe / PayPal | Ready | Return routes wired; env + admin gateways required |
| Payments — Flutterwave | Ready | `/payment/verify` → `paymentAPI.verify` → order confirmation |
| Payments — MoMo / Airtel | Ready | Wait pages + status polling |
| COD | Ready | Rwanda destination gate; skip payment init |
| Order confirmation | Ready | Loads order from `GET /api/orders/:id` |
| Multi-seller checkout | Partial | First order paid inline; others in `reaglex_unpaid_order_ids` — banner on confirmation |
| Notifications | Ready | Inbox → detail → navigate; prefs load still optional |
| Guest `/notifications` | Partial | Unguarded route |

## Seller

| Area | Status | Notes |
|------|--------|-------|
| Products / inventory | Ready | Variants, images, warehouses |
| Orders / shipping | Ready | Web dashboard |
| KYC / payouts | Partial | Withdraw is ledger-first; admin payout queue may need live disbursement config |
| `transfer-all-to-me` | Secured | Dev-only (`NODE_ENV !== 'production'`) |
| Mobile app | Partial | Some API paths still stubs |

## Admin

| Area | Status | Notes |
|------|--------|-------|
| Orders / finance gateways | Ready | Enable gateways in admin finance |
| Product moderation | Partial | CRUD ready; analytics/export partial |
| Platform settings page | Partial | `PlatformSettings.tsx` may not be routed |
| Notification studio | Ready | Email + in-app |

## Required environment (production)

- `CLIENT_URL` — payment redirects (Flutterwave, Stripe, PayPal)
- Payment keys per enabled gateway (see `server/env.example`, `MISSING_ENV_VARIABLES.md`)
- MongoDB, JWT, Cloudinary (product media)
- `NODE_ENV=production` on API host

## Deploy checklist

1. Set all env vars on server + Vercel (client `VITE_API_URL`).
2. Enable only gateways you have credentials for in **Admin → Finance**.
3. Smoke test: add variant product → cart → checkout (card + MoMo if RW).
4. Confirm Flutterwave return hits `/payment/verify` and order shows **ESCROW_HOLD**.
5. Seller: create product, fulfill test order.
6. Do **not** expose debug inventory routes in production (already gated).
