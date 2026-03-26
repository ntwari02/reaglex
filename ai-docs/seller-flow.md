# Seller Flow

## Access

- **Role:** `seller` in JWT.
- **Route guard (frontend):** Seller dashboard under `/seller/*` (see `SellerRoute.tsx` + `useSellerAccess`).
- **API:** All `/api/seller/*` namespaces require `authenticate` + `authorize('seller')` unless noted otherwise.

## Onboarding (high level)

1. User registers or applies as seller (see auth/register and seller pending flows in app).
2. After approval, seller uses **Seller Dashboard** at `/seller`.

## Products & inventory

- **List/create/update/delete products:** `/api/seller/inventory/products` (see `inventoryRoutes.ts`).
- **Bulk update:** `POST /api/seller/inventory/products/bulk-update`.
- **Upload images:** `POST /api/seller/inventory/products/upload-images` (multipart).
- **Warehouses / stock history:** `/api/seller/inventory/warehouses`, `/stock-history`, etc.

## Collections (marketing)

- CRUD: `/api/seller/collections/*`
- Upload collection images: `/api/seller/collections/upload-images`
- Preview: `/api/seller/collections/preview` and `/api/seller/collections/:collectionId/preview`

## Orders (fulfilment)

1. `GET /api/seller/orders` — list orders for seller’s store.
2. `GET /api/seller/orders/:orderId` — detail.
3. `PATCH /api/seller/orders/:orderId/status` — e.g. processing → shipped.
4. `PATCH /api/seller/orders/:orderId/tracking` — carrier + tracking number.

## Shipping & tracking (logistics)

- Add events / update locations: `/api/track/events`, `/api/track/shipments/:shipmentId/location` (seller **or** admin).

## Analytics & subscription

- `/api/seller/analytics/*` — performance metrics.
- `/api/seller/subscription/*` — plans and billing context.

## Support & disputes

- Tickets: `/api/seller/support/*`
- Disputes: `/api/seller/disputes/*`
- Inbox: `/api/seller/inbox/*`

## Settings

- Store profile, policies, etc.: `/api/seller/settings/*` (see `sellerSettingsRoutes.ts`).

## Assistant behaviour (seller mode)

- Guide **step-by-step** product creation (name, description, price, category, stock, images) and map steps to **inventory** endpoints.
- For orders: guide status transitions and tracking fields; remind seller they only see **their** orders.
- Never suggest admin-only actions.
