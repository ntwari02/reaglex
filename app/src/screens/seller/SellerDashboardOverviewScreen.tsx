import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import api from '../../services/api';

export default function SellerDashboardOverviewScreen() {
  const [range, setRange] = useState<'today' | 'week' | 'month'>('week');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/seller/dashboard/stats', { params: { timeRange: range } });
        if (alive) setData(res.data);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [range]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h}>Dashboard</Text>
      <View style={styles.row}>
        {(['today', 'week', 'month'] as const).map((r) => (
          <Pressable key={r} style={[styles.chip, range === r && styles.chipOn]} onPress={() => setRange(r)}>
            <Text style={styles.chipT}>{r}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator /> : <Text style={styles.raw}>{JSON.stringify(data, null, 2)}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0' },
  chipOn: { backgroundColor: '#ccfbf1' },
  chipT: { fontWeight: '700', textTransform: 'capitalize' },
  raw: { fontFamily: 'monospace', fontSize: 11, color: '#334155' },
});
