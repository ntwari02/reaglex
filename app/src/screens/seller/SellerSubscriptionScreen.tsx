import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { publicPaymentGatewayAPI, sellerSubscriptionAPI } from '../../services/api';
import { useAppColors } from '../../hooks/useAppColors';

export default function SellerSubscriptionScreen() {
  const c = useAppColors();
  const [plans, setPlans] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [enabledGateways, setEnabledGateways] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const [plansRes, currentRes, gwRes] = await Promise.all([
        sellerSubscriptionAPI.getPlans(),
        sellerSubscriptionAPI.getCurrent().catch(() => ({ subscription: null })),
        publicPaymentGatewayAPI.getEnabled().catch(() => ({ gateways: [] })),
      ]);
      setPlans(Array.isArray(plansRes?.plans) ? plansRes.plans : []);
      setCurrent(currentRes?.subscription || null);
      const enabled = Array.isArray(gwRes?.gateways)
        ? gwRes.gateways.filter((g: any) => g?.isEnabled).map((g: any) => String(g.key))
        : [];
      setEnabledGateways(enabled);
    } catch (e: any) {
      setMessage(e?.response?.data?.message || e?.message || 'Failed to load subscription.');
      setPlans([]);
      setCurrent(null);
      setEnabledGateways([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function upgrade(tierId: string) {
    setUpgrading(tierId);
    setMessage(null);
    try {
      const res = await sellerSubscriptionAPI.upgrade(tierId);
      setMessage(res?.message || 'Subscription updated successfully.');
      await load();
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'Upgrade failed. Ensure an admin-enabled payment method is configured.');
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;
  return (
    <ScrollView style={[styles.box, { backgroundColor: c.bgPage }]} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.h, { color: c.textPrimary }]}>Subscription & Billing</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>Upgrades use only payment methods enabled by admin.</Text>

      <View style={[styles.currentCard, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>Current plan</Text>
        <Text style={[styles.value, { color: c.textPrimary }]}>{current?.name || 'Starter'}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          Renewal: {current?.nextBillingDate || current?.renewalDate || 'N/A'}
        </Text>
      </View>

      <View style={[styles.gatewayCard, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>Enabled payment gateways</Text>
        <Text style={[styles.valueSmall, { color: c.textPrimary }]}>
          {enabledGateways.length ? enabledGateways.join(', ') : 'No gateway enabled by admin'}
        </Text>
      </View>

      {plans.map((plan) => {
        const isCurrent = String(current?.tierId || '').toLowerCase() === String(plan?.id || '').toLowerCase();
        return (
          <View key={String(plan?.id || plan?.name)} style={[styles.plan, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planName, { color: c.textPrimary }]}>{plan?.name || 'Plan'}</Text>
              <Text style={[styles.meta, { color: c.textMuted }]}>
                {plan?.price != null ? `${plan.currency || 'USD'} ${plan.price}` : 'Contact admin'}
              </Text>
            </View>
            <Pressable
              disabled={isCurrent || upgrading === plan?.id}
              onPress={() => upgrade(String(plan?.id))}
              style={[styles.planBtn, { backgroundColor: isCurrent ? c.textFaint : c.brandPrimary }]}
            >
              <Text style={styles.planBtnText}>{isCurrent ? 'Current' : upgrading === plan?.id ? 'Updating...' : 'Choose'}</Text>
            </Pressable>
          </View>
        );
      })}

      {message ? <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1 },
  h: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4, marginBottom: 10 },
  currentCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  gatewayCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  valueSmall: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  meta: { fontSize: 12, marginTop: 2 },
  plan: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 72,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planName: { fontSize: 16, fontWeight: '800' },
  planBtn: { minHeight: 40, borderRadius: 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  planBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  message: { marginTop: 8, fontSize: 12 },
});
