import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppColors } from '../hooks/useAppColors';
import { fontLogo } from '../theme/tokens';

type Props = {
  title?: string;
  subtitle?: string;
  /** Show sun/moon to match web theme toggle */
  showThemeToggle?: boolean;
  /** Optional right icon (e.g. cart) */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  children: React.ReactNode;
};

export default function BuyerScreenLayout({
  title,
  subtitle,
  showThemeToggle = true,
  rightIcon,
  onRightPress,
  children,
}: Props) {
  const c = useAppColors();
  const { toggleTheme, theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: c.bgPage }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={c.headerBg}
      />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: c.headerBg,
            borderBottomColor: c.divider,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: theme === 'dark' ? 0.35 : 0.06,
                shadowRadius: 6,
              },
              android: { elevation: 2 },
            }),
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={[styles.wordmark, { color: c.textPrimary }, { fontFamily: fontLogo }]}>
              Spacilly
            </Text>
            {(title || subtitle) && (
              <Text style={[styles.pageTitle, { color: c.textMuted }]} numberOfLines={1}>
                {subtitle || title}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {rightIcon ? (
              <Pressable
                onPress={onRightPress}
                style={[styles.iconBtn, { backgroundColor: c.searchBg }]}
                hitSlop={12}
              >
                <Ionicons name={rightIcon} size={22} color={c.brandPrimary} />
              </Pressable>
            ) : null}
            {showThemeToggle ? (
              <Pressable
                onPress={toggleTheme}
                style={[styles.iconBtn, { backgroundColor: c.searchBg }]}
                accessibilityRole="button"
                accessibilityLabel={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                <Ionicons
                  name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                  size={22}
                  color={c.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: { flex: 1 },
  wordmark: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pageTitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
});
