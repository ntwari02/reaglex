import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function ReturnsScreen() {
  const user = useAuthStore((s) => s.user);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/buyer/disputes', { params: { limit: 50 } });
        const list = res.data?.disputes || res.data || [];
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
  }, [user?.id]);

  if (!user) {
    return (
      <View style={styles.c}>
        <Text>Sign in to view returns.</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.h}>Returns</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(x, i) => String(x._id || x.id || i)}
          ListEmptyComponent={<Text style={styles.m}>No return requests.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.t}>{item.reason || item.status || 'Request'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  c: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  m: { color: '#64748b' },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e2e8f0' },
  t: { color: '#0f172a' },
});
