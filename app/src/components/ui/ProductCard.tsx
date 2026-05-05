import React, { memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { AppColors } from '../../theme/tokens';
import { fontSerif } from '../../theme/tokens';

type Props = {
  colors: AppColors;
  title: string;
  price: number;
  currency?: string;
  imageUri: string;
  onPress: () => void;
  onAddToCart: () => void;
  discountPct?: number;
};

function ProductCardComponent({
  colors,
  title,
  price,
  currency = 'USD',
  imageUri,
  onPress,
  onAddToCart,
  discountPct,
}: Props) {
  const handleAdd = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onAddToCart();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.borderCard,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        Platform.select({
          ios: {
            shadowColor: `rgba(${colors.shadowRgb},0.12)`,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
          },
          android: { elevation: 3 },
        }),
      ]}
    >
      <View style={styles.imgWrap}>
        <Image
          source={{ uri: imageUri }}
          style={styles.img}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        {discountPct != null && discountPct > 0 ? (
          <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.95)' }]}>
            <Text style={styles.badgeT}>-{Math.round(discountPct)}%</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.row}>
          <Text style={[styles.price, { color: colors.brandPrimary }, { fontFamily: fontSerif }]}>
            {currency === 'USD' ? '$' : ''}
            {Number.isInteger(price) ? price : price.toFixed(2)}
            {currency !== 'USD' ? ` ${currency}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            handleAdd();
          }}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.brandTint,
              borderColor: colors.brandPrimary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.brandHover }]}>Add to cart</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  imgWrap: {
    aspectRatio: 1,
    backgroundColor: 'rgba(148,163,184,0.15)',
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeT: { color: '#fff', fontSize: 11, fontWeight: '800' },
  body: { padding: 12, gap: 6 },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    minHeight: 40,
  },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  price: {
    fontSize: 17,
    fontWeight: '700',
  },
  cta: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  ctaText: { fontWeight: '700', fontSize: 13 },
});
