import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClientHomeExperience } from '@/components/ClientHomeExperience';
import { EnergyField } from '@/components/EnergyField';
import { NotificationsNudge } from '@/components/NotificationsNudge';
import { TrainerDashboard } from '@/components/TrainerDashboard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { useTrainerSessions } from '@/lib/queries/sessions';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export default function Home() {
  const { session, profile } = useAuth();
  const { showEmoji } = usePreferences();
  const { colors, accent, isDark } = useTheme();
  const userId = session?.user.id;
  const isTrainer = profile?.role === 'trainer';

  const trainerSessionsQ = useTrainerSessions(isTrainer ? userId : undefined);
  const sessions = useMemo(() => trainerSessionsQ.data ?? [], [trainerSessionsQ.data]);
  const upcoming = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => s.status === 'scheduled' && new Date(s.starts_at) >= now);
  }, [sessions]);

  if (!isTrainer) return <ClientHomeExperience />;

  const firstName = profile?.full_name?.split(' ')[0] ?? null;
  const greeting = firstName ? `Hey, ${firstName}${showEmoji ? ' 👋' : ''}` : `Welcome${showEmoji ? ' 👋' : ''}`;
  const s = makeStyles(colors, accent, isDark);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={trainerSessionsQ.isLoading} onRefresh={trainerSessionsQ.refetch} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroShell}>
          <EnergyField />
          <View style={s.heroInner}>
            <View style={s.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.brandEyebrow}>FIND  •  BOOK  •  TRAIN</Text>
                <Text style={s.greeting}>{greeting}</Text>
                <Text style={s.subtitle}>Build momentum. Grow your training business.</Text>
              </View>
              <WeatherWidget lat={profile?.location_lat} lng={profile?.location_lng} city={profile?.location_city} />
            </View>

            <View style={s.heroMetaRow}>
              <View style={s.heroChip}>
                <Ionicons name="people-outline" size={14} color="#fff" />
                <Text style={s.heroChipText}>{upcoming.length} upcoming</Text>
              </View>
              <Text style={s.heroChipMutedText}>BETTER TOGETHER.</Text>
            </View>
          </View>
        </View>

        <View style={s.content}>
          <NotificationsNudge />
          {userId ? <TrainerDashboard trainerId={userId} /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], accent: string, isDark: boolean) {
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
    trainerPanel: { backgroundColor: colors.surfaceCard, borderColor: colors.border, shadowOpacity: isDark ? 0.28 : 0.05, borderWidth: 1, borderRadius: 20, padding: 18 },
  });
}
