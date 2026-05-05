import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { adminAPI } from '../../lib/api';

export default function AdminOverviewScreen() {
  const [buyers, setBuyers] = useState<any>(null);
  const [sellers, setSellers] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let a = true;
    (async () => {
      try {
        const [b, s] = await Promise.all([adminAPI.getUserStats(), adminAPI.getSellerStats()]);
        if (a) {
          setBuyers(b);
          setSellers(s);
        }
      } catch {
        if (a) {
          setBuyers(null);
          setSellers(null);
        }
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
      <Text style={styles.h}>Overview</Text>
      <Text style={styles.sub}>Buyer stats</Text>
      <Text style={styles.raw}>{JSON.stringify(buyers, null, 2)}</Text>
      <Text style={styles.sub}>Seller stats</Text>
      <Text style={styles.raw}>{JSON.stringify(sellers, null, 2)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  sub: { fontWeight: '700', marginTop: 12, marginBottom: 6 },
  raw: { fontFamily: 'monospace', fontSize: 11, color: '#334155' },
});
