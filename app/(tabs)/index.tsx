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
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

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
import { BRAND_GRADIENT } from '@/lib/theme';
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
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient hero header ──────────────────────────────────── */}
        <View style={s.hero}>
          <Svg style={StyleSheet.absoluteFillObject}>
            <Defs>
              <LinearGradient id="heroA" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={BRAND_GRADIENT.start} stopOpacity="0.18" />
                <Stop offset="1" stopColor={BRAND_GRADIENT.end} stopOpacity="0.06" />
              </LinearGradient>
              <LinearGradient id="heroB" x1="1" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={BRAND_GRADIENT.end} stopOpacity="0.14" />
                <Stop offset="1" stopColor={BRAND_GRADIENT.start} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Circle cx="105%" cy="-20%" r="55%" fill="url(#heroA)" />
            <Circle cx="-10%" cy="120%" r="40%" fill="url(#heroB)" />
          </Svg>

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
        </View>

        <View style={s.content}>
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
        <View style={s.sectionTitleRow}>
          <View style={[s.sectionAccentBar, { backgroundColor: accent }]} />
          <Text style={s.sectionTitle}>Next session</Text>
        </View>
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
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionAccentBar, { backgroundColor: accent }]} />
              <Text style={s.sectionTitle}>Up next</Text>
            </View>
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
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionAccentBar, { backgroundColor: accent }]} />
              <Text style={s.sectionTitle}>My programs</Text>
            </View>
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
        </View>{/* end content */}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Dynamic styles ─────────────────────────────────────────────────────────────

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  accent: string,
  isDark: boolean,
) {
  return StyleSheet.create({
    safe:  { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 40 },

    // ── Gradient hero ─────────────────────────────────────────────
    hero: {
      overflow: 'hidden',
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 24,
      marginBottom: 20,
      backgroundColor: colors.surface,
      // Subtle card shadow so the hero lifts slightly off background
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.4 : 0.07,
      shadowRadius: 12,
      elevation: 3,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    greeting:  { fontSize: 28, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
    subtitle:  { fontSize: 14, color: colors.muted, marginTop: 3, fontWeight: '500' },

    // ── Content area ──────────────────────────────────────────────
    content: { paddingHorizontal: 24 },

    // ── Stats ─────────────────────────────────────────────────────
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard: {
      flex: 1, backgroundColor: colors.surfaceCard, borderRadius: 16,
      borderWidth: 1, borderColor: colors.border,
      padding: 14, alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.04,
      shadowRadius: 4,
    },
    statVal:   { fontSize: 26, fontWeight: '900', color: colors.ink },
    statLabel: { fontSize: 11, color: colors.muted, marginTop: 3, textAlign: 'center', fontWeight: '600' },

    // ── Section titles ────────────────────────────────────────────
    sectionTitleRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: 8, marginBottom: 12,
    },
    sectionAccentBar: {
      width: 3, height: 17, borderRadius: 2,
    },
    sectionTitle: {
      fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.2,
    },

    // ── Next session card ─────────────────────────────────────────
    nextCard: {
      backgroundColor: accent,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      shadowColor: accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    nextCardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
    nextCardTime:     { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
    nextCardClient:   { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
    nextCardDuration: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '600' },
    nextCardNotes:    { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 12, fontStyle: 'italic', lineHeight: 18 },
    countdownBadge: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    countdownText: { fontSize: 13, fontWeight: '800', color: '#fff' },

    // ── Empty states ──────────────────────────────────────────────
    emptyCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 16, borderWidth: 1, borderColor: colors.border,
      padding: 24, alignItems: 'center', gap: 12, marginBottom: 24,
    },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
      backgroundColor: accent, borderRadius: 12,
      paddingHorizontal: 22, paddingVertical: 12,
    },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // ── Up next rows (trainer) ────────────────────────────────────
    upNextRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.surfaceCard,
      borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      padding: 14, marginBottom: 8,
    },
    upNextName: { fontSize: 14, fontWeight: '700', color: colors.ink },
    upNextTime: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '500' },
    chevron:    { fontSize: 20, color: colors.placeholder },
    seeAll:     { fontSize: 13, color: accent, fontWeight: '700', textAlign: 'center', marginTop: 4, marginBottom: 20 },

    // ── Programs ──────────────────────────────────────────────────
    programCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      padding: 16, marginBottom: 8,
    },
    programTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    programDesc:  { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  });
}
