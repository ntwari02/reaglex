import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import { useAppColors } from '../../hooks/useAppColors';

type P = { orderDetail: { orderId: string } };

export default function SellerOrderDetailScreen() {
  const c = useAppColors();
  const { orderId } = useRoute<RouteProp<P, 'orderDetail'>>().params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadOrder() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.get(`/seller/orders/${encodeURIComponent(orderId)}`);
      const order = res.data?.order || res.data;
      setData(order);
      setTrackingNumber(order?.trackingNumber || '');
      setCarrier(order?.carrier || '');
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get(`/seller/orders/${encodeURIComponent(orderId)}`);
        const order = res.data?.order || res.data;
        if (alive) {
          setData(order);
          setTrackingNumber(order?.trackingNumber || '');
          setCarrier(order?.carrier || '');
        }
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);

  async function updateStatus(status: 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled') {
    setUpdating(true);
    setFeedback(null);
    try {
      const res = await api.patch(`/seller/orders/${encodeURIComponent(orderId)}/status`, { status });
      setData(res.data?.order || data);
      setFeedback(`Order updated to ${status}.`);
    } catch (e: any) {
      setFeedback(e?.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  }

  async function saveTracking() {
    if (!trackingNumber.trim()) {
      setFeedback('Tracking number is required.');
      return;
    }
    setUpdating(true);
    setFeedback(null);
    try {
      const res = await api.patch(`/seller/orders/${encodeURIComponent(orderId)}/tracking`, {
        trackingNumber: trackingNumber.trim(),
        carrier: carrier.trim() || undefined,
      });
      setData(res.data?.order || data);
      setFeedback('Tracking saved and buyer can be notified.');
    } catch (e: any) {
      setFeedback(e?.response?.data?.message || 'Failed to update tracking.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;
  return (
    <ScrollView style={[styles.root, { backgroundColor: c.bgPage }]} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.h, { color: c.textPrimary }]}>Order #{data?.orderNumber || data?._id || orderId}</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>
        {data?.customer?.name || data?.customer || 'Buyer'} · {data?.items?.length || 0} items
      </Text>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>Current status</Text>
        <Text style={[styles.value, { color: c.textPrimary }]}>{data?.status || 'pending'}</Text>
        <View style={styles.rowWrap}>
          {(['processing', 'packed', 'shipped', 'delivered'] as const).map((s) => (
            <Pressable
              key={s}
              disabled={updating}
              onPress={() => updateStatus(s)}
              style={[
                styles.chip,
                { borderColor: c.borderCard, backgroundColor: c.searchBg },
                data?.status === s && { borderColor: c.brandPrimary, backgroundColor: c.brandTint },
              ]}
            >
              <Text style={[styles.chipText, { color: c.textSecondary }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>Tracking</Text>
        <TextInput
          value={trackingNumber}
          onChangeText={setTrackingNumber}
          placeholder="Tracking number"
          placeholderTextColor={c.textFaint}
          style={[styles.input, { backgroundColor: c.searchBg, borderColor: c.borderCard, color: c.textPrimary }]}
        />
        <TextInput
          value={carrier}
          onChangeText={setCarrier}
          placeholder="Carrier (optional)"
          placeholderTextColor={c.textFaint}
          style={[styles.input, { backgroundColor: c.searchBg, borderColor: c.borderCard, color: c.textPrimary }]}
        />
        <Pressable disabled={updating} onPress={saveTracking} style={[styles.btn, { backgroundColor: c.brandPrimary }]}>
          <Text style={styles.btnText}>{updating ? 'Saving...' : 'Save tracking'}</Text>
        </Pressable>
      </View>

      <Pressable onPress={loadOrder} style={[styles.refresh, { borderColor: c.borderCard }]}>
        <Text style={[styles.refreshText, { color: c.textPrimary }]}>Refresh order</Text>
      </Pressable>

      {feedback ? <Text style={[styles.feedback, { color: c.textSecondary }]}>{feedback}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  h: { fontSize: 23, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 16, fontWeight: '800', marginTop: 4, marginBottom: 8, textTransform: 'capitalize' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  chipText: { textTransform: 'capitalize', fontSize: 12, fontWeight: '700' },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginTop: 8 },
  btn: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  refresh: { minHeight: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  refreshText: { fontWeight: '700', fontSize: 14 },
  feedback: { marginTop: 10, fontSize: 13 },
});
