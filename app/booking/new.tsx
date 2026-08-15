import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import type { SessionType } from '@/lib/types';

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

  // Price estimate
  const rateCents = trainerProfile?.hourly_rate_cents ?? null;
  const estimatedCents = rateCents != null ? Math.round(rateCents * (duration / 60)) : null;
  const estimatedLabel = estimatedCents != null
    ? `$${(estimatedCents / 100).toFixed(2)}`
    : null;

  const eligiblePurchases = (packagesQuery.data ?? []).filter(
    (p) => p.trainer_id === trainerId && p.sessions_remaining > 0,
  );
  const availability = availabilityQuery.data ?? [];
  const selectedDaySlots = availabilityForDay(availability, startsAt);

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
      Alert.alert(
        'Availability unavailable',
        'TrainerHub could not verify this time. Refresh availability before requesting the session.',
      );
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
      Alert.alert(
        'Booking requested!',
        "You'll be notified when the trainer confirms.",
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: unknown) {
      Alert.alert('Booking failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (trainerQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (trainerQuery.isError || !trainerProfile) {
    return (
      <View style={[styles.center, styles.loadError, { backgroundColor: colors.background }]}>
        <Text accessibilityRole="alert" style={[styles.loadErrorText, { color: colors.danger }]}>
          Trainer details could not be loaded.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: colors.borderInput }]}
          onPress={() => trainerQuery.refetch()}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.ink }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          {trainerProfile && (
            <Text style={[styles.trainerName, { color: colors.ink }]}>
              {trainerProfile.full_name ?? 'Trainer'}
            </Text>
          )}

          {/* Date & Time */}
          <Text style={[styles.label, { color: colors.muted }]}>Date & Time</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.pickerBtn, { borderColor: colors.borderInput }]}
              onPress={() => setPickerMode(pickerMode === 'date' ? null : 'date')}
              accessibilityRole="button"
              accessibilityLabel="Choose booking date"
            >
              <Text style={[styles.pickerBtnText, { color: colors.ink }]}>
                {startsAt.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerBtn, { borderColor: colors.borderInput }]}
              onPress={() => setPickerMode(pickerMode === 'time' ? null : 'time')}
              accessibilityRole="button"
              accessibilityLabel="Choose booking time"
            >
              <Text style={[styles.pickerBtnText, { color: colors.ink }]}>
                {startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
          {pickerMode && (
            <DateTimePicker
              value={startsAt}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handlePickerChange}
              minimumDate={pickerMode === 'date' ? new Date() : undefined}
            />
          )}

          <View style={[styles.availabilityCard, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[styles.availabilityTitle, { color: colors.ink }]}>Trainer availability</Text>
            {availabilityQuery.isLoading ? (
              <ActivityIndicator size="small" />
            ) : availabilityQuery.isError ? (
              <View>
                <Text accessibilityRole="alert" style={[styles.availabilityText, { color: colors.danger }]}>
                  Availability could not be loaded.
                </Text>
                <TouchableOpacity onPress={() => availabilityQuery.refetch()} accessibilityRole="button">
                  <Text style={[styles.retryText, { color: accent }]}>Refresh availability</Text>
                </TouchableOpacity>
              </View>
            ) : availability.length === 0 ? (
              <Text style={[styles.availabilityText, { color: colors.muted }]}>
                No recurring hours published. You can still request a time.
              </Text>
            ) : selectedDaySlots.length === 0 ? (
              <Text accessibilityRole="alert" style={[styles.availabilityText, { color: colors.danger }]}>
                No availability published for {startsAt.toLocaleDateString(undefined, { weekday: 'long' })}.
              </Text>
            ) : (
              <Text style={[styles.availabilityText, { color: colors.muted }]}>
                {selectedDaySlots.map((slot) => `${formatTime(slot.start_time)}–${formatTime(slot.end_time)}`).join(', ')}
              </Text>
            )}
          </View>

          {/* Duration */}
          <Text style={[styles.label, { color: colors.muted }]}>Duration</Text>
          <View style={styles.row}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.segment,
                  { borderColor: colors.borderInput },
                  duration === d && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setDuration(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: duration === d }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: duration === d ? colors.white : colors.muted },
                  ]}
                >
                  {d}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Session Type */}
          <Text style={[styles.label, { color: colors.muted }]}>Session Type</Text>
          <View style={styles.row}>
            {supportedTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.segment,
                  { borderColor: colors.borderInput },
                  sessionType === type && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setSessionType(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: sessionType === type }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: sessionType === type ? colors.white : colors.muted },
                  ]}
                >
                  {type === 'in-person' ? 'In-Person' : 'Virtual'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Package picker */}
          {eligiblePurchases.length > 0 && (
            <>
              <Text style={[styles.label, { color: colors.muted }]}>Use a Package</Text>
              <TouchableOpacity
                style={[
                  styles.packageOption,
                  { borderColor: colors.borderInput },
                  selectedPurchaseId === null && { borderColor: colors.disabled },
                ]}
                onPress={() => setSelectedPurchaseId(null)}
              >
                <Text style={[styles.packageOptionText, { color: colors.ink }]}>
                  Single session
                </Text>
                {selectedPurchaseId === null && (
                  <Text style={{ color: accent, fontWeight: '600' }}>✓</Text>
                )}
              </TouchableOpacity>
              {eligiblePurchases.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.packageOption,
                    { borderColor: colors.borderInput },
                    selectedPurchaseId === p.id && { borderColor: accent },
                  ]}
                  onPress={() => setSelectedPurchaseId(p.id)}
                >
                  <View style={styles.packageOptionLeft}>
                    <Text style={[styles.packageOptionText, { color: colors.ink }]}>
                      {p.package?.title ?? 'Package'}
                    </Text>
                    <Text style={[styles.packageOptionSub, { color: colors.muted }]}>
                      {p.sessions_remaining} sessions remaining
                    </Text>
                  </View>
                  {selectedPurchaseId === p.id && (
                    <Text style={{ color: accent, fontWeight: '600' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Notes */}
          <Text style={[styles.label, { color: colors.muted }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any details for your trainer…"
            placeholderTextColor={colors.placeholder}
            multiline
          />

          {/* Price estimate */}
          {estimatedLabel && !selectedPurchaseId && (
            <View style={[styles.priceRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.md }]}>
              <Text style={[styles.priceLabel, { color: colors.muted }]}>Trainer charges approx.</Text>
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
            {createBooking.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Request Session</Text>
            )}
          </TouchableOpacity>
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
  trainerName: { fontSize: typography.xl, fontWeight: '700', marginBottom: spacing.md },
  label: { fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pickerBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerBtnText: { fontSize: typography.base },
  availabilityCard: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  availabilityTitle: { fontSize: typography.sm, fontWeight: '700', marginBottom: 4 },
  availabilityText: { fontSize: typography.sm, lineHeight: 20 },
  retryText: { fontSize: typography.sm, fontWeight: '700', marginTop: spacing.xs },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  segmentText: { fontSize: typography.sm, fontWeight: '600' },
  packageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  packageOptionLeft: { flex: 1 },
  packageOptionText: { fontSize: typography.md, fontWeight: '500' },
  packageOptionSub: { fontSize: typography.xs, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: typography.base, fontWeight: '600' },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.lg,
  },
  priceLabel: { fontSize: typography.sm },
  priceValue: { fontSize: typography.md, fontWeight: '700' },
});
