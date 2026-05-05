import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../services/api';

export default function SellerDisputesScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let a = true;
    (async () => {
      try {
        const res = await api.get('/seller/disputes');
        const list = res.data?.disputes || res.data || [];
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
      <Text style={styles.h}>Disputes</Text>
      <FlatList
        data={rows}
        keyExtractor={(x, i) => String(x._id || i)}
        ListEmptyComponent={<Text style={styles.m}>No disputes.</Text>}
        renderItem={({ item }) => <Text style={styles.r}>{JSON.stringify(item)}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  m: { color: '#64748b' },
  r: { paddingVertical: 8, fontSize: 11, fontFamily: 'monospace' },
});
