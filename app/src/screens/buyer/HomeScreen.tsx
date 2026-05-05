import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { productAPI } from '../../services/api';
import { useBuyerCart } from '../../store/buyerCartStore';
import { resolveImageUrl } from '../../utils/assetUrl';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import type { BuyerTabParamList } from '../../navigation/BuyerTabs';
import BuyerScreenLayout from '../../components/BuyerScreenLayout';
import HomeHero from '../../components/HomeHero';
import { ProductCard } from '../../components/ui/ProductCard';
import { useAppColors } from '../../hooks/useAppColors';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSerif } from '../../theme/tokens';

const IMG_FALL =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Home'>,
  NativeStackNavigationProp<BuyerStackParamList>
>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { theme } = useTheme();
  const c = useAppColors();
  const addItem = useBuyerCart((s) => s.addItem);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await productAPI.getProducts({ limit: 24, status: 'active' });
      const list = res?.products || res || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const header = useMemo(
    () => (
      <View>
        <HomeHero colors={c} theme={theme} />
        <Text style={[styles.sectionLabel, { color: c.textSecondary }, { fontFamily: fontSerif }]}>
          Discover
        </Text>
      </View>
    ),
    [c, theme],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const id = String(item._id || item.id);
      const title = item.title || item.name;
      const price = Number(item.price || 0);
      const compare = Number(item.compareAtPrice || item.compare_at_price || 0);
      const discountPct =
        compare > price && compare > 0
          ? Math.round((1 - price / compare) * 100)
          : undefined;
      const img = resolveImageUrl(item.images?.[0] || item.thumbnail, IMG_FALL);
      return (
        <ProductCard
          colors={c}
          title={title}
          price={price}
          currency={item.currency || 'USD'}
          imageUri={img}
          discountPct={discountPct}
          onPress={() => nav.navigate('ProductDetail', { productId: id })}
          onAddToCart={() => addItem(item, 1)}
        />
      );
    },
    [addItem, c, nav],
  );

  if (loading && !items.length) {
    return (
      <BuyerScreenLayout subtitle="Discover" rightIcon="cart-outline" onRightPress={() => nav.navigate('Cart')}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brandPrimary} />
        </View>
      </BuyerScreenLayout>
    );
  }

  if (err) {
    return (
      <BuyerScreenLayout subtitle="Discover">
        <View style={styles.center}>
          <Text style={[styles.err, { color: c.error }]}>{err}</Text>
          <Pressable onPress={load} style={[styles.retry, { backgroundColor: c.brandPrimary }]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </BuyerScreenLayout>
    );
  }

  return (
    <BuyerScreenLayout subtitle="Discover" rightIcon="cart-outline" onRightPress={() => nav.navigate('Cart')}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it._id || it.id)}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={styles.rowGap}
        contentContainerStyle={[styles.listPad, { paddingBottom: 28 }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={c.brandPrimary} />
        }
        ListEmptyComponent={
          <Text style={[styles.muted, { color: c.textMuted }]}>No products yet.</Text>
        }
        renderItem={renderItem}
      />
    </BuyerScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    letterSpacing: -0.3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { textAlign: 'center' },
  muted: { textAlign: 'center', marginTop: 24 },
  retry: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700' },
  rowGap: { gap: 12, paddingHorizontal: 16 },
  listPad: { gap: 12, paddingTop: 4 },
});
