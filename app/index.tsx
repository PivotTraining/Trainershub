import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';

export default function Index() {
  const { session, profile, loading, profileError, retryProfile } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (session && profileError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>We couldn&apos;t load your account</Text>
        <Text style={styles.errorBody}>Check your connection and try again.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading account"
          style={styles.retryButton}
          onPress={retryProfile}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  if (session && !profile?.full_name) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href={session ? '/(tabs)' : '/(auth)/sign-in'} />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1A1512', textAlign: 'center' },
  errorBody: { marginTop: 8, fontSize: 15, color: '#6B625C', textAlign: 'center' },
  retryButton: { marginTop: 20, borderRadius: 10, backgroundColor: '#D97706', paddingHorizontal: 22, paddingVertical: 12 },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
