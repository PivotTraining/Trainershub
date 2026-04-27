import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useClientSessions, useTrainerSessions } from '@/lib/queries/sessions';

export default function Home() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const isTrainer = profile?.role === 'trainer';
  const trainer = useTrainerSessions(isTrainer ? userId : undefined);
  const client = useClientSessions(!isTrainer ? userId : undefined);
  const upcoming = (isTrainer ? trainer.data : client.data) ?? [];
  const next = upcoming.find((s) => s.status === 'scheduled' && new Date(s.starts_at) >= new Date());

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>
          Hi{profile?.full_name ? `, ${profile.full_name}` : ''} 👋
        </Text>
        <Text style={styles.role}>
          You're signed in as a {profile?.role ?? 'user'}.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next session</Text>
          {next ? (
            <Text style={styles.cardBody}>
              {new Date(next.starts_at).toLocaleString()} · {next.duration_min} min
            </Text>
          ) : (
            <Text style={styles.cardBody}>None scheduled.</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  container: { padding: 24 },
  greeting: { fontSize: 26, fontWeight: '700' },
  role: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: { fontSize: 14, color: '#888', marginBottom: 6 },
  cardBody: { fontSize: 16 },
});
