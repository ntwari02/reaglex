import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VerifyOTPScreen from '../screens/auth/VerifyOTPScreen';
import { useAuthStore } from '../store/authStore';

export type VerifyStackParamList = {
  VerifyOTP: { email?: string };
};

const Stack = createNativeStackNavigator<VerifyStackParamList>();

/** Shown when session exists but email is not verified (matches web HomeRouteGuard). */
export default function VerifyEmailNavigator() {
  const email = useAuthStore((s) => s.user?.email);

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="VerifyOTP"
        component={VerifyOTPScreen}
        initialParams={{ email }}
        options={{ title: 'Verify email' }}
      />
    </Stack.Navigator>
  );
}
