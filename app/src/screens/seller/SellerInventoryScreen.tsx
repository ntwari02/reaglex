import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../services/api';

export default function SellerInventoryScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/seller/inventory');
        const list = res.data?.items || res.data?.inventory || res.data || [];
        if (alive) setRows(Array.isArray(list) ? list : []);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <View style={styles.box}>
      <Text style={styles.h}>Inventory</Text>
      <FlatList
        data={rows}
        keyExtractor={(x, i) => String(x._id || x.id || i)}
        ListEmptyComponent={<Text style={styles.m}>No rows (same endpoint as web).</Text>}
        renderItem={({ item }) => (
          <Text style={styles.row}>{item.name || item.title || JSON.stringify(item)}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  m: { color: '#64748b' },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e2e8f0' },
});
