import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type R = RouteProp<BuyerStackParamList, 'OrderConfirmation'>;
type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export default function OrderConfirmationScreen() {
  const { orderId } = useRoute<R>().params;
  const nav = useNavigation<Nav>();
  return (
    <View style={styles.box}>
      <Text style={styles.h}>Thank you</Text>
      <Text style={styles.t}>Order {orderId} confirmed (same flow as web confirmation).</Text>
      <Pressable style={styles.btn} onPress={() => nav.navigate('OrderTracking', { orderId })}>
        <Text style={styles.btnT}>Track order</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 24, justifyContent: 'center' },
  h: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  t: { color: '#64748b' },
  btn: { marginTop: 20, backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnT: { color: '#fff', fontWeight: '800' },
});
