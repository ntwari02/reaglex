import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ReportProblemScreen() {
  return (
    <View style={styles.box}>
      <Text style={styles.h}>Report a problem</Text>
      <Text style={styles.t}>Same ticket flows as web `/report-problem` — connect support ticket API.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  t: { color: '#64748b', lineHeight: 22 },
});
