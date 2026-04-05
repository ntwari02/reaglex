import { useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { translate } from './translate';

export function useTranslation() {
  const { language } = useTheme();
  const t = useCallback((key: string) => translate(language, key), [language]);
  return { t, language };
}
