import { useEffect } from 'react';
import {
  type AuthDraftFlow,
  type AuthDraftScope,
  loadAuthDraft,
  saveAuthDraft,
} from '../lib/authDraftStorage';

export function getAuthDraftInitial<T extends object>(scope: AuthDraftScope, flow: AuthDraftFlow, defaults: T): T {
  const saved = loadAuthDraft<Partial<T>>(scope, flow);
  return saved ? { ...defaults, ...saved } : defaults;
}

/** Debounce-persist auth form state to sessionStorage */
export function useSaveAuthDraft<T extends object>(
  scope: AuthDraftScope,
  flow: AuthDraftFlow,
  value: T,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => saveAuthDraft(scope, flow, value), 350);
    return () => clearTimeout(id);
  }, [scope, flow, value, enabled]);
}
