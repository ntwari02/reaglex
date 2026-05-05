import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAppColors } from '../../hooks/useAppColors';

export default function SellerProductsScreen() {
  const c = useAppColors();
  const nav = useNavigation<any>();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => {
    let a = true;
    (async () => {
      try {
        const res = await api.get('/seller/inventory/products');
        const list = res.data?.products || [];
        if (a) setRows(Array.isArray(list) ? list : []);
      } catch {
        if (a) setRows([]);
      } finally {
        if (a) setLoading(false);
      }
    })();
    return () => {
      a = false;
    };
  }, []);
  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;
  const filtered = rows.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(item.title || item.name || '')
        .toLowerCase()
        .includes(q) || String(item.sku || '').toLowerCase().includes(q)
    );
  });
  const lowStock = rows.filter((r) => Number(r.stock || 0) < 20).length;
  return (
    <View style={[styles.box, { backgroundColor: c.bgPage }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.h, { color: c.textPrimary }]}>Products</Text>
          <View style={styles.topRow}>
            <Text style={[styles.caption, { color: c.textMuted }]}>{rows.length} listings</Text>
            <Text style={[styles.caption, { color: c.error }]}>{lowStock} low stock</Text>
          </View>
        </View>
        <Pressable style={[styles.addBtn, { backgroundColor: c.brandPrimary }]} onPress={() => nav.navigate('addProduct')}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search product or SKU"
        placeholderTextColor={c.textFaint}
        style={[
          styles.search,
          { backgroundColor: c.searchBg, borderColor: c.borderCard, color: c.textPrimary },
        ]}
      />
      <FlatList
        data={filtered}
        keyExtractor={(x, i) => String(x._id || i)}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.textMuted }]}>No products found.</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.r, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: c.textPrimary }]}>{item.title || item.name}</Text>
              <Text style={[styles.meta, { color: c.textMuted }]}>SKU {item.sku || 'N/A'}</Text>
            </View>
            <Text style={[styles.stock, { color: Number(item.stock || 0) < 20 ? c.error : c.textSecondary }]}>
              {Number(item.stock || 0)} in stock
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  h: { fontSize: 24, fontWeight: '800' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  addBtn: { minHeight: 38, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  caption: { fontSize: 12, fontWeight: '700' },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  r: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
  stock: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 22 },
});
