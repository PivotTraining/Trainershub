import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BrandLockup } from '@/components/BrandLockup';
import { StarRating } from '@/components/StarRating';
import { useAuth } from '@/lib/auth';
import { useBrowseTrainers } from '@/lib/queries/browse';
import { useClientAssignedProgramsByUserId } from '@/lib/queries/programs';
import { useClientSessions } from '@/lib/queries/sessions';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { TrainerListing } from '@/lib/types';

const CATEGORIES = [
  { label: 'Basketball', icon: 'basketball-outline', specialty: 'basketball' },
  { label: 'Strength', icon: 'barbell-outline', specialty: 'strength' },
  { label: 'Weight Loss', icon: 'flame-outline', specialty: 'weight loss' },
  { label: 'Mobility', icon: 'body-outline', specialty: 'mobility' },
  { label: 'Youth', icon: 'people-outline', specialty: 'youth' },
  { label: 'Virtual', icon: 'videocam-outline', sessionType: 'virtual' },
] as const;

export function ClientHomeExperience() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const userId = session?.user.id;
  const sessionsQ = useClientSessions(userId);
  const programsQ = useClientAssignedProgramsByUserId(userId);
  const trainersQ = useBrowseTrainers({});

  const upcoming = useMemo(() => {
    const now = new Date();
    return (sessionsQ.data ?? [])
      .filter((s) => s.status === 'scheduled' && new Date(s.starts_at) >= now)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  }, [sessionsQ.data]);

  const nextSession = upcoming[0] ?? null;
  const featured = (trainersQ.data ?? []).slice(0, 4);
  const firstName = profile?.full_name?.trim().split(' ')[0] || 'there';
  const program = programsQ.data?.[0] ?? null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <BrandLockup compact dark={false} />
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/profile-dashboard')}>
            <Ionicons name="notifications-outline" size={20} color={BRAND.navy} />
          </TouchableOpacity>
        </View>

        <Text style={styles.greeting}>Good morning, {firstName} 👋</Text>
        <Text style={styles.heroTitle}>Who are we{`\n`}training with{`\n`}<Text style={styles.heroAccent}>today?</Text></Text>

        <TouchableOpacity style={styles.findCard} onPress={() => router.push('/(tabs)/browse')} activeOpacity={0.9}>
          <View>
            <Text style={styles.findTitle}>Find a Trainer</Text>
            <Text style={styles.findSub}>Search by name, skill, goal, or location</Text>
          </View>
          <View style={styles.findArrow}><Ionicons name="arrow-forward" size={21} color="#FFFFFF" /></View>
        </TouchableOpacity>

        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>Popular Categories</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/browse')}><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
        </View>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.category}
              onPress={() => router.push({ pathname: '/(tabs)/browse', params: 'sessionType' in item ? { sessionType: item.sessionType } : { specialty: item.specialty } })}
            >
              <Ionicons name={item.icon} size={16} color="#FFFFFF" />
              <Text style={styles.categoryText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>Top Trainers</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/browse')}><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trainerRail}>
          {featured.map((trainer) => <FeaturedTrainer key={trainer.user_id} trainer={trainer} onPress={() => router.push({ pathname: '/(tabs)/browse/[trainerId]', params: { trainerId: trainer.user_id } })} />)}
          {!featured.length ? <View style={styles.emptyFeatured}><Text style={styles.emptyFeaturedText}>Trainer profiles will appear here as the marketplace grows.</Text></View> : null}
        </ScrollView>

        {nextSession ? (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 10 }]}>Your Next Session</Text>
            <TouchableOpacity style={styles.nextSession} onPress={() => router.push({ pathname: '/session/[id]', params: { id: nextSession.id } })}>
              <View style={styles.nextIcon}><Ionicons name="calendar" size={19} color="#FFFFFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextKicker}>SESSION LOCKED IN</Text>
                <Text style={styles.nextTime}>{new Date(nextSession.starts_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
                <Text style={styles.nextMeta}>{nextSession.duration_min} min training session</Text>
              </View>
              <View style={styles.nextArrow}><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></View>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.nextSession} onPress={() => router.push('/(tabs)/browse')}>
            <View style={styles.nextIcon}><Ionicons name="flash" size={19} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}><Text style={styles.nextKicker}>YOUR NEXT MOVE</Text><Text style={styles.nextTime}>Book your first session</Text><Text style={styles.nextMeta}>Find a trainer who fits how you want to grow.</Text></View>
            <View style={styles.nextArrow}><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></View>
          </TouchableOpacity>
        )}

        {program ? (
          <>
            <View style={[styles.sectionTop, { marginTop: 24 }]}><Text style={styles.sectionTitle}>Continue Your Program</Text><TouchableOpacity onPress={() => router.push('/(tabs)/profile-dashboard')}><Text style={styles.viewAll}>View program</Text></TouchableOpacity></View>
            <View style={styles.programCard}>
              <View style={styles.programIcon}><Ionicons name="layers" size={22} color="#FFFFFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.programTitle}>{program.title}</Text>
                <Text style={styles.programSub}>{program.description || 'Keep building consistency one session at a time.'}</Text>
                <View style={styles.programTrack}><View style={styles.programFill} /></View>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeaturedTrainer({ trainer, onPress }: { trainer: TrainerListing; onPress: () => void }) {
  const displayName = trainer.full_name ?? 'Trainer';
  const specialty = trainer.specialties[0] ?? 'Trainer';
  return (
    <TouchableOpacity style={styles.trainerCard} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.trainerVisual}>
        <Avatar seed={trainer.user_id} size={74} initial={displayName} imageUrl={trainer.avatar_url} />
        <View style={styles.heart}><Ionicons name="heart-outline" size={15} color="#FFFFFF" /></View>
      </View>
      <Text style={styles.trainerName} numberOfLines={1}>{displayName}</Text>
      <Text style={styles.trainerSpecialty} numberOfLines={1}>{specialty}</Text>
      <View style={styles.ratingLine}><StarRating rating={trainer.avg_rating} size={11} /><Text style={styles.ratingText}>{trainer.avg_rating > 0 ? trainer.avg_rating.toFixed(1) : 'New'}</Text></View>
      <Text style={styles.rate}>{trainer.hourly_rate_cents != null ? `$${Math.round(trainer.hourly_rate_cents / 100)} / session` : 'Rate on request'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 44 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1F7' },
  greeting: { color: '#626775', fontSize: 12, fontWeight: '700', marginBottom: 9 },
  heroTitle: { color: BRAND.navy, fontSize: 44, lineHeight: 44, fontWeight: '900', letterSpacing: -1.9, maxWidth: 420 },
  heroAccent: { color: BRAND.purple },
  findCard: { marginTop: 20, minHeight: 84, borderRadius: 18, backgroundColor: '#F1F0F3', paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  findTitle: { color: BRAND.navy, fontSize: 17, fontWeight: '900' },
  findSub: { color: '#7A7E89', fontSize: 11, marginTop: 4 },
  findArrow: { width: 50, height: 50, borderRadius: 25, backgroundColor: BRAND.purple, alignItems: 'center', justifyContent: 'center' },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: BRAND.navy, fontSize: 15, fontWeight: '900' },
  viewAll: { color: BRAND.purple, fontSize: 11, fontWeight: '800' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { width: '31.5%', minHeight: 48, backgroundColor: BRAND.navy, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  categoryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', flexShrink: 1 },
  trainerRail: { gap: 10, paddingRight: 8 },
  trainerCard: { width: 156, minHeight: 218, borderRadius: 18, padding: 10, backgroundColor: '#F4F2F7', borderWidth: 1, borderColor: '#E7E2EC' },
  trainerVisual: { height: 92, borderRadius: 14, backgroundColor: '#DDD7E5', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heart: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(7,23,43,0.82)', alignItems: 'center', justifyContent: 'center' },
  trainerName: { color: BRAND.navy, fontSize: 13, fontWeight: '900', marginTop: 9 },
  trainerSpecialty: { color: '#777B87', fontSize: 10, marginTop: 2 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  ratingText: { color: BRAND.navy, fontSize: 10, fontWeight: '800' },
  rate: { color: BRAND.navy, fontSize: 11, fontWeight: '900', marginTop: 5 },
  emptyFeatured: { width: 260, minHeight: 120, borderRadius: 16, backgroundColor: '#F4F2F7', alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyFeaturedText: { textAlign: 'center', color: '#777B87', fontSize: 12, lineHeight: 18 },
  nextSession: { minHeight: 112, borderRadius: 20, backgroundColor: BRAND.navy, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  nextIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#172A41', alignItems: 'center', justifyContent: 'center' },
  nextKicker: { color: '#7ED3FF', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  nextTime: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 4 },
  nextMeta: { color: '#A9B8C9', fontSize: 11, marginTop: 3 },
  nextArrow: { width: 42, height: 42, borderRadius: 21, backgroundColor: BRAND.purple, alignItems: 'center', justifyContent: 'center' },
  programCard: { borderRadius: 18, backgroundColor: BRAND.navy, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  programIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#172A41', alignItems: 'center', justifyContent: 'center' },
  programTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  programSub: { color: '#A9B8C9', fontSize: 10, marginTop: 3 },
  programTrack: { height: 5, borderRadius: 4, backgroundColor: '#2A3A4C', marginTop: 11, overflow: 'hidden' },
  programFill: { width: '48%', height: '100%', borderRadius: 4, backgroundColor: BRAND.purple },
});
