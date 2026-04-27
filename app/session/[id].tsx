import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { useSession, useUpdateSessionStatus } from '@/lib/queries/sessions';
import type { SessionStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: SessionStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: '#0a7' },
  { value: 'completed', label: 'Completed', color: '#048' },
  { value: 'canceled', label: 'Canceled', color: '#c33' },
];

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { data, isLoading, error } = useSession(id);
  const update = useUpdateSessionStatus();
  const isTrainer = profile?.role === 'trainer';

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{(error as Error).message}</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Session not found.</Text>
      </View>
    );
  }

  const setStatus = async (status: SessionStatus) => {
    try {
      await update.mutateAsync({ id: data.id, status });
    } catch (err: unknown) {
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.label}>When</Text>
      <Text style={styles.value}>{new Date(data.starts_at).toLocaleString()}</Text>

      <Text style={styles.label}>Duration</Text>
      <Text style={styles.value}>{data.duration_min} min</Text>

      <Text style={styles.label}>Status</Text>
      <Text style={[styles.value, styles.status]}>{data.status}</Text>

      {data.notes ? (
        <>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>{data.notes}</Text>
        </>
      ) : null}

      {isTrainer && (
        <View style={styles.actions}>
          <Text style={styles.label}>Set status</Text>
          <View style={styles.row}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                disabled={update.isPending || data.status === opt.value}
                style={[
                  styles.statusButton,
                  { borderColor: opt.color },
                  data.status === opt.value && { backgroundColor: opt.color },
                ]}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    {
                      color: data.status === opt.value ? '#fff' : opt.color,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, color: '#888', marginTop: 16, marginBottom: 4 },
  value: { fontSize: 16 },
  status: { textTransform: 'capitalize', fontWeight: '600' },
  error: { color: '#c00' },
  actions: { marginTop: 24 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  statusButtonText: { fontWeight: '600' },
});
