import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
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
import { useClient } from '@/lib/queries/clients';
import {
  useAssignProgram,
  useClientAssignedPrograms,
  useTrainerPrograms,
} from '@/lib/queries/programs';

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const trainerId = session?.user.id;
  const clientQuery = useClient(id);
  const assigned = useClientAssignedPrograms(id);
  const allPrograms = useTrainerPrograms(trainerId);
  const assignMut = useAssignProgram();

  const assignedIds = useMemo(
    () => new Set((assigned.data ?? []).map((p) => p.id)),
    [assigned.data],
  );
  const unassigned = useMemo(
    () => (allPrograms.data ?? []).filter((p) => !assignedIds.has(p.id)),
    [allPrograms.data, assignedIds],
  );

  if (clientQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (clientQuery.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{(clientQuery.error as Error).message}</Text>
      </View>
    );
  }
  if (!clientQuery.data) {
    return (
      <View style={styles.center}>
        <Text>Client not found.</Text>
      </View>
    );
  }
  const data = clientQuery.data;

  const handleAssign = async (programId: string) => {
    try {
      await assignMut.mutateAsync({ program_id: programId, client_id: data.id });
    } catch (error: unknown) {
      Alert.alert('Assign failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.label}>Goals</Text>
      <Text style={styles.value}>{data.goals ?? '—'}</Text>
      <Text style={styles.label}>Notes</Text>
      <Text style={styles.value}>{data.notes ?? '—'}</Text>
      <Text style={styles.label}>Added</Text>
      <Text style={styles.value}>{new Date(data.created_at).toLocaleDateString()}</Text>

      <Text style={[styles.label, { marginTop: 32 }]}>Assigned programs</Text>
      {assigned.isLoading ? (
        <ActivityIndicator />
      ) : (assigned.data ?? []).length === 0 ? (
        <Text style={styles.muted}>None yet.</Text>
      ) : (
        (assigned.data ?? []).map((p) => (
          <View key={p.id} style={styles.programRow}>
            <Text style={styles.programTitle}>{p.title}</Text>
            {p.description ? <Text style={styles.muted}>{p.description}</Text> : null}
          </View>
        ))
      )}

      {unassigned.length > 0 && (
        <>
          <Text style={[styles.label, { marginTop: 24 }]}>Assign a program</Text>
          {unassigned.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.assignRow}
              onPress={() => handleAssign(p.id)}
              disabled={assignMut.isPending}
            >
              <Text style={styles.programTitle}>{p.title}</Text>
              <Text style={styles.assignLink}>Assign</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, color: '#888', marginTop: 16, marginBottom: 4 },
  value: { fontSize: 16 },
  error: { color: '#c00' },
  muted: { color: '#666' },
  programRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  programTitle: { fontSize: 15, fontWeight: '600' },
  assignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  assignLink: { color: '#0a7', fontWeight: '600' },
});
