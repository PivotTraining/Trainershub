import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
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
type Step = 1 | 2 | 3;

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
      if (starts.length >= 8) return starts;
    }
  }
  return starts;
}

export default function BookingNew() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const clientId = session?.user.id ?? '';
  const { colors } = useTheme();
  const trainerQuery = usePublicTrainerProfile(trainerId);
  const availabilityQuery = useAvailabilitySlots(trainerId);
  const packagesQuery = useMyPackagePurchases(clientId);
  const createBooking = useCreateBooking();

  const [step, setStep] = useState<Step>(1);
  const [startsAt, setStartsAt] = useState<Date>(defaultStart);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [duration, setDuration] = useState<Duration>(60);
  const [sessionType, setSessionType] = useState<SessionType>('in-person');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const trainer = trainerQuery.data;
  const supportedTypes: SessionType[] = trainer?.session_types ?? ['in-person', 'virtual'];
  const rateCents = trainer?.hourly_rate_cents ?? null;
  const estimatedCents = rateCents != null ? Math.round(rateCents * (duration / 60)) : null;
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

  const advanceFromDate = () => {
    if (availabilityQuery.isLoading || availabilityQuery.isFetching) return Alert.alert('Checking availability', 'Wait a moment while the trainer’s schedule loads.');
    if (availabilityQuery.isError) return Alert.alert('Availability unavailable', 'TrainerHub could not verify this time.');
    const validation = validateBookingTime(startsAt, duration, availability);
    if (!validation.valid) return Alert.alert('Choose another time', validation.message);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!clientId || !trainerId) return Alert.alert('Error', 'Missing required information.');
    const validation = validateBookingTime(startsAt, duration, availability);
    if (!validation.valid) return Alert.alert('Choose another time', validation.message);
    try {
      await createBooking.mutateAsync({ trainer_id: trainerId, client_id: clientId, starts_at: startsAt.toISOString(), duration_min: duration, session_type: sessionType, package_purchase_id: selectedPurchaseId, notes: notes.trim() || null });
      router.replace({ pathname: '/booking/success', params: { trainerName: trainer?.full_name ?? 'Your trainer', startsAt: startsAt.toISOString(), duration: String(duration), sessionType } });
    } catch (error: unknown) {
      Alert.alert('Booking failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (trainerQuery.isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  if (!trainer) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.danger }}>Trainer details could not be loaded.</Text></View>;

  const trainerName = trainer.full_name ?? 'Trainer';
  const specialty = trainer.specialties[0] ?? 'Trainer';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => step === 1 ? router.back() : setStep((step - 1) as Step)}><Ionicons name="arrow-back" size={20} color={BRAND.navy} /></TouchableOpacity>
          <Text style={styles.headerTitle}>{step === 1 ? 'Select Session Type' : step === 2 ? 'Select Date & Time' : 'Review Request'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <StepProgress step={step} />

        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.trainerSummary}>
            <Avatar seed={trainer.user_id} size={52} initial={trainerName} imageUrl={trainer.avatar_url} />
            <View style={{ flex: 1 }}><Text style={styles.trainerName}>{trainerName} {trainer.is_verified ? '✓' : ''}</Text><Text style={styles.trainerSpecialty}>{specialty}</Text></View>
            <Text style={styles.trainerRate}>{rateCents != null ? `$${Math.round(rateCents / 100)}/hr` : 'Rate on request'}</Text>
          </View>

          {step === 1 ? (
            <>
              <Text style={styles.prompt}>Choose how you want to train</Text>
              <View style={styles.choiceStack}>
                {DURATIONS.map((value) => {
                  const selected = duration === value;
                  const amount = rateCents != null ? Math.round(rateCents * (value / 60) / 100) : null;
                  return <TouchableOpacity key={value} style={[styles.choice, selected && styles.choiceActive]} onPress={() => setDuration(value)}><View style={{ flex: 1 }}><Text style={styles.choiceTitle}>{value === 60 ? '1 on 1 Training' : `${value} Minute Session`}</Text><Text style={styles.choiceSub}>Focused training · {value} min</Text></View><Text style={styles.choicePrice}>{amount != null ? `$${amount}` : '—'}</Text><View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioDot} /> : null}</View></TouchableOpacity>;
                })}
              </View>

              <Text style={[styles.prompt, { marginTop: 24 }]}>Session format</Text>
              <View style={styles.formatRow}>{supportedTypes.map((type) => <TouchableOpacity key={type} style={[styles.formatCard, sessionType === type && styles.formatCardActive]} onPress={() => setSessionType(type)}><Ionicons name={type === 'virtual' ? 'videocam-outline' : 'people-outline'} size={20} color={sessionType === type ? '#FFFFFF' : BRAND.navy} /><Text style={[styles.formatText, sessionType === type && styles.formatTextActive]}>{type === 'virtual' ? 'Virtual' : 'In-person'}</Text></TouchableOpacity>)}</View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View style={styles.dateHeading}><View><Text style={styles.monthLabel}>{startsAt.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text><Text style={styles.dateLabel}>{startsAt.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</Text></View><TouchableOpacity style={styles.calendarButton} onPress={() => setPickerMode(pickerMode === 'date' ? null : 'date')}><Ionicons name="calendar-outline" size={19} color={BRAND.purple} /></TouchableOpacity></View>
              {pickerMode === 'date' ? <DateTimePicker value={startsAt} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handlePickerChange} minimumDate={new Date()} /> : null}
              <Text style={styles.prompt}>Available Times</Text>
              {availabilityQuery.isLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : quickStarts.length ? <View style={styles.timeGrid}>{quickStarts.map((time) => { const selected = Math.abs(time.getTime() - startsAt.getTime()) < 60_000; return <TouchableOpacity key={time.toISOString()} style={[styles.time, selected && styles.timeActive]} onPress={() => setStartsAt(time)}><Text style={[styles.timeText, selected && styles.timeTextActive]}>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></TouchableOpacity>; })}</View> : <View style={styles.noTimes}><Text style={styles.noTimesTitle}>No {duration}-minute starts on this day.</Text><Text style={styles.noTimesText}>Choose another date or pick a time manually.</Text></View>}
              <TouchableOpacity style={styles.manualTime} onPress={() => setPickerMode(pickerMode === 'time' ? null : 'time')}><Text style={styles.manualText}>Choose a different time manually</Text><Ionicons name="time-outline" size={17} color={BRAND.purple} /></TouchableOpacity>
              {pickerMode === 'time' ? <DateTimePicker value={startsAt} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handlePickerChange} /> : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View style={styles.reviewCard}>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Session</Text><Text style={styles.reviewValue}>{duration} min · {sessionType === 'virtual' ? 'Virtual' : 'In-person'}</Text></View>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>When</Text><Text style={styles.reviewValue}>{startsAt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text></View>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Estimated session</Text><Text style={styles.reviewTotal}>{estimatedCents != null ? `$${(estimatedCents / 100).toFixed(2)}` : '—'}</Text></View>
              </View>

              {eligiblePurchases.length ? <><Text style={styles.prompt}>Payment option</Text><View style={styles.choiceStack}><TouchableOpacity style={[styles.choice, selectedPurchaseId === null && styles.choiceActive]} onPress={() => setSelectedPurchaseId(null)}><View style={{ flex: 1 }}><Text style={styles.choiceTitle}>Single session</Text><Text style={styles.choiceSub}>Use the standard session rate</Text></View><View style={[styles.radio, selectedPurchaseId === null && styles.radioActive]}>{selectedPurchaseId === null ? <View style={styles.radioDot} /> : null}</View></TouchableOpacity>{eligiblePurchases.map((purchase) => <TouchableOpacity key={purchase.id} style={[styles.choice, selectedPurchaseId === purchase.id && styles.choiceActive]} onPress={() => setSelectedPurchaseId(purchase.id)}><View style={{ flex: 1 }}><Text style={styles.choiceTitle}>{purchase.package?.title ?? 'Package'}</Text><Text style={styles.choiceSub}>{purchase.sessions_remaining} sessions remaining</Text></View><View style={[styles.radio, selectedPurchaseId === purchase.id && styles.radioActive]}>{selectedPurchaseId === purchase.id ? <View style={styles.radioDot} /> : null}</View></TouchableOpacity>)}</View></> : null}

              <Text style={styles.prompt}>Anything your trainer should know?</Text>
              <TextInput value={notes} onChangeText={setNotes} multiline placeholder="Goals, injuries, questions, or context…" placeholderTextColor="#989CA6" style={styles.notes} />

              <View style={styles.notice}><Ionicons name="shield-checkmark-outline" size={18} color={BRAND.purple} /><Text style={styles.noticeText}>No payment is captured by this request. Your trainer confirms the session first.</Text></View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primary, createBooking.isPending && { opacity: 0.6 }]}
            disabled={createBooking.isPending}
            onPress={() => step === 1 ? setStep(2) : step === 2 ? advanceFromDate() : handleSubmit()}
          >
            {createBooking.isPending ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>{step === 3 ? 'Send Session Request' : 'Continue'}</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepProgress({ step }: { step: Step }) {
  return <View style={styles.progress}><View style={[styles.progressSegment, step >= 1 && styles.progressActive]} /><View style={[styles.progressSegment, step >= 2 && styles.progressActive]} /><View style={[styles.progressSegment, step >= 3 && styles.progressActive]} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F2F0F4', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: BRAND.navy, fontSize: 14, fontWeight: '900' },
  progress: { width: '100%', maxWidth: 700, alignSelf: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 8 },
  progressSegment: { flex: 1, height: 4, borderRadius: 3, backgroundColor: '#E6E2E9' },
  progressActive: { backgroundColor: BRAND.purple },
  page: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 20, paddingBottom: 130 },
  trainerSummary: { minHeight: 78, borderRadius: 16, borderWidth: 1, borderColor: '#E7E3EA', backgroundColor: '#FFFFFF', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trainerName: { color: BRAND.navy, fontSize: 13, fontWeight: '900' },
  trainerSpecialty: { color: '#777B87', fontSize: 10, marginTop: 2 },
  trainerRate: { color: BRAND.navy, fontSize: 12, fontWeight: '900' },
  prompt: { color: BRAND.navy, fontSize: 14, fontWeight: '900', marginTop: 22, marginBottom: 11 },
  choiceStack: { gap: 9 },
  choice: { minHeight: 74, borderRadius: 15, borderWidth: 1.5, borderColor: '#E6E2E9', backgroundColor: '#FFFFFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceActive: { borderColor: BRAND.purple, backgroundColor: '#FCF9FF' },
  choiceTitle: { color: BRAND.navy, fontSize: 12, fontWeight: '900' },
  choiceSub: { color: '#868A94', fontSize: 9, marginTop: 3 },
  choicePrice: { color: BRAND.navy, fontSize: 12, fontWeight: '900' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#B8B6BE', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: BRAND.purple }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND.purple },
  formatRow: { flexDirection: 'row', gap: 10 },
  formatCard: { flex: 1, minHeight: 72, borderRadius: 15, borderWidth: 1.5, borderColor: '#E6E2E9', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 6 },
  formatCardActive: { backgroundColor: BRAND.navy, borderColor: BRAND.navy },
  formatText: { color: BRAND.navy, fontSize: 11, fontWeight: '900' }, formatTextActive: { color: '#FFFFFF' },
  dateHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  monthLabel: { color: BRAND.navy, fontSize: 20, fontWeight: '900' },
  dateLabel: { color: '#777B87', fontSize: 11, marginTop: 3 },
  calendarButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F2ECFB', alignItems: 'center', justifyContent: 'center' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  time: { width: '30.5%', minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#E3DFE7', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  timeActive: { backgroundColor: BRAND.purple, borderColor: BRAND.purple },
  timeText: { color: BRAND.navy, fontSize: 11, fontWeight: '800' }, timeTextActive: { color: '#FFFFFF' },
  noTimes: { borderRadius: 14, backgroundColor: '#F7F5F9', padding: 16 }, noTimesTitle: { color: BRAND.navy, fontSize: 12, fontWeight: '900' }, noTimesText: { color: '#777B87', fontSize: 10, marginTop: 4 },
  manualTime: { minHeight: 48, marginTop: 13, borderRadius: 12, backgroundColor: '#F7F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13 },
  manualText: { color: BRAND.purple, fontSize: 11, fontWeight: '800' },
  reviewCard: { borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E3EA', padding: 16, marginTop: 16 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reviewLabel: { color: '#777B87', fontSize: 10, fontWeight: '700' }, reviewValue: { color: BRAND.navy, fontSize: 11, fontWeight: '900', textAlign: 'right' }, reviewTotal: { color: BRAND.navy, fontSize: 17, fontWeight: '900' },
  reviewDivider: { height: 1, backgroundColor: '#ECE9EF', marginVertical: 13 },
  notes: { minHeight: 112, borderRadius: 15, borderWidth: 1, borderColor: '#E3DFE7', backgroundColor: '#FFFFFF', color: BRAND.navy, padding: 14, textAlignVertical: 'top', fontSize: 12 },
  notice: { marginTop: 14, borderRadius: 13, backgroundColor: '#F3EDF9', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  noticeText: { color: '#5D5367', fontSize: 10, lineHeight: 15, flex: 1 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#ECE9EF', paddingHorizontal: 20, paddingVertical: 14 },
  primary: { width: '100%', maxWidth: 660, alignSelf: 'center', minHeight: 54, borderRadius: 13, backgroundColor: BRAND.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
