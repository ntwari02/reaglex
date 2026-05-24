# Deployment Issues — Render & Production

## Render API service checklist

| Step | Action |
|------|--------|
| Root directory | `server` |
| Build command | `npm install && npm run build` |
| Start command | `npm run start:prod` (runs `node dist/index.js`) — **not** `npm start` (nodemon/dev) |
| Health check | `/api/health` |
| Bind address | `HOST=0.0.0.0` (default in code) |
| Port | `PORT` injected by Render |

A blueprint is provided at [`render.yaml`](./render.yaml) (adjust service names and env groups).

---

## Symptom: build OK, process exits with status 1 after Mongo connect

**Observed log pattern:**

```
✅ Connected to MongoDB
(then exit — no "Server listening on 0.0.0.0:PORT")
```

**Likely causes addressed:**

1. Uncaught error in `ensureCorePaymentGateways()` or worker startup → wrapped in `runStartupStep` (logs, continues).
2. `httpServer.listen` failure (port in use, permission) → explicit error handler.
3. `keepAlive` invalid URL (`https://`) causing noisy failures — fixed (not usually fatal).

**Verify success:** Log line `🚀 Server listening on 0.0.0.0:<PORT>` and `📡 WebSocket server ready`.

---

## Frontend (Vercel / static host)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Full API base including `/api` |
| `VITE_SERVER_URL` | Origin without `/api` (uploads, sockets) |
| `REAGLEX_API_ORIGIN` | Build-time proxy for `/sitemap.xml`, `/robots.txt` |

Build warning if `REAGLEX_API_ORIGIN` unset:

```
[vercel] No REAGLEX_API_ORIGIN / VITE_SERVER_URL set — /sitemap.xml and /robots.txt will NOT proxy
```

---

## CORS on Render

Set on API service:

- `CLIENT_URL` — primary frontend origin (no trailing slash)
- `ALLOWED_ORIGINS` — comma-separated list if multiple apps (www + apex, Vercel previews)

Empty `ALLOWED_ORIGINS` in production falls back to `CLIENT_URL` only (warning logged).

---

## Keep-alive ping (Render free tier)

`server/keepAlive.ts` pings `/api/health` every 14 minutes.

Requires one of:

- `RENDER_EXTERNAL_URL` (full URL, preferred), or
- `RENDER_EXTERNAL_HOSTNAME`, or
- default `https://reaglex.onrender.com`

---

## Optional services (degrade if missing)

| Service | Env | Behavior if missing |
|---------|-----|---------------------|
| Meilisearch | `MEILISEARCH_HOST` | Intelligence index sync skipped |
| Redis / BullMQ | Redis URL vars | Queue worker skipped |
| Microblink KYC | Microblink keys | KYC scan disabled |
| Resend / SMTP | Email keys | Email features fail at runtime |
| Stripe / PayPal | Payment keys | Checkout for that gateway fails |

---

## Build validation results (2026-05-24)

| Command | Location | Result |
|---------|----------|--------|
| `npm run build` | `server/` | ✅ Pass |
| `npm run build` | `client/` | ✅ Pass (~2m 21s) |
| `npm run typecheck` | `client/` | ❌ Pre-existing TS errors |

**Remaining deploy blockers:**

1. Render env vars not set (see [MISSING_ENV_VARIABLES.md](./MISSING_ENV_VARIABLES.md))
2. Using wrong start command (`npm start` → nodemon)
3. `CLIENT_URL` / CORS misconfiguration → browser blocked requests
4. Committed secrets in `server/env` — rotate and remove from git history if ever pushed

---

## SEO SSR (optional second service)

`npm run seo:ssr` runs `dist/src/seo/seoSsrServer.js` — separate from main API. Deploy only if using SSR for crawlers.

---

## Security before go-live

- [ ] Strong `JWT_SECRET` on Render
- [ ] Remove or gitignore `server/env`; use dashboard secrets
- [ ] `NODE_ENV=production`
- [ ] MongoDB Atlas IP allowlist includes Render egress (or `0.0.0.0/0` with strong auth)
