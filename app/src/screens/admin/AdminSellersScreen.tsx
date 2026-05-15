import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { adminAPI } from '../../lib/api';

export default function AdminSellersScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let a = true;
    (async () => {
      try {
        const res = await adminAPI.getSellers({ limit: 50 });
        if (a) setRows(res.sellers || []);
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
      <Text style={styles.h}>Sellers</Text>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x.id || x.email)}
        renderItem={({ item }) => (
          <Text style={styles.r}>
            {item.storeName || item.sellerName} · {item.email}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  r: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e2e8f0' },
});
