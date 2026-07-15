import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../theme/tokens';
import { fontSerif } from '../theme/tokens';

type Props = {
  colors: AppColors;
  theme: 'light' | 'dark';
};

/** Mirrors web buyer hero mood: soft gradient, serif headline, teal + violet accents (theme.css). */
export default function HomeHero({ colors, theme }: Props) {
  const gradient =
    theme === 'dark'
      ? (['#1a1a1a', '#242424', '#1C1C1C'] as const)
      : (['#ffffff', '#f9fafb', '#f3f4f6'] as const);

  return (
    <LinearGradient colors={[...gradient]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={[styles.blobA, { backgroundColor: colors.heroBlobTeal }]} />
      <View style={[styles.blobB, { backgroundColor: colors.heroBlobViolet }]} />
      <View style={styles.inner}>
        <View style={[styles.pill, { backgroundColor: colors.brandTint }]}>
          <Text style={[styles.pillText, { color: colors.brandPrimary }]}>Verified sellers · Secure checkout</Text>
        </View>
        <Text style={[styles.h1, { color: colors.textPrimary }, { fontFamily: fontSerif }]}>
          Shop the future
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Premium products, buyer protection, and delivery you can track — same marketplace as spacilly.com.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 168,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  blobA: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -40,
    right: -20,
    opacity: 0.9,
  },
  blobB: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -20,
    left: -10,
    opacity: 0.85,
  },
  inner: {
    padding: 20,
    paddingVertical: 22,
    zIndex: 1,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: '100%',
  },
});
