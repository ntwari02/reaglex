/** Session-scoped auth form drafts — avoids losing in-progress input on refresh/navigation */

export type AuthDraftFlow = 'login' | 'signup' | 'forgot' | 'reset';
export type AuthDraftScope = 'page' | 'modal';

const VERSION = 'v1';

function storageKey(scope: AuthDraftScope, flow: AuthDraftFlow) {
  return `spacilly_auth_draft_${VERSION}_${scope}_${flow}`;
}

export type LoginDraft = {
  email?: string;
  remember?: boolean;
  password?: string;
};

export type SignupDraft = {
  fullName?: string;
  email?: string;
  role?: 'buyer' | 'seller';
  storeName?: string;
  referralCode?: string;
  agreed?: boolean;
  password?: string;
  confirmPassword?: string;
};

export type ForgotDraft = {
  email?: string;
};

export type ResetDraft = {
  email?: string;
  digits?: string[];
  newPassword?: string;
  newConfirm?: string;
};

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function loadAuthDraft<T>(scope: AuthDraftScope, flow: AuthDraftFlow): T | null {
  return read<T>(storageKey(scope, flow));
}

export function saveAuthDraft<T>(scope: AuthDraftScope, flow: AuthDraftFlow, data: T) {
  write(storageKey(scope, flow), data);
}

export function clearAuthDraft(scope: AuthDraftScope, flow: AuthDraftFlow) {
  try {
    sessionStorage.removeItem(storageKey(scope, flow));
  } catch {
    /* ignore */
  }
}

export function clearAllAuthDrafts(scope: AuthDraftScope) {
  (['login', 'signup', 'forgot', 'reset'] as const).forEach((flow) => clearAuthDraft(scope, flow));
}
