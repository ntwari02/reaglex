import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type R = RouteProp<BuyerStackParamList, 'Static'>;

export default function StaticScreen() {
  const { title, body } = useRoute<R>().params;
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h}>{title}</Text>
      <Text style={styles.t}>{body}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  t: { color: '#334155', lineHeight: 22 },
});
