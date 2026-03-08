# Resend Email Setup

This project uses [Resend](https://resend.com) for sending emails (password reset, etc.).

## 1. Get an API key

1. Sign up at [resend.com](https://resend.com).
2. Go to [API Keys](https://resend.com/api-keys) and create a key.
3. Copy the key (starts with `re_`).

## 2. Configure environment

In `server/.env` set:

```env
RESEND_API_KEY=re_your_key_here
MAIL_FROM=onboarding@resend.dev
```

- **Testing:** Use `onboarding@resend.dev` as `MAIL_FROM` (Resend’s test sender). You can send to your own email.
- **Production:** [Verify your domain](https://resend.com/domains) in Resend, then set `MAIL_FROM` to an address on that domain (e.g. `noreply@reaglex.com`).

## 3. Usage in code

Password reset sends a **6-digit code** (not a link) via `sendPasswordResetCode()` in `src/utils/email.ts`. The code expires in 15 minutes.

To send other emails (welcome, notifications, etc.) use the generic helper:

```ts
import { sendEmail } from '../utils/email';

const { ok, id, error } = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Reaglex',
  html: '<p>Hello!</p>',
  text: 'Hello!', // optional plain-text fallback
});
```

Optional: `to` can be an array of addresses; `replyTo` is supported.

## 4. Limits and docs

- [Resend Node.js docs](https://resend.com/docs/send-with-nodejs)
- [API reference](https://resend.com/docs/api-reference/emails/send-email)
- Free tier: 100 emails/day; 3,000/month. Upgrade at [resend.com/pricing](https://resend.com/pricing).


