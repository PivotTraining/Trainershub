/**
 * FindMatchCard — hero card on the home dashboard that drops users into the
 * sector → sub-specialty quiz.  Shown most prominently for first-time users
 * (those who haven't completed the quiz yet) but stays available afterwards
 * as a quick way to re-discover trainers.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/lib/useTheme';

const QUIZ_DONE_KEY = '@trainerhub:quiz_completed';

export function FindMatchCard() {
  const router = useRouter();
  const { accent } = useTheme();
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(QUIZ_DONE_KEY).then((v) => setCompleted(!!v));
  }, []);

  if (completed === null) return null;

  const handlePress = () => {
    router.push('/(tabs)/browse/quiz');
  };

  // First-time pitch is bigger and more conversion-focused
  if (!completed) {
    return (
      <TouchableOpacity
        style={[styles.hero, { backgroundColor: accent }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.heroEyebrow}>5-min match quiz</Text>
          <Text style={styles.heroTitle}>Find your trainer</Text>
          <Text style={styles.heroBody}>
            Tell us what you want to work on — we&apos;ll match you with coaches who specialise in it.
          </Text>
          <View style={styles.heroBtn}>
            <Text style={styles.heroBtnText}>Take the quiz →</Text>
          </View>
        </View>
        <Text style={styles.heroEmoji}>🎯</Text>
      </TouchableOpacity>
    );
  }

  // Returning users get a slim re-entry pill
  return (
    <TouchableOpacity style={[styles.pill, { borderColor: accent }]} onPress={handlePress} activeOpacity={0.85}>
      <Text style={[styles.pillText, { color: accent }]}>🎯 Find a different trainer →</Text>
    </TouchableOpacity>
  );
}

/** Call this from the quiz finish handler to mark the user as no-longer first-time. */
export async function markQuizComplete() {
  await AsyncStorage.setItem(QUIZ_DONE_KEY, '1').catch(() => null);
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 16,
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
  heroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  heroBody: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 6, lineHeight: 18 },
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    marginTop: 14,
  },
  heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroEmoji: { fontSize: 56 },
  pill: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  pillText: { fontSize: 13, fontWeight: '600' },
});
