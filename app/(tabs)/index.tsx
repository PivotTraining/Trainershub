/**
 * Home tab — role-aware dashboard.
 *
 * Trainer: greeting + stats row (clients, sessions this week, upcoming) +
 *          next-session countdown card + recent client activity.
 * Client:  greeting + next-session countdown + assigned programs summary.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { FindMatchCard } from '@/components/FindMatchCard';
import { NotificationsNudge } from '@/components/NotificationsNudge';
import { StreakCard } from '@/components/StreakCard';
import { TrainerDashboard } from '@/components/TrainerDashboard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { useClients } from '@/lib/queries/clients';
import { useClientAssignedProgramsByUserId } from '@/lib/queries/programs';
import { useClientSessions, useTrainerSessions } from '@/lib/queries/sessions';
import { useTheme } from '@/lib/useTheme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(target: Date): string {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return 'Starting now';
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m`;
  const diffDay = Math.floor(diffHr / 24);
  return diffDay === 1 ? 'Tomorrow' : `${diffDay} days`;
}

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { showEmoji } = usePreferences();
  const { colors, accent, isDark } = useTheme();
  const userId = session?.user.id;
  const isTrainer = profile?.role === 'trainer';

  const trainerSessionsQ = useTrainerSessions(isTrainer ? userId : undefined);
  const clientSessionsQ  = useClientSessions(!isTrainer ? userId : undefined);
  const clientsQ         = useClients(isTrainer ? userId : undefined);
  const programsQ        = useClientAssignedProgramsByUserId(!isTrainer ? userId : undefined);

  const sessions = useMemo(
    () => (isTrainer ? trainerSessionsQ.data : clientSessionsQ.data) ?? [],
    [isTrainer, trainerSessionsQ.data, clientSessionsQ.data],
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => s.status === 'scheduled' && new Date(s.starts_at) >= now);
  }, [sessions]);
  const nextSession = upcoming[0] ?? null;
  const thisWeek = useMemo(() => {
    const weekStart = startOfWeek();
    return sessions.filter((s) => new Date(s.starts_at) >= weekStart);
  }, [sessions]);
  const completed  = useMemo(() => sessions.filter((s) => s.status === 'completed'), [sessions]);

  const isLoading = isTrainer ? trainerSessionsQ.isLoading : clientSessionsQ.isLoading;
  const refetch   = isTrainer ? trainerSessionsQ.refetch : clientSessionsQ.refetch;

  const firstName = profile?.full_name?.split(' ')[0] ?? null;
  const greeting = firstName
    ? `Hey, ${firstName}${showEmoji ? ' 👋' : ''}`
    : `Welcome${showEmoji ? ' 👋' : ''}`;

  const s = makeStyles(colors, accent, isDark);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* ── Header: greeting + weather pill ──────────────────────── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.subtitle}>
              {isTrainer ? 'Your training dashboard' : 'Your training journey'}
            </Text>
          </View>
          <WeatherWidget
            lat={profile?.location_lat}
            lng={profile?.location_lng}
            city={profile?.location_city}
          />
        </View>

        {/* ── Notifications nudge ──────────────────────────────────── */}
        <NotificationsNudge />

        {/* ── Find-your-match (clients only) ───────────────────────── */}
        {!isTrainer && <FindMatchCard />}

        {/* ── Streak (clients only) ────────────────────────────────── */}
        {!isTrainer && userId && (
          <StreakCard
            userId={userId}
            count={profile?.streak_count ?? 0}
            unit={profile?.streak_unit ?? 'days'}
            lastLogged={profile?.streak_last_logged}
          />
        )}

        {/* ── Trainer dashboard (revenue / monetization focus) ─────── */}
        {isTrainer && userId && <TrainerDashboard trainerId={userId} />}

        {/* ── Next session card (clients only — trainer dashboard has its own) ─ */}
        {!isTrainer && (
          <>
        <Text style={s.sectionTitle}>
          {showEmoji ? '⏰ ' : ''}Next session
        </Text>
        {nextSession ? (
          <TouchableOpacity
            style={s.nextCard}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: nextSession.id } })}
            activeOpacity={0.85}
          >
            <View style={s.nextCardTop}>
              {isTrainer && nextSession.clientName ? (
                <Avatar seed={nextSession.clientName} size={44} />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={s.nextCardTime}>
                  {new Date(nextSession.starts_at).toLocaleString([], {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </Text>
                {isTrainer && nextSession.clientName ? (
                  <Text style={s.nextCardClient}>{nextSession.clientName}</Text>
                ) : null}
                <Text style={s.nextCardDuration}>{nextSession.duration_min} min</Text>
              </View>
              <View style={s.countdownBadge}>
                <Text style={s.countdownText}>
                  {formatCountdown(new Date(nextSession.starts_at))}
                </Text>
              </View>
            </View>
            {nextSession.notes ? (
              <Text style={s.nextCardNotes} numberOfLines={2}>{nextSession.notes}</Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>
              {isTrainer
                ? 'No upcoming sessions. Schedule one with a client.'
                : 'No upcoming sessions. Your trainer will add one here.'}
            </Text>
            {isTrainer ? (
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/session/new')}>
                <Text style={s.emptyBtnText}>{showEmoji ? '+ ' : ''}New session</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

          </>
        )}

        {/* ── Upcoming queue (trainer) ──────────────────────────────── */}
        {isTrainer && false && upcoming.length > 1 && (
          <>
            <Text style={s.sectionTitle}>{showEmoji ? '📋 ' : ''}Up next</Text>
            {upcoming.slice(1, 4).map((sess) => (
              <TouchableOpacity
                key={sess.id}
                style={s.upNextRow}
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: sess.id } })}
              >
                {sess.clientName ? <Avatar seed={sess.clientName} size={34} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={s.upNextName}>{sess.clientName ?? sess.clientEmail ?? 'Client'}</Text>
                  <Text style={s.upNextTime}>
                    {new Date(sess.starts_at).toLocaleString([], {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}  ·  {sess.duration_min} min
                  </Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))}
            {upcoming.length > 4 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')}>
                <Text style={s.seeAll}>See all {upcoming.length} sessions →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Client: assigned programs ─────────────────────────────── */}
        {!isTrainer && (programsQ.data?.length ?? 0) > 0 && (
          <>
            <Text style={s.sectionTitle}>{showEmoji ? '🏋️ ' : ''}My programs</Text>
            {(programsQ.data ?? []).map((p) => (
              <View key={p.id} style={s.programCard}>
                <Text style={s.programTitle}>{p.title}</Text>
                {p.description ? (
                  <Text style={s.programDesc} numberOfLines={2}>{p.description}</Text>
                ) : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Dynamic styles ─────────────────────────────────────────────────────────────

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  accent: string,
  _isDark: boolean,
) {
  return StyleSheet.create({
    safe:     { flex: 1, backgroundColor: colors.background },
    scroll:   { padding: 24, paddingBottom: 40 },
    headerRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    greeting: { fontSize: 26, fontWeight: '800', color: colors.ink },
    subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },

    // stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard: {
      flex: 1, backgroundColor: colors.surfaceCard, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border,
      padding: 14, alignItems: 'center',
    },
    statVal:   { fontSize: 24, fontWeight: '800', color: colors.ink },
    statLabel: { fontSize: 11, color: colors.muted, marginTop: 2, textAlign: 'center' },

    // section
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 10 },

    // next session
    nextCard: {
      backgroundColor: accent,
      borderRadius: 16,
      padding: 18,
      marginBottom: 24,
      shadowColor: accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    nextCardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    nextCardTime:    { fontSize: 15, fontWeight: '700', color: '#fff' },
    nextCardClient:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    nextCardDuration:{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    nextCardNotes:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 10, fontStyle: 'italic' },
    countdownBadge:  {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 6,
    },
    countdownText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // empty
    emptyCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      padding: 20, alignItems: 'center', gap: 12, marginBottom: 24,
    },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
    emptyBtn: {
      backgroundColor: accent, borderRadius: 8,
      paddingHorizontal: 18, paddingVertical: 10,
    },
    emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

    // up next rows
    upNextRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.surfaceCard,
      borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      padding: 12, marginBottom: 8,
    },
    upNextName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    upNextTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
    chevron:    { fontSize: 20, color: colors.placeholder },
    seeAll:     { fontSize: 13, color: accent, fontWeight: '600', textAlign: 'center', marginTop: 4, marginBottom: 20 },

    // programs
    programCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      padding: 14, marginBottom: 8,
    },
    programTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
    programDesc:  { fontSize: 13, color: colors.muted, marginTop: 4 },
  });
}
