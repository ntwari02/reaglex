import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { orderAPI, paymentAPI, productAPI, shippingAPI } from '../../services/api';
import { API_BASE_URL } from '../../lib/config';
import { useAuthStore } from '../../store/authStore';
import { useBuyerCart } from '../../store/buyerCartStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

const UNPAID_KEY = 'spacilly_unpaid_order_ids';

export default function CheckoutScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const items = useBuyerCart((s) => s.items);
  const clearCart = useBuyerCart((s) => s.clearCart);
  const shippingPreviewLocation = useBuyerCart((s) => s.shippingPreviewLocation);
  const currencyPricing = useCurrencyPricing();

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });
  const [shippingMethodsByGroup, setShippingMethodsByGroup] = useState<Record<string, string>>({});
  const [shippingQuote, setShippingQuote] = useState<any>(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingQuoteErr, setShippingQuoteErr] = useState<string | null>(null);
  const [checkoutProvider, setCheckoutProvider] = useState('flutterwave');
  const [momoPhone, setMomoPhone] = useState('');
  const [airtelPhone, setAirtelPhone] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [gateways, setGateways] = useState({
    flutterwave: false,
    mtn_momo: false,
    stripe: false,
    paypal: false,
    airtel_money: false,
  });
  const [gatewayOrderCurrency, setGatewayOrderCurrency] = useState({ mtn_momo: 'RWF' });
  const [gwLoaded, setGwLoaded] = useState(false);

  const loadGateways = useCallback(() => {
    fetch(`${API_BASE_URL}/public/payment-gateways?t=${Date.now()}`, { cache: 'no-store' } as any)
      .then((r) => r.json())
      .then((d) => {
        const list = d?.gateways || [];
        const next = {
          flutterwave: false,
          mtn_momo: false,
          stripe: false,
          paypal: false,
          airtel_money: false,
        };
        list.forEach((x: any) => {
          if (x?.key && x.isEnabled === true) next[x.key as keyof typeof next] = true;
        });
        setGateways(next);
        const momoOrderCurrencyRaw = list.find((x: any) => x?.key === 'mtn_momo')?.orderCurrency;
        const momoOrderCurrency = String(momoOrderCurrencyRaw || '').trim().toUpperCase();
        setGatewayOrderCurrency({
          mtn_momo: ['RWF', 'USD', 'EUR'].includes(momoOrderCurrency) ? momoOrderCurrency : 'RWF',
        });
      })
      .catch(() => {
        setGateways({
          flutterwave: true,
          mtn_momo: false,
          stripe: false,
          paypal: false,
          airtel_money: false,
        });
        setGatewayOrderCurrency({ mtn_momo: 'RWF' });
      })
      .finally(() => setGwLoaded(true));
  }, []);

  useEffect(() => {
    loadGateways();
  }, [loadGateways]);

  useEffect(() => {
    if (user) {
      setAddress((a) => ({
        ...a,
        email: user.email || a.email,
        fullName: user.full_name?.trim() || a.fullName,
        phone: user.phone || a.phone,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!shippingPreviewLocation?.country && !shippingPreviewLocation?.city) return;
    setAddress((a) => ({
      ...a,
      country: a.country?.trim() ? a.country : shippingPreviewLocation.country,
      city: a.city?.trim() ? a.city : shippingPreviewLocation.city,
      state: a.state?.trim() ? a.state : shippingPreviewLocation.state || '',
      zip: a.zip?.trim() ? a.zip : shippingPreviewLocation.zip || '',
    }));
  }, [shippingPreviewLocation]);

  useEffect(() => {
    if (!gwLoaded) return;
    const enabled = (k: string) => {
      if (k === 'momo') return gateways.mtn_momo;
      if (k === 'airtel') return gateways.airtel_money;
      return (gateways as any)[k];
    };
    if (!enabled(checkoutProvider)) {
      const first = ['flutterwave', 'stripe', 'paypal', 'momo', 'airtel'].find(enabled);
      if (first) setCheckoutProvider(first);
    }
  }, [gwLoaded, gateways, checkoutProvider]);

  const quoteFingerprint = useMemo(() => {
    const hasFull =
      !!address.street?.trim() && !!address.city?.trim() && !!address.country?.trim();
    return [
      hasFull ? 'full' : 'est',
      address.street?.toLowerCase().trim(),
      address.city?.toLowerCase().trim(),
      address.zip?.toLowerCase().trim(),
      address.country?.toUpperCase().trim(),
      items.map((i) => `${i.id}:${i.quantity}`).join(','),
      JSON.stringify(shippingMethodsByGroup),
    ].join('~');
  }, [address.street, address.city, address.zip, address.country, items, shippingMethodsByGroup]);

  useEffect(() => {
    if (!items.length) {
      setShippingQuote(null);
      return undefined;
    }
    const hasFull =
      !!(address.street?.trim() && address.city?.trim() && address.country?.trim());
    const hasPartial = !!(address.city?.trim() && address.country?.trim());
    if (!hasFull && !hasPartial) {
      setShippingQuote(null);
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      setShippingQuoteLoading(true);
      setShippingQuoteErr(null);
      try {
        const lines = items.map((i: { id: string; quantity: number }) => ({
          productId: i.id,
          quantity: i.quantity,
        }));
        const fullName =
          (address.fullName || user?.full_name || 'Customer').trim() || 'Customer';
        let data;
        if (user?.id) {
          data = await shippingAPI.quote({
            lines,
            estimate: !hasFull,
            shippingAddress: hasFull
              ? {
                  full_name: fullName,
                  phone: address.phone || user?.phone || '000',
                  address_line1: address.street,
                  address_line2: '',
                  city: address.city,
                  state: address.state,
                  postal_code: address.zip,
                  country: address.country,
                }
              : {
                  full_name: fullName,
                  phone: address.phone || user?.phone || '000',
                  address_line1: `${address.city} (estimate)`,
                  address_line2: '',
                  city: address.city,
                  state: address.state || '—',
                  postal_code: address.zip || '00000',
                  country: address.country,
                },
            selectedMethods: shippingMethodsByGroup,
          });
        } else {
          data = await shippingAPI.estimate({
            lines,
            destination: {
              country: address.country,
              city: address.city,
              state: address.state || '',
              postal_code: address.zip || '',
            },
            selectedMethods: shippingMethodsByGroup,
          });
        }
        if (cancelled) return;
        setShippingQuote(data);
        setShippingMethodsByGroup((prev) => {
          const next = { ...prev };
          for (const g of data.groups || []) {
            if (next[g.groupKey] == null) next[g.groupKey] = 'standard';
          }
          return next;
        });
      } catch (e: any) {
        if (!cancelled) {
          setShippingQuote(null);
          setShippingQuoteErr(e?.response?.data?.message || e?.message || 'Shipping quote failed');
        }
      } finally {
        if (!cancelled) setShippingQuoteLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [quoteFingerprint, items.length, user?.id]);

  const shippingCost = Number(shippingQuote?.totalShipping) || 0;
  const subtotal = items.reduce(
    (s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity,
    0,
  );
  const tax = subtotal * 0.1;
  const total = subtotal + shippingCost + tax;

  const gwOk = (k: string) => {
    if (k === 'momo') return gateways.mtn_momo;
    if (k === 'airtel') return gateways.airtel_money;
    return (gateways as any)[k];
  };

  const placeOrder = async () => {
    if (!agreedTerms) return Alert.alert('Terms', 'Please agree to the terms.');
    if (!user?.id) {
      (nav as any).getParent()?.getParent()?.navigate('AuthModal');
      return;
    }
    if (!gwOk(checkoutProvider)) {
      return Alert.alert('Payment', 'Selected payment method is not available.');
    }
    if (checkoutProvider === 'momo') {
      const ph = (momoPhone || address.phone || '').trim();
      if (!ph) return Alert.alert('Phone required', 'Enter MTN MoMo phone.');
    }
    if (checkoutProvider === 'airtel') {
      const ph = (airtelPhone || address.phone || '').trim();
      if (!ph) return Alert.alert('Phone required', 'Enter Airtel phone.');
    }
    if (shippingQuoteErr) return Alert.alert('Shipping', shippingQuoteErr);
    if (!shippingQuote?.groups?.length && items.length) {
      return Alert.alert('Shipping', 'Shipping quote not ready.');
    }
    if (shippingQuote?.isEstimate) {
      return Alert.alert('Shipping', 'Finalize your shipping address.');
    }
    if (
      !address.street?.trim() ||
      !address.city?.trim() ||
      !address.country?.trim() ||
      !(address.fullName || user?.full_name || '').trim()
    ) {
      return Alert.alert('Address', 'Complete shipping address.');
    }

    setPlacing(true);
    let createdOrders: any = null;
    try {
      const productById = new Map<string, any>();
      for (const line of items as Array<{ id: string; quantity: number; price: number }>) {
        const res = await productAPI.getProductById(line.id);
        const p = res?.product;
        if (!p) {
          setPlacing(false);
          return Alert.alert('Product unavailable');
        }
        const sid = String(p.sellerId || '');
        if (!sid) {
          setPlacing(false);
          return Alert.alert('Product unavailable');
        }
        productById.set(line.id, p);
      }

      const linesBySeller = new Map<string, { product_id: string; quantity: number }[]>();
      for (const line of items) {
        const p = productById.get(line.id);
        const sid = String(p.sellerId);
        if (!linesBySeller.has(sid)) linesBySeller.set(sid, []);
        linesBySeller.get(sid)!.push({ product_id: line.id, quantity: line.quantity });
      }

      const sellerGroups = [...linesBySeller.entries()].map(([sellerId, orderItems]) => ({
        sellerId,
        items: orderItems,
        subtotal: orderItems.reduce((s, it) => {
          const pr = productById.get(it.product_id);
          return s + (pr ? pr.price * it.quantity : 0);
        }, 0),
        discount: 0,
      }));

      const shippingMethodsPayload = { ...shippingMethodsByGroup };
      for (const g of shippingQuote?.groups || []) {
        if (shippingMethodsPayload[g.groupKey] == null) {
          shippingMethodsPayload[g.groupKey] = 'standard';
        }
      }

      const byGroup: Record<string, number> = {};
      for (const g of shippingQuote?.groups || []) {
        const mk = shippingMethodsPayload[g.groupKey] || 'standard';
        const m = (g.methods || []).find((x: any) => x.key === mk && x.enabled);
        const amt = m?.freeShippingApplied ? 0 : Number(m?.price ?? 0);
        byGroup[g.groupKey] = amt;
      }

      const createRes = await orderAPI.create({
        sellerGroups,
        shippingAddress: {
          full_name: address.fullName,
          phone: address.phone,
          address_line1: address.street,
          address_line2: '',
          city: address.city,
          state: address.state,
          postal_code: address.zip,
          country: address.country,
        },
        paymentMethod:
          checkoutProvider === 'momo'
            ? gatewayOrderCurrency.mtn_momo
            : checkoutProvider === 'airtel'
              ? 'RWF'
              : 'card',
        displayCurrency: currencyPricing.selectedCurrency,
        shippingMethods: shippingMethodsPayload,
        notes: {},
        shippingQuoteLock:
          shippingQuote?.addressFingerprint && shippingQuote.isEstimate === false
            ? {
                addressFingerprint: shippingQuote.addressFingerprint,
                totalShipping: Number(shippingQuote.totalShipping) || 0,
                byGroup,
              }
            : undefined,
      });

      const orders = createRes?.orders;
      if (!orders?.length) {
        setPlacing(false);
        return Alert.alert('Order failed', 'Could not create order.');
      }

      createdOrders = orders;
      try {
        if (orders.length > 1) {
          await AsyncStorage.setItem(
            UNPAID_KEY,
            JSON.stringify(orders.slice(1).map((o: any) => String(o.id || o._id))),
          );
        }
      } catch {
        /* ignore */
      }

      const first = orders[0];
      const orderId = first.id || first._id;
      const init = await paymentAPI.initialize({
        orderId,
        paymentMethod: checkoutProvider,
        ...(checkoutProvider === 'momo' ? { momoPhone: momoPhone || address.phone } : {}),
        ...(checkoutProvider === 'airtel' ? { airtelPhone: airtelPhone || address.phone } : {}),
      });

      if (
        (init?.provider === 'flutterwave' || init?.provider === 'stripe' || init?.provider === 'paypal') &&
        init?.paymentLink
      ) {
        clearCart();
        if (orders.length > 1) Alert.alert('Multiple orders', 'Complete payment for additional orders after this one.');
        await WebBrowser.openBrowserAsync(init.paymentLink);
        return;
      }

      if (init?.provider === 'momo' && init?.referenceId) {
        clearCart();
        if (orders.length > 1) Alert.alert('Multiple orders', 'Additional orders remain unpaid.');
        nav.replace('MomoPaymentWait', {
          referenceId: init.referenceId,
          orderId: String(orderId),
        });
        return;
      }

      if (init?.provider === 'airtel' && init?.referenceId) {
        clearCart();
        nav.replace('MomoPaymentWait', {
          referenceId: init.referenceId,
          orderId: String(orderId),
          provider: 'airtel',
        });
        return;
      }

      await Promise.allSettled(
        createdOrders.map((o: any) => orderAPI.cancel(String(o.id || o._id)).catch(() => null)),
      );
      setPlacing(false);
      Alert.alert('Payment', 'Could not start payment.');
    } catch (err: any) {
      console.error(err);
      if (createdOrders?.length) {
        await Promise.allSettled(
          createdOrders.map((o: any) => orderAPI.cancel(String(o.id || o._id)).catch(() => null)),
        );
      }
      setPlacing(false);
      const msg = err?.response?.data?.message || err?.message || 'Payment failed';
      if (err?.response?.status === 409) {
        Alert.alert('Shipping changed', 'Quote changed — please retry checkout.');
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyT}>Cart is empty</Text>
        <Pressable onPress={() => nav.goBack()} style={styles.btn}>
          <Text style={styles.btnT}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.h}>Checkout · step {step}/4</Text>

      {step === 1 && (
        <View style={styles.card}>
          <Field label="Full name" value={address.fullName} onChange={(v) => setAddress((a) => ({ ...a, fullName: v }))} />
          <Field label="Email" value={address.email} onChange={(v) => setAddress((a) => ({ ...a, email: v }))} keyboard="email-address" />
          <Field label="Phone" value={address.phone} onChange={(v) => setAddress((a) => ({ ...a, phone: v }))} keyboard="phone-pad" />
          <Field label="Street" value={address.street} onChange={(v) => setAddress((a) => ({ ...a, street: v }))} />
          <Field label="City" value={address.city} onChange={(v) => setAddress((a) => ({ ...a, city: v }))} />
          <Field label="State" value={address.state} onChange={(v) => setAddress((a) => ({ ...a, state: v }))} />
          <Field label="Postal code" value={address.zip} onChange={(v) => setAddress((a) => ({ ...a, zip: v }))} />
          <Field label="Country" value={address.country} onChange={(v) => setAddress((a) => ({ ...a, country: v }))} />
          <Pressable style={styles.primary} onPress={() => setStep(2)}>
            <Text style={styles.primaryT}>Continue</Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.subh}>Shipping</Text>
          {shippingQuoteLoading ? <ActivityIndicator /> : null}
          {shippingQuoteErr ? <Text style={styles.err}>{shippingQuoteErr}</Text> : null}
          {shippingQuote?.groups?.map((g: any) => (
            <View key={g.groupKey} style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: '700' }}>{g.label || g.groupKey}</Text>
              {(g.methods || []).map((m: any) => (
                <Pressable
                  key={m.key}
                  style={[
                    styles.opt,
                    shippingMethodsByGroup[g.groupKey] === m.key && styles.optOn,
                  ]}
                  onPress={() =>
                    setShippingMethodsByGroup((prev) => ({ ...prev, [g.groupKey]: m.key }))
                  }
                >
                  <Text>
                    {m.label || m.key} — {m.price ?? 0}{m.freeShippingApplied ? ' (free)' : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
          <Pressable style={styles.secondary} onPress={() => setStep(1)}>
            <Text>Back</Text>
          </Pressable>
          <Pressable style={styles.primary} onPress={() => setStep(3)}>
            <Text style={styles.primaryT}>Continue</Text>
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.subh}>Payment</Text>
          {gateways.flutterwave ? (
            <Pressable
              style={[styles.opt, checkoutProvider === 'flutterwave' && styles.optOn]}
              onPress={() => setCheckoutProvider('flutterwave')}
            >
              <Text>Flutterwave</Text>
            </Pressable>
          ) : null}
          {gateways.stripe ? (
            <Pressable
              style={[styles.opt, checkoutProvider === 'stripe' && styles.optOn]}
              onPress={() => setCheckoutProvider('stripe')}
            >
              <Text>Stripe</Text>
            </Pressable>
          ) : null}
          {gateways.paypal ? (
            <Pressable
              style={[styles.opt, checkoutProvider === 'paypal' && styles.optOn]}
              onPress={() => setCheckoutProvider('paypal')}
            >
              <Text>PayPal</Text>
            </Pressable>
          ) : null}
          {gateways.mtn_momo ? (
            <>
              <Pressable
                style={[styles.opt, checkoutProvider === 'momo' && styles.optOn]}
                onPress={() => setCheckoutProvider('momo')}
              >
                <Text>MTN MoMo</Text>
              </Pressable>
              <Field label="MoMo phone" value={momoPhone} onChange={setMomoPhone} keyboard="phone-pad" />
            </>
          ) : null}
          {gateways.airtel_money ? (
            <>
              <Pressable
                style={[styles.opt, checkoutProvider === 'airtel' && styles.optOn]}
                onPress={() => setCheckoutProvider('airtel')}
              >
                <Text>Airtel Money</Text>
              </Pressable>
              <Field label="Airtel phone" value={airtelPhone} onChange={setAirtelPhone} keyboard="phone-pad" />
            </>
          ) : null}
          <Pressable style={styles.secondary} onPress={() => setStep(2)}>
            <Text>Back</Text>
          </Pressable>
          <Pressable style={styles.primary} onPress={() => setStep(4)}>
            <Text style={styles.primaryT}>Review</Text>
          </Pressable>
        </View>
      )}

      {step === 4 && (
        <View style={styles.card}>
          <Text style={styles.subh}>Confirm</Text>
          <Text>Subtotal: {subtotal.toFixed(2)}</Text>
          <Text>Shipping: {shippingCost.toFixed(2)}</Text>
          <Text>Tax (est.): {tax.toFixed(2)}</Text>
          <Text style={styles.total}>Total: {total.toFixed(2)}</Text>
          <Pressable
            style={styles.row}
            onPress={() => setAgreedTerms(!agreedTerms)}
          >
            <Text>{agreedTerms ? '☑' : '☐'} I agree to terms</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => setStep(3)}>
            <Text>Back</Text>
          </Pressable>
          <Pressable
            style={[styles.primary, placing && { opacity: 0.6 }]}
            disabled={placing}
            onPress={placeOrder}
          >
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryT}>Place order</Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'email-address' | 'phone-pad';
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.lab}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.inp}
        keyboardType={keyboard}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  subh: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  lab: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  inp: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  primary: {
    marginTop: 12,
    backgroundColor: '#0d9488',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryT: { color: '#fff', fontWeight: '800' },
  secondary: { marginTop: 8, padding: 10, alignItems: 'center' },
  opt: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  optOn: { borderColor: '#0d9488', backgroundColor: '#ecfdf5' },
  total: { fontSize: 18, fontWeight: '800', marginVertical: 8 },
  row: { paddingVertical: 8 },
  err: { color: '#b91c1c', marginBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyT: { fontSize: 18, marginBottom: 12 },
  btn: { backgroundColor: '#0d9488', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  btnT: { color: '#fff', fontWeight: '700' },
});
