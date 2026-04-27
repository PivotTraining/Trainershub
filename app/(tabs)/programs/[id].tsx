import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useProgram,
  useProgramClients,
  useUnassignProgram,
  useUpdateProgram,
} from '@/lib/queries/programs';
import { programUpdateSchema } from '@/lib/validators/program';

export default function ProgramDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const programQuery = useProgram(id);
  const clientsQuery = useProgramClients(id);
  const updateProgram = useUpdateProgram();
  const unassign = useUnassignProgram();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (programQuery.data && !seeded) {
      setTitle(programQuery.data.title);
      setDescription(programQuery.data.description ?? '');
      setSeeded(true);
      navigation.setOptions({ title: programQuery.data.title });
    }
  }, [programQuery.data, seeded, navigation]);

  const handleSave = async () => {
    const parsed = programUpdateSchema.safeParse({
      title: title.trim(),
      description: description.trim() || null,
    });
    if (!parsed.success) {
      Alert.alert('Check inputs', parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      const updated = await updateProgram.mutateAsync({ id: id!, ...parsed.data });
      navigation.setOptions({ title: updated.title });
      setEditing(false);
    } catch (err: unknown) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleCancel = () => {
    setTitle(programQuery.data?.title ?? '');
    setDescription(programQuery.data?.description ?? '');
    setEditing(false);
  };

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
  if (programQuery.error || !programQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {programQuery.error ? (programQuery.error as Error).message : 'Program not found.'}
        </Text>
      </View>
    );
  }

  const program = programQuery.data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      {/* ── Header row ───────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Details</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={handleCancel} disabled={updateProgram.isPending}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={updateProgram.isPending}>
              {updateProgram.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.saveLink}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Title ────────────────────────────────────────────────── */}
      <Text style={styles.label}>Title</Text>
      {editing ? (
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      ) : (
        <Text style={styles.title}>{program.title}</Text>
      )}

      {/* ── Description ──────────────────────────────────────────── */}
      <Text style={styles.label}>Description</Text>
      {editing ? (
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Optional description…"
        />
      ) : (
        <Text style={[styles.value, !program.description && styles.muted]}>
          {program.description || 'No description.'}
        </Text>
      )}

      <Text style={styles.label}>Created</Text>
      <Text style={styles.value}>{new Date(program.created_at).toLocaleDateString()}</Text>

      {/* ── Assigned clients ─────────────────────────────────────── */}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  editActions: { flexDirection: 'row', gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  editLink: { color: '#0a7', fontWeight: '600' },
  cancelLink: { color: '#888' },
  saveLink: { color: '#0a7', fontWeight: '600' },
  label: { fontSize: 13, color: '#888', marginTop: 16, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  value: { fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: '#c00' },
  muted: { color: '#666', marginTop: 4 },
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
