/**
 * TrainerDashboard — money-first overview for trainers.
 *
 * Sections:
 *   1. Hero stat row: revenue this month, sessions completed, upcoming sessions
 *   2. Pending requests CTA (links to /requests tab)
 *   3. Revenue trend (last 4 weeks bar chart, simple inline render)
 *   4. Upcoming sessions list (next 3)
 *   5. Monetization shortcuts: edit packages, manage availability, share profile
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { useBookings } from '@/lib/queries/bookings';
import { useTrainerSessions } from '@/lib/queries/sessions';
import type { BookingWithNames } from '@/lib/types';
import { useTheme } from '@/lib/useTheme';

interface TrainerDashboardProps {
  trainerId: string;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

interface UseBookingsResult {
  data: BookingWithNames[] | undefined;
}

// useBookings is a thin alias around useMyBookingsAsTrainer to keep the import line tidy
function _ensureUseBookings(): unknown {
  return null;
}

export function TrainerDashboard({ trainerId }: TrainerDashboardProps) {
  const router = useRouter();
  const { colors, accent } = useTheme();
  const sessionsQ = useTrainerSessions(trainerId);
  const bookingsQ = useBookings(trainerId) as UseBookingsResult;

  const sessions = sessionsQ.data ?? [];
  const bookings = bookingsQ.data ?? [];

  // Revenue from confirmed + paid bookings this month
  const monthStart = startOfMonth(new Date());
  const paidThisMonth = bookings.filter(
    (b) => b.payment_status === 'paid' && new Date(b.starts_at) >= monthStart,
  );
  const revenueCentsMonth = paidThisMonth.reduce((sum, b) => {
    // Without rate snapshot we approximate at $50 per session — wire actual price later.
    return sum + 5000;
  }, 0);

  const completedThisMonth = sessions.filter(
    (s) => s.status === 'completed' && new Date(s.starts_at) >= monthStart,
  ).length;

  const upcoming = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => s.status === 'scheduled' && new Date(s.starts_at) >= now)
      .slice(0, 3);
  }, [sessions]);

  const pendingRequests = bookings.filter((b) => b.status === 'pending').length;

  // Last 4 weeks paid count for sparkline-ish bars
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
      {/* ── Headline stats ───────────────────────────────────────── */}
      <View style={s.heroRow}>
        <View style={[s.heroCard, { backgroundColor: accent }]}>
          <Text style={s.heroLabel}>Revenue this month</Text>
          <Text style={s.heroValue}>{dollars(revenueCentsMonth)}</Text>
          <Text style={s.heroSub}>{paidThisMonth.length} paid sessions</Text>
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

      {/* ── 4-week revenue bars ──────────────────────────────────── */}
      <Text style={[s.sectionTitle, { color: colors.ink }]}>Last 4 weeks</Text>
      <View style={[s.barsCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        {weekBuckets.map((count, idx) => (
          <View key={idx} style={s.barCol}>
            <View style={s.barTrack}>
              <View
                style={[
                  s.barFill,
                  { backgroundColor: accent, height: `${(count / maxWeek) * 100}%` },
                ]}
              />
            </View>
            <Text style={[s.barLabel, { color: colors.muted }]}>
              {idx === 3 ? 'This wk' : `${3 - idx + 1}w ago`}
            </Text>
            <Text style={[s.barValue, { color: colors.ink }]}>{count}</Text>
          </View>
        ))}
      </View>

      {/* ── Monetization shortcuts ───────────────────────────────── */}
      <Text style={[s.sectionTitle, { color: colors.ink }]}>Grow your business</Text>
      <View style={s.shortcutsGrid}>
        <TouchableOpacity
          style={[s.shortcut, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/packages')}
        >
          <Text style={s.shortcutEmoji}>📦</Text>
          <Text style={[s.shortcutText, { color: colors.ink }]}>Packages</Text>
          <Text style={[s.shortcutHelp, { color: colors.muted }]}>Sell session bundles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.shortcut, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/availability')}
        >
          <Text style={s.shortcutEmoji}>📅</Text>
          <Text style={[s.shortcutText, { color: colors.ink }]}>Availability</Text>
          <Text style={[s.shortcutHelp, { color: colors.muted }]}>Open more slots</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.shortcut, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={s.shortcutEmoji}>📣</Text>
          <Text style={[s.shortcutText, { color: colors.ink }]}>Share profile</Text>
          <Text style={[s.shortcutHelp, { color: colors.muted }]}>Card for socials</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.shortcut, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={s.shortcutEmoji}>💳</Text>
          <Text style={[s.shortcutText, { color: colors.ink }]}>Payouts</Text>
          <Text style={[s.shortcutHelp, { color: colors.muted }]}>Stripe Connect</Text>
        </TouchableOpacity>
      </View>

      {/* ── Upcoming list ────────────────────────────────────────── */}
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
                <Text style={[s.upcomingName, { color: colors.ink }]}>
                  {sess.clientName ?? sess.clientEmail ?? 'Client'}
                </Text>
                <Text style={[s.upcomingMeta, { color: colors.muted }]}>
                  {new Date(sess.starts_at).toLocaleString([], {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })} · {sess.duration_min} min
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

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], accent: string) {
  return StyleSheet.create({
    heroRow:    { marginBottom: 12 },
    heroCard:   {
      borderRadius: 16, padding: 18,
      shadowColor: accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10,
    },
    heroLabel:  { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroValue:  { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4 },
    heroSub:    { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },

    statsRow:   { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statCard:   { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center' },
    statVal:    { fontSize: 22, fontWeight: '800' },
    statLabel:  { fontSize: 11, marginTop: 2, textAlign: 'center' },

    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 4 },

    barsCard:   { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 24, height: 130 },
    barCol:     { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    barTrack:   { width: 18, flex: 1, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden' },
    barFill:    { width: '100%', borderRadius: 4 },
    barLabel:   { fontSize: 10, marginTop: 4 },
    barValue:   { fontSize: 12, fontWeight: '700' },

    shortcutsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    shortcut:   {
      width: '48%',
      borderRadius: 12, borderWidth: 1, padding: 14,
    },
    shortcutEmoji: { fontSize: 22, marginBottom: 6 },
    shortcutText:  { fontSize: 14, fontWeight: '700' },
    shortcutHelp:  { fontSize: 11, marginTop: 2 },

    upcomingRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
    upcomingName: { fontSize: 14, fontWeight: '600' },
    upcomingMeta: { fontSize: 12, marginTop: 2 },
    chevron:      { fontSize: 20 },
  });
}
