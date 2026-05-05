import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from '../../lib/config';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

export default function ResetPasswordScreen() {
  const token = useRoute<RouteProp<AuthStackParamList, 'ResetPassword'>>().params?.token;
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!token) {
      Alert.alert('Missing token');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pw }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || 'Failed');
      Alert.alert('Done', 'Password updated');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.h}>New password</Text>
      <TextInput style={styles.inp} secureTextEntry placeholder="New password" value={pw} onChangeText={setPw} />
      <Pressable style={styles.btn} onPress={submit} disabled={busy}>
        <Text style={styles.btnT}>{busy ? '…' : 'Save'}</Text>
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
