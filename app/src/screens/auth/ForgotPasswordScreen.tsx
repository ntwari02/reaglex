import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { API_BASE_URL } from '../../lib/config';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || 'Failed');
      Alert.alert('Check email', j.message || 'Reset link sent');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.h}>Forgot password</Text>
      <TextInput
        style={styles.inp}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable style={styles.btn} onPress={submit} disabled={busy}>
        <Text style={styles.btnT}>{busy ? '…' : 'Send reset link'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, gap: 12 },
  h: { fontSize: 22, fontWeight: '800' },
  inp: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12 },
  btn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnT: { color: '#fff', fontWeight: '800' },
});
