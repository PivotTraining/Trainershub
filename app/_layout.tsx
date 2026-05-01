import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/lib/auth';
import { usePreferences, PreferencesProvider } from '@/lib/preferences';
import { StripeProvider } from '@/lib/stripe';

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
 * Inner stack — lives inside PreferencesProvider so it can read the user's
 * darkMode preference and pass the correct theme to React Navigation.
 * Without this the nav chrome (tab bar, headers) always follows the system
 * scheme and ignores the in-app preference toggle.
 */
function ThemedStack() {
  const system = useColorScheme();
  const { darkMode } = usePreferences();

  const isDark =
    darkMode === 'dark' ||
    (darkMode === 'system' && system === 'dark');

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
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
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
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
