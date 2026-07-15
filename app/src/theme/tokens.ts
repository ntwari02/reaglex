/**
 * Semantic colors aligned with `client/src/styles/theme.css` (Spacilly buyer storefront).
 * Light uses vivid orange #f97316; dark uses softened brand #D97736 per web dark theme.
 */
import { Platform } from 'react-native';

export interface AppColors {
  bgPage: string;
  bgSecondary: string;
  bgTertiary: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  brandPrimary: string;
  brandHover: string;
  brandTint: string;
  link: string;
  divider: string;
  borderCard: string;
  tabBarBg: string;
  headerBg: string;
  searchBg: string;
  success: string;
  error: string;
  /** For rgba() shadows */
  shadowRgb: string;
  heroBlobTeal: string;
  heroBlobViolet: string;
}

export function getColors(theme: 'light' | 'dark'): AppColors {
  if (theme === 'dark') {
    return {
      bgPage: '#121212',
      bgSecondary: '#1C1C1C',
      bgTertiary: '#242424',
      cardBg: '#1C1C1C',
      textPrimary: '#F2F2F2',
      textSecondary: '#BDBDBD',
      textMuted: '#9E9E9E',
      textFaint: '#8A8A8A',
      brandPrimary: '#D97736',
      brandHover: '#E08A4A',
      brandTint: 'rgba(217,119,54,0.14)',
      link: '#7EB0D8',
      divider: 'rgba(255,255,255,0.08)',
      borderCard: 'rgba(255,255,255,0.06)',
      tabBarBg: '#161616',
      headerBg: '#161616',
      searchBg: '#242424',
      success: '#8FD4AE',
      error: '#E8B0B0',
      shadowRgb: '0,0,0',
      heroBlobTeal: 'rgba(20,140,120,0.12)',
      heroBlobViolet: 'rgba(99,102,241,0.1)',
    };
  }
  return {
    bgPage: '#f3f4f6',
    bgSecondary: '#ffffff',
    bgTertiary: '#f9fafb',
    cardBg: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    textFaint: '#9ca3af',
    brandPrimary: '#f97316',
    brandHover: '#ea580c',
    brandTint: 'rgba(249,115,22,0.08)',
    link: '#f97316',
    divider: '#e5e7eb',
    borderCard: '#e5e7eb',
    tabBarBg: '#ffffff',
    headerBg: '#ffffff',
    searchBg: '#f3f4f6',
    success: '#15803d',
    error: '#b91c1c',
    shadowRgb: '15,23,42',
    heroBlobTeal: 'rgba(13,148,136,0.14)',
    heroBlobViolet: 'rgba(99,102,241,0.12)',
  };
}

/** Site body font — matches web `--font-body`. */
export const fontBody = Platform.select({
  ios: 'Times New Roman',
  android: 'serif',
  default: 'Times New Roman',
}) as string;

/** @deprecated Use fontBody */
export const fontSerif = fontBody;

export const fontSans = fontBody;

/** Spacilly logo wordmark only (web uses Mea Culpa via custom font). */
export const fontLogo = Platform.select({
  ios: 'Times New Roman',
  android: 'serif',
  default: 'Times New Roman',
}) as string;
