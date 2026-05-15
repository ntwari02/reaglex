import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '../store/toastStore';

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const insets = useSafeAreaInsets();

  if (!toasts.length) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => removeToast(t.id)}
          style={[
            styles.toast,
            t.type === 'error' && styles.err,
            t.type === 'warning' && styles.warn,
            t.type === 'info' && styles.info,
          ]}
        >
          <Text style={styles.text}>{t.message}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#0d9488',
  },
  err: { backgroundColor: '#b91c1c' },
  warn: { backgroundColor: '#b45309' },
  info: { backgroundColor: '#1d4ed8' },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
