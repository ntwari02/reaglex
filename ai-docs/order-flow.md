# Order Flow (Buyer → Payment → Tracking → Shipping)

## 1. Create order (buyer, authenticated)

- **Endpoint:** `POST /api/orders`
- **Auth:** Required (`authenticate`)
- **Effect:** Creates an order document linked to `buyerId` and cart line items (per controller logic).

## 2. List / view / cancel (buyer)

- `GET /api/orders` — list buyer’s orders.
- `GET /api/orders/:orderId` — detail.
- `PATCH /api/orders/:orderId/cancel` — cancel if allowed by business rules.

## 3. Payment

- **Initialize:** `POST /api/payments/initialize` with `{ orderId }` — **Auth** required; buyer must own order.
- **Verify (callback):** `GET /api/payments/verify?transaction_id=...&order_id=...` — used by payment gateway redirect flows.

## 4. Escrow / confirm delivery (buyer)

- **Endpoint:** `POST /api/payments/orders/:orderId/confirm-delivery` — buyer confirms receipt; triggers escrow release via `releaseEscrow` (see `paymentRoutes.ts`).

## 5. Public tracking (guest)

- **By order number:** `GET /api/orders/track/:orderNumber`

## 6. Tracking API (richer)

- **Public:** `GET /api/track/:identifier` — track by order number or tracking number.
- **Authenticated buyer:** `GET /api/track/my-orders`

## 7. Seller fulfilment

- List seller orders: `GET /api/seller/orders`
- Update status: `PATCH /api/seller/orders/:orderId/status`
- Add/change tracking: `PATCH /api/seller/orders/:orderId/tracking`

## 8. Logistics (seller/admin)

- `POST /api/track/events`
- `PATCH /api/track/shipments/:shipmentId/location`
- `POST /api/track/shipments/:shipmentId/confirm-delivery`
- `POST /api/track/shipments/:shipmentId/failed-delivery`

## 9. Admin oversight

- `GET /api/admin/orders/*` — dashboards, facets, order detail, status updates, logs.

## Assistant guidance

- **Buyers:** guide Login → Cart → Checkout → Order created → Pay via initialize → Track via `/track` or account orders.
- **Sellers:** guide Orders list → update status → add tracking → notify buyer if messaging enabled.
- **Admins:** point to admin orders dashboard and filters; never claim ability to bypass auth.
