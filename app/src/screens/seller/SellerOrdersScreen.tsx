import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAppColors } from '../../hooks/useAppColors';

export default function SellerOrdersScreen() {
  const nav = useNavigation<any>();
  const c = useAppColors();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'packed' | 'shipped'>('pending');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/seller/orders');
        const list = res.data?.orders || [];
        if (alive) setOrders(Array.isArray(list) ? list : []);
      } catch {
        if (alive) setOrders([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  const chips: Array<'all' | 'pending' | 'processing' | 'packed' | 'shipped'> = [
    'all',
    'pending',
    'processing',
    'packed',
    'shipped',
  ];
  const filtered = filter === 'all' ? orders : orders.filter((o) => String(o.status || '') === filter);

  return (
    <View style={[styles.box, { backgroundColor: c.bgPage }]}>
      <Text style={[styles.h, { color: c.textPrimary }]}>Orders</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>Focus mode: defaults to orders needing action.</Text>
      <View style={styles.chips}>
        {chips.map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilter(s)}
            style={[
              styles.chip,
              { backgroundColor: c.cardBg, borderColor: c.borderCard },
              s === filter && { backgroundColor: c.brandTint, borderColor: c.brandPrimary },
            ]}
          >
            <Text style={[styles.chipText, { color: c.textSecondary }]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o._id || o.id)}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.textMuted }]}>No orders in this filter.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}
            onPress={() => nav.navigate('orderDetail', { orderId: String(item._id || item.id) })}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.t, { color: c.textPrimary }]}>#{item.orderNumber || item._id}</Text>
              <Text style={[styles.meta, { color: c.textMuted }]}>
                {item.customer?.name || item.customer || 'Buyer'} · {item.items?.length || 0} items
              </Text>
            </View>
            <Text style={[styles.s, { color: c.textSecondary }]}>{item.status || 'pending'}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16 },
  h: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 12, textTransform: 'capitalize', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  t: { fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
  s: { textTransform: 'capitalize', fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 22 },
});
