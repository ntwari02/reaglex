import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { profileAPI } from '../lib/api';

type Theme = 'dark' | 'light';
type Language = 'en' | 'fr' | 'rw' | 'sw';
type Currency = 'USD' | 'EUR' | 'RWF' | 'KES';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
}

function isAuthSessionError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.status === 401 ||
    error?.status === 403 ||
    error?.code === 'SESSION_REPLACED' ||
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('session was replaced')
  );
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Keep DOM theme in sync with React state, with smooth transitions
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Disable transitions briefly to prevent flash/jank
  root.classList.add('no-transition');

  // Set data-theme for CSS variable system
  root.setAttribute('data-theme', theme);
  // Set Tailwind dark class for backward-compatible dark: variants
  root.classList.toggle('dark', theme === 'dark');
  // Set color-scheme for native browser elements (scrollbars, inputs, etc.)
  root.style.colorScheme = theme;

  // Persist for next page load (matched by index.html script)
  try {
    localStorage.setItem('reaglex-theme', theme);
  } catch {}

  // Re-enable transitions after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove('no-transition');
    });
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();

  // Read initial theme from localStorage or DOM (anti-flash script already applied it)
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('reaglex-theme') as Theme;
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {}

    if (typeof document !== 'undefined') {
      const domTheme = document.documentElement.getAttribute('data-theme');
      if (domTheme === 'dark' || domTheme === 'light') {
        return domTheme as Theme;
      }
    }

    return 'light';
  });

  const [language, setLanguage] = useState<Language>(() => {
    try { return (localStorage.getItem('language') as Language) || 'en'; } catch { return 'en'; }
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    try { return (localStorage.getItem('currency') as Currency) || 'USD'; } catch { return 'USD'; }
  });

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dbPreferencesLoaded, setDbPreferencesLoaded] = useState(false);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyTheme(theme);

    if (user && !isInitialLoad && dbPreferencesLoaded) {
      const saveThemeToDB = async () => {
        try {
          await profileAPI.updatePreferences({ theme });
        } catch (error) {
          if (isAuthSessionError(error)) {
            await useAuthStore
              .getState()
              .signOut(error?.code === 'SESSION_REPLACED' ? 'SESSION_REPLACED' : undefined);
            return;
          }
          console.error('Failed to save theme to database:', error);
        }
      };
      saveThemeToDB();
    }
  }, [theme, user, isInitialLoad, dbPreferencesLoaded]);

  // Mark initial load done after first render
  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  // Load user preferences from DB when logged in
  useEffect(() => {
    if (user && !dbPreferencesLoaded) {
      const loadPreferencesFromDB = async () => {
        try {
          const profileData = await profileAPI.getProfile();

          if (profileData.preferences) {
            if (profileData.preferences.theme && profileData.preferences.theme !== 'auto') {
              setThemeState(profileData.preferences.theme as Theme);
              localStorage.setItem('theme', profileData.preferences.theme);
            }
            if (profileData.preferences.language) {
              setLanguage(profileData.preferences.language as Language);
              localStorage.setItem('language', profileData.preferences.language);
            }
            if (profileData.preferences.currency) {
              setCurrency(profileData.preferences.currency as Currency);
              localStorage.setItem('currency', profileData.preferences.currency);
            }
          }
          setDbPreferencesLoaded(true);
        } catch (error) {
          if (isAuthSessionError(error)) {
            await useAuthStore
              .getState()
              .signOut(error?.code === 'SESSION_REPLACED' ? 'SESSION_REPLACED' : undefined);
            return;
          }
          console.error('Failed to load preferences from database:', error);
          setDbPreferencesLoaded(true);
        }
      };
      loadPreferencesFromDB();
    }
  }, [user, dbPreferencesLoaded]);

  // Sync with OS-level preference changes (only if no explicit user preference)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only follow OS preference when user hasn't explicitly chosen a theme
      try {
        if (!localStorage.getItem('reaglex-theme')) {
          setThemeState(e.matches ? 'dark' : 'light');
        }
      } catch {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    if (user && dbPreferencesLoaded) {
      const saveLanguageToDB = async () => {
        try {
          await profileAPI.updatePreferences({ language: lang });
        } catch (error) {
          if (isAuthSessionError(error)) {
            await useAuthStore
              .getState()
              .signOut(error?.code === 'SESSION_REPLACED' ? 'SESSION_REPLACED' : undefined);
            return;
          }
          console.error('Failed to save language to database:', error);
        }
      };
      saveLanguageToDB();
    }
  };

  const handleSetCurrency = (curr: Currency) => {
    setCurrency(curr);
    localStorage.setItem('currency', curr);
    if (user && dbPreferencesLoaded) {
      const saveCurrencyToDB = async () => {
        try {
          await profileAPI.updatePreferences({ currency: curr });
        } catch (error) {
          if (isAuthSessionError(error)) {
            await useAuthStore
              .getState()
              .signOut(error?.code === 'SESSION_REPLACED' ? 'SESSION_REPLACED' : undefined);
            return;
          }
          console.error('Failed to save currency to database:', error);
        }
      };
      saveCurrencyToDB();
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      language,
      setLanguage: handleSetLanguage,
      currency,
      setCurrency: handleSetCurrency
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
