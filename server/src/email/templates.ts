/**
 * HTML email templates. Use CLIENT_URL for links (e.g. reset password, verify email).
 */
const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #1f2937;
  max-width: 560px;
  margin: 0 auto;
`;
const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #ffffff !important;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
`;
const footerStyle = `font-size: 12px; color: #6b7280; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;`;

export function getWelcomeEmailHtml(options: { name: string; loginUrl: string; appName?: string }) {
  const appName = options.appName || 'Reaglex';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${baseStyles} padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #111827;">Welcome to ${appName}</h1>
  </div>
  <p>Hi ${options.name},</p>
  <p>Thanks for signing up. You're all set to start exploring.</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${options.loginUrl}" style="${buttonStyle}">Sign in to your account</a>
  </p>
  <p>If you have any questions, reply to this email or visit our help center.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. You received it because you created an account.</div>
</body>
</html>
`;
}

export function getVerificationEmailHtml(options: {
  name: string;
  verifyUrl: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const expires = options.expiresIn || '24 hours';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${baseStyles} padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #111827;">Verify your email</h1>
  </div>
  <p>Hi ${options.name},</p>
  <p>Please confirm your email address by clicking the button below. This link expires in ${expires}.</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${options.verifyUrl}" style="${buttonStyle}">Verify email address</a>
  </p>
  <p>If you didn't create an account, you can safely ignore this email.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. You received it because someone signed up with this address.</div>
</body>
</html>
`;
}

export function getVerificationOtpEmailHtml(options: {
  name: string;
  code: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const expires = options.expiresIn || '10 minutes';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${baseStyles} padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #111827;">Your verification code</h1>
  </div>
  <p>Hi ${options.name},</p>
  <p>Use this code to verify your email address. It expires in ${expires}.</p>
  <p style="text-align: center; margin: 28px 0;">
    <span style="display: inline-block; padding: 16px 28px; background: #f3f4f6; border-radius: 12px; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #111827;">${options.code}</span>
  </p>
  <p>If you didn't request this code, you can safely ignore this email.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. You received it because a verification was requested for your account.</div>
</body>
</html>
`;
}

export function getPasswordResetEmailHtml(options: {
  name: string;
  resetUrl: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const expires = options.expiresIn || '1 hour';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${baseStyles} padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #111827;">Reset your password</h1>
  </div>
  <p>Hi ${options.name},</p>
  <p>We received a request to reset your password. Click the button below to choose a new password. This link expires in ${expires}.</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${options.resetUrl}" style="${buttonStyle}">Reset password</a>
  </p>
  <p>If you didn't request a reset, you can safely ignore this email. Your password will not change.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. You received it because a password reset was requested for your account.</div>
</body>
</html>
`;
}

export function getSecurityAlertEmailHtml(options: {
  name: string;
  message: string;
  appName?: string;
  loginUrl?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const loginUrl = options.loginUrl || '#';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${baseStyles} padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #b91c1c;">Security alert</h1>
  </div>
  <p>Hi ${options.name},</p>
  <p>${options.message}</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${loginUrl}" style="${buttonStyle}">Review account</a>
  </p>
  <div style="${footerStyle}">This is an automated security message from ${appName}. If you didn't take this action, secure your account immediately.</div>
</body>
</html>
`;
}

export function getNotificationEmailHtml(options: {
  subject: string;
  body: string;
  appName?: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const action = options.actionUrl && options.actionLabel
    ? `<p style="text-align: center; margin: 28px 0;"><a href="${options.actionUrl}" style="${buttonStyle}">${options.actionLabel}</a></p>`
    : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${baseStyles} padding: 24px;">
  <h1 style="font-size: 20px; font-weight: 700; color: #111827;">${options.subject}</h1>
  <div style="margin: 20px 0;">${options.body}</div>
  ${action}
  <div style="${footerStyle}">${appName}</div>
</body>
</html>
`;
}
