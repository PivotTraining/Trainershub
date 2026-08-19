import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function Welcome() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors, accent } = useTheme();
  const isTrainer = profile?.role === 'trainer';

  const bullets = isTrainer
    ? [
        ['person-circle-outline', 'Build your trainer profile'],
        ['calendar-outline', 'Set your availability'],
        ['card-outline', 'Connect payouts and start getting booked'],
      ] as const
    : [
        ['search-outline', 'Discover trainers who fit your goals'],
        ['calendar-outline', 'Book sessions from your phone or computer'],
        ['sparkles-outline', 'Track your progress and come back anytime'],
      ] as const;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.wrap}>
        <View style={[styles.logoWrap, { backgroundColor: accent }]}>
          <Logo size={48} color="#fff" background="none" />
        </View>

        <Text style={styles.confetti}>🎉</Text>
        <Text style={[styles.eyebrow, { color: accent }]}>YOU’RE IN</Text>
        <Text style={[styles.title, { color: colors.ink }]}>Welcome to TrainerHub.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Your account is live. Let’s make it useful in about two minutes.</Text>

        <View style={styles.list}>
          {bullets.map(([icon, label]) => (
            <View key={label} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name={icon} size={22} color={accent} />
              </View>
              <Text style={[styles.rowText, { color: colors.ink }]}>{label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primary, { backgroundColor: accent }]}
          onPress={() => router.replace('/(auth)/onboarding')}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryText}>{isTrainer ? 'Set up my trainer profile' : 'Set up my profile'}</Text>
          <Ionicons name="arrow-forward" size={19} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.placeholder }]}>You can update these details later from Profile.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  wrap: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 26, paddingTop: 34, paddingBottom: 30 },
  logoWrap: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  confetti: { fontSize: 48, marginTop: 24, marginBottom: 6 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 2.1 },
  title: { fontSize: 38, lineHeight: 43, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  subtitle: { fontSize: 17, lineHeight: 25, marginTop: 10, maxWidth: 520 },
  list: { gap: 10, marginTop: 30 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 14 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  primary: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, paddingVertical: 16 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  note: { textAlign: 'center', fontSize: 12, marginTop: 12 },
});
