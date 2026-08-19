/** Client marketplace command card for Home. */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EnergyField } from '@/components/EnergyField';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const QUIZ_DONE_KEY = '@trainerhub:quiz_completed';

export function FindMatchCard() {
  const router = useRouter();
  const { accent, colors } = useTheme();
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(QUIZ_DONE_KEY).then((value) => setCompleted(!!value));
  }, []);

  if (completed === null) return null;

  if (!completed) {
    return (
      <View style={styles.hero}>
        <EnergyField opacity={0.72} flip />
        <View style={styles.lightRail} />
        <View style={{ flex: 1, zIndex: 2 }}>
          <Text style={styles.heroEyebrow}>YOUR NEXT MOVE</Text>
          <Text style={styles.heroTitle}>Find a trainer who fits.</Text>
          <Text style={styles.heroBody}>
            Answer five quick questions and narrow the marketplace to trainers aligned with your goals, format and budget.
          </Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/(tabs)/browse/quiz')} activeOpacity={0.86}>
            <Text style={styles.heroBtnText}>Start my match</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
        <Ionicons name="locate-outline" size={38} color="#A9DFFF" style={styles.heroIcon} />
      </View>
    );
  }

  return (
    <View style={[styles.returningCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={styles.returningRail} />
      <View style={styles.returningHeader}>
        <View style={styles.iconLine}>
          <Ionicons name="search-outline" size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.returningEyebrow, { color: accent }]}>FIND YOUR NEXT TRAINER</Text>
          <Text style={[styles.returningTitle, { color: colors.ink }]}>Ready to book?</Text>
          <Text style={[styles.returningBody, { color: colors.muted }]}>Browse the marketplace directly or refine your matches again.</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: BRAND.navy }]}
          onPress={() => router.push('/(tabs)/browse')}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryBtnText}>Browse trainers</Text>
          <Ionicons name="arrow-forward" size={15} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/browse/quiz')}
          activeOpacity={0.82}
        >
          <Ionicons name="options-outline" size={15} color={accent} />
          <Text style={[styles.secondaryBtnText, { color: accent }]}>Retake match</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export async function markQuizComplete() {
  await AsyncStorage.setItem(QUIZ_DONE_KEY, '1').catch(() => null);
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: BRAND.navy,
    borderWidth: 1,
    borderColor: '#193857',
    overflow: 'hidden',
    shadowColor: BRAND.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  lightRail: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: BRAND.purple, opacity: 0.78 },
  heroEyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 5, letterSpacing: -0.5 },
  heroBody: { color: '#B7C6D7', fontSize: 13, marginTop: 6, lineHeight: 19 },
  heroBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 15 },
  heroBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  heroIcon: { zIndex: 2, opacity: 0.9 },
  returningCard: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 18, shadowColor: BRAND.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  returningRail: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: BRAND.blue, opacity: 0.62 },
  returningHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconLine: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 2, borderLeftColor: BRAND.purple },
  returningEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  returningTitle: { fontSize: 19, fontWeight: '900', marginTop: 3 },
  returningBody: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 10 },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 10 },
  secondaryBtnText: { fontSize: 12, fontWeight: '900' },
});
