# AI documentation (`/ai-docs`)

These Markdown files are **internal reference** for:

- Human operators
- The **Gemini assistant** (`POST /api/assistant/chat`) — loaded server-side when present

## Files

| File | Purpose |
|------|---------|
| `system-overview.md` | Architecture, domains, env hints |
| `roles-permissions.md` | Guest / buyer / seller / admin capabilities |
| `api-endpoints.md` | Route map (prefixes and auth) |
| `product-flow.md` | Browse → cart → product APIs |
| `order-flow.md` | Orders → payment → tracking → fulfilment |
| `seller-flow.md` | Seller dashboard capabilities |
| `admin-flow.md` | Admin dashboard capabilities |

## Maintenance

- Update docs when routes or business rules change.
- **Do not** put secrets, API keys, or production credentials in these files.
