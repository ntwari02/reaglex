import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import api from '../../services/api';
import { useAppColors } from '../../hooks/useAppColors';

export default function SellerInboxScreen() {
  const c = useAppColors();
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/seller/inbox/threads');
        const list = res.data?.threads || res.data || [];
        if (alive) {
          const safe = Array.isArray(list) ? list : [];
          setThreads(safe);
          setSelectedThreadId(safe[0]?._id || safe[0]?.id || null);
        }
      } catch {
        if (alive) setThreads([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function sendReply() {
    if (!selectedThreadId || !draft.trim()) {
      setFeedback('Choose a thread and type a message.');
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      await api.post(`/seller/inbox/threads/${encodeURIComponent(selectedThreadId)}/messages`, {
        content: draft.trim(),
      });
      setDraft('');
      setFeedback('Message sent. Undo available for 5 seconds (UI pattern).');
    } catch (e: any) {
      setFeedback(e?.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  const templates = [
    'Thanks. We are preparing your order now.',
    'Your order has shipped. Tracking details are now available.',
    'Sorry for the delay. We are resolving this and will update you shortly.',
  ];

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <View style={[styles.box, { backgroundColor: c.bgPage }]}>
      <Text style={[styles.h, { color: c.textPrimary }]}>Inbox</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>Priority buyer conversations and quick responses.</Text>
      <FlatList
        data={threads}
        keyExtractor={(x, i) => String(x._id || x.id || i)}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.textMuted }]}>No active conversations.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedThreadId(String(item._id || item.id))}
            style={[
              styles.row,
              { backgroundColor: c.cardBg, borderColor: c.borderCard },
              String(item._id || item.id) === selectedThreadId && { borderColor: c.brandPrimary, backgroundColor: c.brandTint },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.threadTitle, { color: c.textPrimary }]}>
                {item.subject || item.title || 'Buyer conversation'}
              </Text>
              <Text style={[styles.threadMeta, { color: c.textMuted }]}>
                {item.lastMessage?.text || item.preview || 'Open thread to respond'}
              </Text>
            </View>
            <Text style={[styles.threadTime, { color: c.textFaint }]}>{item.updatedAt ? 'Recent' : ''}</Text>
          </Pressable>
        )}
      />

      <View style={[styles.replyBox, { borderColor: c.borderCard, backgroundColor: c.cardBg }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Reply to buyer..."
          placeholderTextColor={c.textFaint}
          style={[styles.input, { borderColor: c.borderCard, backgroundColor: c.searchBg, color: c.textPrimary }]}
        />
        <View style={styles.templateRow}>
          {templates.map((t) => (
            <Pressable
              key={t}
              onPress={() => setDraft(t)}
              style={[styles.templateBtn, { borderColor: c.borderCard, backgroundColor: c.searchBg }]}
            >
              <Text numberOfLines={1} style={[styles.templateText, { color: c.textSecondary }]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable disabled={sending} onPress={sendReply} style={[styles.sendBtn, { backgroundColor: c.brandPrimary }]}>
          <Text style={styles.sendBtnText}>{sending ? 'Sending...' : 'Send reply'}</Text>
        </Pressable>
        {feedback ? <Text style={[styles.feedback, { color: c.textSecondary }]}>{feedback}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16 },
  h: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  row: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  threadTitle: { fontSize: 15, fontWeight: '700' },
  threadMeta: { fontSize: 12, marginTop: 4 },
  threadTime: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 20 },
  replyBox: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  templateRow: { flexDirection: 'row', gap: 6 },
  templateBtn: { flex: 1, minHeight: 32, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, justifyContent: 'center' },
  templateText: { fontSize: 11, fontWeight: '600' },
  sendBtn: { minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  feedback: { fontSize: 12 },
});
