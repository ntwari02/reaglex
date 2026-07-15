import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { profileAPI } from '../lib/api';

export type Theme = 'dark' | 'light';
type Language = 'en' | 'fr' | 'rw' | 'sw';
export type Currency = 'USD' | 'EUR' | 'RWF' | 'KES';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'spacilly-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [theme, setThemeState] = useState<Theme>('light');
  const [language, setLanguageState] = useState<Language>('en');
  const [currency, setCurrencyState] = useState<Currency>('USD');

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(THEME_KEY);
        if (t === 'dark' || t === 'light') setThemeState(t);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { user: prof } = await profileAPI.getProfile();
        const prefs = (prof as Record<string, unknown> | undefined)?.preferences as
          | Record<string, unknown>
          | undefined;
        if (cancelled || !prefs) return;
        if (prefs.theme === 'dark' || prefs.theme === 'light') setThemeState(prefs.theme);
        const lang = prefs.language;
        if (typeof lang === 'string' && ['en', 'fr', 'rw', 'sw'].includes(lang)) {
          setLanguageState(lang as Language);
        }
        if (prefs.currency && ['USD', 'EUR', 'RWF', 'KES'].includes(String(prefs.currency))) {
          setCurrencyState(prefs.currency as Currency);
        }
      } catch {
        /* offline — keep local */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      void AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (user?.id) {
      void profileAPI.updatePreferences({ language: lang }).catch(() => {});
    }
  }, [user?.id]);

  const setCurrency = useCallback(
    (curr: Currency) => {
      setCurrencyState(curr);
      if (user?.id) {
        void profileAPI.updatePreferences({ currency: curr }).catch(() => {});
      }
    },
    [user?.id],
  );

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      language,
      setLanguage,
      currency,
      setCurrency,
    }),
    [theme, toggleTheme, language, setLanguage, currency, setCurrency],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
