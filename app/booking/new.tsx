import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
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

import { EnergyHero } from '@/components/EnergyHero';
import { useAuth } from '@/lib/auth';
import { useAvailabilitySlots } from '@/lib/queries/availability';
import { useCreateBooking } from '@/lib/queries/bookings';
import { usePublicTrainerProfile } from '@/lib/queries/browse';
import { useMyPackagePurchases } from '@/lib/queries/packages';
import { availabilityForDay, mergePickerDateTime, validateBookingTime } from '@/lib/scheduling';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { AvailabilitySlot, SessionType } from '@/lib/types';

const DURATIONS = [30, 45, 60, 90] as const;
type Duration = (typeof DURATIONS)[number];

function formatTime(value: string): string {
  const [hourValue, minute = '00'] = value.split(':');
  const hour = Number(hourValue);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
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
  const eligiblePurchases = (packagesQuery.data ?? []).filter((purchase) => purchase.trainer_id === trainerId && purchase.sessions_remaining > 0);
  const availability = availabilityQuery.data ?? [];
  const selectedDaySlots = availabilityForDay(availability, startsAt);
  const quickStarts = useMemo(() => quickStartsForDay(selectedDaySlots, startsAt, duration), [selectedDaySlots, startsAt, duration]);

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    const mode = pickerMode;
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !selected || !mode) return;
    setStartsAt((current) => mergePickerDateTime(current, selected, mode));
  };

  const handleSubmit = async () => {
    if (!clientId || !trainerId) return Alert.alert('Error', 'Missing required information.');
    if (availabilityQuery.isLoading || availabilityQuery.isFetching) return Alert.alert('Checking availability', 'Wait a moment while the trainer’s schedule loads.');
    if (availabilityQuery.isError) return Alert.alert('Availability unavailable', 'TrainerHub could not verify this time. Refresh availability before requesting the session.');
    const timeValidation = validateBookingTime(startsAt, duration, availability);
    if (!timeValidation.valid) return Alert.alert('Choose another time', timeValidation.message);

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
      router.replace({ pathname: '/booking/success', params: { trainerName: trainerProfile?.full_name ?? 'Your trainer', startsAt: startsAt.toISOString(), duration: String(duration), sessionType } });
    } catch (error: unknown) {
      Alert.alert('Booking failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (trainerQuery.isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  if (trainerQuery.isError || !trainerProfile) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.danger }}>Trainer details could not be loaded.</Text><TouchableOpacity style={[styles.retryBtn, { borderColor: colors.border }]} onPress={() => trainerQuery.refetch()}><Text style={{ color: colors.ink }}>Try again</Text></TouchableOpacity></View>;
  }

  const trainerName = trainerProfile.full_name ?? 'Trainer';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <EnergyHero eyebrow="BOOK A SESSION" title={`Train with ${trainerName.split(' ')[0]}.`} subtitle="Choose the session details. Your request becomes official when the trainer confirms it." icon="calendar-outline" compact />

          <Section title="When" number="01" accent={accent} colors={colors} />
          <TouchableOpacity style={[styles.dateLine, { borderColor: colors.border }]} onPress={() => setPickerMode(pickerMode === 'date' ? null : 'date')}>
            <View><Text style={[styles.lineLabel, { color: colors.muted }]}>DATE</Text><Text style={[styles.lineValue, { color: colors.ink }]}>{startsAt.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text></View>
            <Ionicons name="calendar-outline" size={18} color={accent} />
          </TouchableOpacity>
          {pickerMode === 'date' ? <DateTimePicker value={startsAt} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handlePickerChange} minimumDate={new Date()} /> : null}

          <View style={[styles.availability, { borderColor: colors.border }]}>
            <View style={styles.availabilityTop}>
              <View><Text style={[styles.lineLabel, { color: accent }]}>AVAILABLE STARTS</Text><Text style={[styles.availabilityHint, { color: colors.muted }]}>{selectedDaySlots.length ? selectedDaySlots.map((slot) => `${formatTime(slot.start_time)}–${formatTime(slot.end_time)}`).join(', ') : 'Published trainer availability'}</Text></View>
              <View style={styles.availabilityBeam} />
            </View>
            {availabilityQuery.isLoading ? <ActivityIndicator style={{ marginTop: 12 }} /> : availabilityQuery.isError ? (
              <TouchableOpacity onPress={() => availabilityQuery.refetch()}><Text style={[styles.errorText, { color: colors.danger }]}>Couldn’t load availability. Tap to retry.</Text></TouchableOpacity>
            ) : quickStarts.length ? (
              <View style={styles.quickGrid}>{quickStarts.map((time) => {
                const selected = Math.abs(time.getTime() - startsAt.getTime()) < 60_000;
                return <TouchableOpacity key={time.toISOString()} style={[styles.quickTime, { borderColor: selected ? accent : colors.border, backgroundColor: selected ? BRAND.navy : 'transparent' }]} onPress={() => { setStartsAt(time); setPickerMode(null); }}><View style={[styles.quickRail, { backgroundColor: selected ? accent : colors.border }]} /><Text style={[styles.quickTimeText, { color: selected ? '#FFFFFF' : colors.ink }]}>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></TouchableOpacity>;
              })}</View>
            ) : <Text style={[styles.availabilityHint, { color: colors.muted, marginTop: 12 }]}>No {duration}-minute starts available for this day.</Text>}
          </View>
          <TouchableOpacity onPress={() => setPickerMode(pickerMode === 'time' ? null : 'time')}><Text style={[styles.manualLink, { color: accent }]}>Choose a different time manually</Text></TouchableOpacity>
          {pickerMode === 'time' ? <DateTimePicker value={startsAt} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handlePickerChange} /> : null}

          <Section title="Session" number="02" accent={accent} colors={colors} />
          <Text style={[styles.lineLabel, { color: colors.muted }]}>DURATION</Text>
          <View style={styles.optionRow}>{DURATIONS.map((value) => <Option key={value} selected={duration === value} label={`${value} min`} onPress={() => setDuration(value)} accent={accent} colors={colors} />)}</View>
          <Text style={[styles.lineLabel, { color: colors.muted, marginTop: 17 }]}>FORMAT</Text>
          <View style={styles.optionRow}>{supportedTypes.map((type) => <Option key={type} selected={sessionType === type} label={type === 'in-person' ? 'In-person' : 'Virtual'} onPress={() => setSessionType(type)} accent={accent} colors={colors} />)}</View>

          {eligiblePurchases.length ? <><Text style={[styles.lineLabel, { color: colors.muted, marginTop: 17 }]}>PAYMENT OPTION</Text><View style={styles.packageList}><Option selected={selectedPurchaseId === null} label="Single session" onPress={() => setSelectedPurchaseId(null)} accent={accent} colors={colors} />{eligiblePurchases.map((purchase) => <Option key={purchase.id} selected={selectedPurchaseId === purchase.id} label={`${purchase.package?.title ?? 'Package'} · ${purchase.sessions_remaining} left`} onPress={() => setSelectedPurchaseId(purchase.id)} accent={accent} colors={colors} />)}</View></> : null}

          <Section title="Anything to know?" number="03" accent={accent} colors={colors} />
          <TextInput style={[styles.notes, { borderColor: colors.border, backgroundColor: colors.surfaceCard, color: colors.ink }]} value={notes} onChangeText={setNotes} placeholder="Goals, injuries, questions, or context for your trainer…" placeholderTextColor={colors.placeholder} multiline />

          <View style={[styles.summary, { borderColor: colors.border }]}>
            <View style={[styles.summaryRail, { backgroundColor: accent }]} />
            <View><Text style={[styles.lineLabel, { color: accent }]}>{selectedPurchaseId ? 'PACKAGE SESSION' : 'ESTIMATED TOTAL'}</Text><Text style={[styles.summaryHint, { color: colors.muted }]}>{startsAt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {duration} min · {sessionType === 'in-person' ? 'In-person' : 'Virtual'}</Text></View>
            <Text style={[styles.price, { color: colors.ink }]}>{selectedPurchaseId ? '–1 session' : estimatedLabel ?? '—'}</Text>
          </View>

          <TouchableOpacity style={[styles.primary, createBooking.isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={createBooking.isPending}>
            {createBooking.isPending ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>Send session request</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></>}
          </TouchableOpacity>
          <Text style={[styles.pendingNote, { color: colors.placeholder }]}>This sends a request, not an automatic confirmation.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, number, accent, colors }: { title: string; number: string; accent: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <View style={styles.section}><Text style={[styles.sectionNumber, { color: accent }]}>{number}</Text><Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text><View style={styles.sectionBeam} /></View>;
}
function Option({ selected, label, onPress, accent, colors }: { selected: boolean; label: string; onPress: () => void; accent: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <TouchableOpacity style={[styles.option, { borderColor: selected ? accent : colors.border, backgroundColor: selected ? BRAND.navy : colors.surfaceCard }]} onPress={onPress}><View style={[styles.optionRail, { backgroundColor: selected ? accent : colors.border }]} /><Text style={[styles.optionText, { color: selected ? '#FFFFFF' : colors.ink }]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 52 },
  retryBtn: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 },
  section: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, marginTop: 27, marginBottom: 13 },
  sectionNumber: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { fontSize: 20, fontWeight: '900' },
  sectionBeam: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.2, marginBottom: 5 },
  lineLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  lineValue: { fontSize: 16, fontWeight: '900', marginTop: 3 },
  dateLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14 },
  availability: { borderBottomWidth: 1, paddingVertical: 14 },
  availabilityTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  availabilityHint: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  availabilityBeam: { flex: 1, height: 1, backgroundColor: BRAND.purple, opacity: 0.2, marginBottom: 5 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  quickTime: { position: 'relative', overflow: 'hidden', minWidth: 96, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  quickRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2 },
  quickTimeText: { fontSize: 13, fontWeight: '800' },
  manualLink: { fontSize: 12, fontWeight: '800', marginTop: 10 },
  errorText: { fontSize: 12, fontWeight: '700', marginTop: 10 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  option: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 10 },
  optionRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2 },
  optionText: { fontSize: 12, fontWeight: '800' },
  packageList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  notes: { borderWidth: 1, borderRadius: 10, minHeight: 105, padding: 13, fontSize: 14, textAlignVertical: 'top' },
  summary: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16, marginTop: 22 },
  summaryRail: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 2 },
  summaryHint: { fontSize: 11, marginTop: 3 },
  price: { fontSize: 22, fontWeight: '900' },
  primary: { marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND.navy, borderRadius: 10, paddingVertical: 15 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  pendingNote: { textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 9 },
});
