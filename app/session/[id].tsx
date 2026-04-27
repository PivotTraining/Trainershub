import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { useDeleteSession, useSession, useUpdateSessionStatus } from '@/lib/queries/sessions';
import type { SessionStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: SessionStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: '#0a7' },
  { value: 'completed', label: 'Completed', color: '#048' },
  { value: 'canceled', label: 'Canceled', color: '#c33' },
];

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { data, isLoading, error } = useSession(id);
  const update = useUpdateSessionStatus();
  const del = useDeleteSession();
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

  const handleDelete = () => {
    Alert.alert('Delete session?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(data!.id);
            router.back();
          } catch (err: unknown) {
            Alert.alert('Delete failed', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  const setStatus = async (status: SessionStatus) => {
    try {
      await update.mutateAsync({ id: data.id, status });
    } catch (err: unknown) {
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      {isTrainer && data.status === 'scheduled' && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            router.push({ pathname: '/session/edit/[id]', params: { id: data.id } })
          }
        >
          <Text style={styles.editButtonText}>Edit time & duration</Text>
        </TouchableOpacity>
      )}

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
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={del.isPending}
        >
          {del.isPending ? (
            <ActivityIndicator color="#c33" />
          ) : (
            <Text style={styles.deleteText}>Delete session</Text>
          )}
        </TouchableOpacity>
      )}

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
  editButton: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  editButtonText: { color: '#333', fontWeight: '600' },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#c33',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 32,
  },
  deleteText: { color: '#c33', fontWeight: '600' },
});
