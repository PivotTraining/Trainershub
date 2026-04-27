import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useProgram, useProgramClients, useUnassignProgram } from '@/lib/queries/programs';

export default function ProgramDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const programQuery = useProgram(id);
  const clientsQuery = useProgramClients(id);
  const unassign = useUnassignProgram();

  const handleUnassign = (assignmentId: string, clientId: string) => {
    Alert.alert('Remove client?', 'This will unassign the client from this program.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await unassign.mutateAsync({ assignmentId, programId: id!, clientId });
          } catch (err: unknown) {
            Alert.alert('Failed', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  if (programQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (programQuery.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{(programQuery.error as Error).message}</Text>
      </View>
    );
  }
  if (!programQuery.data) {
    return (
      <View style={styles.center}>
        <Text>Program not found.</Text>
      </View>
    );
  }

  const program = programQuery.data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>{program.title}</Text>
      {program.description ? (
        <Text style={styles.description}>{program.description}</Text>
      ) : null}
      <Text style={styles.label}>Created</Text>
      <Text style={styles.value}>{new Date(program.created_at).toLocaleDateString()}</Text>

      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
        Assigned clients ({clientsQuery.data?.length ?? '…'})
      </Text>

      {clientsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 8 }} />
      ) : (clientsQuery.data ?? []).length === 0 ? (
        <Text style={styles.muted}>No clients assigned yet.</Text>
      ) : (
        (clientsQuery.data ?? []).map((c) => (
          <View key={c.assignmentId} style={styles.clientRow}>
            <View style={styles.clientInfo}>
              <Text style={styles.clientGoals}>{c.goals ?? 'No goal set'}</Text>
              {c.notes ? <Text style={styles.muted}>{c.notes}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={() => handleUnassign(c.assignmentId, c.clientId)}
              disabled={unassign.isPending}
              style={styles.removeButton}
            >
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  description: { fontSize: 15, color: '#555', marginTop: 6 },
  label: { fontSize: 13, color: '#888', marginTop: 16, marginBottom: 4 },
  value: { fontSize: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  muted: { color: '#666', marginTop: 8 },
  error: { color: '#c00' },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  clientInfo: { flex: 1 },
  clientGoals: { fontSize: 15, fontWeight: '600' },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c33',
  },
  removeText: { color: '#c33', fontWeight: '600', fontSize: 13 },
});
