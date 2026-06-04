import { focusAuthErrorSummary, focusAuthField } from '../components/auth/AuthFormControls';

export type AuthErrorFlow = 'login' | 'signup' | 'forgot' | 'reset' | 'otp';

type ZodFlatten = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
};

type ApiErrorBody = {
  message?: string;
  errors?: ZodFlatten;
};

const SIGNUP_KEYS: Record<string, string> = {
  fullName: 'Full Name',
  email: 'Email Address',
  password: 'Password',
  role: 'Account type',
  referralCode: 'Referral Code (optional)',
  storeName: 'Store Name',
};

const LOGIN_KEYS: Record<string, string> = {
  email: 'Email or Phone',
  password: 'Password',
};

const FORGOT_KEYS: Record<string, string> = {
  email: 'Email Address',
};

const RESET_KEYS: Record<string, string> = {
  email: 'Email Address',
  password: 'New Password',
  code: '__otp__',
};

function mapZodFields(flatten: ZodFlatten, keyMap: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(flatten.fieldErrors || {})) {
    const label = keyMap[key];
    if (label && msgs?.[0]) out[label] = msgs[0];
  }
  return out;
}

function messageToFields(message: string, flow: AuthErrorFlow): Record<string, string> {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('email is already')) {
    return { 'Email Address': message };
  }
  if (
    (flow === 'reset' || flow === 'otp') &&
    (m.includes('code') || m.includes('invalid or expired') || m.includes('invalid email or code'))
  ) {
    return { __otp__: message };
  }
  if (flow === 'forgot' && m.includes('email')) {
    return { 'Email Address': message };
  }
  return {};
}

/**
 * Map API validation payloads to UI field labels (AuthInput labels) and optional banner text.
 */
export function mapAuthApiErrors(
  data: ApiErrorBody | null | undefined,
  flow: AuthErrorFlow,
): { banner: string; fields: Record<string, string> } {
  const message = (data?.message || '').trim();
  const keyMap =
    flow === 'signup' ? SIGNUP_KEYS : flow === 'login' ? LOGIN_KEYS : flow === 'forgot' ? FORGOT_KEYS : RESET_KEYS;

  if (data?.errors?.fieldErrors && Object.keys(data.errors.fieldErrors).length > 0) {
    const fields = mapZodFields(data.errors, keyMap);
    const banner =
      data.errors.formErrors?.[0] ||
      (Object.keys(fields).length ? '' : message) ||
      'Please correct the highlighted fields.';
    return { banner, fields };
  }

  const heuristicFields = message ? messageToFields(message, flow) : {};
  if (Object.keys(heuristicFields).length > 0) {
    return { banner: '', fields: heuristicFields };
  }

  if (
    message &&
    (message.toLowerCase().includes('google sign-in') ||
      message.toLowerCase().includes('google instead') ||
      (flow === 'login' && message.toLowerCase().includes('invalid email or password')) ||
      message.toLowerCase().includes('deactivated') ||
      message.toLowerCase().includes('verify your email'))
  ) {
    return { banner: message, fields: {} };
  }

  return { banner: message || 'Something went wrong. Please try again.', fields: {} };
}

export function focusAuthApiErrors(fields: Record<string, string>, banner: string) {
  const labels = Object.keys(fields).filter((k) => k !== '__otp__');
  if (labels.length > 0) {
    focusAuthField(labels[0]);
    return;
  }
  if (fields.__otp__) {
    document.querySelector<HTMLInputElement>('.auth-otp-digit')?.focus();
    return;
  }
  if (banner) focusAuthErrorSummary();
}
