import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { authAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import type { VerifyStackParamList } from '../../navigation/VerifyEmailNavigator';

type RAuth = RouteProp<AuthStackParamList, 'VerifyOTP'>;
type RVer = RouteProp<VerifyStackParamList, 'VerifyOTP'>;

export default function VerifyOTPScreen() {
  const route = useRoute<RAuth | RVer>();
  const emailFromRoute = (route.params as any)?.email || '';
  const initialize = useAuthStore((s) => s.initialize);

  const [email, setEmail] = useState(emailFromRoute);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (emailFromRoute) setEmail(emailFromRoute);
  }, [emailFromRoute]);

  const verify = async () => {
    setBusy(true);
    try {
      const res: any = await authAPI.verifyEmailWithOtp(email.trim(), code.trim());
      if (res?.token && res?.user) {
        const u = res.user;
        await useAuthStore.getState().setUserAndToken(
          {
            id: String(u._id || u.id || ''),
            email: u.email,
            email_verified: u.emailVerified ?? true,
            full_name: u.fullName,
            role: u.role,
            seller_status: u.sellerVerificationStatus,
            seller_verified: u.isSellerVerified,
            phone: u.phone,
            avatar_url: u.avatarUrl,
            created_at: u.createdAt || new Date().toISOString(),
            updated_at: u.updatedAt || new Date().toISOString(),
          },
          res.token,
        );
      } else {
        await initialize();
      }
      Alert.alert('Verified', 'Email confirmed.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    try {
      await authAPI.requestVerificationOtp(email.trim());
      Alert.alert('Sent', 'Check your email.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.box}>
      <Text style={styles.h}>Verify email</Text>
      <TextInput
        style={styles.inp}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.inp} placeholder="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" />
      <Pressable style={styles.btn} onPress={verify} disabled={busy}>
        <Text style={styles.btnT}>Verify</Text>
      </Pressable>
      <Pressable onPress={send} disabled={busy}>
        <Text style={styles.link}>Resend code</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, gap: 12 },
  h: { fontSize: 22, fontWeight: '800' },
  inp: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12 },
  btn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnT: { color: '#fff', fontWeight: '800' },
  link: { color: '#0d9488', textAlign: 'center', marginTop: 8 },
});
