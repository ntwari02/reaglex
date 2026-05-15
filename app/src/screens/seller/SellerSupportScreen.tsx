import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SellerSupportScreen() {
  return (
    <View style={styles.box}>
      <Text style={styles.h}>Support</Text>
      <Text style={styles.t}>Same seller support flows as web — wire `/seller/support` tickets.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  t: { color: '#64748b', lineHeight: 22 },
});
