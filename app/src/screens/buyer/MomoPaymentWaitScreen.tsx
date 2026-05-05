import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { paymentAPI } from '../../services/api';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const POLL_MS = 3500;
const MAX_MS = 3 * 60 * 1000;

function isTerminalMomoFailure(status: string | undefined) {
  const u = String(status || '').toUpperCase();
  return ['FAILED', 'REJECTED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(u);
}

function isTerminalAirtelFailure(status: string | undefined) {
  const u = String(status || '').toUpperCase();
  return ['FAILED', 'FAILURE', 'TF', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(u);
}

type R = RouteProp<BuyerStackParamList, 'MomoPaymentWait'>;
type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export default function MomoPaymentWaitScreen() {
  const { params } = useRoute<R>();
  const nav = useNavigation<Nav>();
  const referenceId = params.referenceId;
  const orderId = params.orderId;
  const provider = (params.provider || 'momo').toLowerCase();

  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
  const started = useRef(0);

  useEffect(() => {
    if (!referenceId || !orderId) {
      setStatus('error');
      setMessage('Missing payment reference.');
      return;
    }
    started.current = Date.now();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - started.current > MAX_MS) {
        setStatus('timeout');
        setMessage('Timed out waiting for confirmation.');
        return;
      }
      try {
        const res =
          provider === 'airtel'
            ? await paymentAPI.getAirtelStatus(referenceId)
            : await paymentAPI.getMomoStatus(referenceId);
        if (cancelled) return;
        if (res?.success) {
          nav.replace('OrderConfirmation', { orderId });
          return;
        }
        if (provider === 'airtel') {
          if (res?.failed === true || isTerminalAirtelFailure(res?.airtelStatus)) {
            setStatus('failed');
            setMessage('Airtel payment failed.');
            return;
          }
          setMessage(
            String(res?.airtelStatus || '').toUpperCase() === 'PENDING'
              ? 'Waiting on Airtel…'
              : `Status: ${res?.airtelStatus || '—'}`,
          );
        } else {
          if (res?.failed === true || isTerminalMomoFailure(res?.momoStatus)) {
            setStatus('failed');
            setMessage('MoMo payment failed.');
            return;
          }
          setMessage(
            res?.momoStatus === 'PENDING'
              ? 'Approve on your phone…'
              : `Status: ${res?.momoStatus || '—'}`,
          );
        }
      } catch (e: any) {
        if (!cancelled) setMessage(e?.response?.data?.message || e?.message || 'Poll error');
      }
      timer = setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [referenceId, orderId, nav, provider]);

  return (
    <View style={styles.box}>
      {status === 'pending' && <ActivityIndicator size="large" />}
      <Text style={styles.t}>{message || 'Processing…'}</Text>
      {status === 'failed' || status === 'timeout' || status === 'error' ? (
        <Pressable
          style={styles.btn}
          onPress={() => nav.navigate('BuyerTabs', { screen: 'Account' } as never)}
        >
          <Text style={styles.btnT}>Account</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  t: { textAlign: 'center', color: '#334155' },
  btn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0d9488', borderRadius: 10 },
  btnT: { color: '#fff', fontWeight: '700' },
});
