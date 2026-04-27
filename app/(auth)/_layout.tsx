import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();

  if (loading) return null;

  // Allow the onboarding screen for authenticated users who haven't set their name yet
  const isOnboarding = segments.at(-1) === 'onboarding';
  if (session && !profile?.full_name && isOnboarding) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  if (session) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
