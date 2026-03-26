# Product Flow (Buyer & Public)

## Browse & discover

1. **List products** — `GET /api/products` with query params (category, search, pagination — see `productController.listProducts`).
2. **Product detail** — `GET /api/products/:productId`.
3. **View tracking** — `POST /api/products/:productId/view` increments view count.

## Cart (frontend)

- Cart state is managed in the React app (e.g. Zustand stores); not a separate REST “cart” resource in the same way as orders.
- User proceeds to checkout; order creation happens via **buyer orders API** when they place an order.

## Images & media

- Product images may be stored as relative paths under `/uploads/...`. Frontend resolves with `VITE_SERVER_URL` / `SERVER_URL` from config.

## Seller product creation (summary)

- Sellers use **inventory** APIs under `/api/seller/inventory/products` (create/update/delete) and image upload endpoints.
- See `seller-flow.md` for detailed steps.

## Assistant guidance for buyers

- Help users find products: suggest using search + category filters via the storefront UI, then open product detail.
- For **budget queries** (e.g. “under $4”): recommend filtering by price in the UI; if API supports `maxPrice`/`search` query params, match those to actual controller parameters (do not invent query names — check `listProducts` implementation in code when in doubt).
