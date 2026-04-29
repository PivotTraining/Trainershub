import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';
import { StripeProvider } from '@stripe/stripe-react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes — avoids redundant refetches on tab
      // switches and short background/foreground cycles.
      staleTime: 5 * 60 * 1000,
      // Keep unused cache entries for 10 minutes so navigating back to a list
      // shows stale data instantly rather than a blank loading state.
      gcTime: 10 * 60 * 1000,
      // Retry once with a 2-second backoff before surfacing an error.
      retry: 1,
      retryDelay: 2_000,
      // Show stale data while a background refetch is running (no flash to empty).
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      // Mutations should always attempt to run — even if the network looks
      // flaky. TanStack Query will queue them internally.
      networkMode: 'always',
      retry: 1,
      retryDelay: 2_000,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary label="App root">
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme="trainerhub">
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
      </PreferencesProvider>
    </QueryClientProvider>
    </StripeProvider>
    </ErrorBoundary>
  );
}
