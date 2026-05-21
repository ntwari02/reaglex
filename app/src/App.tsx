import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { getColors } from './theme/tokens';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useAuthStore } from './store/authStore';
import { hydrateDeviceId } from './lib/deviceId';
import { websocketService } from './services/websocketService';
import RootNavigator from './navigation/RootNavigator';
import ToastHost from './components/ToastHost';
import CartCloudSyncBridge from './components/CartCloudSyncBridge';

SplashScreen.preventAutoHideAsync().catch(() => {});

function GlobalRealtimeBridge() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) {
      websocketService.disconnect();
      return;
    }
    websocketService.connect();
    return () => {
      websocketService.disconnect();
    };
  }, [userId]);

  return null;
}

function AppNavigation() {
  const { theme } = useTheme();
  const c = getColors(theme);
  const base = theme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.brandPrimary,
      background: c.bgPage,
      card: c.cardBg,
      text: c.textPrimary,
      border: c.divider,
      notification: c.brandPrimary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <GlobalRealtimeBridge />
      <CartCloudSyncBridge />
      <RootNavigator />
      <ToastHost />
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateDeviceId();
      await initialize();
      if (!cancelled) await SplashScreen.hideAsync();
    })();
    return () => {
      cancelled = true;
    };
  }, [initialize]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
