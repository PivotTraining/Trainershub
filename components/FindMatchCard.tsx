/** Client marketplace command card for Home. */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
      <View style={[styles.hero, { backgroundColor: accent }]}>
        <View style={{ flex: 1 }}>
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
        <Text style={styles.heroEmoji}>🎯</Text>
      </View>
    );
  }

  return (
    <View style={[styles.returningCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={styles.returningHeader}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceRaised }]}>
          <Ionicons name="search-outline" size={21} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.returningEyebrow, { color: accent }]}>FIND YOUR NEXT TRAINER</Text>
          <Text style={[styles.returningTitle, { color: colors.ink }]}>Ready to book?</Text>
          <Text style={[styles.returningBody, { color: colors.muted }]}>Browse the marketplace directly or refine your matches again.</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.ink }]}
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
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 5, letterSpacing: -0.2 },
  heroBody: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 6, lineHeight: 19 },
  heroBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, marginTop: 14 },
  heroBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  heroEmoji: { fontSize: 52 },
  returningCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 20 },
  returningHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  returningEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  returningTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  returningBody: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 10 },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 10 },
  secondaryBtnText: { fontSize: 12, fontWeight: '900' },
});
