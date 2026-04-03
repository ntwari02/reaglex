# Seller subscriptions & assistant (Gemini / tools)

Use this when helping **sellers** or **admins** with plans, limits, and billing context.

## Canonical APIs (admin)

- `GET /api/admin/seller-subscriptions/plans` — catalog with `features`, `limits`, pricing.
- `GET /api/admin/seller-subscriptions` — paginated seller rows (search, tier, status).
- `GET /api/admin/seller-subscriptions/seller/:userId` — full `SellerSubscription` document + user summary.
- `PATCH .../tier` — body `{ tierId }` (assign plan).
- `PATCH .../status` — body `{ action: "suspend" | "pause" | "reactivate" }`.
- `PATCH .../cancel` — body `{ reason }`.
- `PATCH .../auto-renew` — body `{ autoRenew: boolean }`.
- `POST .../extend-renewal` — body `{ days }` (1–366).
- `POST .../extend-trial` — body `{ days }` (1–90).
- `PATCH .../override-limits` — body `{ productLimit?, apiCallsPerMonth?, storageBytes? }` (stored under `metadata.admin_limit_overrides`).
- `POST .../apply-coupon` — body `{ code }`.
- `POST .../retry-payment` — records ops retry (gateway hooks can subscribe).

Mutations notify the **seller** and **all admins** via system inbox (`createSystemInboxAndFanout`).

## Health

- `GET /api/system/health` (authenticated admin) includes `integrations.mongoConnected`, `integrations.sellerSubscriptionAdmin`, `integrations.loginAlertEmail`.

## Assistant behavior

- Prefer **function calling** to fetch live plan rows instead of inventing prices.
- After admin tier changes, remind the seller to check **notifications** (bell) for the confirmation message.
- Do not expose raw internal stack traces to non-admin users.
- **Premium / Pro** style bullets should match `plans[].features` from the API (e.g. unlimited products, analytics, API access).

## Login emails

- Successful logins trigger `sendLoginNotificationEmail` when email is configured. Disable with `SEND_LOGIN_ALERT_EMAIL=false`.
