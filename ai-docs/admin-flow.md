# Admin Flow

## Access

- **Role:** `admin` in JWT.
- **Frontend:** `/admin/*` wrapped in `AdminRoute` (requires `user.role === 'admin'`).
- **API:** `/api/admin/*` routers use `authenticate` + `authorize('admin')` (see `adminRoutes.ts`, `adminOrdersRoutes.ts`, etc.).

## User & seller management

- **Core admin router** (`/api/admin`):
  - User stats, buyers, sellers CRUD and status updates (see `adminController` + `adminRoutes.ts`).

## Orders

- **Dashboard / facets / list / detail / status / logs:** `/api/admin/orders/*` (`adminOrdersRoutes.ts`).

## Catalog & collections

- **Products:** `/api/admin/products/*`
- **Collections:** `/api/admin/collections/*`

## Finance

- `/api/admin/finance/*` — payouts, escrow overview, etc. (see routes).

## Logistics

- `/api/admin/logistics/*`

## Support

- `/api/admin/support/*`

## Marketing & reviews

- `/api/admin/marketing/*`
- `/api/admin/reviews/*` — includes AI review settings UI in frontend (`AIReviewAssistant`).

## Notifications

- `/api/admin/notifications/*`

## Assistant behaviour (admin mode)

- Provide **structured** operational guidance: where in the admin UI to manage users/orders/products.
- Reference **admin** endpoints only; never instruct a guest to call them.
- Do not expose secrets or internal credentials.
