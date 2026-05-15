import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAppColors } from '../../hooks/useAppColors';

type StepKey = 'basics' | 'pricing' | 'inventory' | 'confirm';

const STEPS: StepKey[] = ['basics', 'pricing', 'inventory', 'confirm'];

export default function SellerAddProductScreen() {
  const c = useAppColors();
  const nav = useNavigation<any>();
  const [step, setStep] = useState<StepKey>('basics');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [listingCurrency, setListingCurrency] = useState('RWF');
  const [listingPriceAmount, setListingPriceAmount] = useState('');
  const [stock, setStock] = useState('0');
  const [status, setStatus] = useState<'in_stock' | 'out_of_stock'>('in_stock');

  const stepIndex = STEPS.indexOf(step);
  const canNext = useMemo(() => {
    if (step === 'basics') return Boolean(name.trim() && sku.trim());
    if (step === 'pricing') return Boolean(Number(listingPriceAmount) > 0);
    return true;
  }, [step, name, sku, listingPriceAmount]);

  async function publish() {
    if (!name.trim() || !sku.trim() || Number(listingPriceAmount) <= 0) {
      setMessage('Please fill name, SKU, and listing price.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/seller/inventory/products', {
        name: name.trim(),
        category: category.trim() || 'General',
        sku: sku.trim(),
        description: description.trim(),
        listingCurrency,
        listingPriceAmount: Math.round(Number(listingPriceAmount)),
        stock: Math.max(0, Math.round(Number(stock || 0))),
        status,
      });
      setMessage('Product published. You can undo by deleting/editing from Products.');
      setTimeout(() => nav.goBack(), 700);
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'Failed to publish product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={[styles.box, { backgroundColor: c.bgPage }]} contentContainerStyle={styles.content}>
      <Text style={[styles.h, { color: c.textPrimary }]}>Add product</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>Step {stepIndex + 1} of {STEPS.length}</Text>

      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              { backgroundColor: i <= stepIndex ? c.brandPrimary : c.borderCard, borderColor: c.borderCard },
            ]}
          />
        ))}
      </View>

      {step === 'basics' && (
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          <Input label="Product name" value={name} onChangeText={setName} c={c} />
          <Input label="SKU" value={sku} onChangeText={setSku} c={c} />
          <Input label="Category" value={category} onChangeText={setCategory} c={c} />
          <Input label="Description" value={description} onChangeText={setDescription} c={c} multiline />
        </View>
      )}

      {step === 'pricing' && (
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          <Input label="Listing currency (default RWF)" value={listingCurrency} onChangeText={setListingCurrency} c={c} />
          <Input
            label="Listing amount"
            value={listingPriceAmount}
            onChangeText={setListingPriceAmount}
            c={c}
            keyboardType="number-pad"
          />
        </View>
      )}

      {step === 'inventory' && (
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          <Input label="Initial stock" value={stock} onChangeText={setStock} c={c} keyboardType="number-pad" />
          <View style={styles.switchRow}>
            <Pressable
              onPress={() => setStatus('in_stock')}
              style={[
                styles.switchBtn,
                { borderColor: c.borderCard, backgroundColor: status === 'in_stock' ? c.brandTint : c.cardBg },
              ]}
            >
              <Text style={[styles.switchText, { color: c.textPrimary }]}>In stock</Text>
            </Pressable>
            <Pressable
              onPress={() => setStatus('out_of_stock')}
              style={[
                styles.switchBtn,
                { borderColor: c.borderCard, backgroundColor: status === 'out_of_stock' ? c.brandTint : c.cardBg },
              ]}
            >
              <Text style={[styles.switchText, { color: c.textPrimary }]}>Out of stock</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 'confirm' && (
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.borderCard }]}>
          <Text style={[styles.review, { color: c.textPrimary }]}>Name: {name || '-'}</Text>
          <Text style={[styles.review, { color: c.textPrimary }]}>SKU: {sku || '-'}</Text>
          <Text style={[styles.review, { color: c.textPrimary }]}>Price: {listingCurrency} {listingPriceAmount || '0'}</Text>
          <Text style={[styles.review, { color: c.textPrimary }]}>Stock: {stock || '0'}</Text>
          <Text style={[styles.review, { color: c.textPrimary }]}>Status: {status}</Text>
        </View>
      )}

      {message ? <Text style={[styles.msg, { color: c.textSecondary }]}>{message}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}
          disabled={stepIndex === 0 || saving}
          style={[styles.secondary, { borderColor: c.borderCard, opacity: stepIndex === 0 ? 0.5 : 1 }]}
        >
          <Text style={[styles.secondaryText, { color: c.textPrimary }]}>Back</Text>
        </Pressable>
        {step !== 'confirm' ? (
          <Pressable
            onPress={() => canNext && setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)])}
            style={[styles.primary, { backgroundColor: c.brandPrimary, opacity: canNext ? 1 : 0.5 }]}
          >
            <Text style={styles.primaryText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable onPress={publish} disabled={saving} style={[styles.primary, { backgroundColor: c.brandPrimary }]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Publish product</Text>}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function Input({
  label,
  value,
  onChangeText,
  c,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  c: ReturnType<typeof useAppColors>;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.inputLabel, { color: c.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          styles.input,
          { color: c.textPrimary, borderColor: c.borderCard, backgroundColor: c.searchBg, minHeight: multiline ? 86 : 44 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  h: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4, marginBottom: 10 },
  stepRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  stepDot: { flex: 1, height: 6, borderWidth: 1, borderRadius: 99 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  inputLabel: { fontSize: 12, marginBottom: 6, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  switchRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  switchBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: 14, fontWeight: '700' },
  review: { fontSize: 14, marginBottom: 8 },
  msg: { fontSize: 13, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primary: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondary: { width: 96, minHeight: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '700' },
});
