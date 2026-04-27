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
import { colors } from '@/lib/theme';
import type { SessionStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: SessionStatus; label: string; color: string }[] = [
  { value: 'scheduled',  label: 'Scheduled',  color: colors.statusScheduled },
  { value: 'completed',  label: 'Completed',  color: colors.statusCompleted },
  { value: 'canceled',   label: 'Canceled',   color: colors.statusCanceled  },
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
    return <View style={styles.center}><ActivityIndicator /></View>;
  }
  if (error) {
    return <View style={styles.center}><Text style={styles.error}>{(error as Error).message}</Text></View>;
  }
  if (!data) {
    return <View style={styles.center}><Text>Session not found.</Text></View>;
  }

  const clientDisplay = data.clientName ?? data.clientEmail ?? 'Unknown client';

  const handleDelete = () => {
    Alert.alert('Delete session?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(data.id);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Client ───────────────────────────────────────────────── */}
      <View style={styles.clientRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{clientDisplay.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.clientName}>{clientDisplay}</Text>
          {data.clientEmail && data.clientName ? (
            <Text style={styles.clientEmail}>{data.clientEmail}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Quick actions (trainer only, scheduled only) ───────────── */}
      {isTrainer && data.status === 'scheduled' && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/session/edit/[id]', params: { id: data.id } })}
        >
          <Text style={styles.editButtonText}>Edit time & duration</Text>
        </TouchableOpacity>
      )}

      {/* ── Details ───────────────────────────────────────────────── */}
      <Text style={styles.label}>When</Text>
      <Text style={styles.value}>
        {new Date(data.starts_at).toLocaleString([], {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })}
      </Text>

      <Text style={styles.label}>Duration</Text>
      <Text style={styles.value}>{data.duration_min} min</Text>

      <Text style={styles.label}>Status</Text>
      <Text style={[styles.value, styles.statusText,
        { color: STATUS_OPTIONS.find(o => o.value === data.status)?.color }]}>
        {data.status}
      </Text>

      {data.notes ? (
        <>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>{data.notes}</Text>
        </>
      ) : null}

      {/* ── Status picker (trainer only) ──────────────────────────── */}
      {isTrainer && (
        <View style={styles.actions}>
          <Text style={styles.label}>Set status</Text>
          <View style={styles.statusRow}>
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
                <Text style={[
                  styles.statusButtonText,
                  { color: data.status === opt.value ? colors.white : opt.color },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Danger zone ───────────────────────────────────────────── */}
      {isTrainer && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={del.isPending}
        >
          {del.isPending
            ? <ActivityIndicator color={colors.danger} />
            : <Text style={styles.deleteText}>Delete session</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // client header
  clientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingBottom: 20, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  clientName: { fontSize: 17, fontWeight: '700' },
  clientEmail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  // fields
  label: { fontSize: 13, color: colors.muted, marginTop: 16, marginBottom: 4 },
  value: { fontSize: 16 },
  statusText: { textTransform: 'capitalize', fontWeight: '600' },
  error: { color: colors.danger },
  // status picker
  actions: { marginTop: 24 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusButton: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  statusButtonText: { fontWeight: '600' },
  // quick-edit
  editButton: {
    borderWidth: 1, borderColor: colors.borderInput, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center', marginBottom: 8,
  },
  editButtonText: { color: colors.inkSoft, fontWeight: '600' },
  // delete
  deleteButton: {
    borderWidth: 1, borderColor: colors.danger, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center', marginTop: 32,
  },
  deleteText: { color: colors.danger, fontWeight: '600' },
});
