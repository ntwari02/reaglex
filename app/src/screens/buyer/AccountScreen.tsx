import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import type { BuyerTabParamList } from '../../navigation/BuyerTabs';
import BuyerScreenLayout from '../../components/BuyerScreenLayout';
import { useAppColors } from '../../hooks/useAppColors';
import { fontSerif } from '../../theme/tokens';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'Account'>,
  NativeStackNavigationProp<BuyerStackParamList>
>;

export default function AccountScreen() {
  const nav = useNavigation<Nav>();
  const c = useAppColors();
  const { user, signOut } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/orders', { params: { limit: 50 } });
      const list = res.data?.orders || res.data || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) {
    return (
      <BuyerScreenLayout subtitle="Account">
        <View style={styles.center}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: c.brandTint }]}>
            <Ionicons name="person-outline" size={40} color={c.brandPrimary} />
          </View>
          <Text style={[styles.h, { color: c.textPrimary }, { fontFamily: fontSerif }]}>Account</Text>
          <Text style={[styles.muted, { color: c.textMuted }]}>
            Sign in to view orders, track deliveries, and manage your profile.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: c.brandPrimary, opacity: pressed ? 0.92 : 1 },
            ]}
            onPress={() => {
              (nav as any).getParent()?.getParent()?.navigate('AuthModal');
            }}
          >
            <Text style={styles.btnT}>Sign in</Text>
          </Pressable>
        </View>
      </BuyerScreenLayout>
    );
  }

  return (
    <BuyerScreenLayout subtitle="Account">
      <ScrollView
        style={[styles.root, { backgroundColor: c.bgPage }]}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          <View style={[styles.avatarSm, { backgroundColor: c.brandTint }]}>
            <Text style={[styles.avatarLetter, { color: c.brandPrimary }]}>
              {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greet, { color: c.textPrimary }, { fontFamily: fontSerif }]}>
              Hello, {user.full_name || 'there'}
            </Text>
            <Text style={[styles.email, { color: c.textMuted }]}>{user.email}</Text>
          </View>
        </View>

        <Text style={[styles.sh, { color: c.textPrimary }]}>Shortcuts</Text>
        <View style={[styles.section, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          {[
            { label: 'Notifications', icon: 'notifications-outline' as const, onPress: () => nav.navigate('Notifications') },
            { label: 'Returns', icon: 'return-down-back-outline' as const, onPress: () => nav.navigate('Returns') },
            { label: 'Contact', icon: 'mail-outline' as const, onPress: () => nav.navigate('Contact') },
            {
              label: 'Report a problem',
              icon: 'alert-circle-outline' as const,
              onPress: () => nav.navigate('ReportProblem', {}),
            },
            {
              label: 'Privacy',
              icon: 'document-text-outline' as const,
              onPress: () =>
                nav.navigate('Static', {
                  title: 'Privacy',
                  body: 'Privacy policy content matches the web app at /privacy.',
                }),
            },
          ].map((row, i, arr) => (
            <Pressable
              key={row.label}
              style={[
                styles.link,
                i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
              ]}
              onPress={row.onPress}
            >
              <Ionicons name={row.icon} size={22} color={c.brandPrimary} style={styles.linkIcon} />
              <Text style={[styles.linkT, { color: c.link }]}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sh, { color: c.textPrimary }]}>Recent orders</Text>
        {loading ? (
          <ActivityIndicator color={c.brandPrimary} style={{ marginTop: 8 }} />
        ) : orders.slice(0, 10).length === 0 ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>No orders yet.</Text>
        ) : (
          orders.slice(0, 10).map((item, idx, arr) => (
            <Pressable
              key={String(item._id || item.id)}
              style={[
                styles.orderRow,
                { borderBottomColor: c.divider },
                idx === arr.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() =>
                nav.navigate('OrderTracking', { orderId: String(item._id || item.id) })
              }
            >
              <Text style={[styles.orderId, { color: c.textPrimary }]}>
                #{item.orderNumber || item._id}
              </Text>
              <View style={styles.orderRight}>
                <Text style={[styles.orderSt, { color: c.textMuted }]}>
                  {item.status || item.paymentStatus || '—'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
              </View>
            </Pressable>
          ))
        )}

        <Pressable
          style={({ pressed }) => [styles.out, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => signOut()}
        >
          <Text style={[styles.outT, { color: c.error }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </BuyerScreenLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  h: { fontSize: 26, fontWeight: '700' },
  muted: { textAlign: 'center', marginTop: 10, lineHeight: 22, maxWidth: 300 },
  btn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  avatarSm: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '800' },
  greet: { fontSize: 20, fontWeight: '700' },
  email: { marginTop: 4, fontSize: 14 },
  sh: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 20 },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  linkIcon: { marginRight: 12 },
  linkT: { flex: 1, fontSize: 16, fontWeight: '600' },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderId: { fontWeight: '700' },
  orderSt: { fontSize: 13 },
  out: { marginTop: 28, padding: 14, alignItems: 'center' },
  outT: { fontWeight: '800', fontSize: 15 },
});
