import { useState } from 'react';
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
  useAvailabilitySlots,
  useCreateSlot,
  useDeleteSlot,
} from '@/lib/queries/availability';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { AvailabilitySlot, DayOfWeek } from '@/lib/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAYS_ORDERED: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

function formatTime(hhmm: string): string {
  const [hourStr, minStr] = hhmm.split(':');
  const hour = parseInt(hourStr, 10);
  const min = minStr ?? '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${min} ${period}`;
}

interface AddSlotModalProps {
  visible: boolean;
  trainerId: string;
  onClose: () => void;
}

function AddSlotModal({ visible, trainerId, onClose }: AddSlotModalProps) {
  const { colors, accent } = useTheme();
  const createSlot = useCreateSlot(trainerId);
  const [day, setDay] = useState<DayOfWeek>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const handleAdd = async () => {
    if (!startTime.match(/^\d{1,2}:\d{2}$/) || !endTime.match(/^\d{1,2}:\d{2}$/)) {
      Alert.alert('Invalid time', 'Enter times in HH:MM format (e.g. 09:00).');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Invalid range', 'Start time must be before end time.');
      return;
    }
    try {
      await createSlot.mutateAsync({
        day_of_week: day,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
      });
      onClose();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.ink }]}>Add Slot</Text>
          <TouchableOpacity onPress={handleAdd} disabled={createSlot.isPending}>
            {createSlot.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={[styles.modalSave, { color: accent }]}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={[styles.label, { color: colors.muted }]}>Day of Week</Text>
          <View style={styles.dayRow}>
            {DAYS_ORDERED.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dayBtn,
                  { borderColor: colors.borderInput },
                  day === d && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setDay(d)}
              >
                <Text
                  style={[
                    styles.dayBtnText,
                    { color: day === d ? colors.white : colors.muted },
                  ]}
                >
                  {DAY_NAMES[d]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>Start Time (HH:MM)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.borderInput, color: colors.ink }]}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="09:00"
            placeholderTextColor={colors.placeholder}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={[styles.label, { color: colors.muted }]}>End Time (HH:MM)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.borderInput, color: colors.ink }]}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="10:00"
            placeholderTextColor={colors.placeholder}
            keyboardType="numbers-and-punctuation"
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface SlotRowProps {
  slot: AvailabilitySlot;
  trainerId: string;
}

function SlotRow({ slot, trainerId }: SlotRowProps) {
  const { colors } = useTheme();
  const deleteSlot = useDeleteSlot(trainerId);

  const handleDelete = () => {
    Alert.alert('Remove slot?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSlot.mutateAsync(slot.id);
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.slotRow, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}>
      <Text style={[styles.slotTime, { color: colors.ink }]}>
        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
      </Text>
      <TouchableOpacity onPress={handleDelete} disabled={deleteSlot.isPending}>
        {deleteSlot.isPending ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text style={[styles.deleteBtn, { color: colors.danger }]}>✕</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function Availability() {
  const { session } = useAuth();
  const trainerId = session?.user.id ?? '';
  const { colors, accent } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const slotsQuery = useAvailabilitySlots(trainerId);
  const allSlots = slotsQuery.data ?? [];

  if (slotsQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={DAYS_ORDERED}
        keyExtractor={(d) => String(d)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={slotsQuery.isFetching && !slotsQuery.isLoading}
            onRefresh={slotsQuery.refetch}
          />
        }
        renderItem={({ item: day }) => {
          const daySlots = allSlots.filter((s) => s.day_of_week === day);
          if (daySlots.length === 0) return null;
          return (
            <View style={styles.daySection}>
              <Text style={[styles.daySectionHeader, { color: colors.muted }]}>
                {DAY_NAMES[day]}
              </Text>
              {daySlots.map((slot) => (
                <SlotRow key={slot.id} slot={slot} trainerId={trainerId} />
              ))}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.placeholder }]}>
            No availability set. Tap + to add your first slot.
          </Text>
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accent }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.fabText}>+ Add Slot</Text>
      </TouchableOpacity>
      <AddSlotModal
        visible={showModal}
        trainerId={trainerId}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 100 },
  empty: { fontSize: typography.sm, textAlign: 'center', marginTop: spacing.xl },
  daySection: { marginBottom: spacing.md },
  daySectionHeader: {
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  slotTime: { fontSize: typography.md },
  deleteBtn: { fontSize: typography.lg, fontWeight: '600', paddingHorizontal: 4 },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: typography.md },
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
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  dayBtnText: { fontSize: typography.sm, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
  },
});
