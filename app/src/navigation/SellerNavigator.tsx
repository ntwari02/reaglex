import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SellerMobileHomeScreen from '../screens/seller/SellerMobileHomeScreen';
import SellerOrdersScreen from '../screens/seller/SellerOrdersScreen';
import SellerOrderDetailScreen from '../screens/seller/SellerOrderDetailScreen';
import SellerProductsScreen from '../screens/seller/SellerProductsScreen';
import SellerInboxScreen from '../screens/seller/SellerInboxScreen';
import SellerMoreScreen from '../screens/seller/SellerMoreScreen';
import SellerAnalyticsScreen from '../screens/seller/SellerAnalyticsScreen';
import SellerSubscriptionScreen from '../screens/seller/SellerSubscriptionScreen';
import SellerProfileScreen from '../screens/seller/SellerProfileScreen';
import SellerSupportScreen from '../screens/seller/SellerSupportScreen';
import SellerNotificationsScreen from '../screens/seller/SellerNotificationsScreen';
import SellerShippingScreen from '../screens/seller/SellerShippingScreen';
import SellerCollectionsScreen from '../screens/seller/SellerCollectionsScreen';
import SellerDisputesScreen from '../screens/seller/SellerDisputesScreen';
import SellerAddProductScreen from '../screens/seller/SellerAddProductScreen';
import SellerPaymentsScreen from '../screens/seller/SellerPaymentsScreen';
import { useAppColors } from '../hooks/useAppColors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SellerTabs() {
  const c = useAppColors();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brandPrimary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: c.tabBarBg,
          borderTopColor: c.divider,
          ...Platform.select({
            ios: {
              shadowColor: `rgba(${c.shadowRgb},0.06)`,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 1,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          }),
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={SellerMobileHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={SellerOrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Products"
        component={SellerProductsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="cube" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={SellerInboxScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={SellerMoreScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function SellerNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="sellerTabs" component={SellerTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="orderDetail"
        component={SellerOrderDetailScreen}
        options={{ title: 'Order' }}
      />
      <Stack.Screen name="addProduct" component={SellerAddProductScreen} options={{ title: 'Add product' }} />
      <Stack.Screen name="payments" component={SellerPaymentsScreen} options={{ title: 'Payments & escrow' }} />
      <Stack.Screen name="analytics" component={SellerAnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="shipping" component={SellerShippingScreen} options={{ title: 'Shipping settings' }} />
      <Stack.Screen name="collections" component={SellerCollectionsScreen} options={{ title: 'Collections' }} />
      <Stack.Screen name="disputes" component={SellerDisputesScreen} options={{ title: 'Disputes' }} />
      <Stack.Screen name="subscription" component={SellerSubscriptionScreen} options={{ title: 'Subscription' }} />
      <Stack.Screen name="settings" component={SellerProfileScreen} options={{ title: 'Profile & settings' }} />
      <Stack.Screen name="support" component={SellerSupportScreen} options={{ title: 'Support' }} />
      <Stack.Screen name="notifications" component={SellerNotificationsScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}
