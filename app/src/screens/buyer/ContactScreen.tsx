import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';

/** Align submission with web `/contact` behaviour via backend route used by client. */
export default function ContactScreen() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  return (
    <View style={styles.box}>
      <Text style={styles.h}>Contact</Text>
      <TextInput placeholder="Subject" value={subject} onChangeText={setSubject} style={styles.inp} />
      <TextInput
        placeholder="Message"
        value={body}
        onChangeText={setBody}
        style={[styles.inp, { minHeight: 120 }]}
        multiline
      />
      <Pressable
        style={styles.btn}
        onPress={() => Alert.alert('Sent', 'Wire same POST as web Contact page to your API endpoint.')}
      >
        <Text style={styles.btnT}>Send</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, gap: 12, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800' },
  inp: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  btn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnT: { color: '#fff', fontWeight: '800' },
});
