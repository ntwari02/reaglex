import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../services/api';

export default function SellerCollectionsScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let a = true;
    (async () => {
      try {
        const res = await api.get('/seller/collections');
        const list = res.data?.collections || res.data || [];
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
  return (
    <View style={styles.box}>
      <Text style={styles.h}>Collections</Text>
      <FlatList
        data={rows}
        keyExtractor={(x, i) => String(x._id || i)}
        renderItem={({ item }) => <Text style={styles.r}>{item.name}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  r: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e2e8f0' },
});
