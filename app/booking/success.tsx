import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnergyField } from '@/components/EnergyField';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export default function BookingSuccess() {
  const router = useRouter();
  const { colors, accent } = useTheme();
  const { trainerName, startsAt, duration, sessionType } = useLocalSearchParams<{
    trainerName?: string;
    startsAt?: string;
    duration?: string;
    sessionType?: string;
  }>();

  const date = startsAt ? new Date(startsAt) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Your requested time';
  const trainer = trainerName || 'your trainer';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.wrap}>
        <View style={styles.hero}>
          <EnergyField />
          <View style={styles.statusLine} />
          <Ionicons name="checkmark-circle-outline" size={34} color="#FFFFFF" />
          <Text style={styles.eyebrow}>REQUEST SENT</Text>
          <Text style={styles.title}>Your session request is moving.</Text>
          <Text style={styles.subtitle}>
            {trainer} has been notified. This session stays pending until the trainer confirms it.
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <SummaryRow icon="calendar-outline" label="Requested time" value={dateLabel} colors={colors} accent={accent} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow icon="time-outline" label="Duration" value={duration ? `${duration} minutes` : 'Session'} colors={colors} accent={accent} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow icon={sessionType === 'virtual' ? 'videocam-outline' : 'people-outline'} label="Session type" value={sessionType === 'virtual' ? 'Virtual' : 'In-person'} colors={colors} accent={accent} />
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.statusRail, { backgroundColor: BRAND.blue }]} />
          <Ionicons name="notifications-outline" size={20} color={accent} />
          <Text style={[styles.statusText, { color: colors.muted }]}>We’ll update your booking as soon as the trainer accepts or declines.</Text>
        </View>

        <TouchableOpacity
          style={styles.primary}
          onPress={() => router.replace('/(tabs)/bookings')}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryText}>View my bookings</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/(tabs)/browse')}>
          <Text style={[styles.secondaryText, { color: accent }]}>Back to Discover</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ icon, label, value, colors, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: ReturnType<typeof useTheme>['colors']; accent: string }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIconLine}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.summaryValue, { color: colors.ink }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  wrap: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 26, paddingTop: 34, paddingBottom: 28 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 260, justifyContent: 'flex-end', backgroundColor: BRAND.navy, borderRadius: 26, borderWidth: 1, borderColor: '#193857', padding: 24, shadowColor: BRAND.navy, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 7 },
  statusLine: { position: 'absolute', left: 24, top: 24, width: 90, height: 2, backgroundColor: BRAND.blue, opacity: 0.75 },
  eyebrow: { color: '#7ED3FF', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 14 },
  title: { color: '#FFFFFF', fontSize: 36, lineHeight: 40, fontWeight: '900', letterSpacing: -0.9, marginTop: 6, maxWidth: 540 },
  subtitle: { color: '#AEBFD2', fontSize: 15, lineHeight: 23, marginTop: 10, maxWidth: 560 },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  summaryIconLine: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 2, borderLeftColor: BRAND.purple },
  summaryLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.9, fontWeight: '900' },
  summaryValue: { fontSize: 14, lineHeight: 20, fontWeight: '800', marginTop: 2 },
  divider: { height: 1, marginVertical: 9 },
  statusCard: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
  statusRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.72 },
  statusText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  primary: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16, backgroundColor: BRAND.navy },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondary: { alignItems: 'center', paddingVertical: 15 },
  secondaryText: { fontSize: 14, fontWeight: '800' },
});
