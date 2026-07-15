import { useCallback, useEffect, useState } from 'react';

/**
 * Captures the `beforeinstallprompt` event so the app can offer a custom
 * "Install Spacilly" button matching the rest of the UI (instead of the
 * generic browser prompt).
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'spacilly-install-dismissed-at';
const DISMISS_PERMANENT_KEY = 'spacilly-install-dismissed-permanent';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 2 weeks

function readDismissed(): boolean {
  try {
    if (localStorage.getItem(DISMISS_PERMANENT_KEY) === '1') return true;
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function isStandaloneInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari
  const iosStandalone = (window.navigator as any).standalone === true;
  // Chromium / Edge
  const mqStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return Boolean(iosStandalone || mqStandalone);
}

export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(isStandaloneInstalled());
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setEvent(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!event) return 'unavailable' as const;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'dismissed') {
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        setDismissed(true);
      }
      setEvent(null);
      return choice.outcome;
    } catch {
      return 'error' as const;
    }
  }, [event]);

  const dismiss = useCallback((permanent = true) => {
    setDismissed(true);
    try {
      if (permanent) {
        localStorage.setItem(DISMISS_PERMANENT_KEY, '1');
      } else {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } catch {
      /* ignore */
    }
  }, []);

  return {
    canInstall: Boolean(event) && !installed,
    installed,
    dismissed,
    promptInstall,
    dismiss,
  };
}
