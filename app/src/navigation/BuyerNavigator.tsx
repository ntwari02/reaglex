import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuyerTabs from './BuyerTabs';
import ProductDetailScreen from '../screens/buyer/ProductDetailScreen';
import CheckoutScreen from '../screens/buyer/CheckoutScreen';
import MomoPaymentWaitScreen from '../screens/buyer/MomoPaymentWaitScreen';
import OrderConfirmationScreen from '../screens/buyer/OrderConfirmationScreen';
import OrderTrackingScreen from '../screens/buyer/OrderTrackingScreen';
import NotificationsScreen from '../screens/buyer/NotificationsScreen';
import ReturnsScreen from '../screens/buyer/ReturnsScreen';
import ContactScreen from '../screens/buyer/ContactScreen';
import ReportProblemScreen from '../screens/buyer/ReportProblemScreen';
import StaticScreen from '../screens/buyer/StaticScreen';
import StripeReturnScreen from '../screens/buyer/StripeReturnScreen';
import PayPalReturnScreen from '../screens/buyer/PayPalReturnScreen';

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { productId: string };
  Checkout: undefined;
  MomoPaymentWait: { referenceId: string; orderId: string; provider?: string };
  OrderConfirmation: { orderId: string };
  OrderTracking: { orderId?: string };
  Notifications: undefined;
  Returns: undefined;
  Contact: undefined;
  ReportProblem: { ticketId?: string };
  Static: { title: string; body: string };
  StripeReturn: { session_id?: string };
  PayPalReturn: { token?: string };
};

const Stack = createNativeStackNavigator<BuyerStackParamList>();

export default function BuyerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="BuyerTabs" component={BuyerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen name="MomoPaymentWait" component={MomoPaymentWaitScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{ title: 'Order' }} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Tracking' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Returns" component={ReturnsScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="ReportProblem" component={ReportProblemScreen} options={{ title: 'Support' }} />
      <Stack.Screen name="Static" component={StaticScreen} />
      <Stack.Screen name="StripeReturn" component={StripeReturnScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="PayPalReturn" component={PayPalReturnScreen} options={{ title: 'Payment' }} />
    </Stack.Navigator>
  );
}
