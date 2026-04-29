import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { useClient, useDeleteClient, useUpdateClient } from '@/lib/queries/clients';
import {
  useAssignProgram,
  useClientAssignedPrograms,
  useTrainerPrograms,
} from '@/lib/queries/programs';

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { colors } = useTheme();
  const trainerId = session?.user.id ?? '';

  const clientQuery = useClient(id);
  const updateClient = useUpdateClient(trainerId);
  const assigned = useClientAssignedPrograms(id);
  const allPrograms = useTrainerPrograms(trainerId);
  const assignMut = useAssignProgram();

  const router = useRouter();
  const navigation = useNavigation();
  const deleteClient = useDeleteClient(trainerId);
  const [editing, setEditing] = useState(false);
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');

  // Seed form + nav title whenever the remote data arrives or changes
  useEffect(() => {
    if (clientQuery.data) {
      setGoals(clientQuery.data.goals ?? '');
      setNotes(clientQuery.data.notes ?? '');
      const name =
        clientQuery.data.profile?.full_name ??
        clientQuery.data.profile?.email ??
        'Client';
      navigation.setOptions({ title: name });
    }
  }, [clientQuery.data, navigation]);

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
        <Text style={{ color: colors.danger }}>{(clientQuery.error as Error).message}</Text>
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

  const handleSave = async () => {
    try {
      await updateClient.mutateAsync({
        id: clientQuery.data!.id,
        goals: goals.trim() || null,
        notes: notes.trim() || null,
      });
      setEditing(false);
    } catch (err: unknown) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleCancel = () => {
    setGoals(clientQuery.data?.goals ?? '');
    setNotes(clientQuery.data?.notes ?? '');
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove client?',
      'This removes the client relationship and all their sessions with you. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient.mutateAsync(clientQuery.data!.id);
              router.back();
            } catch (err: unknown) {
              Alert.alert('Failed', err instanceof Error ? err.message : 'Unknown error');
            }
          },
        },
      ],
    );
  };

  const handleAssign = async (programId: string) => {
    try {
      await assignMut.mutateAsync({ program_id: programId, client_id: clientQuery.data!.id });
    } catch (err: unknown) {
      Alert.alert('Assign failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const displayName =
    clientQuery.data.profile?.full_name ??
    clientQuery.data.profile?.email ??
    'Client';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 24 }}>
      {/* ── Name + email ─────────────────────────────────────────── */}
      <Text style={styles.clientName}>{displayName}</Text>
      {clientQuery.data.profile?.email ? (
        <Text style={[styles.clientEmail, { color: colors.muted }]}>{clientQuery.data.profile.email}</Text>
      ) : null}

      {/* ── Header row ───────────────────────────────────────────── */}
      <View style={[styles.headerRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Client info</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={[styles.editLink, { color: colors.success }]}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={handleCancel} disabled={updateClient.isPending}>
              <Text style={[styles.cancelLink, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={updateClient.isPending}>
              {updateClient.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={[styles.saveLink, { color: colors.success }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Goals ────────────────────────────────────────────────── */}
      <Text style={[styles.label, { color: colors.muted }]}>Goals</Text>
      {editing ? (
        <TextInput
          style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
          value={goals}
          onChangeText={setGoals}
          multiline
          placeholder="What is the client working toward?"
        />
      ) : (
        <Text style={styles.value}>{clientQuery.data.goals || '—'}</Text>
      )}

      {/* ── Notes ────────────────────────────────────────────────── */}
      <Text style={[styles.label, { color: colors.muted }]}>Notes</Text>
      {editing ? (
        <TextInput
          style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Private trainer notes"
        />
      ) : (
        <Text style={styles.value}>{clientQuery.data.notes || '—'}</Text>
      )}

      <Text style={[styles.label, { color: colors.muted }]}>Added</Text>
      <Text style={styles.value}>
        {new Date(clientQuery.data.created_at).toLocaleDateString()}
      </Text>

      {/* ── Assigned programs ────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Assigned programs</Text>
      {assigned.isLoading ? (
        <ActivityIndicator style={{ marginTop: 8 }} />
      ) : (assigned.data ?? []).length === 0 ? (
        <Text style={[styles.muted, { color: colors.muted }]}>None yet.</Text>
      ) : (
        (assigned.data ?? []).map((p) => (
          <View key={p.id} style={[styles.programRow, { borderBottomColor: colors.border }]}>
            <Text style={styles.programTitle}>{p.title}</Text>
            {p.description ? <Text style={[styles.muted, { color: colors.muted }]}>{p.description}</Text> : null}
          </View>
        ))
      )}

      {/* ── Assign from unassigned ───────────────────────────────── */}
      {unassigned.length > 0 && (
        <>
          <Text style={[styles.label, { marginTop: 24, color: colors.muted }]}>Assign a program</Text>
          {unassigned.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.assignRow, { borderBottomColor: colors.border }]}
              onPress={() => handleAssign(p.id)}
              disabled={assignMut.isPending}
            >
              <Text style={styles.programTitle}>{p.title}</Text>
              <Text style={[styles.assignLink, { color: colors.success }]}>+ Assign</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* ── Danger zone ──────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.deleteButton, { borderColor: colors.danger }]}
        onPress={handleDelete}
        disabled={deleteClient.isPending}
      >
        {deleteClient.isPending
          ? <ActivityIndicator color={colors.danger} />
          : <Text style={[styles.deleteText, { color: colors.danger }]}>Remove client</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editActions: { flexDirection: 'row', gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  editLink: { fontWeight: '600' },
  cancelLink: {},
  saveLink: { fontWeight: '600' },
  label: { fontSize: 13, marginTop: 16, marginBottom: 4 },
  value: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  clientName: { fontSize: 22, fontWeight: '700' },
  clientEmail: { fontSize: 14, marginTop: 2 },
  muted: { marginTop: 4 },
  programRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  programTitle: { fontSize: 15, fontWeight: '600' },
  assignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  assignLink: { fontWeight: '600' },
  deleteButton: {
    marginTop: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteText: { fontWeight: '600' },
});
