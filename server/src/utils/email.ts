/**
 * Email sending via Resend API (https://resend.com)
 * Set RESEND_API_KEY in .env. For testing use onboarding@resend.dev as from;
 * for production verify your domain in Resend and use e.g. noreply@yourdomain.com
 *
 * Note: We read env at runtime so RESEND_API_KEY is available after dotenv.config() in index.ts.
 */

import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey && apiKey.trim() ? new Resend(apiKey.trim()) : null;
}

function getFromAddress(): string {
  const fromEmail = process.env.MAIL_FROM || 'onboarding@resend.dev';
  return fromEmail.includes('<') ? fromEmail : `Reaglex <${fromEmail}>`;
}

/** Send 6-digit reset code by email (no link). Code expires in 15 minutes. */
export async function sendPasswordResetCode(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const resend = getResendClient();
  const fromAddress = getFromAddress();

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Email] RESEND_API_KEY not set – not sending.');
      console.log('[DEV] Password reset code (would have sent to', to, '):', code);
      return { ok: true };
    }
    return {
      ok: false,
      error: 'Email is not configured. Set RESEND_API_KEY in .env (get one at https://resend.com/api-keys)',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: 'Reaglex – Your password reset code',
      html: `
        <p>You requested a password reset.</p>
        <p>Your <strong>6-digit code</strong> is:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:bold;color:#f97316;">${code}</p>
        <p>Enter this code on the reset password page. It expires in 15 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
        <p>— Reaglex</p>
      `,
      text: `Your password reset code is: ${code}\n\nEnter it on the reset password page. It expires in 15 minutes.\n\nIf you didn't request this, ignore this email.\n— Reaglex`,
    });

    if (error) {
      console.error('[Resend] Password reset code email failed:', { to, error });
      return { ok: false, error: error.message || 'Failed to send email' };
    }
    console.log('[Resend] Password reset code sent:', { to, id: data?.id });
    return { ok: true };
  } catch (err: any) {
    console.error('Send password reset code error:', err?.message || err);
    return { ok: false, error: err?.message || 'Failed to send email' };
  }
}

/**
 * Generic send helper for other emails (welcome, notifications, etc.)
 * Usage: await sendEmail({ to: 'user@example.com', subject: '...', html: '...' });
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const fromAddress = getFromAddress();

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Email] RESEND_API_KEY not set – not sending.');
      return { ok: true };
    }
    return { ok: false, error: 'RESEND_API_KEY not set' };
  }

  try {
    const toList = Array.isArray(options.to) ? options.to : [options.to];
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: toList,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('Resend send error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error('Send email error:', err?.message || err);
    return { ok: false, error: err?.message || 'Failed to send email' };
  }
}
