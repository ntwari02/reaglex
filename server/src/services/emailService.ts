import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import {
  getWelcomeEmailHtml,
  getVerificationEmailHtml,
  getVerificationOtpEmailHtml,
  getPasswordResetEmailHtml,
  getPasswordResetOtpEmailHtml,
  getSecurityAlertEmailHtml,
  getNotificationEmailHtml,
  getDeviceApprovalEmailHtml,
} from '../email/templates';
import { getClientUrl } from '../config/publicEnv';

function getEnv(key: string, fallback = ''): string {
  return String(process.env[key] || fallback).trim();
}

const CLIENT_URL = getClientUrl();
const APP_NAME = getEnv('APP_NAME') || 'Reaglex';
const EMAIL_PROVIDER = getEnv('EMAIL_PROVIDER', 'smtp').toLowerCase();

let transporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const SMTP_USER = getEnv('SMTP_USER');
  const SMTP_PASS = getEnv('SMTP_PASS');

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[emailService] SMTP_USER or SMTP_PASS not set; emails will not be sent.');
    return null;
  }
  if (transporter) return transporter;

  // Allow switching SMTP mode for platforms where port 587 is blocked.
  // - Gmail usually: 587 + STARTTLS, or 465 + SSL/TLS
  const SMTP_HOST = getEnv('SMTP_HOST', 'smtp.gmail.com');
  const SMTP_PORT = Number(getEnv('SMTP_PORT', '587')) || 587;
  const SMTP_SECURE = getEnv('SMTP_SECURE', 'false').toLowerCase() === 'true';
  const SMTP_REQUIRE_TLS = getEnv('SMTP_REQUIRE_TLS', 'true').toLowerCase() === 'true';

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    // STARTTLS is only relevant when `secure` (implicit TLS) is false.
    requireTLS: !SMTP_SECURE && SMTP_REQUIRE_TLS,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return transporter;
}

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const API_KEY = getEnv('RESEND_API_KEY');
  if (!API_KEY) return null;
  resendClient = new Resend(API_KEY);
  return resendClient;
}

export function isEmailConfigured(): boolean {
  if (EMAIL_PROVIDER === 'resend') {
    return Boolean(getEnv('RESEND_API_KEY') && getEnv('RESEND_FROM_EMAIL'));
  }
  return Boolean(getEnv('SMTP_USER') && getEnv('SMTP_PASS'));
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  // Resend provider (recommended for Render environments)
  if (EMAIL_PROVIDER === 'resend') {
    try {
      const client = getResendClient();
      if (!client) {
        return { success: false, error: 'Resend not configured (missing RESEND_API_KEY)' };
      }
      const fromEmail = getEnv('RESEND_FROM_EMAIL');
      if (!fromEmail) {
        return { success: false, error: 'Resend not configured (missing RESEND_FROM_EMAIL)' };
      }

      const result = await client.emails.send({
        // Resend can be strict about `from`. Using the raw verified sender email
        // avoids formatting issues like `"Name" <email>`.
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        // Resend can render plain text automatically, but we keep explicit text for safety.
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      // Resend typically throws on hard errors, but we also defensively check result shape.
      // If an error is present on the result, treat it as failure.
      const maybeAny = result as any;
      if (maybeAny?.error) {
        const msg = typeof maybeAny.error === 'string' ? maybeAny.error : JSON.stringify(maybeAny.error);
        console.error('[emailService] resend returned error:', msg);
        return { success: false, error: msg };
      }

      console.log(
        '[emailService] Sent email via resend to',
        options.to,
        'subject:',
        options.subject,
        'id:',
        maybeAny?.id || maybeAny?.data?.id || 'unknown',
        'status:',
        maybeAny?.status || 'unknown',
      );

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[emailService] resend sendEmail error:', msg);
      if (err?.response) console.error('[emailService] resend error response:', err.response);
      return { success: false, error: msg };
    }
  }

  const trans = getTransporter();
  if (!trans) {
    console.warn('[emailService] sendEmail skipped: SMTP not configured');
    return { success: false, error: 'Email service not configured' };
  }
  const fromUser = getEnv('SMTP_USER');
  try {
    await trans.sendMail({
      from: `"${APP_NAME}" <${fromUser}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      replyTo: options.replyTo,
    });
    console.log('[emailService] Sent email to', options.to, 'subject:', options.subject);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[emailService] sendEmail error:', msg);
    if (err?.response) console.error('[emailService] SMTP response:', err.response);
    return { success: false, error: msg };
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<{ success: boolean; error?: string }> {
  const loginUrl = `${CLIENT_URL}/login`;
  const html = getWelcomeEmailHtml({ name, loginUrl, appName: APP_NAME });
  return sendEmail({
    to,
    subject: `Welcome to ${APP_NAME}`,
    html,
  });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
  expiresIn = '24 hours'
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
  const safeName = name || 'there';
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <p>Hi ${safeName},</p>
      <p>Please verify your Reaglex account.</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#f97316;color:#fff;text-decoration:none;font-weight:600;">
          Verify my email
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280;">This link expires in ${expiresIn}.</p>
    </div>
  `;
  return sendEmail({
    to,
    subject: 'Verify your Reaglex account',
    html,
  });
}

export async function sendVerificationOtpEmail(
  to: string,
  name: string,
  code: string,
  expiresIn = '10 minutes'
): Promise<{ success: boolean; error?: string }> {
  const html = getVerificationOtpEmailHtml({
    name,
    code,
    appName: APP_NAME,
    expiresIn,
  });
  return sendEmail({
    to,
    subject: `Your verification code – ${APP_NAME}`,
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
  expiresIn = '1 hour'
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const html = getPasswordResetEmailHtml({
    name,
    resetUrl,
    appName: APP_NAME,
    expiresIn,
  });
  return sendEmail({
    to,
    subject: `Reset your password – ${APP_NAME}`,
    html,
  });
}

export async function sendPasswordResetOtpEmail(
  to: string,
  name: string,
  code: string,
  expiresIn = '15 minutes'
): Promise<{ success: boolean; error?: string }> {
  const html = getPasswordResetOtpEmailHtml({
    name,
    code,
    appName: APP_NAME,
    expiresIn,
  });
  return sendEmail({
    to,
    subject: `Your password reset code – ${APP_NAME}`,
    html,
  });
}

export async function sendSecurityAlert(
  to: string,
  name: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const html = getSecurityAlertEmailHtml({
    name,
    message,
    appName: APP_NAME,
    loginUrl: `${CLIENT_URL}/login`,
  });
  return sendEmail({
    to,
    subject: `Security alert – ${APP_NAME}`,
    html,
  });
}

export async function sendNotificationEmail(options: {
  to: string;
  subject: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}): Promise<{ success: boolean; error?: string }> {
  const html = getNotificationEmailHtml({
    subject: options.subject,
    body: options.body,
    appName: APP_NAME,
    actionUrl: options.actionUrl,
    actionLabel: options.actionLabel,
  });
  return sendEmail({
    to: options.to,
    subject: options.subject,
    html,
  });
}

export async function sendDeviceApprovalEmail(options: {
  to: string;
  name: string;
  approveToken: string;
  deviceInfo: string;
  ipAddress: string;
  expiresIn?: string;
}): Promise<{ success: boolean; error?: string }> {
  const approveUrl = `${CLIENT_URL}/auth/approve-device?token=${encodeURIComponent(options.approveToken)}`;
  const html = getDeviceApprovalEmailHtml({
    name: options.name,
    approveUrl,
    deviceInfo: options.deviceInfo,
    ipAddress: options.ipAddress,
    appName: APP_NAME,
    expiresIn: options.expiresIn || '15 minutes',
  });
  return sendEmail({
    to: options.to,
    subject: `Approve new device sign-in – ${APP_NAME}`,
    html,
  });
}
