import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { productAPI } from '../../services/api';
import { resolveImageUrl } from '../../utils/assetUrl';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import type { BuyerTabParamList } from '../../navigation/BuyerTabs';
import BuyerScreenLayout from '../../components/BuyerScreenLayout';
import { ProductCard } from '../../components/ui/ProductCard';
import { useAppColors } from '../../hooks/useAppColors';
import { useBuyerCart } from '../../store/buyerCartStore';

const IMG_FALL =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Search'>,
  NativeStackNavigationProp<BuyerStackParamList>
>;

export default function SearchScreen() {
  const nav = useNavigation<Nav>();
  const c = useAppColors();
  const addItem = useBuyerCart((s) => s.addItem);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await productAPI.getProducts({ search: q.trim(), limit: 40 });
      const list = res?.products || res || [];
      setResults(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  }, [q]);

  const listHeader = useMemo(
    () => (
      <View style={styles.searchBlock}>
        <View style={[styles.searchRow, { backgroundColor: c.searchBg, borderColor: c.borderCard }]}>
          <Ionicons name="search" size={20} color={c.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search products…"
            placeholderTextColor={c.textFaint}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={search}
            style={[styles.input, { color: c.textPrimary }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable
          onPress={search}
          style={({ pressed }) => [
            styles.go,
            { backgroundColor: c.brandPrimary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.goText}>Search</Text>
        </Pressable>
      </View>
    ),
    [c, q, search],
  );

  return (
    <BuyerScreenLayout subtitle="Search" rightIcon="cart-outline" onRightPress={() => nav.navigate('Cart')}>
      <FlatList
        data={loading ? [] : results}
        keyExtractor={(it) => String(it._id || it.id)}
        numColumns={2}
        ListHeaderComponent={
          <View>
            {listHeader}
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={c.brandPrimary} />
                <Text style={[styles.loadingText, { color: c.textMuted }]}>Searching…</Text>
              </View>
            ) : null}
            {!loading && searched && results.length > 0 ? (
              <Text style={[styles.resultCount, { color: c.textMuted }]}>
                {results.length} result{results.length === 1 ? '' : 's'}
              </Text>
            ) : null}
          </View>
        }
        columnWrapperStyle={[styles.rowGap, { paddingHorizontal: 16 }]}
        contentContainerStyle={[styles.listPad, { paddingBottom: 28 }]}
        ListEmptyComponent={
          loading ? null : (
            <Text style={[styles.hint, { color: c.textMuted }]}>
              {searched
                ? 'No matches. Try another keyword.'
                : 'Enter a term and tap Search — same catalog as the web app.'}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const id = String(item._id || item.id);
          const title = item.title || item.name;
          const price = Number(item.price || 0);
          const compare = Number(item.compareAtPrice || item.compare_at_price || 0);
          const discountPct =
            compare > price && compare > 0
              ? Math.round((1 - price / compare) * 100)
              : undefined;
          return (
            <ProductCard
              colors={c}
              title={title}
              price={price}
              currency={item.currency || 'USD'}
              imageUri={resolveImageUrl(item.images?.[0], IMG_FALL)}
              discountPct={discountPct}
              onPress={() => nav.navigate('ProductDetail', { productId: id })}
              onAddToCart={() => addItem(item, 1)}
            />
          );
        }}
      />
    </BuyerScreenLayout>
  );
}

const styles = StyleSheet.create({
  searchBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  go: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  goText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  hint: { marginTop: 32, textAlign: 'center', paddingHorizontal: 24, lineHeight: 22 },
  resultCount: { fontSize: 13, fontWeight: '600', marginBottom: 8, paddingHorizontal: 16 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  loadingText: { fontSize: 14, fontWeight: '600' },
  rowGap: { gap: 12 },
  listPad: { gap: 12, paddingTop: 4 },
});
