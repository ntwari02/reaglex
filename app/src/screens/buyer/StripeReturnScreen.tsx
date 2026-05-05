import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { paymentAPI } from '../../services/api';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type R = RouteProp<BuyerStackParamList, 'StripeReturn'>;
type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export default function StripeReturnScreen() {
  const nav = useNavigation<Nav>();
  const sessionId = useRoute<R>().params?.session_id;
  const [msg, setMsg] = useState('Completing Stripe payment…');

  useEffect(() => {
    if (!sessionId) {
      setMsg('Missing session.');
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await paymentAPI.stripeComplete(sessionId);
        const oid = res?.orderId || res?.order?.id || res?.order?._id;
        if (alive && oid) nav.replace('OrderConfirmation', { orderId: String(oid) });
        else if (alive) setMsg('Payment processed.');
      } catch (e: any) {
        if (alive) setMsg(e?.message || 'Stripe completion failed');
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId, nav]);

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
