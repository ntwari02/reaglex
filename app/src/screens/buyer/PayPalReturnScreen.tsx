import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { paymentAPI } from '../../services/api';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type R = RouteProp<BuyerStackParamList, 'PayPalReturn'>;
type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export default function PayPalReturnScreen() {
  const nav = useNavigation<Nav>();
  const token = useRoute<R>().params?.token;
  const [msg, setMsg] = useState('Completing PayPal payment…');

  useEffect(() => {
    if (!token) {
      setMsg('Missing PayPal token.');
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await paymentAPI.paypalComplete(token);
        const oid = res?.orderId || res?.order?.id || res?.order?._id;
        if (alive && oid) nav.replace('OrderConfirmation', { orderId: String(oid) });
        else if (alive) setMsg('Payment processed.');
      } catch (e: any) {
        if (alive) setMsg(e?.message || 'PayPal completion failed');
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, nav]);

  return (
    <View style={styles.box}>
      <ActivityIndicator />
      <Text style={styles.t}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  t: { color: '#64748b', paddingHorizontal: 24, textAlign: 'center' },
});
