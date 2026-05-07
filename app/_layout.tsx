import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences';
import { StripeProvider } from '@/lib/stripe';

// Keep the splash visible until we explicitly hide it after first paint.
// On iPad iOS 26 the auto-hide can race with the navigator mount and leave
// the splash on top, intercepting all taps and making the app appear frozen.
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

/**
 * Force-light theme. Dark mode preference temporarily ignored — the app's
 * dark palette has known contrast/glass-blend issues on iPad iOS 26.4 that
 * compound the post-login interaction problems Apple is reporting. Will
 * re-enable dark mode in a follow-up after the App Store approval lands.
 */
function ThemedStack() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="session/new"
          options={{ presentation: 'modal', title: 'New session' }}
        />
        <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
        <Stack.Screen
          name="session/edit/[id]"
          options={{ presentation: 'modal', title: 'Edit session' }}
        />
        <Stack.Screen
          name="invite"
          options={{ presentation: 'modal', title: 'Join your team', headerShown: false }}
        />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Hide once React has mounted. We don't gate on auth/profile loading —
    // those screens render their own loading state, but the splash itself
    // must never linger.
    SplashScreen.hideAsync().catch(() => null);
  }, []);

  // NOTE: GestureHandlerRootView removed. It was added defensively in #2 but
  // the App Review reports of "buttons don't function" post-login on real
  // iPad hardware (iPadOS 26.4.2) point at the gesture handler intercepting
  // native UITabBar / Pressable touches in ways the simulator does not
  // reproduce. The app does not actually use any react-native-gesture-handler
  // gesture detectors, so removing the wrapper is safe.
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
