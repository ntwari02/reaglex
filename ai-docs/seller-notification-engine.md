# Seller notification engine

Calm, Stripe/Notion-style seller alerts across **in-app**, **push**, and **email**.

## Architecture

| Module | Role |
|--------|------|
| `server/src/services/sellerNotificationEngine/types.ts` | Events, context, strict copy shape |
| `server/src/services/sellerNotificationEngine/gemini.ts` | Gemini-first JSON generation |
| `server/src/services/sellerNotificationEngine/fallback.ts` | Template pools, synonyms, anti-repetition |
| `server/src/services/sellerNotificationEngine/memory.ts` | Last fingerprint per seller/event/entity |
| `server/src/services/sellerNotificationEngine/utils.ts` | Behavioral rules, deep links, word clamp |
| `server/src/services/sellerNotificationEngine/index.ts` | Orchestrator |
| `server/src/services/sellerNotificationService.ts` | Channel delivery |
| `client/src/lib/sellerNotificationPresentation.js` | UI enrichment (thumbnails, tone) |

## Flow

1. `deliverSellerNotification(event, ctx)` enriches context (reminders, product thumbs).
2. `generateSellerNotificationCopy()` tries Gemini when admin + env allow.
3. On failure or duplicate → deterministic fallback (never blocks).
4. Same copy goes to inbox metadata, push, and rich email.

## Admin control

**Marketing → Email automation**

- **AI seller notifications (Gemini)** — `email.geminiSellerNotifications` (default **on**)
- Respects **AI Tools → Auto-Generate Copy** master switch

## Env

- `GEMINI_API_KEY` — required for AI path
- `SELLER_NOTIFICATION_USE_GEMINI=false` — force fallback only
- `SELLER_NOTIFICATION_MODEL` — optional model override

## Output fields

Every notification includes: `title`, `message` (8–22 words), `tone`, `priority`, `actionLabel`, `deepLink`, `visualStyle`, `source` (`gemini` | `fallback`).
