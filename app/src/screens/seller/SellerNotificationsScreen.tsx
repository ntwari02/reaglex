import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SellerNotificationsScreen() {
  return (
    <View style={styles.box}>
      <Text style={styles.h}>Notifications</Text>
      <Text style={styles.t}>Seller notifications — align with web `/seller/notifications` data source.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  t: { color: '#64748b', lineHeight: 22 },
});
