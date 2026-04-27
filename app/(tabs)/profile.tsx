import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut, useAuth } from '@/lib/auth';

export default function Profile() {
  const { session, profile } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: unknown) {
      Alert.alert('Sign out failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{session?.user.email ?? '—'}</Text>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{profile?.full_name || '—'}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{profile?.role ?? '—'}</Text>
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24 },
  label: { fontSize: 13, color: '#888', marginTop: 16, marginBottom: 4 },
  value: { fontSize: 16 },
  button: {
    marginTop: 32,
    backgroundColor: '#c33',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
