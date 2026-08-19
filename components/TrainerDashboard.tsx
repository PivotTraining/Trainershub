/** TrainerDashboard — truthful, action-first overview for trainers. */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { useAvailabilitySlots } from '@/lib/queries/availability';
import { useBookings } from '@/lib/queries/bookings';
import { usePublicTrainerProfile } from '@/lib/queries/browse';
import { useTrainerSessions } from '@/lib/queries/sessions';
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
  const s = makeStyles(colors, accent);

  return (
    <View>
      <View style={[s.readinessCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <View style={s.readinessTop}>
          <View>
            <Text style={[s.readinessEyebrow, { color: accent }]}>MARKETPLACE READINESS</Text>
            <Text style={[s.readinessTitle, { color: colors.ink }]}>{readinessPercent}% ready to get booked</Text>
          </View>
          <View style={[s.scoreBadge, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[s.scoreText, { color: colors.ink }]}>{completedReadiness}/{readinessItems.length}</Text>
          </View>
        </View>
        <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[s.progressFill, { backgroundColor: accent, width: `${readinessPercent}%` }]} />
        </View>
        {nextReadiness ? (
          <TouchableOpacity style={s.nextAction} onPress={() => router.push(nextReadiness.route)}>
            <Text style={[s.nextActionText, { color: colors.ink }]}>Next: {nextReadiness.label}</Text>
            <Text style={[s.nextActionArrow, { color: accent }]}>→</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[s.readyText, { color: colors.muted }]}>Your core marketplace setup is complete. Keep availability current and respond quickly to requests.</Text>
        )}
      </View>

      <View style={s.heroRow}>
        <View style={[s.heroCard, { backgroundColor: accent }]}>
          <Text style={s.heroLabel}>Paid sessions this month</Text>
          <Text style={s.heroValue}>{paidThisMonth.length}</Text>
          <Text style={s.heroSub}>Confirmed by Stripe — no estimated revenue</Text>
        </View>
      </View>

      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Text style={[s.statVal, { color: colors.ink }]}>{completedThisMonth}</Text>
          <Text style={[s.statLabel, { color: colors.muted }]}>Completed (mo)</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Text style={[s.statVal, { color: colors.ink }]}>{upcoming.length}</Text>
          <Text style={[s.statLabel, { color: colors.muted }]}>Upcoming</Text>
        </View>
        <TouchableOpacity
          style={[s.statCard, pendingRequests > 0 ? { backgroundColor: '#FFFAE6', borderColor: '#FF8B00' } : { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/requests')}
        >
          <Text style={[s.statVal, { color: pendingRequests > 0 ? '#FF8B00' : colors.ink }]}>{pendingRequests}</Text>
          <Text style={[s.statLabel, { color: pendingRequests > 0 ? '#FF8B00' : colors.muted }]}>Requests</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.sectionTitle, { color: colors.ink }]}>Paid sessions · last 4 weeks</Text>
      <View style={[s.barsCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        {weekBuckets.map((count, idx) => (
          <View key={idx} style={s.barCol}>
            <View style={[s.barTrack, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[s.barFill, { backgroundColor: accent, height: `${(count / maxWeek) * 100}%` }]} />
            </View>
            <Text style={[s.barLabel, { color: colors.muted }]}>{idx === 3 ? 'This wk' : `${4 - idx}w ago`}</Text>
            <Text style={[s.barValue, { color: colors.ink }]}>{count}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.sectionTitle, { color: colors.ink }]}>Grow your business</Text>
      <View style={s.shortcutsGrid}>
        <Shortcut emoji="📦" title="Packages" help="Sell session bundles" onPress={() => router.push('/(tabs)/packages')} colors={colors} />
        <Shortcut emoji="📅" title="Availability" help="Open more bookable time" onPress={() => router.push('/(tabs)/availability')} colors={colors} />
        <Shortcut emoji="📣" title="Profile" help="Improve discovery conversion" onPress={() => router.push('/(tabs)/profile')} colors={colors} />
        <Shortcut emoji="💳" title="Payouts" help="Manage Stripe Connect" onPress={() => router.push('/(tabs)/profile')} colors={colors} />
      </View>

      {upcoming.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { color: colors.ink }]}>Upcoming</Text>
          {upcoming.map((sess) => (
            <TouchableOpacity
              key={sess.id}
              style={[s.upcomingRow, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: sess.id } })}
            >
              {sess.clientName ? <Avatar seed={sess.clientName} size={36} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={[s.upcomingName, { color: colors.ink }]}>{sess.clientName ?? sess.clientEmail ?? 'Client'}</Text>
                <Text style={[s.upcomingMeta, { color: colors.muted }]}>
                  {new Date(sess.starts_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {sess.duration_min} min
                </Text>
              </View>
              <Text style={[s.chevron, { color: colors.placeholder }]}>›</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

function Shortcut({ emoji, title, help, onPress, colors }: { emoji: string; title: string; help: string; onPress: () => void; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <TouchableOpacity style={[styles.shortcut, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]} onPress={onPress}>
      <Text style={styles.shortcutEmoji}>{emoji}</Text>
      <Text style={[styles.shortcutText, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.shortcutHelp, { color: colors.muted }]}>{help}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shortcut: { width: '48%', borderRadius: 14, borderWidth: 1, padding: 14 },
  shortcutEmoji: { fontSize: 22, marginBottom: 6 },
  shortcutText: { fontSize: 14, fontWeight: '800' },
  shortcutHelp: { fontSize: 11, marginTop: 2, lineHeight: 15 },
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], accent: string) {
  return StyleSheet.create({
    readinessCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
    readinessTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    readinessEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    readinessTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 },
    scoreBadge: { minWidth: 48, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    scoreText: { fontSize: 13, fontWeight: '900' },
    progressTrack: { height: 8, borderRadius: 999, marginTop: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    nextAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
    nextActionText: { fontSize: 13, fontWeight: '800' },
    nextActionArrow: { fontSize: 18, fontWeight: '900' },
    readyText: { fontSize: 12, lineHeight: 18, marginTop: 12 },
    heroRow: { marginBottom: 12 },
    heroCard: { borderRadius: 18, padding: 18, shadowColor: accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10 },
    heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroValue: { color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 4 },
    heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center' },
    statVal: { fontSize: 22, fontWeight: '900' },
    statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
    sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 4 },
    barsCard: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 24, height: 130 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    barTrack: { width: 18, flex: 1, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden' },
    barFill: { width: '100%', borderRadius: 4 },
    barLabel: { fontSize: 10, marginTop: 4 },
    barValue: { fontSize: 12, fontWeight: '800' },
    shortcutsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
    upcomingName: { fontSize: 14, fontWeight: '700' },
    upcomingMeta: { fontSize: 12, marginTop: 2 },
    chevron: { fontSize: 20 },
  });
}
