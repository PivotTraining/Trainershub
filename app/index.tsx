import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/auth';

export default function Index() {
  const { session, profile, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (session && !profile?.full_name) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href={session ? '/(tabs)' : '/(auth)/sign-in'} />;
}
