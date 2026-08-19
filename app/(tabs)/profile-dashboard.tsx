import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { EnergyField } from '@/components/EnergyField';
import { FadeUp, SpringPress } from '@/components/Motion';
import { useAuth } from '@/lib/auth';
import { useMyBookingsAsTrainer } from '@/lib/queries/bookings';
import { usePublicTrainerProfile } from '@/lib/queries/browse';
import { useClientAssignedProgramsByUserId } from '@/lib/queries/programs';
import { useClientSessions, useTrainerSessions } from '@/lib/queries/sessions';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

type Achievement = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  unlocked: boolean;
};

export default function ProfileDashboard() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors, accent, spacing } = useTheme();
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

  const achievements = useMemo<Achievement[]>(() => {
    const items: Achievement[] = [
      { icon: 'rocket-outline', title: 'First Step', detail: 'Complete your first session', unlocked: completedSessions >= 1 },
      { icon: 'flame-outline', title: 'Momentum', detail: 'Reach 5 completed sessions', unlocked: completedSessions >= 5 },
      { icon: 'camera-outline', title: 'Show Up', detail: 'Add your profile photo', unlocked: Boolean(profile?.avatar_url) },
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
          <View style={styles.hero}>
            <EnergyField opacity={0.95} />
            <View style={styles.heroTop}>
              <View style={styles.avatarWrap}>
                <Avatar seed={userId || 'trainerhub'} size={92} initial={displayName} imageUrl={profile?.avatar_url} />
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => router.push('/(tabs)/personalize')}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                >
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
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
              <View style={[styles.progressFill, { width: `${levelProgress}%`, backgroundColor: accent }]} />
            </View>
          </View>
        </FadeUp>

        <FadeUp delay={70}>
          <View style={styles.statGrid}>
            <StatCard icon="flame-outline" value={String(streak)} label="Streak" accent={accent} colors={colors} />
            <StatCard icon="checkmark-circle-outline" value={String(completedSessions)} label="Completed" accent={accent} colors={colors} />
            <StatCard icon="calendar-outline" value={String(upcomingSessions)} label="Upcoming" accent={accent} colors={colors} />
            <StatCard
              icon={isTrainer ? 'star-outline' : 'map-outline'}
              value={String(isTrainer ? reviews : programs.length)}
              label={isTrainer ? 'Reviews' : 'Programs'}
              accent={accent}
              colors={colors}
            />
          </View>
        </FadeUp>

        <FadeUp delay={130}>
          <View style={[styles.momentumCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <View style={[styles.momentumRail, { backgroundColor: accent }]} />
            <View style={styles.momentumGlyph}>
              <Ionicons name={isTrainer ? 'trending-up-outline' : 'flash-outline'} size={22} color={accent} />
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
              <View style={styles.goButton}>
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
            <View style={styles.sectionLine} />
            <Text style={[styles.achievementCount, { color: colors.muted }]}>{achievements.filter((item) => item.unlocked).length}/{achievements.length}</Text>
          </View>
          <View style={styles.badgeGrid}>
            {achievements.map((item) => (
              <View
                key={item.title}
                style={[
                  styles.badgeCard,
                  { backgroundColor: colors.surfaceCard, borderColor: item.unlocked ? accent : colors.border, opacity: item.unlocked ? 1 : 0.58 },
                ]}
              >
                <View style={[styles.badgeRail, { backgroundColor: item.unlocked ? accent : colors.border }]} />
                <Ionicons name={item.icon} size={21} color={item.unlocked ? accent : colors.muted} />
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
            <View style={styles.sectionLine} />
          </View>
          <SpringPress onPress={() => router.push('/(tabs)/personalize')}>
            <View style={[styles.actionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={[styles.actionRail, { backgroundColor: BRAND.purple }]} />
              <Ionicons name="color-palette-outline" size={22} color={accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.ink }]}>Personalize TrainerHub</Text>
                <Text style={[styles.actionSub, { color: colors.muted }]}>Change your color and profile photo.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
            </View>
          </SpringPress>
          <SpringPress onPress={() => router.push('/(tabs)/profile')}>
            <View style={[styles.actionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={[styles.actionRail, { backgroundColor: BRAND.blue }]} />
              <Ionicons name="settings-outline" size={22} color={accent} />
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
        <View style={[styles.statRail, { backgroundColor: accent }]} />
        <Ionicons name={icon} size={20} color={accent} />
        <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      </View>
    </SpringPress>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingBottom: 56 },
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: BRAND.navy, borderRadius: 24, borderWidth: 1, borderColor: '#193857', padding: 22, shadowColor: BRAND.navy, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 22, elevation: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16, zIndex: 2 },
  avatarWrap: { position: 'relative' },
  cameraButton: { position: 'absolute', right: -4, bottom: -4, width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroEyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  heroName: { color: '#fff', fontSize: 30, lineHeight: 35, fontWeight: '900', letterSpacing: -0.7, marginTop: 3 },
  heroSub: { color: '#AEBFD2', fontSize: 13, fontWeight: '700', marginTop: 3 },
  editButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', alignItems: 'center', justifyContent: 'center' },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 22, zIndex: 2 },
  levelCopy: { flex: 1 },
  levelTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  levelSub: { color: '#879BB1', fontSize: 11, marginTop: 2 },
  levelPercent: { color: '#fff', fontSize: 16, fontWeight: '900' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', marginTop: 10, zIndex: 2 },
  progressFill: { height: '100%', borderRadius: 3 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statCard: { position: 'relative', overflow: 'hidden', width: 150, minWidth: 135, flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 15, minHeight: 110 },
  statRail: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.6 },
  statValue: { fontSize: 27, fontWeight: '900', marginTop: 8 },
  statLabel: { fontSize: 11, fontWeight: '800', marginTop: 1 },
  momentumCard: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 17, marginTop: 18 },
  momentumRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.72 },
  momentumGlyph: { width: 36, alignItems: 'center', justifyContent: 'center' },
  momentumTitle: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  momentumBody: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  goButton: { width: 42, height: 42, borderRadius: 10, backgroundColor: BRAND.navy, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 27, marginBottom: 11 },
  sectionEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.3, marginTop: 2 },
  sectionLine: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.22, marginBottom: 7 },
  achievementCount: { fontSize: 12, fontWeight: '800' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { position: 'relative', overflow: 'hidden', width: 190, minWidth: 170, flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 15 },
  badgeRail: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.64 },
  badgeTitle: { fontSize: 14, fontWeight: '900', marginTop: 10 },
  badgeDetail: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  unlocked: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 9 },
  actionCard: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 9 },
  actionRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.68 },
  actionTitle: { fontSize: 14, fontWeight: '900' },
  actionSub: { fontSize: 11, lineHeight: 16, marginTop: 2 },
});
