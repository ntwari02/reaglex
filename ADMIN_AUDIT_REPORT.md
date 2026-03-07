# Admin Section – Full Code Audit Report

**Project:** E-commerce (Reaglex)  
**Scope:** Admin frontend + backend API used by admin  
**Method:** Static code analysis (no local run)  
**Date:** 2025-03-07  

---

## 1. Admin Feature Discovery

### 1.1 Top-Level Routes (AdminDashboard)

| Route segment | Component | Data source |
|---------------|-----------|-------------|
| `/admin` / `dashboard` | AdminOverview | **Supabase** (not Express API) |
| `users` | UserManagement | adminAPI (Express) |
| `sellers` | SellerStoreManagement → SellerList / SellerProfile | adminAPI (list); **SellerProfile = mock** |
| `products` | ProductManagementAdmin | adminProductsAPI |
| `orders` | OrderManagementAdmin | adminOrdersAPI |
| `finance` | PaymentsFinancial | adminFinanceAPI |
| `support` | SupportCenter | adminSupportAPI |
| `logistics` | LogisticsCenter | adminLogisticsAPI (sub-pages) |
| `notifications` | NotificationsCenter | adminNotificationsAPI |
| `marketing` | MarketingCenter | adminMarketingAPI (dashboard + sub-pages) |
| `reviews` | ReviewsCenter | adminReviewsAPI (dashboard + sub-pages) |
| `collections` | CollectionsCenter | adminCollectionsAPI |
| `settings` | AdminProfile | **Mock statistics** |

### 1.2 API Utilities (client/src/lib/api.ts)

- **adminAPI** – users/buyers/sellers (stats, list, details, status, CRUD)
- **adminFinanceAPI** – dashboard, payouts, transactions, gateways, refunds, chargebacks, tax rules, reports, settings, sellers list
- **adminSupportAPI** – dashboard, tickets, disputes, staff, articles, alerts, reports/analytics, settings, **chats** (backend placeholder)
- **adminLogisticsAPI** – partners, zones, fleet, warehouses, tracking, analytics, returns, settings, etc.
- **adminNotificationsAPI** – dashboard, send, templates, scheduled, analytics, user control, logs, integrations, automation, permissions, **alerts** (system alerts)
- **adminCollectionsAPI** – dashboard, getCollections, getCollection, create, update, delete, getCollectionAnalytics
- **adminProductsAPI** – dashboard, getProducts, getProduct, create, update, delete, bulk, getProductAnalytics, getProductLogs, getFacets
- **adminOrdersAPI** – getDashboard, getFacets, getOrders, getOrder, updateOrderStatus, getOrderLogs
- **adminMarketingAPI** – getDashboard and other methods
- **adminReviewsAPI** – getDashboard and other methods

### 1.3 Backend Routes Mounted (server/index.ts)

- `app.use('/api/admin', adminRoutes)` → users, buyers, sellers (no role check)
- `app.use('/api/admin/finance', adminFinanceRoutes)` → full finance API
- `app.use('/api/admin/support', adminSupportRoutes)` → support API
- `app.use('/api/admin/logistics', adminLogisticsRoutes)` → logistics API
- `app.use('/api/admin/notifications', adminNotificationsRoutes)` → notifications API
- `app.use('/api/admin/marketing', adminMarketingRoutes)` → marketing API
- `app.use('/api/admin/reviews', adminReviewsRoutes)` → reviews API
- `app.use('/api/admin/collections', adminCollectionsRoutes)` → collections API
- `app.use('/api/admin/products', adminProductsRoutes)` → products API
- `app.use('/api/admin/orders', adminOrdersRoutes)` → orders API

All except **adminRoutes** use `authenticate` + `authorize('admin')`. **adminRoutes** uses only `authenticate`.

---

## 2. Mock / Static Data Detection

### 2.1 Files Still Using Mock or Hardcoded Data

| File | Issue |
|------|--------|
| **client/src/pages/admin/sellers/SellerProfile.tsx** | Comment: "Mock seller data - in real app, fetch by sellerId". Full seller object hardcoded (name, store, email, phone, status, etc.). Never calls `adminAPI.getSellerDetails(sellerId)`. |
| **client/src/pages/admin/sellers/SellerOrders.tsx** | `mockOrders` array; list and stats derived from `mockOrders` only. No API call. |
| **client/src/pages/admin/sellers/SellerProducts.tsx** | `mockProducts` array; filtering and counts from mock. No API. |
| **client/src/pages/admin/sellers/SellerFinance.tsx** | `mockPayouts` array; all tabs and stats from mock. No API. |
| **client/src/pages/admin/sellers/SellerSupport.tsx** | `mockTickets` and `mockDisputes` arrays; "Mock messages" in UI. No API. |
| **client/src/pages/admin/sellers/SellerStrikes.tsx** | `mockStrikes` and `mockViolations` arrays. No API. |
| **client/src/pages/admin/sellers/SellerKYC.tsx** | `mockDocuments` and `mockLogs` arrays. No API. |
| **client/src/pages/admin/sellers/SellerPerformance.tsx** | Comment: "Mock data". Needs verification of data source. |
| **client/src/pages/admin/sellers/SellerSettings.tsx** | `mockCategories` for category list. No API. |
| **client/src/pages/admin/sellers/AdminNotes.tsx** | `mockNotes` and `mockAdmins` arrays. No API. |
| **client/src/pages/admin/collections/ProductManagement.tsx** | `mockProducts` and `useState(mockProducts)`. No API. |
| **client/src/pages/admin/collections/QualityModeration.tsx** | `mockIssues` array. No API. |
| **client/src/pages/admin/AdminOverview.tsx** | Uses **Supabase**; also "Mock data for demo", `mockLiveOrders`, "Calculate operational KPIs (mock for demo)". Mixed Supabase + mock. |
| **client/src/pages/admin/DataInsights.tsx** | Uses **Supabase**; comments "mock data - would need proper aggregation", "Mock conversion rate". |
| **client/src/pages/admin/DisputesSupport.tsx** | Uses **Supabase**; "Mock tickets data - in real app, this would come from support_tickets table"; sets state from `mockTickets`. |
| **client/src/pages/admin/AdminProfile.tsx** | Comment: "Mock statistics". Profile/statistics not from Express API. |

### 2.2 Backend Placeholder / Stub Responses

- **adminSupportController.ts** – `getChats`: returns `{ chats: [], pagination: {...} }` (placeholder). LiveChatSupport.tsx calls `adminSupportAPI.getChats()` and will always see empty list.
- **adminProductsController.ts** – `getProductAnalytics`: returns placeholder metrics (e.g. sales: 0, revenue: 0). `getProductLogs`: returns a single synthetic log entry.
- **adminCollectionsController.ts** – `getCollectionAnalytics`: comment "placeholder metrics".

---

## 3. API vs Backend Alignment

### 3.1 Frontend–Backend Match (Verified)

- **adminOrdersAPI** ↔ adminOrdersRoutes: dashboard, facets, list, get, PATCH status, logs – methods and paths match.
- **adminProductsAPI** ↔ adminProductsRoutes: dashboard, facets, list, get, create, update, delete, bulk, analytics, logs – match.
- **adminCollectionsAPI** ↔ adminCollectionsRoutes: dashboard, GET list, get, create, PATCH update, delete, analytics – match. `updateCollection` accepts `scheduledPublishAt` (backend line 236).
- **adminFinanceAPI** ↔ adminFinanceRoutes: dashboard, payouts (approve/reject), transactions, export, gateways, refunds (approve/reject), chargebacks, tax-rules, reports, settings, sellers – match.
- **adminSupportAPI** ↔ adminSupportRoutes: dashboard, tickets (get/put), messages, disputes, resolve, staff, articles, alerts (get/post/PATCH), reports/analytics, settings, chats – match. **Note:** Support alerts use `updateAlertStatus` (PATCH); Notifications alerts use `updateAlert` / `deleteAlert` (different base path).
- **adminNotificationsAPI** ↔ adminNotificationsRoutes: dashboard, send, templates, scheduled, analytics, user-control, logs, integrations, automation-rules, permissions, alerts (GET/POST/PATCH/DELETE) – match. SystemAlerts.tsx correctly uses `adminNotificationsAPI.updateAlert` and `deleteAlert`.
- **adminLogisticsAPI** ↔ adminLogisticsRoutes: partners, zones, fleet, etc. – present; DeliveryPartners.tsx uses `getPartners`.
- **adminMarketingAPI** ↔ adminMarketingRoutes: MarketingDashboard uses getDashboard.
- **adminReviewsAPI** ↔ adminReviewsRoutes: ReviewsDashboard uses getDashboard.

### 3.2 Admin Users/Sellers (adminRoutes) – Security Gap

- **adminRoutes** (server) uses only `authenticate`, not `authorize('admin')`. So any authenticated user (e.g. buyer or seller) can call:
  - GET/POST /api/admin/users, GET/PUT/PATCH/DELETE /api/admin/users/:userId
  - GET /api/admin/buyers
  - GET/POST /api/admin/sellers, GET/PUT/PATCH/DELETE /api/admin/sellers/:sellerId
- **Recommendation:** Add `router.use(authorize('admin'))` (or equivalent role check) to adminRoutes so only admin role can access these endpoints.

### 3.3 Request/Response Shape Notes

- Finance: Frontend expects payout/refund/transaction objects with fields like `sellerName`, `requestedDate`, etc. Backend must return compatible shapes (adminFinanceController returns DB-driven data; mapping in controller should be checked for field names).
- Support disputes: DisputeResolutionCenter maps backend `type` to category and backend `status` to UI status; backend returns `_id`, `orderId`, `buyerId`, `sellerId` – frontend maps these (e.g. populated names). Ensure populate/lean shapes match.
- Order list/detail: adminOrdersController `toOrderShape` returns id, orderId, customerName, orderDate, status, paymentStatus, totalAmount, items, shippingAddress, etc. OrderDetails and OrderManagementAdmin consume this; status flow uses backend statuses (pending, processing, packed, shipped, delivered, cancelled).

---

## 4. Potential Runtime / Integration Issues

### 4.1 Incorrect or Missing API Usage

- **SellerProfile**: Receives `sellerId` but never calls `adminAPI.getSellerDetails(sellerId)`. All displayed data is mock. **Fix:** In SellerProfile, `useEffect` with `sellerId` calling `adminAPI.getSellerDetails(sellerId)` and set state; show loading/error; remove hardcoded seller object.
- **LiveChatSupport**: Calls `adminSupportAPI.getChats()`. Backend always returns empty array. UI will show "No chats" until getChats is implemented or wired to real chat source.
- **ProductLogs**: Expects `res.logs` with `{ id, action, at, by, details }`. Backend returns exactly that (one placeholder log). No bug; extend backend to real activity log when needed.
- **ProductAnalytics**: Backend returns `metrics: { totalViews, sales: 0, revenue: 0 }`. Frontend can show zeros until real metrics exist.

### 4.2 Environment / URL

- Client: `const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`. If VITE_API_URL is unset in production, requests go to localhost. **Recommendation:** Ensure production build sets VITE_API_URL to the real API base (e.g. `https://api.example.com/api`).
- All admin APIs use `${API_BASE_URL}/admin/...`; server mounts at `/api/admin/...`. So base must be base URL including `/api` (e.g. `http://localhost:5000/api`). Correct if backend is at `http://localhost:5000`.

### 4.3 Imports and Paths

- Most admin pages use `@/lib/api`; a few use `../../lib/api` or `../../../lib/api`. Both resolve if `@` is configured (e.g. to `src`). No broken imports detected; ensure tsconfig/vite alias `@` points to `src`.

### 4.4 Async / Error Handling

- Several admin pages call API in `useEffect` and use `.then().catch().finally()` without guarding for unmount (e.g. setState after unmount). Example pattern that is safe: `let cancelled = false; ... .then((res) => { if (!cancelled) setData(res); }); return () => { cancelled = true; };`. PaymentsFinancial, SupportDashboard, and a few others already use this; others could add it to avoid React warnings or stray updates.
- LiveChatSupport `handleSendMessage` only `console.log`s; no API call to send message. Backend has no support chat send endpoint; entire chat flow is placeholder.

---

## 5. Backend Controllers and Data Flow

### 5.1 Controllers Reviewed

- **adminOrdersController**: Uses Order model; getDashboard aggregates on `date` and `status`; getOrders builds query from query params (search, status, paymentStatus, sellerId, city, date range, amount, cod, fulfilled), sort, pagination; getOrder by _id or orderNumber; updateOrderStatus appends to timeline; getOrderLogs builds logs from timeline. **MongoDB:** Valid use of find, aggregate, countDocuments.
- **adminFinanceController**: Uses PayoutRequest, RefundRequest, Chargeback, TaxRule, PaymentGatewayConfig, etc.; dashboard aggregates; payouts/refunds/transactions with filters. **Recommendation:** Confirm model names and field names match (e.g. PayoutRequest schema vs frontend Payout type).
- **adminSupportController**: Tickets, disputes, staff, articles, alerts, settings, reports. getChats is stub. **Recommendation:** Ensure Ticket/Dispute models and populate() return shapes that DisputeResolutionCenter and TicketingSystem expect.
- **adminCollectionsController**: Collection model; updateCollection supports `scheduledPublishAt`; getCollectionAnalytics returns placeholder metrics.
- **adminProductsController**: Product model; getProductAnalytics and getProductLogs return minimal/placeholder data.

### 5.2 Error Handling

- Controllers generally use try/catch and `res.status(500).json({ message: ... })`. 404 for single-resource get/update/delete. No global admin error middleware observed; each controller returns JSON errors. Frontend relies on handleResponse in api.ts throwing on !response.ok; error messages from backend are passed through.

---

## 6. Data Flow Summary

| Flow | Status |
|------|--------|
| Admin UI → adminOrdersAPI → adminOrdersRoutes → Order (Mongo) → response → UI | Connected end-to-end |
| Admin UI → adminProductsAPI → adminProductsRoutes → Product (Mongo) → response → UI | Connected; analytics/logs placeholder |
| Admin UI → adminCollectionsAPI → adminCollectionsRoutes → Collection (Mongo) → response → UI | Connected |
| Admin UI → adminFinanceAPI → adminFinanceRoutes → Finance models (Mongo) → response → UI | Connected |
| Admin UI → adminSupportAPI → adminSupportRoutes → Support models (Mongo) → response → UI | Connected; chats placeholder |
| Admin UI → adminNotificationsAPI → adminNotificationsRoutes → Notification models (Mongo) → response → UI | Connected |
| Admin UI → adminLogisticsAPI → adminLogisticsRoutes → Logistics models (Mongo) → response → UI | Connected (partners etc.) |
| Admin UI → adminMarketingAPI / adminReviewsAPI → respective routes → MongoDB | Connected for dashboard usage |
| Admin UI (SellerProfile, SellerOrders, etc.) → no API → mock data only | **Broken** – no backend integration |
| Admin UI (AdminOverview, DataInsights, DisputesSupport) → Supabase + mock | **Alternate/partial** – not Express/Mongo admin API |

---

## 7. Recommended Fixes (Code-Level)

### 7.1 Add Admin Role Check to adminRoutes

**File:** `server/src/routes/adminRoutes.ts`

```ts
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));  // add this line
```

### 7.2 SellerProfile – Fetch Real Seller

**File:** `client/src/pages/admin/sellers/SellerProfile.tsx`

- Remove the hardcoded `seller` object and the "Mock seller data" comment.
- Add state: `const [seller, setSeller] = useState<...>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);`
- In `useEffect` with `sellerId`:  
  `adminAPI.getSellerDetails(sellerId).then((res) => { setSeller(res.user); }).catch((e) => setError(e.message)).finally(() => setLoading(false));`
- Map backend `user` shape to your existing UI props (e.g. name, email, phone, status from res.user).
- Render loading and error states; only render tabs when `seller` is set.

### 7.3 Seller Sub-Pages – Replace Mock with API

- **SellerOrders**: Add `adminOrdersAPI.getOrders({ sellerId })` (or a dedicated seller-orders endpoint if you add one) and drive list and stats from that. Remove `mockOrders`.
- **SellerProducts**: Use `adminProductsAPI.getProducts({ sellerId })` (or seller-scoped product endpoint). Remove `mockProducts`.
- **SellerFinance**: Use `adminFinanceAPI.getPayouts({ ... })` filtered by seller if backend supports it; otherwise add a `sellerId` filter to getPayouts and use it here. Remove `mockPayouts`.
- **SellerSupport**: Use `adminSupportAPI.getTickets(...)` and `getDisputes(...)` with filters if backend supports seller/buyer; map results to your UI. Remove mockTickets and mockDisputes.
- **SellerStrikes / SellerKYC / AdminNotes / SellerSettings**: Either add corresponding backend endpoints and models (strikes, violations, KYC documents, admin notes, seller settings) and call them from these components, or clearly mark as "Coming soon" and hide/disable tabs until implemented.
- **SellerPerformance**: Replace mock with real metrics from API (e.g. orders count, revenue) if you have or add an endpoint.
- **SellerSettings** (mockCategories): Replace with categories from your API (e.g. product categories from adminProductsAPI.getFacets() or a dedicated categories endpoint).

### 7.4 Collections ProductManagement and QualityModeration

- **ProductManagement.tsx**: Load products for the collection from API (e.g. adminCollectionsAPI.getCollection(collectionId) for productIds, then product details, or add a collection-products endpoint). Remove `mockProducts`.
- **QualityModeration.tsx**: Add backend endpoint for quality issues (or derive from reviews/disputes) and call it. Remove `mockIssues`.

### 7.5 AdminOverview, DataInsights, DisputesSupport

- Decide whether admin dashboard and insights should use **Express/Mongo** or **Supabase**. If Express/Mongo:
  - Add admin dashboard/analytics endpoints (e.g. GET /api/admin/dashboard, GET /api/admin/insights) that aggregate from Order, User, Product, etc.
  - Replace Supabase and mock usage in AdminOverview and DataInsights with these APIs.
- For DisputesSupport: Either use `adminSupportAPI.getTickets()` and related support APIs and remove mock, or keep as separate Supabase flow and document it.

### 7.6 AdminProfile Mock Statistics

- If profile and statistics should come from backend: add GET /api/admin/profile or reuse existing profile API with admin stats, and call it from AdminProfile. Remove mock statistics.

### 7.7 Live Chat and getChats

- Either implement real chat (messages in DB, getChats returning real data, and a send-message endpoint) or keep placeholder and show an "Coming soon" message in LiveChatSupport when `chats.length === 0`.

---

## 8. Summary Table

| Category | Count / Status |
|----------|----------------|
| Admin pages/components scanned | 136+ TSX files under pages/admin |
| Pages using only mock/hardcoded data | 16+ files (sellers sub-pages, collections ProductManagement/QualityModeration, AdminOverview/DataInsights/DisputesSupport, AdminProfile) |
| Pages using Supabase instead of Express API | AdminOverview, DataInsights, DisputesSupport |
| Backend placeholder/stub endpoints | getChats (support), getProductAnalytics/getProductLogs (minimal/placeholder), getCollectionAnalytics (placeholder) |
| Missing role check (security) | adminRoutes (users/sellers) – only authenticate |
| Frontend–backend method/URL alignment | Aligned for orders, products, collections, finance, support, notifications, logistics, marketing, reviews |
| Suggested next steps | 1) Add authorize('admin') to adminRoutes. 2) Replace all seller-profile and seller sub-page mocks with real API. 3) Replace collection ProductManagement/QualityModeration mocks. 4) Unify AdminOverview/DataInsights/DisputesSupport with Express API or document Supabase. 5) Implement or clearly stub live chat and product/collection analytics. |

---

*End of audit report. No files were modified; recommendations only.*
