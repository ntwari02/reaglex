# Email (Gmail SMTP) Setup

The backend uses **Nodemailer** with **Gmail SMTP** for transactional emails.

## Required environment variables

Add these to your `server/.env` file (never commit real credentials):

```env
# Gmail SMTP (use App Password, not your normal password)
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password

# Optional: used in email links (reset password, verify email)
CLIENT_URL=http://localhost:5173
APP_NAME=Reaglex
```

## Gmail App Password

1. Enable 2-Step Verification on your Google account.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Create an app password for "Mail" (or "Other" with name "Reaglex").
4. Copy the 16-character password (spaces are optional) into `SMTP_PASS`.

**Do not use your normal Gmail password** — it will not work with SMTP when 2FA is on.

## SMTP configuration (in code)

- **Host:** `smtp.gmail.com`
- **Port:** `587`
- **Secure:** `false` (STARTTLS)

All of this is set in `src/services/emailService.ts`. Credentials are read from `process.env.SMTP_USER` and `process.env.SMTP_PASS` only; nothing is hardcoded.

## What uses email

| Feature            | When                         | Template / function              |
|--------------------|------------------------------|-----------------------------------|
| Signup             | After registration           | Verification email                |
| After verification | When user clicks verify link | Welcome email                     |
| Forgot password    | When user requests reset     | Password reset email (link)        |
| Security           | (Future) login alerts, etc.  | `sendSecurityAlert()` in service  |

## Checking if email is configured

- **Backend:** If `SMTP_USER` or `SMTP_PASS` is missing, the app still runs but emails are not sent (a warning is logged).
- **API:** `GET /api/auth/email-config` returns `{ configured: true | false }` so the frontend can adapt if needed.

## Security

- Password reset tokens expire in **1 hour** and are single-use.
- Verification tokens expire in **24 hours**.
- Forgot-password endpoint is **rate-limited** (5 requests per 15 minutes per IP).
- No credentials are stored in code or logs.
