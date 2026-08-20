import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export default function BookingSuccess() {
  const router = useRouter();
  const { colors } = useTheme();
  const { trainerName, startsAt, duration, sessionType } = useLocalSearchParams<{ trainerName?: string; startsAt?: string; duration?: string; sessionType?: string }>();
  const date = startsAt ? new Date(startsAt) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Requested time';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.page}>
        <View style={styles.checkWrap}><Ionicons name="checkmark" size={46} color="#FFFFFF" /></View>
        <Text style={styles.title}>Request Sent!</Text>
        <Text style={styles.subtitle}>Your session request is on its way to {trainerName || 'your trainer'}.</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}><View style={styles.avatarPlaceholder}><Ionicons name="person" size={20} color="#FFFFFF" /></View><View style={{ flex: 1 }}><Text style={styles.trainerName}>{trainerName || 'Your Trainer'}</Text><Text style={styles.sessionType}>{sessionType === 'virtual' ? 'Virtual Training' : 'In-person Training'}</Text></View><Ionicons name="checkmark-circle" size={19} color={BRAND.purple} /></View>
          <View style={styles.divider} />
          <View style={styles.details}><Detail icon="calendar-outline" text={dateLabel} /><Detail icon="time-outline" text={duration ? `${duration} minute session` : 'Training session'} /></View>
        </View>

        <View style={styles.notice}><Ionicons name="notifications-outline" size={18} color={BRAND.purple} /><Text style={styles.noticeText}>This is a request, not a final confirmation. We’ll notify you when the trainer responds.</Text></View>

        <TouchableOpacity style={styles.primary} onPress={() => router.replace('/(tabs)/bookings')}><Text style={styles.primaryText}>View My Bookings</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/(tabs)/index')}><Text style={styles.secondaryText}>Back to Home</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Detail({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.detail}><Ionicons name={icon} size={16} color={BRAND.purple} /><Text style={styles.detailText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 54, paddingBottom: 28 },
  checkWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: BRAND.purple, alignItems: 'center', justifyContent: 'center', shadowColor: BRAND.purple, shadowOpacity: 0.24, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  title: { color: BRAND.navy, fontSize: 31, fontWeight: '900', letterSpacing: -1, marginTop: 24 },
  subtitle: { color: '#747985', fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 420, marginTop: 7 },
  summaryCard: { width: '100%', marginTop: 28, borderRadius: 18, borderWidth: 1, borderColor: '#E7E3EA', backgroundColor: '#FFFFFF', padding: 16 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: 14, backgroundColor: BRAND.navy, alignItems: 'center', justifyContent: 'center' },
  trainerName: { color: BRAND.navy, fontSize: 13, fontWeight: '900' },
  sessionType: { color: '#777B87', fontSize: 10, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#ECE9EF', marginVertical: 14 },
  details: { gap: 10 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: '#555B68', fontSize: 11, fontWeight: '700' },
  notice: { width: '100%', borderRadius: 14, backgroundColor: '#F3EDF9', padding: 14, flexDirection: 'row', gap: 9, marginTop: 12 },
  noticeText: { flex: 1, color: '#62596B', fontSize: 10, lineHeight: 16 },
  primary: { width: '100%', minHeight: 54, borderRadius: 13, backgroundColor: BRAND.navy, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  secondary: { paddingVertical: 15 },
  secondaryText: { color: BRAND.purple, fontSize: 12, fontWeight: '900' },
});
