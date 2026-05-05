import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useAppColors } from '../../hooks/useAppColors';

const ITEMS: Array<{ key: string; label: string; to: string }> = [
  { key: 'payments', label: 'Payments & escrow', to: 'payments' },
  { key: 'analytics', label: 'Analytics', to: 'analytics' },
  { key: 'shipping', label: 'Shipping settings', to: 'shipping' },
  { key: 'collections', label: 'Collections', to: 'collections' },
  { key: 'disputes', label: 'Disputes', to: 'disputes' },
  { key: 'subscription', label: 'Subscription', to: 'subscription' },
  { key: 'notifications', label: 'Notifications', to: 'notifications' },
  { key: 'support', label: 'Support', to: 'support' },
  { key: 'settings', label: 'Profile & settings', to: 'settings' },
];

export default function SellerMoreScreen() {
  const c = useAppColors();
  const nav = useNavigation<any>();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <ScrollView style={[styles.box, { backgroundColor: c.bgPage }]} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.h, { color: c.textPrimary }]}>More</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>Payments, settings, support, and advanced tools.</Text>
      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.row, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}
            onPress={() => nav.navigate(item.to)}
          >
            <Text style={[styles.rowText, { color: c.textPrimary }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={[styles.signout, { borderColor: c.error }]} onPress={() => signOut()}>
        <Text style={[styles.signoutText, { color: c.error }]}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1 },
  h: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  list: { gap: 8 },
  row: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rowText: { fontSize: 15, fontWeight: '700' },
  signout: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signoutText: { fontSize: 15, fontWeight: '800' },
});
