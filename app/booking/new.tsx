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
import { useCreateBooking } from '@/lib/queries/bookings';
import { usePublicTrainerProfile } from '@/lib/queries/browse';
import { useMyPackagePurchases } from '@/lib/queries/packages';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { SessionType } from '@/lib/types';

const DURATIONS = [30, 45, 60, 90] as const;
type Duration = (typeof DURATIONS)[number];

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

  const eligiblePurchases = (packagesQuery.data ?? []).filter(
    (p) => p.trainer_id === trainerId && p.sessions_remaining > 0,
  );

  const handlePickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (!selected) return;
    setStartsAt(selected);
  };

  const handleSubmit = async () => {
    if (!clientId || !trainerId) {
      Alert.alert('Error', 'Missing required information.');
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
            >
              <Text style={[styles.pickerBtnText, { color: colors.ink }]}>
                {startsAt.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerBtn, { borderColor: colors.borderInput }]}
              onPress={() => setPickerMode(pickerMode === 'time' ? null : 'time')}
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
            />
          )}

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
                  Pay individually
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

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }, createBooking.isPending && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={createBooking.isPending}
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
});
