/** TrainerHub streak card. */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useUpdateProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/theme';
import type { StreakUnit } from '@/lib/types';
import { useTheme } from '@/lib/useTheme';

interface StreakCardProps {
  userId: string;
  count: number;
  unit: StreakUnit;
  lastLogged: string | null | undefined;
}

const UNIT_CYCLE: StreakUnit[] = ['days', 'weeks', 'months'];

function periodKey(unit: StreakUnit, d: Date): string {
  if (unit === 'days') return d.toISOString().slice(0, 10);
  if (unit === 'weeks') {
    const w = new Date(d);
    w.setDate(w.getDate() - w.getDay());
    return w.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7);
}

function isConsecutive(unit: StreakUnit, last: Date, now: Date): boolean {
  const lastKey = periodKey(unit, last);
  const prev = new Date(now);
  if (unit === 'days') prev.setDate(prev.getDate() - 1);
  if (unit === 'weeks') prev.setDate(prev.getDate() - 7);
  if (unit === 'months') prev.setMonth(prev.getMonth() - 1);
  return lastKey === periodKey(unit, prev);
}

export function StreakCard({ userId, count, unit, lastLogged }: StreakCardProps) {
  const { colors, accent } = useTheme();
  const updateProfile = useUpdateProfile();
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const todayKey = periodKey(unit, today);
  const lastDate = lastLogged ? new Date(lastLogged) : null;
  const lastKey = lastDate ? periodKey(unit, lastDate) : null;
  const alreadyLogged = lastKey === todayKey;

  const handleLog = async () => {
    if (alreadyLogged || busy) return;
    setBusy(true);
    try {
      let nextCount = 1;
      if (lastDate && isConsecutive(unit, lastDate, today)) nextCount = count + 1;
      const { error } = await supabase
        .from('profiles')
        .update({ streak_count: nextCount, streak_last_logged: today.toISOString().slice(0, 10) })
        .eq('id', userId);
      if (error) throw new Error(error.message);
    } catch (e: unknown) {
      Alert.alert('Could not log', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const handleCycleUnit = async () => {
    const idx = UNIT_CYCLE.indexOf(unit);
    const next = UNIT_CYCLE[(idx + 1) % UNIT_CYCLE.length];
    await updateProfile.mutateAsync({ id: userId, streak_unit: next }).catch(() => null);
  };

  const unitLabel = unit === 'days' ? 'day' : unit === 'weeks' ? 'week' : 'month';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
      onPress={handleLog}
      onLongPress={handleCycleUnit}
      activeOpacity={0.88}
    >
      <View style={[styles.iconWrap, { backgroundColor: BRAND.navy }]}>
        <Ionicons name="flame" size={24} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrow, { color: accent }]}>MOMENTUM</Text>
        <Text style={[styles.count, { color: colors.ink }]}>
          {count} <Text style={[styles.unit, { color: colors.muted }]}>{unitLabel} streak</Text>
        </Text>
        <Text style={[styles.cta, { color: alreadyLogged ? colors.muted : colors.inkSoft }]}>
          {alreadyLogged ? `Logged this ${unitLabel} ✓` : `Tap to log this ${unitLabel}`}
        </Text>
      </View>
      <View style={styles.rightMeta}>
        <View style={[styles.dot, { backgroundColor: BRAND.purple }]} />
        <View style={[styles.dot, { backgroundColor: BRAND.blue }]} />
        <Text style={[styles.tip, { color: colors.placeholder }]}>hold to switch</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 22, shadowColor: BRAND.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  iconWrap: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  count: { fontSize: 25, fontWeight: '900', marginTop: 1 },
  unit: { fontSize: 13, fontWeight: '700' },
  cta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  rightMeta: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tip: { fontSize: 9, fontWeight: '700', marginTop: 2 },
});
