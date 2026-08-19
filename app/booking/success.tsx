import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/useTheme';

export default function BookingSuccess() {
  const router = useRouter();
  const { colors, accent, radius } = useTheme();
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
        <View style={[styles.celebration, { backgroundColor: colors.successBg }]}>
          <Text style={styles.emoji}>🎉</Text>
          <View style={[styles.check, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={24} color="#fff" />
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: accent }]}>REQUEST SENT</Text>
        <Text style={[styles.title, { color: colors.ink }]}>Your session request is in.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {trainer} has been notified. This session is still pending until the trainer confirms it.
        </Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <SummaryRow icon="calendar-outline" label="Requested time" value={dateLabel} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow icon="time-outline" label="Duration" value={duration ? `${duration} minutes` : 'Session'} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow icon={sessionType === 'virtual' ? 'videocam-outline' : 'people-outline'} label="Session type" value={sessionType === 'virtual' ? 'Virtual' : 'In-person'} colors={colors} />
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.infoBg, borderRadius: radius.lg }]}>
          <Ionicons name="notifications-outline" size={20} color={colors.info} />
          <Text style={[styles.statusText, { color: colors.info }]}>We’ll update your booking when the trainer accepts or declines.</Text>
        </View>

        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.ink, borderRadius: radius.lg }]}
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

function SummaryRow({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={18} color={colors.muted} />
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
  wrap: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 26, paddingTop: 42, paddingBottom: 28 },
  celebration: { width: 86, height: 86, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emoji: { fontSize: 40 },
  check: { position: 'absolute', right: -7, bottom: -7, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { fontSize: 35, lineHeight: 40, fontWeight: '900', letterSpacing: -0.8, marginTop: 7 },
  subtitle: { fontSize: 16, lineHeight: 24, marginTop: 10 },
  summaryCard: { borderWidth: 1, padding: 15, marginTop: 28 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  summaryIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '800' },
  summaryValue: { fontSize: 14, lineHeight: 20, fontWeight: '800', marginTop: 2 },
  divider: { height: 1, marginVertical: 9 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginTop: 14 },
  statusText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  primary: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondary: { alignItems: 'center', paddingVertical: 15 },
  secondaryText: { fontSize: 14, fontWeight: '800' },
});
