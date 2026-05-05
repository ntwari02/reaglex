import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminSellerSubscriptionsScreen() {
  return (
    <View style={styles.box}>
      <Text style={styles.h}>Seller subscriptions</Text>
      <Text style={styles.t}>Use same endpoints as web `SellerSubscriptionsAdmin`.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  t: { color: '#64748b', lineHeight: 22 },
});
