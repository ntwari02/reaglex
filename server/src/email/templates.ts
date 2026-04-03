/**
 * HTML email templates. Use CLIENT_URL for links (e.g. reset password, verify email).
 * Beautiful, responsive design with clear CTAs and security notes.
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
  padding: 14px 28px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #ffffff !important;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35);
`;
const footerStyle = `font-size: 12px; color: #6b7280; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;`;

/** Shared email wrapper: gradient header bar + white card */
function emailWrapper(content: string, appName: string, title: string) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #f9fafb;">
  <tr><td style="padding: 24px 20px 0;">
    <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">${appName}</h1>
      <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">${title}</p>
    </div>
    <div style="background: #ffffff; border-radius: 0 0 16px 16px; padding: 32px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; border-top: none;">
      ${content}
    </div>
  </td></tr>
</table>`;
}

export function getWelcomeEmailHtml(options: { name: string; loginUrl: string; appName?: string }) {
  const appName = options.appName || 'Reaglex';
  const content = `
  <p style="margin: 0 0 16px; font-size: 16px;">Hi ${options.name},</p>
  <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563;">Thanks for signing up. You're all set to start exploring.</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${options.loginUrl}" style="${buttonStyle}">Sign in to your account</a>
  </p>
  <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">If you have any questions, reply to this email or visit our help center.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. You received it because you created an account.</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${baseStyles} padding: 24px;">${emailWrapper(content, appName, 'Welcome')}</body></html>`;
}

export function getVerificationEmailHtml(options: {
  name: string;
  verifyUrl: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const expires = options.expiresIn || '24 hours';
  const content = `
  <p style="margin: 0 0 16px; font-size: 16px;">Hi ${options.name},</p>
  <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563;">Please confirm your email address by clicking the button below. This keeps your account secure.</p>
  <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af;">Link expires in <strong>${expires}</strong>. You can also verify using a one-time code on the sign-in page.</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${options.verifyUrl}" style="${buttonStyle}">Verify email address</a>
  </p>
  <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">If you didn't create an account, you can safely ignore this email.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. You received it because a verification was requested for this address.</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${baseStyles} padding: 24px;">${emailWrapper(content, appName, 'Verify your email')}</body></html>`;
}

export function getVerificationOtpEmailHtml(options: {
  name: string;
  code: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const expires = options.expiresIn || '10 minutes';
  const content = `
  <p style="margin: 0 0 16px; font-size: 16px;">Hi ${options.name},</p>
  <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563;">Use this one-time code to verify your email. Enter it on the verification page.</p>
  <p style="text-align: center; margin: 24px 0;">
    <span style="display: inline-block; padding: 20px 32px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px dashed #f59e0b; border-radius: 16px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #92400e;">${options.code}</span>
  </p>
  <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af; text-align: center;">Expires in <strong>${expires}</strong>. Do not share this code.</p>
  <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">If you didn't request this code, you can safely ignore this email.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. You received it because a verification code was requested for your account.</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${baseStyles} padding: 24px;">${emailWrapper(content, appName, 'Your verification code')}</body></html>`;
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

export function getPasswordResetOtpEmailHtml(options: {
  name: string;
  code: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const expires = options.expiresIn || '15 minutes';
  const content = `
  <p style="margin: 0 0 16px; font-size: 16px;">Hi ${options.name},</p>
  <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563;">Use this one-time code to reset your password. Enter it on the password reset screen.</p>
  <p style="text-align: center; margin: 24px 0;">
    <span style="display: inline-block; padding: 20px 32px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px dashed #f97316; border-radius: 16px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #9a3412;">${options.code}</span>
  </p>
  <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af; text-align: center;">Expires in <strong>${expires}</strong>. Do not share this code.</p>
  <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">If you didn't request a password reset, you can safely ignore this email.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. You received it because a password reset was requested for your account.</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${baseStyles} padding: 24px;">${emailWrapper(content, appName, 'Reset your password')}</body></html>`;
}

/** Sign-in alert: sent after each successful login when email is configured */
export function getLoginNotificationEmailHtml(options: {
  name: string;
  deviceInfo: string;
  ipAddress: string;
  role: string;
  appName?: string;
  loginUrl?: string;
  signedInAt?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const loginUrl = options.loginUrl || '#';
  const when = options.signedInAt || new Date().toUTCString();
  const content = `
  <p style="margin: 0 0 16px; font-size: 16px;">Hi ${options.name || 'there'},</p>
  <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563;">Your <strong>${appName}</strong> account was signed in successfully.</p>
  <div style="background: #f3f4f6; border-radius: 12px; padding: 16px 20px; margin: 20px 0; border-left: 4px solid #10b981;">
    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">When</p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #111827;">${when}</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Role</p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #111827;">${options.role}</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Device / client</p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #111827; word-break: break-all;">${options.deviceInfo}</p>
    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">IP address</p>
    <p style="margin: 0; font-size: 14px; color: #111827;">${options.ipAddress}</p>
  </div>
  <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280;">If this wasn’t you, change your password and contact support immediately.</p>
  <p style="text-align: center; margin: 0;">
    <a href="${loginUrl}" style="${buttonStyle}">Go to ${appName}</a>
  </p>
  <div style="${footerStyle}">Automated security notice from ${appName}. You received this because a login completed for your account.</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${baseStyles} padding: 24px;">${emailWrapper(content, appName, 'New sign-in')}</body></html>`;
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

/** Beautiful device approval email – new login from another device, approve via link */
export function getDeviceApprovalEmailHtml(options: {
  name: string;
  approveUrl: string;
  deviceInfo: string;
  ipAddress: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Reaglex';
  const expires = options.expiresIn || '15 minutes';
  const content = `
  <p style="margin: 0 0 16px; font-size: 16px;">Hi ${options.name},</p>
  <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563;">A new sign-in to your ${appName} account was requested from another device.</p>
  <div style="background: #f3f4f6; border-radius: 12px; padding: 16px 20px; margin: 20px 0; border-left: 4px solid #f97316;">
    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Device</p>
    <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #111827;">${options.deviceInfo}</p>
    <p style="margin: 0; font-size: 13px; color: #6b7280;">IP address: ${options.ipAddress}</p>
  </div>
  <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;">If this was you, click the button below to allow this device and sign in. The link expires in <strong>${expires}</strong>.</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${options.approveUrl}" style="${buttonStyle}">Approve new device</a>
  </p>
  <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">If you didn't try to sign in, ignore this email and your account will stay secure. Consider changing your password if you're concerned.</p>
  <div style="${footerStyle}">This email was sent by ${appName}. One sign-in per device is allowed for admin and seller accounts.</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${baseStyles} padding: 24px;">${emailWrapper(content, appName, 'Approve new device sign-in')}</body></html>`;
}
