# REAGLEX — System Overview

> **Source of truth:** This file is maintained for the platform AI assistant. If it conflicts with older code comments, **follow this documentation** and update code to match.

## Architecture

| Layer | Technology |
|-------|------------|
| API | Node.js + Express (`server/`) |
| Database | MongoDB (Mongoose) |
| Auth | JWT (`Authorization: Bearer` or `cookies.token`), Google OAuth, optional WebAuthn |
| Frontend | React + Vite + TypeScript (`client/`) |
| Static uploads | Served under `/uploads` on the API host |

## Base URLs

- **API prefix:** `/api`
- **Health:** `GET /api/health`
- **Assistant (AI chat):** `POST /api/assistant/chat` — requires `GEMINI_API_KEY` on server; sends JWT role context.

## Environment (high level)

- **Frontend:** `VITE_API_URL` (e.g. `http://localhost:5000/api` or `https://<backend>/api`), `VITE_SERVER_URL` for asset/WebSocket base.
- **Backend:** `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `SERVER_URL`, `ALLOWED_ORIGINS`, Google OAuth vars, `GEMINI_API_KEY` for assistant.

## Core domains

1. **Catalog** — Public product listing/detail; views tracked.
2. **Cart & checkout** — Client-side cart; orders created via buyer API; payments via `/api/payments`.
3. **Orders** — Buyer orders (`/api/orders`); seller order fulfilment (`/api/seller/orders`); admin oversight (`/api/admin/orders`).
4. **Shipping / tracking** — Public and role-based tracking under `/api/track`.
5. **Escrow / payments** — Payment init/verify; buyer confirm delivery releases escrow (see `paymentRoutes`).
6. **Messaging** — Buyer inbox (`/api/buyer/inbox`), seller inbox (`/api/seller/inbox`), WebSockets for realtime.
7. **Disputes & support** — Buyer/seller dispute routes; seller support tickets; knowledge base.
8. **Admin** — Users, products, orders, finance, logistics, marketing, reviews, collections, notifications.

## Security notes (for assistant behaviour)

- Never return API keys, `.env` values, or raw JWT contents.
- Seller and admin tokens may be tied to **single active session** (`ActiveSession`); invalid session returns `SESSION_REPLACED`.

See `roles-permissions.md` for what each role may call.
