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
import { Ionicons } from '@expo/vector-icons';

import { EnergyHero } from '@/components/EnergyHero';
import { useAuth } from '@/lib/auth';
import { useJournalEntries, useCreateJournalEntry, useDeleteJournalEntry } from '@/lib/queries/journal';
import { BRAND, spacing, typography } from '@/lib/theme';
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
  const weeksWithEntries = new Set(entries.map((e) => getWeekKey(new Date(e.created_at))));
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

  const reset = () => { setMood(0); setBody(''); };

  const handleSubmit = async () => {
    if (mood === 0) {
      Alert.alert('Mood required', 'Please select how you felt.');
      return;
    }
    try {
      await createEntry.mutateAsync({ mood, body: body.trim() || null, session_id: null });
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
          <TouchableOpacity onPress={() => { reset(); onClose(); }}><Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.ink }]}>New reflection</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={createEntry.isPending}>
            {createEntry.isPending ? <ActivityIndicator size="small" /> : <Text style={[styles.modalSave, { color: accent }]}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={[styles.label, { color: colors.muted }]}>How are you feeling?</Text>
          <View style={styles.moodRow}>
            {([1, 2, 3, 4, 5] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.moodBtn, { borderColor: mood === m ? accent : colors.borderInput, backgroundColor: mood === m ? BRAND.navy : colors.surfaceCard }]}
                onPress={() => setMood(m)}
              >
                <Text style={styles.moodEmoji}>{MOOD_EMOJI[m]}</Text>
                <Text style={[styles.moodLabel, { color: mood === m ? '#FFFFFF' : colors.muted }]}>{MOOD_LABELS[m]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>What stood out?</Text>
          <TextInput
            style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surfaceCard }]}
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

function EntryCard({ entry, clientId }: { entry: JournalEntry; clientId: string }) {
  const { colors, accent } = useTheme();
  const deleteEntry = useDeleteJournalEntry(clientId);
  const moodNum = entry.mood ?? 0;

  const handleDelete = () => {
    Alert.alert('Delete entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteEntry.mutateAsync(entry.id); }
        catch (err: unknown) { Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error'); }
      } },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={[styles.cardRail, { backgroundColor: accent }]} />
      <View style={styles.cardHeader}>
        <Text style={[styles.entryDate, { color: colors.muted }]}>
          {new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={handleDelete} disabled={deleteEntry.isPending}>
          {deleteEntry.isPending ? <ActivityIndicator size="small" /> : <Ionicons name="trash-outline" size={16} color={colors.placeholder} />}
        </TouchableOpacity>
      </View>
      {moodNum > 0 ? (
        <View style={styles.moodDisplay}>
          <Text style={styles.moodEmojiDisplay}>{MOOD_EMOJI[moodNum]}</Text>
          <View><Text style={[styles.moodEyebrow, { color: accent }]}>CHECK-IN</Text><Text style={[styles.moodLabelDisplay, { color: colors.ink }]}>{MOOD_LABELS[moodNum]}</Text></View>
        </View>
      ) : null}
      {entry.body ? <Text style={[styles.entryBody, { color: colors.inkSoft }]}>{entry.body}</Text> : null}
      {entry.session_id ? <Text style={[styles.sessionLink, { color: accent }]}>Linked to session</Text> : null}
    </View>
  );
}

export default function Journal() {
  const { session } = useAuth();
  const clientId = session?.user.id ?? '';
  const { colors, accent } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const entriesQuery = useJournalEntries(clientId);
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const streakWeeks = useMemo(() => calculateStreakWeeks(entries), [entries]);

  if (entriesQuery.isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[styles.list, entries.length === 0 && { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={entriesQuery.isFetching && !entriesQuery.isLoading} onRefresh={entriesQuery.refetch} />}
        ListHeaderComponent={
          <>
            <EnergyHero eyebrow="REFLECT • NOTICE • GROW" title="Journal" subtitle="Capture how training feels, not just what you completed." icon="book-outline" compact />
            <View style={[styles.momentumStrip, { borderColor: colors.border }]}>
              <View style={[styles.momentumRail, { backgroundColor: accent }]} />
              <Ionicons name="flame-outline" size={20} color={accent} />
              <Text style={[styles.momentumText, { color: colors.ink }]}>{streakWeeks > 0 ? `${streakWeeks}-week reflection streak` : 'Start your reflection streak'}</Text>
            </View>
            <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: colors.ink }]}>Recent reflections</Text><View style={styles.sectionBeam} /></View>
          </>
        }
        renderItem={({ item }) => <EntryCard entry={item} clientId={clientId} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="create-outline" size={28} color={accent} />
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>Nothing written yet.</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Your first reflection can be one sentence.</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.newEntryButton} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={17} color="#FFFFFF" />
        <Text style={styles.newEntryText}>New entry</Text>
      </TouchableOpacity>
      <NewEntryModal visible={showModal} clientId={clientId} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 110 },
  momentumStrip: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, paddingVertical: 14, marginTop: 12 },
  momentumRail: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 2 },
  momentumText: { fontSize: 13, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionBeam: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.22, marginBottom: 5 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  emptyText: { fontSize: typography.sm, textAlign: 'center' },
  card: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: 14, padding: spacing.md, marginBottom: 10 },
  cardRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.66 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  entryDate: { fontSize: typography.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  moodDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xs },
  moodEmojiDisplay: { fontSize: 24 },
  moodEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  moodLabelDisplay: { fontSize: typography.sm, fontWeight: '800', marginTop: 1 },
  entryBody: { fontSize: typography.md, lineHeight: 22, marginTop: spacing.xs },
  sessionLink: { fontSize: typography.xs, marginTop: spacing.sm, fontWeight: '800' },
  newEntryButton: { position: 'absolute', right: spacing.md, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND.navy, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, shadowColor: BRAND.navy, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 12 },
  newEntryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: typography.md, fontWeight: '800' },
  modalCancel: { fontSize: typography.md },
  modalSave: { fontSize: typography.md, fontWeight: '800' },
  modalContent: { padding: spacing.lg },
  label: { fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '700' },
  moodRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  moodBtn: { flex: 1, minWidth: 62, alignItems: 'center', paddingVertical: spacing.sm, borderWidth: 1, borderRadius: 9 },
  moodEmoji: { fontSize: 24 },
  moodLabel: { fontSize: typography.xs, marginTop: 2, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.base },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
