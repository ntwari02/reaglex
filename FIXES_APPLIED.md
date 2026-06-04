# Fixes Applied — Full-Stack Audit

**Date:** 2026-05-24  
All changes are production-safe and scoped to known broken connections or deploy reliability.

---

## 1. Public coupon validation API

**Problem:** `client/src/stores/cartStore.ts` called `GET /api/coupons/validate` but no route existed (admin coupons only under `/api/admin/marketing/coupons`).

**Fix:**

- Added `server/src/controllers/couponPublicController.ts` — validates `MarketingCoupon` (active, expiry, usage limit, min order).
- Added `server/src/routes/couponRoutes.ts` — `GET /validate`.
- Mounted in `server/index.ts`: `app.use('/api/coupons', couponRoutes)`.

**Response shape** matches cart store: `code`, `discount_type`, `discount_value`, optional `max_discount_amount`.

---

## 2. Seller boost analytics URL

**Problem:** `BoostAnalyticsMiniPanel.tsx` fetched `${API_BASE_URL}/analytics` (404).

**Fix:** URL changed to `${API_BASE_URL}/seller/analytics?timeRange=month` (matches `analyticsRoutes` mounted at `/api/seller/analytics`).

**File:** `client/src/components/seller/BoostAnalyticsMiniPanel.tsx`

---

## 3. Help center routing

**Problem:** `/help` rendered `BuyerHome`; `HelpCenter`, `HelpSearch`, `HelpCategory`, `HelpArticle` were unused.

**Fix:** Lazy-loaded help pages and routes in `client/src/App.tsx`:

- `/help` → `HelpCenter`
- `/help/search` → `HelpSearch`
- `/help/:category` → `HelpCategory`
- `/help/:category/:article` → `HelpArticle`

Help content remains static (`helpCenterData.ts`) — no backend change required.

---

## 4. Render keep-alive URL

**Problem:** If `RENDER_EXTERNAL_URL` was set but `RENDER_EXTERNAL_HOSTNAME` empty, ping target became `https://`.

**Fix:** `server/keepAlive.ts` — `resolveSelfUrl()` prefers full `RENDER_EXTERNAL_URL`, then hostname, then default.

---

## 5. Escrow cron error handling

**Problem:** Uncaught errors in cron callbacks could trigger `unhandledRejection`.

**Fix:** `server/src/jobs/escrowJobs.ts` — outer try/catch on hourly auto-release and daily admin report jobs.

---

## 6. Production JWT warning

**Fix:** `server/index.ts` logs a warning when `NODE_ENV=production` and `JWT_SECRET` is missing or `dev_secret`.

Does not exit (avoids surprise hard failure); set secret on Render for security.

---

## 7. Render deployment scripts

**Fix:**

- `server/package.json` — added `"start:prod": "node dist/index.js"`.
- Root `render.yaml` — blueprint with `buildCommand`, `startCommand: npm run start:prod`, `healthCheckPath: /api/health`.

---

## 8. Prior session fixes (already in tree)

Documented for completeness:

| Area | Change |
|------|--------|
| `server/index.ts` | `unhandledRejection` / `uncaughtException` handlers |
| `server/index.ts` | `runStartupStep` for payment gateways + workers |
| `server/index.ts` | Listen on `HOST` default `0.0.0.0`; keep-alive after listen |
| `server/index.ts` | Mongo pool `minPoolSize: 0` in production |
| Admin / auth mobile CSS | UI-only responsive improvements |

---

## 9. Build verification after fixes

| Target | Command | Result |
|--------|---------|--------|
| Server | `npm run build` | ✅ |
| Client | `npm run build` | ✅ |

---

## 10. Not changed (intentional)

- Client TypeScript strict errors — pre-existing; Vite build passes.
- Removing `server/env` from disk — may be local-only; **do not commit**; rotate if exposed.
- Consolidating `cartStore` vs `buyerCartStore` — larger refactor.
- Removing duplicate `/api/ai` mount — needs route-level audit.
- Hard-failing startup on weak `JWT_SECRET` — warning only to avoid blocking deploy.

---

## Redeploy steps

1. Push changes to git (when ready).
2. On Render API service: set **Start Command** to `npm run start:prod`.
3. Confirm env: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `ALLOWED_ORIGINS`.
4. Redeploy and confirm log: `🚀 Server listening on 0.0.0.0:<PORT>`.
