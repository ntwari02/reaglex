import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../lib/api';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function AuthScreen() {
  const nav = useNavigation<Nav>();
  const setUserAndToken = useAuthStore((s) => s.setUserAndToken);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async () => {
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const r = await useAuthStore.getState().login(email.trim(), password);
        if (r && 'success' in r && r.success) {
          (nav as any).getParent?.()?.goBack?.();
          return;
        }
        if (r && 'requires2FA' in r && (r as any).requires2FA) {
          setErr('2FA required — use web for full 2FA flow, or add screens for tempToken.');
          return;
        }
        if (r && 'error' in r) setErr((r as any).error || 'Login failed');
        return;
      }
      const data = await authAPI.register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'buyer',
      } as any);
      if (data?.token && data?.user) {
        const { id, email: em, fullName: fn, role, phone, avatarUrl, createdAt, updatedAt, emailVerified, sellerVerificationStatus, isSellerVerified } = data.user as any;
        await setUserAndToken(
          {
            id: String(id || (data.user as any)._id),
            email: em,
            full_name: fn,
            role,
            phone,
            avatar_url: avatarUrl,
            created_at: createdAt,
            updated_at: updatedAt,
            email_verified: emailVerified,
            seller_status: sellerVerificationStatus,
            seller_verified: isSellerVerified,
          } as any,
          data.token,
        );
        (nav as any).getParent?.()?.goBack?.();
      }
    } catch (e: any) {
      setErr(e?.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.box}>
        <Text style={styles.h}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
        {mode === 'signup' && (
          <TextInput
            style={styles.inp}
            placeholder="Full name"
            value={fullName}
            onChangeText={setFullName}
          />
        )}
        <TextInput
          style={styles.inp}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.inp}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <Pressable style={styles.btn} onPress={onSubmit} disabled={busy}>
          <Text style={styles.btnT}>{busy ? '…' : mode === 'login' ? 'Sign in' : 'Register'}</Text>
        </Pressable>
        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.link}>
            {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
          </Text>
        </Pressable>
        <Pressable onPress={() => nav.navigate('ForgotPassword')}>
          <Text style={styles.link}>Forgot password</Text>
        </Pressable>
        <Pressable onPress={() => (nav as any).getParent?.()?.goBack?.()}>
          <Text style={styles.link}>Close</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  box: { padding: 20, gap: 12, paddingTop: 48 },
  h: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  inp: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  err: { color: '#b91c1c' },
  btn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnT: { color: '#fff', fontWeight: '800' },
  link: { color: '#0d9488', marginTop: 8, textAlign: 'center' },
});
