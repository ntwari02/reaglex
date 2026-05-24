# Frontend ↔ Backend Connection Map

**Convention:** Client uses `API_BASE_URL` = `VITE_API_URL` (e.g. `https://api.example.com/api`). Paths below are relative to that base unless noted.

---

## Auth & onboarding

| Frontend | HTTP | Backend route | Controller / service | DB |
|----------|------|---------------|----------------------|-----|
| `AuthPage`, `Login`, `Signup` | POST `/auth/login`, `/auth/register` | `authRoutes` | `authController` | `User`, sessions |
| `GoogleCallback` | GET `/auth/google/callback` | `authRoutes` | OAuth handlers | `User` |
| `VerifyOTP`, `VerifyEmail` | POST `/auth/verify-*` | `authRoutes` | OTP / email verify | `User` |
| `ForgotPassword`, `ResetPassword` | POST `/auth/forgot-password`, `/auth/reset-password` | `authRoutes` | email + token | `User` |
| `SelectRole` | PATCH profile / role | `profileRoutes` | `profileController` | `User` |
| `authStore` | GET `/auth/me` | `authRoutes` | JWT verify | `User` |

---

## Buyer storefront

| Frontend | HTTP | Backend route | Controller / service | DB |
|----------|------|---------------|----------------------|-----|
| `Home`, `homeFeedApi` | GET `/home/*` | `marketplaceAIRoutes` / public home | home feed services | Products, collections |
| `SearchResults`, `ExploreAll` | GET `/products`, `/categories` | `productRoutes`, `categoryRoutes` | product controllers | Product, Category |
| `ProductDetail` | GET `/products/:id` | `productRoutes` | `productController` | Product |
| `Checkout` | POST `/orders`, `/payments/*` | `buyerOrderRoutes`, `paymentRoutes` | order + payment services | Order, Payment |
| `cartStore.applyCoupon` | GET `/coupons/validate` | **`couponRoutes`** | `couponPublicController` | `MarketingCoupon` |
| `buyerCartStore` / `cartSyncApi` | `/buyer/cart/*` | `buyerCartRoutes` | cart controller | Cart |
| `OrderTracking` | GET `/track/*`, `/orders/*` | `trackingRoutes`, `buyerOrderRoutes` | tracking | Order |
| `BuyerDashboard` | `/buyer/*`, `/profile/*` | various buyer routes | inbox, notifications | multiple |
| `LiveSession`, `LiveDiscover` | `/live-commerce/*` | `liveCommerceRoutes` | live commerce + sockets | LiveSession |
| `websocketService` | Socket.IO | same origin `SERVER_URL` | `websocketService` | n/a |

---

## Help center (static — no API)

| Frontend | HTTP | Backend |
|----------|------|---------|
| `HelpCenter`, `HelpSearch`, `HelpCategory`, `HelpArticle` | — | Static `helpCenterData.ts` only |

Routes: `/help`, `/help/search`, `/help/:category`, `/help/:category/:article`

---

## Seller hub

| Frontend | HTTP | Backend route | Notes |
|----------|------|---------------|-------|
| `SellerDashboard` shell | — | — | Client-side routes |
| `DashboardOverview` | GET `/seller/...` | `sellerRoutes` | Orders, stats |
| `Analytics`, `BoostAnalyticsMiniPanel` | GET `/seller/analytics` | `analyticsRoutes` | `analyticsController` |
| `ProductManagement` | `/products`, `/seller/inventory` | `productRoutes`, `inventoryRoutes` | |
| `OrdersPage` | `/seller` orders | `sellerRoutes` | |
| `SubscriptionTiers` | `/seller/subscription/*` | `subscriptionRoutes` | Stripe billing |
| `ProfilePage`, KYC | `/seller/kyc`, `/seller/settings` | `sellerKycRoutes`, `sellerSettingsRoutes` | |
| `SupportCenter` | `/seller/support`, `/seller/inbox` | support + inbox routes | |

---

## Admin hub

| Frontend | HTTP | Backend route |
|----------|------|---------------|
| `AdminDashboard` + hubs | via `client/src/lib/api.ts` | `/api/admin/*` |
| Marketing coupons (admin) | `/admin/marketing/coupons` | `adminMarketingRoutes` |
| Finance, logistics, reviews | `${*_BASE}` in `api.ts` | matching `admin*Routes` |

---

## Payments & webhooks

| Frontend | HTTP | Backend |
|----------|------|---------|
| `Checkout`, `MomoPaymentWait` | `/payments/*` | `paymentRoutes` |
| `StripeReturn`, `PayPalReturn` | return URLs → `/payments` | payment controllers |
| Stripe (server) | POST `/api/webhooks/stripe` | `stripeWebhookRoutes` (raw body) |

---

## AI & assistant

| Frontend | HTTP | Backend |
|----------|------|---------|
| `AssistantChat` | `/assistant`, `/ai/*` | `assistantRoutes`, `aiChatRoutes`, `aiAgentRoutes` |

---

## Public / SEO

| Frontend | HTTP | Backend |
|----------|------|---------|
| Footer newsletter | `/newsletter` | `newsletterRoutes` |
| Sitemap (Vercel) | proxies to API if `REAGLEX_API_ORIGIN` set | `seoRoutes` |
| OG images | `/public/og` | `publicOgRoutes` |

---

## Known mismatches (status)

| Issue | Status |
|-------|--------|
| `BoostAnalyticsMiniPanel` → `/analytics` | ✅ Fixed → `/seller/analytics` |
| `cartStore` → `/coupons/validate` | ✅ Backend route added |
| `/help` → `BuyerHome` | ✅ Help pages routed |
| Admin-only endpoints unused by UI | ⚠️ Open — audit per hub |
| `cartStore` vs `buyerCartStore` duplicate cart logic | ⚠️ Open |

---

## Backend endpoints with limited / no frontend UI

Examples (not exhaustive):

- `/api/system/*` — system monitor (partially used by admin System Analysis)
- `/api/security-analysis/*` — admin Security Analysis page
- `/api/recommendation-emails/*` — admin tooling
- `/api/warehouse`, `/api/pickup` — logistics (may be admin-only)
- `/api/marketplace/*` — innovation experiments
- `/api/verification/*` — product verification pipeline
- SEO SSR server (`seo:ssr`) — separate process from main API

---

## HTTP client map

| Client module | Used by |
|---------------|---------|
| `lib/api.ts` | Admin hubs, support, marketing, logistics |
| `services/api.ts` | Storefront axios calls |
| `services/*Api.ts` | Focused domains (subscription, live, referral, …) |
| Direct `fetch` + `API_BASE_URL` | Seller pages, auth, cart, boost panel |

Ensure all use `VITE_API_URL` in production builds.
