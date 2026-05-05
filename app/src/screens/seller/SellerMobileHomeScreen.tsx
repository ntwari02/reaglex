import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAppColors } from '../../hooks/useAppColors';

type DashboardStats = {
  stats?: {
    totalSales?: { value?: string };
    activeOrders?: { value?: string };
    lowStockItems?: { value?: string };
    pendingRFQs?: { value?: string };
  };
  actionRequired?: Array<{ title?: string; meta?: string; due?: string; priority?: string }>;
};

export default function SellerMobileHomeScreen() {
  const c = useAppColors();
  const nav = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/seller/dashboard/stats', { params: { timeRange: 'today' } });
        if (alive) setData(res.data || null);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const quickCards = useMemo(
    () => [
      { label: 'Sales today', value: data?.stats?.totalSales?.value || '$0.00' },
      { label: 'Active orders', value: data?.stats?.activeOrders?.value || '0' },
      { label: 'Low stock', value: data?.stats?.lowStockItems?.value || '0' },
      { label: 'Open issues', value: data?.stats?.pendingRFQs?.value || '0' },
    ],
    [data],
  );

  return (
    <ScrollView style={[styles.root, { backgroundColor: c.bgPage }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: c.textPrimary }]}>Seller Home</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>Your next best actions, in one thumb reach.</Text>

      <View style={styles.grid}>
        {quickCards.map((card) => (
          <View key={card.label} style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
            <Text style={[styles.cardValue, { color: c.textPrimary }]}>{card.value}</Text>
            <Text style={[styles.cardLabel, { color: c.textMuted }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Urgent queue</Text>
        {loading ? (
          <ActivityIndicator color={c.brandPrimary} style={{ marginVertical: 10 }} />
        ) : data?.actionRequired?.length ? (
          data.actionRequired.slice(0, 3).map((item, idx) => (
            <View key={`${item.title || 'action'}-${idx}`} style={[styles.actionRow, { borderColor: c.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: c.textPrimary }]}>{item.title || 'Action needed'}</Text>
                <Text style={[styles.actionMeta, { color: c.textMuted }]}>{item.meta || 'Review now'}</Text>
              </View>
              <Text style={[styles.actionDue, { color: c.error }]}>{item.due || 'Today'}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.empty, { color: c.textMuted }]}>No urgent actions right now.</Text>
        )}
      </View>

      <View style={styles.quickActions}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: c.brandPrimary }]}
          onPress={() => nav.navigate('Orders')}
        >
          <Text style={styles.primaryBtnText}>Process orders</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, { borderColor: c.borderCard, backgroundColor: c.cardBg }]}
          onPress={() => nav.navigate('addProduct')}
        >
          <Text style={[styles.secondaryBtnText, { color: c.textPrimary }]}>Add product</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: -4, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 86,
    justifyContent: 'space-between',
  },
  cardValue: { fontSize: 20, fontWeight: '800' },
  cardLabel: { fontSize: 12, marginTop: 8 },
  section: { borderWidth: 1, borderRadius: 14, padding: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingVertical: 10, gap: 8 },
  actionTitle: { fontSize: 14, fontWeight: '700' },
  actionMeta: { fontSize: 12, marginTop: 2 },
  actionDue: { fontSize: 12, fontWeight: '700' },
  empty: { fontSize: 13, paddingVertical: 8 },
  quickActions: { gap: 10, marginTop: 2 },
  primaryBtn: { minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontWeight: '700', fontSize: 15 },
});
