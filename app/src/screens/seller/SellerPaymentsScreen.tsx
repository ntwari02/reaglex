import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { paymentAPI } from '../../services/api';
import { useAppColors } from '../../hooks/useAppColors';

function fmt(amount: number, currency = 'USD') {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export default function SellerPaymentsScreen() {
  const c = useAppColors();
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [wallet, setWallet] = useState<{ held: number; withdrawable: number; withdrawn: number; currency: string } | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await paymentAPI.sellerWallet();
      setWallet(res?.wallet || { held: 0, withdrawable: 0, withdrawn: 0, currency: 'USD' });
      setRows(Array.isArray(res?.recentTransactions) ? res.recentTransactions : []);
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'Failed to load seller wallet.');
      setWallet({ held: 0, withdrawable: 0, withdrawn: 0, currency: 'USD' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canWithdraw = useMemo(() => {
    const n = Math.round(Number(amount || 0));
    return n > 0 && n <= Number(wallet?.withdrawable || 0) && password.trim().length >= 4;
  }, [amount, wallet?.withdrawable, password]);

  async function withdraw() {
    const n = Math.round(Number(amount || 0));
    if (!canWithdraw || n <= 0) {
      setMessage('Enter a valid amount less than or equal to withdrawable balance.');
      return;
    }
    setWithdrawing(true);
    setMessage(null);
    try {
      const out = await paymentAPI.sellerWithdraw(n, password);
      setMessage(out?.message || 'Withdrawal completed');
      setAmount('');
      setPassword('');
      await load();
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'Withdrawal failed.');
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <View style={[styles.box, { backgroundColor: c.bgPage }]}>
      <Text style={[styles.h, { color: c.textPrimary }]}>Payments & Escrow</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>
        Ordered but undelivered = Held. Delivered and released = Withdrawable.
      </Text>

      <View style={styles.cards}>
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          <Text style={[styles.cardLabel, { color: c.textMuted }]}>Held in escrow</Text>
          <Text style={[styles.cardValue, { color: c.textPrimary }]}>{fmt(wallet?.held || 0, wallet?.currency)}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          <Text style={[styles.cardLabel, { color: c.textMuted }]}>Withdrawable</Text>
          <Text style={[styles.cardValue, { color: c.success }]}>{fmt(wallet?.withdrawable || 0, wallet?.currency)}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          <Text style={[styles.cardLabel, { color: c.textMuted }]}>Already withdrawn</Text>
          <Text style={[styles.cardValue, { color: c.textPrimary }]}>{fmt(wallet?.withdrawn || 0, wallet?.currency)}</Text>
        </View>
      </View>

      <View style={[styles.withdrawBox, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Withdraw funds</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="Amount"
          placeholderTextColor={c.textFaint}
          style={[styles.input, { borderColor: c.borderCard, backgroundColor: c.searchBg, color: c.textPrimary }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Confirm password"
          placeholderTextColor={c.textFaint}
          style={[styles.input, { borderColor: c.borderCard, backgroundColor: c.searchBg, color: c.textPrimary }]}
        />
        <Pressable
          disabled={!canWithdraw || withdrawing}
          onPress={withdraw}
          style={[styles.btn, { backgroundColor: c.brandPrimary, opacity: canWithdraw && !withdrawing ? 1 : 0.5 }]}
        >
          <Text style={styles.btnText}>{withdrawing ? 'Processing...' : 'Withdraw now'}</Text>
        </Pressable>
        {message ? <Text style={[styles.msg, { color: c.textSecondary }]}>{message}</Text> : null}
      </View>

      <Text style={[styles.sectionTitle, { color: c.textPrimary, marginTop: 10 }]}>Recent activity</Text>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x.id)}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.textMuted }]}>No payment activity yet.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
            <View>
              <Text style={[styles.rowType, { color: c.textPrimary }]}>{item.type}</Text>
              <Text style={[styles.rowMeta, { color: c.textMuted }]}>{item.status || 'ok'}</Text>
            </View>
            <Text style={[styles.rowAmt, { color: c.textPrimary }]}>{fmt(item.amount, item.currency || wallet?.currency || 'USD')}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16 },
  h: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 3, marginBottom: 10 },
  cards: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  cardLabel: { fontSize: 12, fontWeight: '700' },
  cardValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  withdrawBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  btn: { minHeight: 46, borderRadius: 10, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  msg: { marginTop: 8, fontSize: 12 },
  row: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowType: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowAmt: { fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 20 },
});
