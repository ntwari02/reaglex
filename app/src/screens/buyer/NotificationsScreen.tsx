import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** Matches web buyer notifications entry — extend with `/notifications` API when wired on backend. */
export default function NotificationsScreen() {
  return (
    <View style={styles.box}>
      <Text style={styles.h}>Notifications</Text>
      <Text style={styles.t}>System inbox + Socket.IO bridge runs globally from App (same as web).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  t: { color: '#64748b', lineHeight: 22 },
});
