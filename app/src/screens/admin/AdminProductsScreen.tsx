import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { adminProductsAPI } from '../../lib/api';

export default function AdminProductsScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let a = true;
    (async () => {
      try {
        const res = await adminProductsAPI.getProducts({ limit: 40 });
        if (a) setRows(res.products || []);
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

  return (
    <View style={styles.box}>
      <Text style={styles.h}>Products</Text>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x._id || x.id)}
        renderItem={({ item }) => <Text style={styles.r}>{item.title || item.name}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  r: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e2e8f0' },
});
