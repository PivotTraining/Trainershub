import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useAvailabilitySlots } from '@/lib/queries/availability';
import { useCreateBooking } from '@/lib/queries/bookings';
import { usePublicTrainerProfile } from '@/lib/queries/browse';
import { useMyPackagePurchases } from '@/lib/queries/packages';
import { availabilityForDay, mergePickerDateTime, validateBookingTime } from '@/lib/scheduling';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { AvailabilitySlot, SessionType } from '@/lib/types';

const DURATIONS = [30, 45, 60, 90] as const;
type Duration = (typeof DURATIONS)[number];

function formatTime(value: string): string {
  const [hourValue, minute = '00'] = value.split(':');
  const hour = Number(hourValue);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function dateAtTime(day: Date, value: string): Date {
  const [hours, minutes = '00'] = value.split(':');
  const next = new Date(day);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  return next;
}

function quickStartsForDay(slots: AvailabilitySlot[], day: Date, durationMin: number): Date[] {
  const now = new Date();
  const starts: Date[] = [];

  for (const slot of slots) {
    const windowStart = dateAtTime(day, slot.start_time);
    const windowEnd = dateAtTime(day, slot.end_time);
    const latestStart = new Date(windowEnd.getTime() - durationMin * 60_000);

    for (let cursor = new Date(windowStart); cursor <= latestStart; cursor = new Date(cursor.getTime() + 30 * 60_000)) {
      if (cursor > now) starts.push(cursor);
      if (starts.length >= 6) return starts;
    }
  }

  return starts;
}

export default function BookingNew() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const clientId = session?.user.id ?? '';
  const { colors, accent } = useTheme();

  const trainerQuery = usePublicTrainerProfile(trainerId);
  const availabilityQuery = useAvailabilitySlots(trainerId);
  const packagesQuery = useMyPackagePurchases(clientId);
  const createBooking = useCreateBooking();

  const [startsAt, setStartsAt] = useState<Date>(defaultStart);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [duration, setDuration] = useState<Duration>(60);
  const [sessionType, setSessionType] = useState<SessionType>('in-person');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const trainerProfile = trainerQuery.data;
  const supportedTypes: SessionType[] = trainerProfile?.session_types ?? ['in-person', 'virtual'];
  const rateCents = trainerProfile?.hourly_rate_cents ?? null;
  const estimatedCents = rateCents != null ? Math.round(rateCents * (duration / 60)) : null;
  const estimatedLabel = estimatedCents != null ? `$${(estimatedCents / 100).toFixed(2)}` : null;

  const eligiblePurchases = (packagesQuery.data ?? []).filter(
    (purchase) => purchase.trainer_id === trainerId && purchase.sessions_remaining > 0,
  );
  const availability = availabilityQuery.data ?? [];
  const selectedDaySlots = availabilityForDay(availability, startsAt);
  const quickStarts = useMemo(
    () => quickStartsForDay(selectedDaySlots, startsAt, duration),
    [selectedDaySlots, startsAt, duration],
  );

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    const mode = pickerMode;
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !selected || !mode) return;
    setStartsAt((current) => mergePickerDateTime(current, selected, mode));
  };

  const handleSubmit = async () => {
    if (!clientId || !trainerId) {
      Alert.alert('Error', 'Missing required information.');
      return;
    }
    if (availabilityQuery.isLoading || availabilityQuery.isFetching) {
      Alert.alert('Checking availability', 'Wait a moment while the trainer’s schedule loads.');
      return;
    }
    if (availabilityQuery.isError) {
      Alert.alert('Availability unavailable', 'TrainerHub could not verify this time. Refresh availability before requesting the session.');
      return;
    }

    const timeValidation = validateBookingTime(startsAt, duration, availability);
    if (!timeValidation.valid) {
      Alert.alert('Choose another time', timeValidation.message);
      return;
    }

    try {
      await createBooking.mutateAsync({
        trainer_id: trainerId,
        client_id: clientId,
        starts_at: startsAt.toISOString(),
        duration_min: duration,
        session_type: sessionType,
        package_purchase_id: selectedPurchaseId,
        notes: notes.trim() || null,
      });

      router.replace({
        pathname: '/booking/success',
        params: {
          trainerName: trainerProfile?.full_name ?? 'Your trainer',
          startsAt: startsAt.toISOString(),
          duration: String(duration),
          sessionType,
        },
      });
    } catch (err: unknown) {
      Alert.alert('Booking failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (trainerQuery.isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  }

  if (trainerQuery.isError || !trainerProfile) {
    return (
      <View style={[styles.center, styles.loadError, { backgroundColor: colors.background }]}>
        <Text accessibilityRole="alert" style={[styles.loadErrorText, { color: colors.danger }]}>Trainer details could not be loaded.</Text>
        <TouchableOpacity style={[styles.retryButton, { borderColor: colors.borderInput }]} onPress={() => trainerQuery.refetch()} accessibilityRole="button">
          <Text style={{ color: colors.ink }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={[styles.kicker, { color: accent }]}>REQUEST A SESSION</Text>
          <Text style={[styles.trainerName, { color: colors.ink }]}>{trainerProfile.full_name ?? 'Trainer'}</Text>
          <Text style={[styles.intro, { color: colors.muted }]}>Choose a time that works. The trainer must confirm before the session is officially booked.</Text>

          <Text style={[styles.label, { color: colors.muted }]}>Date</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: colors.borderInput, backgroundColor: colors.surface }]}
            onPress={() => setPickerMode(pickerMode === 'date' ? null : 'date')}
            accessibilityRole="button"
            accessibilityLabel="Choose booking date"
          >
            <Text style={[styles.pickerBtnText, { color: colors.ink }]}>
              {startsAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </TouchableOpacity>

          {pickerMode === 'date' && (
            <DateTimePicker
              value={startsAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handlePickerChange}
              minimumDate={new Date()}
            />
          )}

          <View style={[styles.availabilityCard, { backgroundColor: colors.surfaceRaised }]}>
            <View style={styles.availabilityHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.availabilityTitle, { color: colors.ink }]}>Available times</Text>
                <Text style={[styles.availabilityText, { color: colors.muted }]}>Tap a time to select it.</Text>
              </View>
              {selectedDaySlots.length > 0 && (
                <Text style={[styles.windowText, { color: colors.muted }]}>
                  {selectedDaySlots.map((slot) => `${formatTime(slot.start_time)}–${formatTime(slot.end_time)}`).join(', ')}
                </Text>
              )}
            </View>

            {availabilityQuery.isLoading ? (
              <ActivityIndicator size="small" style={{ marginTop: 10 }} />
            ) : availabilityQuery.isError ? (
              <View style={{ marginTop: 8 }}>
                <Text accessibilityRole="alert" style={[styles.availabilityText, { color: colors.danger }]}>Availability could not be loaded.</Text>
                <TouchableOpacity onPress={() => availabilityQuery.refetch()} accessibilityRole="button">
                  <Text style={[styles.retryText, { color: accent }]}>Refresh availability</Text>
                </TouchableOpacity>
              </View>
            ) : availability.length === 0 ? (
              <Text style={[styles.availabilityText, { color: colors.muted, marginTop: 8 }]}>No recurring hours published. Use manual time selection below.</Text>
            ) : selectedDaySlots.length === 0 ? (
              <Text accessibilityRole="alert" style={[styles.availabilityText, { color: colors.danger, marginTop: 8 }]}>No availability published for this day.</Text>
            ) : quickStarts.length > 0 ? (
              <View style={styles.quickTimeGrid}>
                {quickStarts.map((time) => {
                  const selected = Math.abs(time.getTime() - startsAt.getTime()) < 60_000;
                  return (
                    <TouchableOpacity
                      key={time.toISOString()}
                      style={[
                        styles.quickTime,
                        { borderColor: selected ? accent : colors.borderInput, backgroundColor: selected ? accent : colors.surface },
                      ]}
                      onPress={() => {
                        setStartsAt(time);
                        setPickerMode(null);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.quickTimeText, { color: selected ? colors.white : colors.ink }]}>
                        {time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.availabilityText, { color: colors.muted, marginTop: 8 }]}>No {duration}-minute starts remain for this day.</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.manualTimeToggle}
            onPress={() => setPickerMode(pickerMode === 'time' ? null : 'time')}
          >
            <Text style={[styles.manualTimeText, { color: accent }]}>Choose a different time manually</Text>
          </TouchableOpacity>

          {pickerMode === 'time' && (
            <DateTimePicker
              value={startsAt}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handlePickerChange}
            />
          )}

          <Text style={[styles.label, { color: colors.muted }]}>Duration</Text>
          <View style={styles.row}>
            {DURATIONS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.segment, { borderColor: colors.borderInput }, duration === value && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setDuration(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: duration === value }}
              >
                <Text style={[styles.segmentText, { color: duration === value ? colors.white : colors.muted }]}>{value}m</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.muted }]}>Session Type</Text>
          <View style={styles.row}>
            {supportedTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.segment, { borderColor: colors.borderInput }, sessionType === type && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setSessionType(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: sessionType === type }}
              >
                <Text style={[styles.segmentText, { color: sessionType === type ? colors.white : colors.muted }]}>{type === 'in-person' ? 'In-Person' : 'Virtual'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {eligiblePurchases.length > 0 && (
            <>
              <Text style={[styles.label, { color: colors.muted }]}>Use a Package</Text>
              <TouchableOpacity style={[styles.packageOption, { borderColor: selectedPurchaseId === null ? accent : colors.borderInput }]} onPress={() => setSelectedPurchaseId(null)}>
                <Text style={[styles.packageOptionText, { color: colors.ink }]}>Single session</Text>
                {selectedPurchaseId === null && <Text style={{ color: accent, fontWeight: '700' }}>✓</Text>}
              </TouchableOpacity>
              {eligiblePurchases.map((purchase) => (
                <TouchableOpacity key={purchase.id} style={[styles.packageOption, { borderColor: selectedPurchaseId === purchase.id ? accent : colors.borderInput }]} onPress={() => setSelectedPurchaseId(purchase.id)}>
                  <View style={styles.packageOptionLeft}>
                    <Text style={[styles.packageOptionText, { color: colors.ink }]}>{purchase.package?.title ?? 'Package'}</Text>
                    <Text style={[styles.packageOptionSub, { color: colors.muted }]}>{purchase.sessions_remaining} sessions remaining</Text>
                  </View>
                  {selectedPurchaseId === purchase.id && <Text style={{ color: accent, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={[styles.label, { color: colors.muted }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surface }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Goals, injuries, questions, or anything your trainer should know…"
            placeholderTextColor={colors.placeholder}
            multiline
          />

          {estimatedLabel && !selectedPurchaseId && (
            <View style={[styles.priceRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.md }]}>
              <View>
                <Text style={[styles.priceLabel, { color: colors.muted }]}>Estimated session price</Text>
                <Text style={[styles.priceHint, { color: colors.placeholder }]}>Based on this trainer’s current hourly rate</Text>
              </View>
              <Text style={[styles.priceValue, { color: colors.ink }]}>{estimatedLabel}</Text>
            </View>
          )}

          {selectedPurchaseId && (
            <View style={[styles.priceRow, { backgroundColor: colors.successBg, borderRadius: radius.md }]}>
              <Text style={[styles.priceLabel, { color: colors.success }]}>Using package session</Text>
              <Text style={[styles.priceValue, { color: colors.success }]}>–1 session</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }, createBooking.isPending && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={createBooking.isPending}
            accessibilityRole="button"
            accessibilityState={{ disabled: createBooking.isPending, busy: createBooking.isPending }}
          >
            {createBooking.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Session Request</Text>}
          </TouchableOpacity>
          <Text style={[styles.pendingNote, { color: colors.placeholder }]}>You are sending a request. You’ll see the final status in Bookings after the trainer responds.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadError: { padding: spacing.lg, gap: spacing.md },
  loadErrorText: { fontSize: typography.md, textAlign: 'center' },
  retryButton: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  container: { padding: spacing.lg, flexGrow: 1 },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 4 },
  trainerName: { fontSize: typography.xl, fontWeight: '900', marginBottom: 5 },
  intro: { fontSize: typography.sm, lineHeight: 20, marginBottom: spacing.sm },
  label: { fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '700' },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  dateBtn: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, alignItems: 'center' },
  pickerBtnText: { fontSize: typography.base, fontWeight: '700' },
  availabilityCard: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  availabilityHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  availabilityTitle: { fontSize: typography.sm, fontWeight: '800', marginBottom: 2 },
  availabilityText: { fontSize: typography.sm, lineHeight: 20 },
  windowText: { maxWidth: '50%', fontSize: typography.xs, lineHeight: 17, textAlign: 'right' },
  retryText: { fontSize: typography.sm, fontWeight: '800', marginTop: spacing.xs },
  quickTimeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickTime: { minWidth: 92, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  quickTimeText: { fontSize: typography.sm, fontWeight: '800' },
  manualTimeToggle: { alignSelf: 'flex-start', paddingVertical: 10 },
  manualTimeText: { fontSize: typography.sm, fontWeight: '800' },
  segment: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  segmentText: { fontSize: typography.sm, fontWeight: '700' },
  packageOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.xs },
  packageOptionLeft: { flex: 1 },
  packageOptionText: { fontSize: typography.md, fontWeight: '700' },
  packageOptionSub: { fontSize: typography.xs, marginTop: 2 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.base },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, paddingVertical: 12, marginTop: spacing.lg },
  priceLabel: { fontSize: typography.sm, fontWeight: '700' },
  priceHint: { fontSize: typography.xs, marginTop: 2 },
  priceValue: { fontSize: typography.lg, fontWeight: '900' },
  button: { borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: typography.base, fontWeight: '900' },
  pendingNote: { fontSize: typography.xs, lineHeight: 17, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
});
