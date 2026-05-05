import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import AdminOverviewScreen from '../screens/admin/AdminOverviewScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminSellersScreen from '../screens/admin/AdminSellersScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminFinanceScreen from '../screens/admin/AdminFinanceScreen';
import AdminSellerSubscriptionsScreen from '../screens/admin/AdminSellerSubscriptionsScreen';
import AdminSupportScreen from '../screens/admin/AdminSupportScreen';
import AdminLogisticsScreen from '../screens/admin/AdminLogisticsScreen';
import AdminNotificationsScreen from '../screens/admin/AdminNotificationsScreen';
import AdminMarketingScreen from '../screens/admin/AdminMarketingScreen';
import AdminReviewsScreen from '../screens/admin/AdminReviewsScreen';
import AdminCollectionsScreen from '../screens/admin/AdminCollectionsScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminSystemAnalysisScreen from '../screens/admin/AdminSystemAnalysisScreen';
import AdminSecurityAnalysisScreen from '../screens/admin/AdminSecurityAnalysisScreen';

const Drawer = createDrawerNavigator();

const MENU: { name: string; title: string }[] = [
  { name: 'dashboard', title: 'Dashboard' },
  { name: 'system-analysis', title: 'System Analysis' },
  { name: 'security-analysis', title: 'Security Analysis' },
  { name: 'users', title: 'Users' },
  { name: 'sellers', title: 'Sellers' },
  { name: 'products', title: 'Products' },
  { name: 'orders', title: 'Orders' },
  { name: 'finance', title: 'Finance' },
  { name: 'seller-subscriptions', title: 'Seller subscriptions' },
  { name: 'support', title: 'Support' },
  { name: 'logistics', title: 'Logistics' },
  { name: 'notifications', title: 'Notifications' },
  { name: 'marketing', title: 'Marketing' },
  { name: 'reviews', title: 'Reviews' },
  { name: 'collections', title: 'Collections' },
  { name: 'settings', title: 'Profile & Settings' },
];

function CustomDrawerContent(props: any) {
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <View style={[styles.dr, { paddingTop: insets.top }]}>
      <Text style={styles.brand}>Admin</Text>
      <ScrollView style={{ flex: 1 }}>
        {MENU.map((m) => (
          <Pressable key={m.name} style={styles.item} onPress={() => props.navigation.navigate(m.name)}>
            <Text style={styles.itemT}>{m.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable style={styles.so} onPress={() => signOut()}>
        <Text style={styles.soT}>Sign out</Text>
      </Pressable>
    </View>
  );
}

export default function AdminNavigator() {
  return (
    <Drawer.Navigator drawerContent={(p) => <CustomDrawerContent {...p} />} screenOptions={{ headerShown: true }}>
      <Drawer.Screen name="dashboard" component={AdminOverviewScreen} options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="system-analysis" component={AdminSystemAnalysisScreen} options={{ title: 'System' }} />
      <Drawer.Screen name="security-analysis" component={AdminSecurityAnalysisScreen} options={{ title: 'Security' }} />
      <Drawer.Screen name="users" component={AdminUsersScreen} />
      <Drawer.Screen name="sellers" component={AdminSellersScreen} />
      <Drawer.Screen name="products" component={AdminProductsScreen} />
      <Drawer.Screen name="orders" component={AdminOrdersScreen} />
      <Drawer.Screen name="finance" component={AdminFinanceScreen} />
      <Drawer.Screen name="seller-subscriptions" component={AdminSellerSubscriptionsScreen} options={{ title: 'Subscriptions' }} />
      <Drawer.Screen name="support" component={AdminSupportScreen} />
      <Drawer.Screen name="logistics" component={AdminLogisticsScreen} />
      <Drawer.Screen name="notifications" component={AdminNotificationsScreen} />
      <Drawer.Screen name="marketing" component={AdminMarketingScreen} />
      <Drawer.Screen name="reviews" component={AdminReviewsScreen} />
      <Drawer.Screen name="collections" component={AdminCollectionsScreen} />
      <Drawer.Screen name="settings" component={AdminProfileScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  dr: { flex: 1, paddingHorizontal: 12, backgroundColor: '#fff' },
  brand: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: '#065f46' },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e2e8f0' },
  itemT: { fontSize: 15, color: '#0f172a' },
  so: { padding: 16 },
  soT: { color: '#b91c1c', fontWeight: '700' },
});
