import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../theme/tokens';

export function useAppColors() {
  const { theme } = useTheme();
  return useMemo(() => getColors(theme), [theme]);
}
