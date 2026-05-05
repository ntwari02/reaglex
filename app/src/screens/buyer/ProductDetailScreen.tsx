import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { productAPI } from '../../services/api';
import { useBuyerCart } from '../../store/buyerCartStore';
import { resolveImageUrl } from '../../utils/assetUrl';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';

const IMG_FALL =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';

type R = RouteProp<BuyerStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const { params } = useRoute<R>();
  const addItem = useBuyerCart((s) => s.addItem);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await productAPI.getProductById(params.productId);
        const p = res?.product || res;
        if (alive) setProduct(p);
        void productAPI.trackView(params.productId);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.productId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (err || !product) {
    return (
      <View style={styles.center}>
        <Text>{err || 'Not found'}</Text>
      </View>
    );
  }

  const img = resolveImageUrl(product.images?.[0]?.url || product.images?.[0], IMG_FALL);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      <Image source={{ uri: img }} style={styles.hero} />
      <View style={styles.pad}>
        <Text style={styles.title}>{product.title || product.name}</Text>
        <Text style={styles.price}>
          {product.price} {product.currency || 'USD'}
        </Text>
        {!!product.description && <Text style={styles.desc}>{product.description}</Text>}
        <Pressable style={styles.btn} onPress={() => addItem(product, 1)}>
          <Text style={styles.btnT}>Add to cart</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', aspectRatio: 1, backgroundColor: '#e2e8f0' },
  pad: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  price: { marginTop: 8, fontSize: 20, fontWeight: '800', color: '#0d9488' },
  desc: { marginTop: 12, color: '#334155', lineHeight: 22 },
  btn: { marginTop: 20, backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
