# Full System Audit — Reaglex

**Date:** 2026-05-24  
**Scope:** `server/` (Express + MongoDB + Socket.IO) and `client/` (Vite + React SPA)

## Executive summary

The stack is a large marketplace monorepo: **~65 route modules**, **450+ compiled server files**, and a **3,500+ module** Vite client. Core buyer, seller, admin, payments, live commerce, and marketing flows are wired end-to-end. Several **frontend↔backend mismatches** were found; the highest-impact ones (Render startup, coupon validation, seller boost analytics URL, help center routes, keep-alive ping URL) were **fixed in this audit**.

| Area | Status |
|------|--------|
| Server production build (`npm run build`) | ✅ Pass |
| Client production build (`npm run build`) | ✅ Pass |
| Client strict TypeScript (`npm run typecheck`) | ❌ Pre-existing errors (non-blocking for Vite build) |
| Render deploy readiness | ⚠️ Requires correct env + `start:prod` (now documented) |

---

## 1. Backend architecture

### Entry & lifecycle

| Component | Path | Notes |
|-----------|------|--------|
| HTTP entry | `server/index.ts` | Loads `.env` + `server/env`, mounts routes, connects MongoDB, then listens on `HOST` (default `0.0.0.0`) |
| WebSocket | `server/src/services/websocketService.ts` | Initialized after DB connect |
| Cron (side-effect) | `escrowJobs.ts`, `subscriptionRenewalJob.ts` | Imported at module load; escrow crons now wrapped in try/catch |
| Workers | notification, email, exchange rate, marketplace AI, etc. | Started via `runStartupStep('background workers')` — failures logged, non-fatal |
| Payment registry | `ensureCorePaymentGateways()` | Runs post-Mongo; previously implicated in Render exit-before-listen |

### Global process handlers

- `unhandledRejection` — logs (does not exit)
- `uncaughtException` — logs and `process.exit(1)`
- Production `JWT_SECRET` warning if missing or `dev_secret`

### Middleware stack

Helmet, CORS (`getAllowedCorsOrigins`), compression, rate limit (200/15min on `/api`), `sanitizeInput`, cookie parser, Morgan, Stripe raw body for webhooks.

### Authentication

- JWT in `Authorization: Bearer` or `cookies.token`
- Middleware: `server/src/middleware/auth.ts` (`authenticate`, `authorize`)
- **Risk:** `JWT_SECRET` falls back to `dev_secret` when unset (warn added in production)

### Database

- Mongoose via `MONGODB_URI` or `MONGO_URI` (required at startup)
- Pool tuned for production (`minPoolSize: 0`)

### Payments

- Routes: `/api/payments`, `/api/webhooks/stripe`, `/api/webhooks`
- Gateways synced at startup; Stripe/PayPal/MoMo/Flutterwave via env-driven credentials

### WebSockets

- Socket.IO on same HTTP server; CORS origins aligned with REST

### API surface (mount prefixes)

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Login, register, OAuth, OTP, WebAuthn |
| `/api/profile` | User profile |
| `/api/seller/*` | Seller hub, inventory, KYC, disputes, analytics |
| `/api/buyer/*` | Cart, orders, inbox, returns, referrals |
| `/api/admin/*` | Admin dashboards (finance, marketing, logistics, …) |
| `/api/products`, `/api/categories` | Catalog |
| `/api/orders`, `/api/payments` | Checkout & payments |
| `/api/live-commerce` | Live sessions |
| `/api/ai`, `/api/assistant` | AI chat & assistant |
| `/api/public` | Public CMS-style content |
| `/api/coupons` | **Added:** public coupon validation |
| `/api/health` | Render health check |

Duplicate mount: `/api/ai` registers both `aiChatRoutes` and `aiAgentRoutes` (intentional split by path inside routers).

---

## 2. Frontend architecture

### API configuration

- `client/src/lib/config.ts` — `VITE_API_URL` (must include `/api`), `VITE_SERVER_URL`
- Dual HTTP clients:
  - `client/src/lib/api.ts` — fetch-based, admin dashboards
  - `client/src/services/api.ts` — axios, storefront

### Auth

- Token: `localStorage.auth_token`
- Requests: `credentials: 'include'` where cookies used

### Routing

- Buyer SPA under `SpaBuyerShell` in `App.tsx`
- Seller: `/seller/*` via `SellerDashboard`
- Admin: `/admin/*` via `AdminDashboard`

---

## 3. Issues found (by severity)

### Critical (fixed)

1. **Render exit after Mongo connect** — post-connect steps wrapped in `runStartupStep`; listen on `0.0.0.0`; keep-alive only after listen.
2. **`keepAlive` ping URL `https://`** when only `RENDER_EXTERNAL_URL` set — fixed URL resolution.
3. **Cart coupon validation** — client called `/api/coupons/validate` with no route — **route added**.
4. **Boost analytics panel** — called `/api/analytics` instead of `/api/seller/analytics` — **fixed**.

### High (partially fixed / documented)

5. **Help center** — pages existed but `/help` routed to `BuyerHome` — **routes wired**.
6. **`npm start` on server** was `nodemon` — **`start:prod`** + `render.yaml` added.
7. **`server/env` file present** — may contain secrets; must not be committed; use Render env dashboard.
8. **Cron unhandled rejections** — escrow daily job wrapped.

### Medium (open)

9. Client **TypeScript** errors (`tsc --noEmit`) — many unused imports, missing `.d.ts` for JS modules, `cartStore`/`homeFeedApi` issues.
10. **Dual cart systems** — `cartStore.ts` vs `buyerCartStore.js` + cloud sync.
11. **`/api/ai` duplicate mount** — verify no route collisions.
12. Optional services (Meilisearch, Redis/BullMQ, Microblink) — degrade gracefully if env missing.

### Low

13. Large admin `api.ts` surface — some admin-only endpoints may have no UI.
14. Help center is **static data** (`helpCenterData.ts`) — no backend CMS for help articles.

---

## 4. Security notes

| Issue | Recommendation |
|-------|----------------|
| Default `JWT_SECRET` | Set strong secret on Render; warning logged at startup |
| `server/env` in repo | Rotate any exposed keys; use Render secrets only |
| Rate limiting | Global 200/15min; auth routes have additional limits |
| CORS | Set `ALLOWED_ORIGINS` + `CLIENT_URL` in production |
| Payment webhooks | Stripe raw body route before `express.json()` — correct |

---

## 5. Dead code / unused imports

- Not exhaustively removed (risk of breaking dynamic imports).
- Recommend incremental cleanup with ESLint `no-unused-vars` and `ts-prune` on server.

---

## 6. Build validation (this run)

```
server: npm run build  → ✅ (450 files → dist/)
client: npm run build  → ✅ (~2m 21s)
client: npm run typecheck → ❌ pre-existing TS errors (Vite build still succeeds)
```

---

## 7. Related documents

- [FRONTEND_BACKEND_CONNECTION_MAP.md](./FRONTEND_BACKEND_CONNECTION_MAP.md)
- [DEPLOYMENT_ISSUES.md](./DEPLOYMENT_ISSUES.md)
- [MISSING_ENV_VARIABLES.md](./MISSING_ENV_VARIABLES.md)
- [FIXES_APPLIED.md](./FIXES_APPLIED.md)
