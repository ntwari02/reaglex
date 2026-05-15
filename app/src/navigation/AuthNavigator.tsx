import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from '../screens/auth/AuthScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyOTPScreen from '../screens/auth/VerifyOTPScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

export type AuthStackParamList = {
  Auth: { tab?: 'login' | 'signup'; redirect?: string } | undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email?: string };
  ResetPassword: { token?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Sign in', headerShown: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} options={{ title: 'Verify email' }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'New password' }} />
    </Stack.Navigator>
  );
}
