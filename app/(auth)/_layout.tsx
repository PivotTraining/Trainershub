import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  if (loading) return null;

  const current = segments.at(-1);
  const isWelcome = current === 'welcome';
  const isOnboarding = current === 'onboarding';
  const isSignIn = current === 'sign-in';

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

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />

      {/* Keep sign-in fast for returning users while making account creation
          unmistakable for first-time visitors. */}
      {isSignIn && (
        <TouchableOpacity
          style={styles.signupPill}
          onPress={() => router.push('/(auth)/sign-up')}
          accessibilityRole="button"
          accessibilityLabel="Create a TrainerHub account"
          activeOpacity={0.85}
        >
          <Text style={styles.signupText}>Create account</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  signupPill: {
    position: 'absolute',
    top: 58,
    right: 22,
    zIndex: 50,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  signupText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
