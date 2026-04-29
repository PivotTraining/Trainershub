import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import {
  useJournalEntries,
  useCreateJournalEntry,
  useDeleteJournalEntry,
} from '@/lib/queries/journal';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { JournalEntry } from '@/lib/types';

const MOOD_EMOJI = ['', '😔', '😐', '🙂', '😊', '🤩'] as const;
const MOOD_LABELS = ['', 'Rough', 'Okay', 'Good', 'Great', 'Amazing'] as const;

function calculateStreakWeeks(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;

  const getWeekKey = (date: Date): string => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    return monday.toISOString().slice(0, 10);
  };

  const weeksWithEntries = new Set(
    entries.map((e) => getWeekKey(new Date(e.created_at))),
  );

  const today = new Date();
  let streak = 0;
  const current = new Date(today);

  while (true) {
    const key = getWeekKey(current);
    if (!weeksWithEntries.has(key)) break;
    streak += 1;
    current.setDate(current.getDate() - 7);
  }

  return streak;
}

// ── New Entry Modal ────────────────────────────────────────────────────────────

interface NewEntryModalProps {
  visible: boolean;
  clientId: string;
  onClose: () => void;
}

function NewEntryModal({ visible, clientId, onClose }: NewEntryModalProps) {
  const { colors, accent } = useTheme();
  const createEntry = useCreateJournalEntry(clientId);
  const [mood, setMood] = useState<number>(0);
  const [body, setBody] = useState('');

  const reset = () => {
    setMood(0);
    setBody('');
  };

  const handleSubmit = async () => {
    if (mood === 0) {
      Alert.alert('Mood required', 'Please select how you felt.');
      return;
    }
    try {
      await createEntry.mutateAsync({
        mood,
        body: body.trim() || null,
        session_id: null,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.ink }]}>New Entry</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={createEntry.isPending}>
            {createEntry.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={[styles.modalSave, { color: accent }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={[styles.label, { color: colors.muted }]}>How are you feeling?</Text>
          <View style={styles.moodRow}>
            {([1, 2, 3, 4, 5] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.moodBtn,
                  mood === m && { backgroundColor: accent + '22', borderColor: accent },
                  { borderColor: colors.borderInput },
                ]}
                onPress={() => setMood(m)}
              >
                <Text style={styles.moodEmoji}>{MOOD_EMOJI[m]}</Text>
                <Text style={[styles.moodLabel, { color: mood === m ? accent : colors.muted }]}>
                  {MOOD_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>How was your session?</Text>
          <TextInput
            style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
            value={body}
            onChangeText={setBody}
            placeholder="Write about your workout, progress, thoughts…"
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Entry Card ─────────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: JournalEntry;
  clientId: string;
}

function EntryCard({ entry, clientId }: EntryCardProps) {
  const { colors } = useTheme();
  const deleteEntry = useDeleteJournalEntry(clientId);
  const moodNum = entry.mood ?? 0;

  const handleDelete = () => {
    Alert.alert('Delete entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry.mutateAsync(entry.id);
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.entryDate, { color: colors.muted }]}>
          {new Date(entry.created_at).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <TouchableOpacity onPress={handleDelete} disabled={deleteEntry.isPending}>
          {deleteEntry.isPending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={[styles.deleteBtn, { color: colors.danger }]}>✕</Text>
          )}
        </TouchableOpacity>
      </View>
      {moodNum > 0 && (
        <View style={styles.moodDisplay}>
          <Text style={styles.moodEmojiDisplay}>{MOOD_EMOJI[moodNum]}</Text>
          <Text style={[styles.moodLabelDisplay, { color: colors.muted }]}>
            {MOOD_LABELS[moodNum]}
          </Text>
        </View>
      )}
      {entry.body ? (
        <Text style={[styles.entryBody, { color: colors.inkSoft }]}>{entry.body}</Text>
      ) : null}
      {entry.session_id ? (
        <Text style={[styles.sessionLink, { color: colors.info }]}>
          Session on {new Date(entry.created_at).toLocaleDateString()}
        </Text>
      ) : null}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function Journal() {
  const { session } = useAuth();
  const clientId = session?.user.id ?? '';
  const { colors, accent } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const entriesQuery = useJournalEntries(clientId);
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const streakWeeks = useMemo(() => calculateStreakWeeks(entries), [entries]);

  if (entriesQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[styles.list, entries.length === 0 && { flex: 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={entriesQuery.isFetching && !entriesQuery.isLoading}
            onRefresh={entriesQuery.refetch}
          />
        }
        ListHeaderComponent={
          streakWeeks > 0 ? (
            <View style={[styles.streakBanner, { backgroundColor: colors.warningBg }]}>
              <Text style={[styles.streakText, { color: colors.warning }]}>
                🔥 {streakWeeks}-week streak
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <EntryCard entry={item} clientId={clientId} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.placeholder }]}>
              No journal entries yet. Tap + to log your first session.
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accent }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <NewEntryModal
        visible={showModal}
        clientId={clientId}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 100 },
  streakBanner: {
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  streakText: { fontSize: typography.md, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: typography.sm, textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  entryDate: { fontSize: typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  deleteBtn: { fontSize: typography.md, fontWeight: '600', paddingHorizontal: 4 },
  moodDisplay: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  moodEmojiDisplay: { fontSize: 24 },
  moodLabelDisplay: { fontSize: typography.sm, fontWeight: '500' },
  entryBody: { fontSize: typography.md, lineHeight: 22, marginTop: spacing.xs },
  sessionLink: { fontSize: typography.xs, marginTop: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  // Modal
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: typography.md, fontWeight: '700' },
  modalCancel: { fontSize: typography.md },
  modalSave: { fontSize: typography.md, fontWeight: '600' },
  modalContent: { padding: spacing.lg },
  label: { fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  moodRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  moodBtn: {
    flex: 1,
    minWidth: 56,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  moodEmoji: { fontSize: 24 },
  moodLabel: { fontSize: typography.xs, marginTop: 2, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
