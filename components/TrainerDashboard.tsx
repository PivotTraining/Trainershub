/** TrainerDashboard — truthful, action-first overview for trainers. */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EnergyField } from '@/components/EnergyField';
import { useAvailabilitySlots } from '@/lib/queries/availability';
import { useBookings } from '@/lib/queries/bookings';
import { usePublicTrainerProfile } from '@/lib/queries/browse';
import { useTrainerSessions } from '@/lib/queries/sessions';
import { BRAND } from '@/lib/theme';
import type { BookingWithNames } from '@/lib/types';
import { useTheme } from '@/lib/useTheme';

interface TrainerDashboardProps { trainerId: string; }
interface UseBookingsResult { data: BookingWithNames[] | undefined; }

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function TrainerDashboard({ trainerId }: TrainerDashboardProps) {
  const router = useRouter();
  const { colors, accent } = useTheme();
  const sessionsQ = useTrainerSessions(trainerId);
  const bookingsQ = useBookings(trainerId) as UseBookingsResult;
  const profileQ = usePublicTrainerProfile(trainerId);
  const availabilityQ = useAvailabilitySlots(trainerId);

  const sessions = useMemo(() => sessionsQ.data ?? [], [sessionsQ.data]);
  const bookings = useMemo(() => bookingsQ.data ?? [], [bookingsQ.data]);
  const profile = profileQ.data;
  const availability = availabilityQ.data ?? [];

  const monthStart = startOfMonth(new Date());
  const paidThisMonth = bookings.filter((b) => b.payment_status === 'paid' && new Date(b.starts_at) >= monthStart);
  const completedThisMonth = sessions.filter((s) => s.status === 'completed' && new Date(s.starts_at) >= monthStart).length;

  const upcoming = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => s.status === 'scheduled' && new Date(s.starts_at) >= now).slice(0, 3);
  }, [sessions]);

  const pendingRequests = bookings.filter((b) => b.status === 'pending').length;

  const readinessItems = [
    { label: 'Add a strong bio', done: Boolean(profile?.bio?.trim()), route: '/(tabs)/profile' as const },
    { label: 'Choose specialties', done: (profile?.specialties.length ?? 0) > 0, route: '/(tabs)/profile' as const },
    { label: 'Set your hourly rate', done: (profile?.hourly_rate_cents ?? 0) > 0, route: '/(tabs)/profile' as const },
    { label: 'Choose session types', done: (profile?.session_types.length ?? 0) > 0, route: '/(tabs)/profile' as const },
    { label: 'Publish availability', done: availability.length > 0, route: '/(tabs)/availability' as const },
  ];
  const completedReadiness = readinessItems.filter((item) => item.done).length;
  const readinessPercent = Math.round((completedReadiness / readinessItems.length) * 100);
  const nextReadiness = readinessItems.find((item) => !item.done);

  const weekBuckets: number[] = [0, 0, 0, 0];
  const now = new Date();
  for (const b of bookings) {
    if (b.payment_status !== 'paid') continue;
    const dt = new Date(b.starts_at);
    const wk = Math.floor((+startOfWeek(now) - +startOfWeek(dt)) / (7 * 86_400_000));
    if (wk >= 0 && wk < 4) weekBuckets[3 - wk]++;
  }
  const maxWeek = Math.max(1, ...weekBuckets);

  return (
    <View>
      <View style={styles.heroCard}>
        <EnergyField opacity={0.9} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>TRAINER BUSINESS</Text>
          <Text style={styles.heroValue}>{paidThisMonth.length}</Text>
          <Text style={styles.heroLabel}>paid sessions this month</Text>
          <Text style={styles.heroSub}>Stripe-confirmed sessions only.</Text>
        </View>
        <View style={styles.heroStats}>
          <View><Text style={styles.heroStatValue}>{completedThisMonth}</Text><Text style={styles.heroStatLabel}>completed</Text></View>
          <View style={styles.heroDivider} />
          <View><Text style={styles.heroStatValue}>{upcoming.length}</Text><Text style={styles.heroStatLabel}>upcoming</Text></View>
          <View style={styles.heroDivider} />
          <TouchableOpacity onPress={() => router.push('/(tabs)/requests')}>
            <Text style={[styles.heroStatValue, pendingRequests > 0 && { color: '#7ED3FF' }]}>{pendingRequests}</Text>
            <Text style={styles.heroStatLabel}>requests</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.readinessCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <View style={[styles.readinessRail, { backgroundColor: accent }]} />
        <View style={styles.readinessTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.readinessEyebrow, { color: accent }]}>MARKETPLACE READINESS</Text>
            <Text style={[styles.readinessTitle, { color: colors.ink }]}>{readinessPercent}% ready to get booked</Text>
          </View>
          <Text style={[styles.scoreText, { color: colors.muted }]}>{completedReadiness}/{readinessItems.length}</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: accent, width: `${readinessPercent}%` }]} />
        </View>
        {nextReadiness ? (
          <TouchableOpacity style={styles.nextAction} onPress={() => router.push(nextReadiness.route)}>
            <Text style={[styles.nextActionText, { color: colors.ink }]}>Next: {nextReadiness.label}</Text>
            <Ionicons name="arrow-forward" size={16} color={accent} />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.readyText, { color: colors.muted }]}>Your core marketplace setup is complete. Keep availability current and respond quickly to requests.</Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View><Text style={[styles.sectionEyebrow, { color: accent }]}>MOMENTUM</Text><Text style={[styles.sectionTitle, { color: colors.ink }]}>Paid sessions · 4 weeks</Text></View>
        <View style={styles.sectionBeam} />
      </View>
      <View style={[styles.barsCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        {weekBuckets.map((count, idx) => (
          <View key={idx} style={styles.barCol}>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.barFill, { backgroundColor: idx === 3 ? accent : BRAND.blue, height: `${(count / maxWeek) * 100}%` }]} />
            </View>
            <Text style={[styles.barLabel, { color: colors.muted }]}>{idx === 3 ? 'This wk' : `${4 - idx}w ago`}</Text>
            <Text style={[styles.barValue, { color: colors.ink }]}>{count}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View><Text style={[styles.sectionEyebrow, { color: accent }]}>GROW</Text><Text style={[styles.sectionTitle, { color: colors.ink }]}>Your business</Text></View>
        <View style={styles.sectionBeam} />
      </View>
      <View style={styles.shortcutsGrid}>
        <Shortcut icon="layers-outline" title="Packages" help="Sell session bundles" onPress={() => router.push('/(tabs)/packages')} colors={colors} accent={accent} rail={BRAND.purple} />
        <Shortcut icon="time-outline" title="Availability" help="Open more bookable time" onPress={() => router.push('/(tabs)/availability')} colors={colors} accent={accent} rail={BRAND.blue} />
        <Shortcut icon="person-outline" title="Profile" help="Improve discovery conversion" onPress={() => router.push('/(tabs)/profile')} colors={colors} accent={accent} rail={accent} />
        <Shortcut icon="card-outline" title="Payouts" help="Manage Stripe Connect" onPress={() => router.push('/(tabs)/profile')} colors={colors} accent={accent} rail="#05BFEA" />
      </View>

      {upcoming.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <View><Text style={[styles.sectionEyebrow, { color: accent }]}>NEXT</Text><Text style={[styles.sectionTitle, { color: colors.ink }]}>Upcoming sessions</Text></View>
            <View style={styles.sectionBeam} />
          </View>
          {upcoming.map((sess) => (
            <TouchableOpacity key={sess.id} style={[styles.upcomingRow, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]} onPress={() => router.push({ pathname: '/session/[id]', params: { id: sess.id } })}>
              <View style={[styles.upcomingRail, { backgroundColor: accent }]} />
              {sess.clientName ? <Avatar seed={sess.clientName} size={36} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={[styles.upcomingName, { color: colors.ink }]}>{sess.clientName ?? sess.clientEmail ?? 'Client'}</Text>
                <Text style={[styles.upcomingMeta, { color: colors.muted }]}>{new Date(sess.starts_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {sess.duration_min} min</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.placeholder} />
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </View>
  );
}

function Shortcut({ icon, title, help, onPress, colors, accent, rail }: { icon: keyof typeof Ionicons.glyphMap; title: string; help: string; onPress: () => void; colors: ReturnType<typeof useTheme>['colors']; accent: string; rail: string }) {
  return (
    <TouchableOpacity style={[styles.shortcut, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]} onPress={onPress}>
      <View style={[styles.shortcutRail, { backgroundColor: rail }]} />
      <Ionicons name={icon} size={21} color={accent} />
      <Text style={[styles.shortcutText, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.shortcutHelp, { color: colors.muted }]}>{help}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  heroCard: { position: 'relative', overflow: 'hidden', minHeight: 220, backgroundColor: BRAND.navy, borderRadius: 22, borderWidth: 1, borderColor: '#193857', padding: 20, marginBottom: 14 },
  heroCopy: { zIndex: 2 },
  heroEyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  heroValue: { color: '#FFFFFF', fontSize: 48, fontWeight: '900', letterSpacing: -1.5, marginTop: 8 },
  heroLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  heroSub: { color: '#879BB1', fontSize: 11, marginTop: 3 },
  heroStats: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 24 },
  heroStatValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  heroStatLabel: { color: '#7E92A9', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)' },
  readinessCard: { position: 'relative', overflow: 'hidden', borderRadius: 15, borderWidth: 1, padding: 16, marginBottom: 18 },
  readinessRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.72 },
  readinessTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  readinessEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  readinessTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  scoreText: { fontSize: 12, fontWeight: '900' },
  progressTrack: { height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  nextAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
  nextActionText: { fontSize: 13, fontWeight: '800' },
  readyText: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 6, marginBottom: 10 },
  sectionEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  sectionBeam: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.22, marginBottom: 5 },
  barsCard: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 22, height: 130 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: 14, flex: 1, justifyContent: 'flex-end', borderRadius: 3, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 3 },
  barLabel: { fontSize: 9, marginTop: 5 },
  barValue: { fontSize: 11, fontWeight: '800' },
  shortcutsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  shortcut: { position: 'relative', overflow: 'hidden', width: '48%', borderRadius: 13, borderWidth: 1, padding: 14 },
  shortcutRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.7 },
  shortcutText: { fontSize: 14, fontWeight: '900', marginTop: 9 },
  shortcutHelp: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  upcomingRow: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 13, borderWidth: 1, padding: 12, marginBottom: 8 },
  upcomingRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.68 },
  upcomingName: { fontSize: 14, fontWeight: '800' },
  upcomingMeta: { fontSize: 12, marginTop: 2 },
});
