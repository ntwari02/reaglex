import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBuyerCart } from '../../store/buyerCartStore';
import { resolveImageUrl } from '../../utils/assetUrl';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import type { BuyerTabParamList } from '../../navigation/BuyerTabs';
import BuyerScreenLayout from '../../components/BuyerScreenLayout';
import { useAppColors } from '../../hooks/useAppColors';
import { fontSerif } from '../../theme/tokens';

const IMG_FALL =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Cart'>,
  NativeStackNavigationProp<BuyerStackParamList>
>;

export default function CartScreen() {
  const nav = useNavigation<Nav>();
  const c = useAppColors();
  const items = useBuyerCart((s) => s.items);
  const updateQuantity = useBuyerCart((s) => s.updateQuantity);
  const removeItem = useBuyerCart((s) => s.removeItem);
  const subtotal = useBuyerCart((s) => s.subtotal());

  return (
    <BuyerScreenLayout subtitle="Cart">
      <View style={styles.flex}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        style={styles.flex}
        contentContainerStyle={[styles.listContent, items.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.textMuted }]}>Your cart is empty.</Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              {
                backgroundColor: c.cardBg,
                borderColor: c.borderCard,
              },
              Platform.select({
                ios: {
                  shadowColor: `rgba(${c.shadowRgb},0.08)`,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                },
                android: { elevation: 2 },
              }),
            ]}
          >
            <Image source={{ uri: resolveImageUrl(item.image, IMG_FALL) }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: c.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.meta, { color: c.textMuted }]}>{item.seller}</Text>
              <Text style={[styles.price, { color: c.brandPrimary, fontFamily: fontSerif }]}>
                {item.price} × {item.quantity}
              </Text>
              <View style={styles.qty}>
                <Pressable
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  style={[styles.qb, { backgroundColor: c.searchBg }]}
                >
                  <Text style={{ color: c.textPrimary }}>−</Text>
                </Pressable>
                <Text style={[styles.qtyN, { color: c.textPrimary }]}>{item.quantity}</Text>
                <Pressable
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  style={[styles.qb, { backgroundColor: c.searchBg }]}
                >
                  <Text style={{ color: c.textPrimary }}>+</Text>
                </Pressable>
                <Pressable onPress={() => removeItem(item.id)} style={styles.rm}>
                  <Text style={[styles.rmT, { color: c.error }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
      {items.length > 0 && (
        <View style={[styles.footer, { borderTopColor: c.divider, backgroundColor: c.bgPage }]}>
          <Text style={[styles.sub, { color: c.textPrimary }]}>
            Subtotal:{' '}
            <Text style={{ fontFamily: fontSerif, color: c.brandPrimary }}>
              {subtotal.toFixed(2)}
            </Text>
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.co,
              { backgroundColor: c.brandPrimary, opacity: pressed ? 0.92 : 1 },
            ]}
            onPress={() => nav.navigate('Checkout')}
          >
            <Text style={styles.coT}>Checkout</Text>
          </Pressable>
        </View>
      )}
      </View>
    </BuyerScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 16, gap: 12 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 24 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: 'rgba(148,163,184,0.2)' },
  title: { fontWeight: '700', fontSize: 15 },
  meta: { fontSize: 12, marginTop: 2 },
  price: { marginTop: 6, fontWeight: '700', fontSize: 16 },
  qty: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  qb: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  qtyN: { fontWeight: '700', minWidth: 28, textAlign: 'center' },
  rm: { marginLeft: 'auto' },
  rmT: { fontWeight: '600', fontSize: 13 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sub: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  co: { padding: 16, borderRadius: 14, alignItems: 'center' },
  coT: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
