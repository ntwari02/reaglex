import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type R = RouteProp<BuyerStackParamList, 'OrderTracking'>;

export default function OrderTrackingScreen() {
  const { orderId } = useRoute<R>().params || {};
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await api.get(`/orders/${encodeURIComponent(orderId)}`);
        if (alive) setData(res.data?.order || res.data);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.c}>
        <ActivityIndicator />
      </View>
    );
  }
  if (err || !data) {
    return (
      <View style={styles.c}>
        <Text>{err || 'Enter order id from Account → orders.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h}>Order #{data.orderNumber || orderId}</Text>
      <Text style={styles.t}>Status: {data.status || data.paymentStatus || '—'}</Text>
      <Text style={styles.raw}>{JSON.stringify(data, null, 2)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  c: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  t: { color: '#64748b', marginBottom: 12 },
  raw: { fontFamily: 'monospace', fontSize: 11, color: '#334155' },
});
