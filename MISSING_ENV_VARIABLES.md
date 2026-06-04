# Missing / Required Environment Variables

**Do not commit real values.** Configure in Render (API) and Vercel/static host (client). A `server/env` file exists locally — treat as secret; prefer platform env vars.

---

## API service (required for boot)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` or `MONGO_URI` | **Yes** | MongoDB connection string; server exits if missing |
| `JWT_SECRET` | **Yes (prod)** | Signs auth tokens; defaults to `dev_secret` if unset (warning logged) |
| `NODE_ENV` | Recommended | `production` on Render |
| `PORT` | Auto | Set by Render |
| `HOST` | Optional | Default `0.0.0.0` |

---

## API service (required for correct browser access)

| Variable | Required | Description |
|----------|----------|-------------|
| `CLIENT_URL` | **Yes (prod)** | Frontend origin for emails, OAuth, CORS fallback |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated CORS/Socket.IO origins |
| `SERVER_URL` or `RENDER_EXTERNAL_URL` | Recommended | Absolute API URL for emails, webhooks, assets |

---

## Client build (required for production)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | e.g. `https://your-api.onrender.com/api` |
| `VITE_SERVER_URL` | **Yes** | e.g. `https://your-api.onrender.com` |

---

## Payments (enable per gateway)

| Variable | Gateway |
|----------|---------|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal |
| `FLUTTERWAVE_*` | Flutterwave |
| MoMo-related vars | Mobile Money (see `momoService.ts`) |
| `PAYMENT_SECRETS_ENCRYPTION_KEY` | Encrypted gateway credentials in DB |

---

## Email

| Variable | Provider |
|----------|----------|
| `RESEND_API_KEY` | Resend (preferred in codebase) |
| SMTP vars | Nodemailer fallback (`emailService.ts`) |

---

## OAuth & auth extras

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google login |
| WebAuthn RP vars | Passkeys (`webauthnController.ts`) |

---

## Media & storage

| Variable | Purpose |
|----------|---------|
| `CLOUDINARY_*` | Image uploads |

---

## Search & queues (optional)

| Variable | Purpose |
|----------|---------|
| `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` | Admin intelligence search |
| Redis URL / BullMQ | Background index queue |

---

## AI features (optional)

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` / Google AI vars | Gemini assistant, marketing AI |
| `ANTHROPIC_API_KEY` | Claude paths if enabled |

---

## KYC (optional)

| Variable | Purpose |
|----------|---------|
| Microblink license / API keys | Document scan (`microblink.service.ts`) |

---

## Push notifications (optional)

| Variable | Purpose |
|----------|---------|
| VAPID public/private keys | Web push (`web-push`) |

---

## Shipping & maps (optional)

| Variable | Purpose |
|----------|---------|
| OpenRouteService / shipping API keys | `openRouteService.ts`, `reaglexShipping.service.ts` |

---

## Render-specific

| Variable | Purpose |
|----------|---------|
| `RENDER_EXTERNAL_URL` | Keep-alive ping + `getServerUrl()` fallback |
| `RENDER_EXTERNAL_HOSTNAME` | Alternate keep-alive host |

---

## How to verify env at runtime

1. Deploy API with `NODE_ENV=production`
2. Hit `GET /api/health` → `{ status: "ok", uptime: ... }`
3. Check logs for:
   - `✅ Connected to MongoDB`
   - `✅ Payment gateways registry synced`
   - `🚀 Server listening on 0.0.0.0:...`
4. From browser devtools, confirm API calls go to `VITE_API_URL` host (not localhost)

---

## Local development defaults

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `http://localhost:5000/api` (dev only) |
| `VITE_SERVER_URL` | `http://localhost:5000` |
| `CLIENT_URL` | `http://localhost:5173` |
| `JWT_SECRET` | `dev_secret` (dev only) |
