import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/BrandLockup';
import { EnergyField } from '@/components/EnergyField';
import { useAuth } from '@/lib/auth';
import { BRAND } from '@/lib/theme';
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
        ['sparkles-outline', 'Track progress and build momentum'],
      ] as const;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.wrap}>
        <View style={styles.hero}>
          <EnergyField />
          <BrandLockup compact dark />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>YOU’RE IN</Text>
            <Text style={styles.title}>Welcome to TrainerHub.</Text>
            <Text style={styles.subtitle}>Your account is live. Let’s turn it into momentum.</Text>
          </View>
        </View>

        <View style={styles.list}>
          {bullets.map(([icon, label], index) => (
            <View key={label} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}>
              <View style={[styles.rowRail, { backgroundColor: index === 0 ? BRAND.purple : index === 1 ? BRAND.blue : accent }]} />
              <Ionicons name={icon} size={21} color={accent} />
              <Text style={[styles.rowText, { color: colors.ink }]}>{label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primary} onPress={() => router.replace('/(auth)/onboarding')} activeOpacity={0.86}>
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
  wrap: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 300, justifyContent: 'space-between', backgroundColor: BRAND.navy, borderRadius: 26, borderWidth: 1, borderColor: '#193857', padding: 22 },
  heroCopy: { zIndex: 2 },
  eyebrow: { color: '#7ED3FF', fontSize: 10, fontWeight: '900', letterSpacing: 2.1 },
  title: { color: '#FFFFFF', fontSize: 39, lineHeight: 43, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  subtitle: { color: '#AEBFD2', fontSize: 16, lineHeight: 24, marginTop: 10, maxWidth: 520 },
  list: { gap: 9, marginTop: 20 },
  row: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 13, padding: 14 },
  rowRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.7 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  primary: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, paddingVertical: 16, backgroundColor: BRAND.navy },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  note: { textAlign: 'center', fontSize: 12, marginTop: 12 },
});
