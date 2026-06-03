# Email notification system

## Architecture

| Module | Role |
|--------|------|
| `server/src/email/layout.ts` | Master shell, responsive CSS, buttons, footer |
| `server/src/email/components.ts` | Product grid (2-col desktop / 1-col mobile), meta cards, OTP |
| `server/src/email/copyEngine.ts` | Varied subjects, intros, CTAs by category (fallback) |
| `server/src/email/emailCopyAi.service.ts` | Gemini copy + spam guard + fallback to copyEngine |
| `server/src/email/marketingEmailBuilder.ts` | Product cards + AI/fallback copy for marketing sends |
| `server/src/email/templates.ts` | Auth, marketing, cart, recommendation templates |
| `server/src/email/notificationEmail.ts` | Rich transactional notifications |
| `server/src/email/eventCategories.ts` | Buyer/seller event → category & accent |
| `server/src/services/emailService.ts` | Resend/SMTP send layer |

## Product grid

- Table-based 2×N layout (email-client safe)
- Fixed image height 220px, `object-fit: cover`
- Equal card structure; stacks on screens &lt; 620px
- Placeholder SVG when image URL missing

## Copy variation

**Primary:** `generateMarketingEmailCopy()` (Gemini) for recommendation, cart pulse, browse abandon, winback, abandoned cart.

**Fallback:** `copyEngine.ts` — seeded by `userId` + category when `GEMINI_API_KEY` is missing or `EMAIL_COPY_USE_GEMINI=false`.

- Recommendation: `recommendationSubject()`, `recommendationIntro()`
- Cart pulse / browse / winback: `cartPulseSubject()`, `browseAbandonSubject()`, `winbackSubject()`
- Abandoned cart: `cartSubject()`, `cartIntro()`
- CTAs: `pickCta(category, seed)`
- Greetings: `timeGreeting(name)` (time-of-day aware)

Transactional buyer/seller emails optionally call `enhanceTransactionalEmailCopy()` before send.

## Notification email flow

Buyer/seller assistants still generate varied **title/message** (pools in `*NotificationAssistant.service.ts`).

Emails now use `sendRichNotificationEmail()` with category accent colors instead of plain text.

## Email inventory

| Type | Template | Sender |
|------|----------|--------|
| Welcome | `getWelcomeEmailHtml` | authController |
| Verify email/OTP | `getVerification*` | authController |
| Password reset/OTP | `getPasswordReset*` | authController |
| Login alert | `getLoginNotificationEmailHtml` | emailService |
| Device approval | `getDeviceApprovalEmailHtml` | emailService |
| Security alert | `getSecurityAlertEmailHtml` | emailService |
| Recommendations | `getRecommendationDealsEmailHtml` | recommendationEmail worker |
| Abandoned cart | `getAbandonedCartEmailHtml` | abandonedCartEmailWorker |
| Winback / lifecycle | same as recommendations | lifecycleEmailWorker |
| Cart pulse / browse abandon | same as recommendations | cartPulseEmailWorker, browseAbandonEmailWorker |
| Subscription billing | `getSubscriptionBillingEmailHtml` | available for seller subscription events |
| Newsletter welcome | `getNewsletterWelcomeEmailHtml` | newsletterController |
| Orders, shipping, refunds, messages | `getRichNotificationEmailHtml` | buyer/seller notification services |
| Admin bulk / scheduled | `getNotificationEmailHtml` / rich | admin routes |

## Email + in-app readiness

- All transactional/marketing emails use `renderEmailDocument()` (responsive, max-width 600px, mobile stack).
- CTAs use absolute URLs via `toAbsoluteEmailUrl()` (works in Gmail, Outlook, Apple Mail).
- Product images in email use `toAbsoluteMediaUrl()`.
- In-app rows store `metadata.visualStyle` + `productThumbnails` (absolute URLs).
- Buyer feed: `enrichNotification()` in `notificationPresentation.js`.
- Seller feed: `enrichSellerNotification()` + `SellerNotificationCard` / `OsNotificationCard`.

## Admin control

**Marketing Center → Email automation** (`MarketingEmailAutomation.tsx`)

- Master switch for all marketing flows
- Per-flow email/push toggles (recommendation, cart pulse, browse abandon, winback, abandoned cart)
- Daily email cap per user (default **4**; `0` = unlimited). Recommendation-lane quota: **2–4/day** by buyer activity (`RECOMMENDATION_DAILY_MIN` / `RECOMMENDATION_DAILY_MAX`).
- **Per-buyer send times** from `BuyerInsightProfile.activeHoursUtc` + unique minute offset (not one shared batch). Worker runs every **15m** and only emails buyers whose profile window is open now (`listBuyersInRecommendationSendWindow`).
- Rich templates on/off
- Gemini marketing copy on/off
- Gemini transactional polish on/off (default **off**)
- Provider / Gemini status indicators
- Test recommendation send + manual flow run

Settings persist in `MarketingAutomationSettings` (singleton). Also respects **AI Tools → Auto-Generate Copy** when AI marketing is disabled globally.

## Env

- `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- Or SMTP_* variables
- `CLIENT_URL` for links
- `GEMINI_API_KEY` — dynamic marketing + optional transactional polish
- `EMAIL_COPY_USE_GEMINI=false` — force fallback pools only (overrides admin Gemini toggles)
- `DAILY_MARKETING_EMAIL_CAP` — optional env override of admin daily cap
- `RECOMMENDATION_DAILY_MIN` (default 2), `RECOMMENDATION_DAILY_MAX` (default 4), `RECOMMENDATION_EMAIL_MIN_GAP_HOURS` (default 3), `RECOMMENDATION_EMAIL_TICK_MINUTES` (default 15)
- `EMAIL_COPY_MODEL` — override Gemini model (default `gemini-1.5-flash-latest`)

## Future

- Product thumbnails in order-shipped emails
- Persist `copy.source` (`gemini` | `fallback`) on `RecommendationEmailHistory`
- Product ratings in cards when review aggregates exist on Product
