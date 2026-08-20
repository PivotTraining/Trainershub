import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();

  if (loading) return null;

  const current = segments.at(-1);
  const isWelcome = current === 'welcome';
  const isOnboarding = current === 'onboarding';

  // A brand-new account already has an auth session, but the profile is not
  // complete yet. Route that user through a deliberate welcome moment before
  // collecting profile details instead of dropping them straight into tabs.
  if (session && !profile?.full_name) {
    if (isWelcome || isOnboarding) {
      return <Stack screenOptions={{ headerShown: false }} />;
    }
    return <Redirect href="/(auth)/welcome" />;
  }

  if (session) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
