import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import PageLoader from '../components/PageLoader';
import BuyerNavigator from './BuyerNavigator';
import AuthNavigator from './AuthNavigator';
import VerifyEmailNavigator from './VerifyEmailNavigator';
import SellerNavigator from './SellerNavigator';
import AdminNavigator from './AdminNavigator';

export type RootStackParamList = {
  Shop: undefined;
  AuthModal: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Guests can browse the storefront (same as web). Sign-in is a stack screen.
 * Unverified email forces OTP flow. Seller/admin replace the whole tree.
 */
export default function RootNavigator() {
  const { user, loading, initialized } = useAuthStore();

  if (!initialized || loading) {
    return <PageLoader />;
  }

  if (user && user.email_verified !== true) {
    return <VerifyEmailNavigator />;
  }

  if (user?.role === 'seller') {
    return <SellerNavigator />;
  }

  if (user?.role === 'admin') {
    return <AdminNavigator />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Shop" component={BuyerNavigator} />
      <Stack.Screen
        name="AuthModal"
        component={AuthNavigator}
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
