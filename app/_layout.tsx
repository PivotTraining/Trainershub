import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AppCanvas } from '@/components/AppCanvas';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { trackEvent } from '@/lib/analytics';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences';
import { StripeProvider } from '@/lib/stripe';
import { useTheme } from '@/lib/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => null);

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      retryDelay: 2_000,
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      networkMode: 'always',
      retry: 1,
      retryDelay: 2_000,
    },
  },
});

function AnalyticsTracker() {
  const pathname = usePathname();
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user?.id || !pathname) return;
    void trackEvent('screen_view', { path: pathname });
  }, [pathname, session?.user?.id]);

  return null;
}

function ThemedStack() {
  const { colors } = useTheme();
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.ink,
      border: colors.border,
    },
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppCanvas />
      <ThemeProvider value={navigationTheme}>
        <AnalyticsTracker />
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="session/new" options={{ presentation: 'modal', title: 'New session' }} />
          <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
          <Stack.Screen name="session/edit/[id]" options={{ presentation: 'modal', title: 'Edit session' }} />
          <Stack.Screen name="invite" options={{ presentation: 'modal', title: 'Join your team', headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ presentation: 'modal', title: 'Reset password', headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => null);
  }, []);

  return (
    <ErrorBoundary label="App root">
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme="trainerhub">
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <AuthProvider>
              <ThemedStack />
            </AuthProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      </StripeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
