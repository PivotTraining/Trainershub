import { Ionicons } from '@expo/vector-icons';
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

import { EnergyField } from '@/components/EnergyField';
import { FindMatchCard } from '@/components/FindMatchCard';
import { NotificationsNudge } from '@/components/NotificationsNudge';
import { StreakCard } from '@/components/StreakCard';
import { TrainerDashboard } from '@/components/TrainerDashboard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { useClientAssignedProgramsByUserId } from '@/lib/queries/programs';
import { useClientSessions, useTrainerSessions } from '@/lib/queries/sessions';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

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

export default function Home() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { showEmoji } = usePreferences();
  const { colors, accent, isDark } = useTheme();
  const userId = session?.user.id;
  const isTrainer = profile?.role === 'trainer';

  const trainerSessionsQ = useTrainerSessions(isTrainer ? userId : undefined);
  const clientSessionsQ = useClientSessions(!isTrainer ? userId : undefined);
  const programsQ = useClientAssignedProgramsByUserId(!isTrainer ? userId : undefined);

  const sessions = useMemo(
    () => (isTrainer ? trainerSessionsQ.data : clientSessionsQ.data) ?? [],
    [isTrainer, trainerSessionsQ.data, clientSessionsQ.data],
  );
  const upcoming = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => s.status === 'scheduled' && new Date(s.starts_at) >= now);
  }, [sessions]);
  const nextSession = upcoming[0] ?? null;

  const isLoading = isTrainer ? trainerSessionsQ.isLoading : clientSessionsQ.isLoading;
  const refetch = isTrainer ? trainerSessionsQ.refetch : clientSessionsQ.refetch;
  const firstName = profile?.full_name?.split(' ')[0] ?? null;
  const greeting = firstName ? `Hey, ${firstName}${showEmoji ? ' 👋' : ''}` : `Welcome${showEmoji ? ' 👋' : ''}`;

  const s = makeStyles(colors, accent, isDark);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroShell}>
          <EnergyField />
          <View style={s.heroInner}>
            <View style={s.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.brandEyebrow}>FIND  •  BOOK  •  TRAIN</Text>
                <Text style={s.greeting}>{greeting}</Text>
                <Text style={s.subtitle}>
                  {isTrainer ? 'Build momentum. Grow your training business.' : 'Your next move starts here.'}
                </Text>
              </View>
              <WeatherWidget
                lat={profile?.location_lat}
                lng={profile?.location_lng}
                city={profile?.location_city}
              />
            </View>

            <View style={s.heroMetaRow}>
              <View style={s.heroChip}>
                <Ionicons name={isTrainer ? 'people-outline' : 'flash-outline'} size={14} color="#fff" />
                <Text style={s.heroChipText}>{isTrainer ? `${upcoming.length} upcoming` : 'Keep your streak alive'}</Text>
              </View>
              <Text style={s.heroChipMutedText}>BETTER TOGETHER.</Text>
            </View>
          </View>
        </View>

        <View style={s.content}>
          <NotificationsNudge />

          {!isTrainer && <FindMatchCard />}

          {!isTrainer && userId && (
            <StreakCard
              userId={userId}
              count={profile?.streak_count ?? 0}
              unit={profile?.streak_unit ?? 'days'}
              lastLogged={profile?.streak_last_logged}
            />
          )}

          {isTrainer && userId && <TrainerDashboard trainerId={userId} />}

          {!isTrainer && (
            <>
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionEyebrow}>UP NEXT</Text>
                  <Text style={s.sectionTitle}>Your next session</Text>
                </View>
                <View style={s.sectionBeam} />
              </View>

              {nextSession ? (
                <TouchableOpacity
                  style={s.nextCard}
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: nextSession.id } })}
                  activeOpacity={0.88}
                >
                  <View style={s.nextAccentRail} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.nextCardKicker}>SESSION LOCKED IN</Text>
                    <Text style={s.nextCardTime}>
                      {new Date(nextSession.starts_at).toLocaleString([], {
                        weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </Text>
                    <Text style={s.nextCardDuration}>{nextSession.duration_min} minute session</Text>
                    {nextSession.notes ? <Text style={s.nextCardNotes} numberOfLines={2}>{nextSession.notes}</Text> : null}
                  </View>
                  <View style={s.countdownBadge}>
                    <Text style={s.countdownText}>{formatCountdown(new Date(nextSession.starts_at))}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={s.emptyCard}>
                  <View style={s.emptyIconWrap}>
                    <Ionicons name="calendar-outline" size={24} color={accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.emptyTitle}>Nothing booked yet.</Text>
                    <Text style={s.emptyText}>Find the right trainer and put your next session on the calendar.</Text>
                  </View>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/browse')}>
                    <Text style={s.emptyBtnText}>Discover</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {!isTrainer && (programsQ.data?.length ?? 0) > 0 && (
            <>
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionEyebrow}>KEEP BUILDING</Text>
                  <Text style={s.sectionTitle}>My programs</Text>
                </View>
                <View style={s.sectionBeam} />
              </View>
              {(programsQ.data ?? []).map((p) => (
                <View key={p.id} style={s.programCard}>
                  <View style={s.programRail} />
                  <View style={s.programIcon}><Ionicons name="layers-outline" size={18} color={accent} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.programTitle}>{p.title}</Text>
                    {p.description ? <Text style={s.programDesc} numberOfLines={2}>{p.description}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  accent: string,
  isDark: boolean,
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 48, backgroundColor: colors.background },
    heroShell: {
      marginHorizontal: 18,
      marginTop: 14,
      borderRadius: 28,
      backgroundColor: BRAND.navy,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#193857',
      shadowColor: '#07172B',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
      minHeight: 220,
    },
    heroInner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 26, paddingTop: 26, paddingBottom: 22 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
    brandEyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 2.6, marginBottom: 8 },
    greeting: { fontSize: 35, fontWeight: '900', color: '#fff', letterSpacing: -1.1, lineHeight: 40 },
    subtitle: { fontSize: 14, color: '#AEBFD2', marginTop: 5, fontWeight: '600' },
    heroMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 24 },
    heroChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    heroChipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    heroChipMutedText: { color: '#66809D', fontSize: 8, fontStyle: 'italic', fontWeight: '900', letterSpacing: 2.2 },
    content: { paddingHorizontal: 24, paddingTop: 26 },
    sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 8, marginBottom: 12 },
    sectionEyebrow: { fontSize: 9, color: accent, fontWeight: '900', letterSpacing: 1.6 },
    sectionTitle: { fontSize: 22, color: colors.ink, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
    sectionBeam: { flex: 1, maxWidth: 170, height: 2, marginBottom: 7, backgroundColor: BRAND.blue, opacity: 0.38, borderRadius: 2 },
    nextCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: BRAND.navy, borderRadius: 22, borderWidth: 1, borderColor: '#193857', padding: 20, marginBottom: 28, overflow: 'hidden', shadowColor: BRAND.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 5 },
    nextAccentRail: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: accent },
    nextCardKicker: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    nextCardTime: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 4 },
    nextCardDuration: { color: '#A9B8C9', fontSize: 12, fontWeight: '700', marginTop: 3 },
    nextCardNotes: { color: '#A9B8C9', fontSize: 12, lineHeight: 18, marginTop: 8 },
    countdownBadge: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 },
    countdownText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceCard, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 28, shadowColor: '#07172B', shadowOffset: { width: 0, height: 5 }, shadowOpacity: isDark ? 0.28 : 0.05, shadowRadius: 14 },
    emptyIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
    emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
    emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BRAND.navy, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
    emptyBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    programCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 15, marginBottom: 9, overflow: 'hidden' },
    programRail: { width: 3, alignSelf: 'stretch', backgroundColor: BRAND.purple, opacity: 0.76, borderRadius: 2 },
    programIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
    programTitle: { fontSize: 14, fontWeight: '900', color: colors.ink },
    programDesc: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 2 },
  });
}
