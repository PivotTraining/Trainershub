/**
 * StreakCard — shows the user's current training streak in their preferred unit
 * (days, weeks, or months).  Tappable to log "I trained today" which increments
 * the count and updates streak_last_logged.  Long-press cycles the unit.
 */
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useUpdateProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
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
  if (unit === 'days')  return d.toISOString().slice(0, 10);
  if (unit === 'weeks') {
    const w = new Date(d);
    w.setDate(w.getDate() - w.getDay()); // start of week (Sun)
    return w.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7); // months → YYYY-MM
}

function isConsecutive(unit: StreakUnit, last: Date, now: Date): boolean {
  const lastKey = periodKey(unit, last);
  const prev = new Date(now);
  if (unit === 'days')  prev.setDate(prev.getDate() - 1);
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
  const lastKey  = lastDate ? periodKey(unit, lastDate) : null;
  const alreadyLogged = lastKey === todayKey;

  const handleLog = async () => {
    if (alreadyLogged || busy) return;
    setBusy(true);
    try {
      let nextCount = 1;
      if (lastDate && isConsecutive(unit, lastDate, today)) {
        nextCount = count + 1;
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          streak_count: nextCount,
          streak_last_logged: today.toISOString().slice(0, 10),
        })
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

  const labelMap: Record<StreakUnit, string> = {
    days:   count === 1 ? 'day streak' : 'day streak',
    weeks:  count === 1 ? 'week streak' : 'week streak',
    months: count === 1 ? 'month streak' : 'month streak',
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
      onPress={handleLog}
      onLongPress={handleCycleUnit}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <Text style={styles.flame}>🔥</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.count, { color: colors.ink }]}>
            {count} <Text style={[styles.unit, { color: colors.muted }]}>{labelMap[unit]}</Text>
          </Text>
          <Text style={[styles.cta, { color: alreadyLogged ? colors.muted : accent }]}>
            {alreadyLogged
              ? `Logged this ${unit.slice(0, -1)} ✓`
              : `Tap to log this ${unit.slice(0, -1)}`}
          </Text>
        </View>
      </View>
      <Text style={[styles.tip, { color: colors.placeholder }]}>
        Long-press to switch unit
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flame: { fontSize: 36 },
  count: { fontSize: 26, fontWeight: '800' },
  unit:  { fontSize: 14, fontWeight: '500' },
  cta:   { fontSize: 13, fontWeight: '600', marginTop: 2 },
  tip:   { fontSize: 11, marginTop: 8, textAlign: 'right' },
});
