import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { adminReviewsAPI } from '../../lib/api';

export default function AdminReviewsScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let a = true;
    (async () => {
      try {
        const res = await adminReviewsAPI.getDashboard();
        if (a) setData(res);
      } catch {
        if (a) setData(null);
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
    <ScrollView style={styles.box} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h}>Reviews</Text>
      <Text style={styles.raw}>{JSON.stringify(data, null, 2)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  raw: { fontFamily: 'monospace', fontSize: 11 },
});
