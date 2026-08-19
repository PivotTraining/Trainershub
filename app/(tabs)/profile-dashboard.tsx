import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { FadeUp, SpringPress } from '@/components/Motion';
import { useAuth } from '@/lib/auth';
import { useMyBookingsAsTrainer } from '@/lib/queries/bookings';
import { usePublicTrainerProfile } from '@/lib/queries/browse';
import { useClientAssignedProgramsByUserId } from '@/lib/queries/programs';
import { useClientSessions, useTrainerSessions } from '@/lib/queries/sessions';
import { useTheme } from '@/lib/useTheme';

export default function ProfileDashboard() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors, accent, radius, spacing } = useTheme();
  const userId = session?.user.id ?? '';
  const isTrainer = profile?.role === 'trainer';

  const clientSessionsQ = useClientSessions(!isTrainer ? userId : undefined);
  const programsQ = useClientAssignedProgramsByUserId(!isTrainer ? userId : undefined);
  const trainerSessionsQ = useTrainerSessions(isTrainer ? userId : undefined);
  const trainerProfileQ = usePublicTrainerProfile(isTrainer ? userId : undefined);
  const trainerBookingsQ = useMyBookingsAsTrainer(isTrainer ? userId : undefined);

  const sessions = isTrainer ? (trainerSessionsQ.data ?? []) : (clientSessionsQ.data ?? []);
  const completedSessions = sessions.filter((item) => item.status === 'completed').length;
  const upcomingSessions = sessions.filter((item) => item.status === 'scheduled' && new Date(item.starts_at) > new Date()).length;
  const programs = programsQ.data ?? [];
  const streak = profile?.streak_count ?? 0;
  const trainerProfile = trainerProfileQ.data;
  const reviews = trainerProfile?.review_count ?? 0;
  const paidBookings = (trainerBookingsQ.data ?? []).filter((item) => item.payment_status === 'paid').length;

  const level = Math.max(1, Math.floor(completedSessions / 5) + 1);
  const levelFloor = (level - 1) * 5;
  const levelProgress = Math.min(100, Math.round(((completedSessions - levelFloor) / 5) * 100));
  const sessionsToNextLevel = Math.max(0, level * 5 - completedSessions);

  const achievements = useMemo(() => {
    const items = [
      { icon: 'rocket-outline' as const, title: 'First Step', detail: 'Complete your first session', unlocked: completedSessions >= 1 },
      { icon: 'flame-outline' as const, title: 'Momentum', detail: 'Reach 5 completed sessions', unlocked: completedSessions >= 5 },
      { icon: 'camera-outline' as const, title: 'Show Up', detail: 'Add your profile photo', unlocked: Boolean(profile?.avatar_url) },
    ];
    if (isTrainer) {
      items.push({ icon: 'star-outline', title: 'Trusted', detail: 'Earn your first review', unlocked: reviews >= 1 });
    } else {
      items.push({ icon: 'map-outline', title: 'On a Path', detail: 'Join a training program', unlocked: programs.length >= 1 });
    }
    return items;
  }, [completedSessions, profile?.avatar_url, isTrainer, reviews, programs.length]);

  const displayName = profile?.full_name || session?.user.email?.split('@')[0] || 'TrainerHub member';
  const firstName = displayName.split(' ')[0];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]} showsVerticalScrollIndicator={false}>
        <FadeUp>
          <View style={[styles.hero, { backgroundColor: accent, borderRadius: radius.lg }]}>
            <View style={styles.heroTop}>
              <View style={styles.avatarWrap}>
                <Avatar seed={userId || 'trainerhub'} size={92} initial={displayName} imageUrl={profile?.avatar_url} />
                <TouchableOpacity
                  style={[styles.cameraButton, { backgroundColor: colors.surface }]}
                  onPress={() => router.push('/(tabs)/personalize')}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                >
                  <Ionicons name="camera" size={17} color={accent} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>{isTrainer ? 'TRAINER PROFILE' : 'YOUR TRAINING JOURNEY'}</Text>
                <Text style={styles.heroName}>{displayName}</Text>
                <Text style={styles.heroSub}>Level {level} · {isTrainer ? 'Trainer' : 'Client'}</Text>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(tabs)/profile')}>
                <Ionicons name="settings-outline" size={19} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.levelRow}>
              <View style={styles.levelCopy}>
                <Text style={styles.levelTitle}>{sessionsToNextLevel === 0 ? 'Level complete' : `${sessionsToNextLevel} session${sessionsToNextLevel === 1 ? '' : 's'} to Level ${level + 1}`}</Text>
                <Text style={styles.levelSub}>{completedSessions} completed sessions</Text>
              </View>
              <Text style={styles.levelPercent}>{levelProgress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${levelProgress}%` }]} />
            </View>
          </View>
        </FadeUp>

        <FadeUp delay={70}>
          <View style={styles.statGrid}>
            <StatCard icon="flame" value={String(streak)} label="Streak" accent={accent} colors={colors} />
            <StatCard icon="checkmark-circle" value={String(completedSessions)} label="Completed" accent={accent} colors={colors} />
            <StatCard icon="calendar" value={String(upcomingSessions)} label="Upcoming" accent={accent} colors={colors} />
            <StatCard
              icon={isTrainer ? 'star' : 'map'}
              value={String(isTrainer ? reviews : programs.length)}
              label={isTrainer ? 'Reviews' : 'Programs'}
              accent={accent}
              colors={colors}
            />
          </View>
        </FadeUp>

        <FadeUp delay={130}>
          <View style={[styles.momentumCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border, borderRadius: radius.lg }]}>
            <View style={[styles.momentumIcon, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={styles.momentumEmoji}>{isTrainer ? '🚀' : '🔥'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionEyebrow, { color: accent }]}>NEXT MOVE</Text>
              <Text style={[styles.momentumTitle, { color: colors.ink }]}>
                {isTrainer
                  ? paidBookings === 0 ? 'Get your first paid session.' : 'Keep your booking momentum going.'
                  : upcomingSessions === 0 ? `Ready for your next session, ${firstName}?` : 'You have momentum. Keep it moving.'}
              </Text>
              <Text style={[styles.momentumBody, { color: colors.muted }]}>
                {isTrainer
                  ? 'Keep your profile complete, availability current, and respond quickly to requests.'
                  : upcomingSessions === 0 ? 'Browse trainers and put the next session on your calendar.' : 'Show up, complete the session, and move your progress bar forward.'}
              </Text>
            </View>
            <SpringPress onPress={() => router.push(isTrainer ? '/(tabs)/availability' : '/(tabs)/browse')}>
              <View style={[styles.goButton, { backgroundColor: colors.ink, borderRadius: radius.md }]}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </SpringPress>
          </View>
        </FadeUp>

        <FadeUp delay={190}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: accent }]}>ACHIEVEMENTS</Text>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>Your wins</Text>
            </View>
            <Text style={[styles.achievementCount, { color: colors.muted }]}>{achievements.filter((item) => item.unlocked).length}/{achievements.length}</Text>
          </View>
          <View style={styles.badgeGrid}>
            {achievements.map((item) => (
              <View
                key={item.title}
                style={[
                  styles.badgeCard,
                  { backgroundColor: colors.surfaceCard, borderColor: item.unlocked ? accent : colors.border, borderRadius: radius.lg, opacity: item.unlocked ? 1 : 0.58 },
                ]}
              >
                <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? accent : colors.surfaceRaised }]}>
                  <Ionicons name={item.icon} size={21} color={item.unlocked ? '#fff' : colors.muted} />
                </View>
                <Text style={[styles.badgeTitle, { color: colors.ink }]}>{item.title}</Text>
                <Text style={[styles.badgeDetail, { color: colors.muted }]}>{item.detail}</Text>
                {item.unlocked ? <Text style={[styles.unlocked, { color: accent }]}>UNLOCKED</Text> : null}
              </View>
            ))}
          </View>
        </FadeUp>

        <FadeUp delay={250}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: accent }]}>MAKE IT YOURS</Text>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>Profile & app</Text>
            </View>
          </View>
          <SpringPress onPress={() => router.push('/(tabs)/personalize')}>
            <View style={[styles.actionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border, borderRadius: radius.lg }]}>
              <View style={[styles.actionIcon, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="color-palette" size={23} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.ink }]}>Personalize TrainerHub</Text>
                <Text style={[styles.actionSub, { color: colors.muted }]}>Change your color and profile photo.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
            </View>
          </SpringPress>
          <SpringPress onPress={() => router.push('/(tabs)/profile')}>
            <View style={[styles.actionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border, borderRadius: radius.lg }]}>
              <View style={[styles.actionIcon, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="person-circle" size={23} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.ink }]}>Account & settings</Text>
                <Text style={[styles.actionSub, { color: colors.muted }]}>Edit details, preferences, payments and account settings.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
            </View>
          </SpringPress>
        </FadeUp>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, accent, colors }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; accent: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <SpringPress>
      <View style={[styles.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <Ionicons name={icon} size={22} color={accent} />
        <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      </View>
    </SpringPress>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingBottom: 56 },
  hero: { padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 5 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { position: 'relative' },
  cameraButton: { position: 'absolute', right: -4, bottom: -4, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)' },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  heroName: { color: '#fff', fontSize: 30, lineHeight: 35, fontWeight: '900', letterSpacing: -0.6, marginTop: 3 },
  heroSub: { color: 'rgba(255,255,255,0.86)', fontSize: 13, fontWeight: '700', marginTop: 3 },
  editButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.17)', alignItems: 'center', justifyContent: 'center' },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 22 },
  levelCopy: { flex: 1 },
  levelTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  levelSub: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 2 },
  levelPercent: { color: '#fff', fontSize: 16, fontWeight: '900' },
  progressTrack: { height: 11, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, overflow: 'hidden', marginTop: 9 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 999 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statCard: { width: 150, minWidth: 135, flexGrow: 1, borderWidth: 1, borderRadius: 16, padding: 15, minHeight: 118 },
  statValue: { fontSize: 27, fontWeight: '900', marginTop: 8 },
  statLabel: { fontSize: 11, fontWeight: '800', marginTop: 1 },
  momentumCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, padding: 17, marginTop: 18 },
  momentumIcon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  momentumEmoji: { fontSize: 26 },
  momentumTitle: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  momentumBody: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  goButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 27, marginBottom: 11 },
  sectionEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.3, marginTop: 2 },
  achievementCount: { fontSize: 12, fontWeight: '800' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { width: 190, minWidth: 170, flexGrow: 1, borderWidth: 1.5, padding: 15 },
  badgeIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeTitle: { fontSize: 14, fontWeight: '900', marginTop: 10 },
  badgeDetail: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  unlocked: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 9 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginBottom: 9 },
  actionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '900' },
  actionSub: { fontSize: 11, lineHeight: 16, marginTop: 2 },
});
