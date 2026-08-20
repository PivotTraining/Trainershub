import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { EnergyHero } from '@/components/EnergyHero';
import { useAuth } from '@/lib/auth';
import { useMyBookingsAsTrainer, useUpdateBookingStatus } from '@/lib/queries/bookings';
import { useEnsureVirtualMeeting } from '@/lib/queries/integrations';
import { BRAND, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { BookingWithNames } from '@/lib/types';

interface BookingCardProps {
  booking: BookingWithNames;
  onConfirm?: (booking: BookingWithNames) => void;
  onDecline?: (id: string) => void;
}

function BookingCard({ booking, onConfirm, onDecline }: BookingCardProps) {
  const { colors, accent } = useTheme();
  const isPending = booking.status === 'pending';
  const bookingDate = new Date(booking.starts_at);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={[styles.cardRail, { backgroundColor: isPending ? accent : BRAND.blue }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardLeft}>
          <Text style={[styles.cardEyebrow, { color: accent }]}>{isPending ? 'NEW REQUEST' : 'CONFIRMED'}</Text>
          <Text style={[styles.clientName, { color: colors.ink }]}>{booking.clientName ?? 'Client'}</Text>
          <Text style={[styles.cardDate, { color: colors.muted }]}>
            {bookingDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.muted }]}>{booking.duration_min} min · {booking.session_type === 'in-person' ? 'In-Person' : 'Virtual'}</Text>
          {booking.virtual_meeting_url ? (
            <TouchableOpacity style={styles.meetingPill} onPress={() => Linking.openURL(booking.virtual_meeting_url!)}>
              <Ionicons name="videocam" size={13} color="#FFFFFF" />
              <Text style={styles.meetingPillText}>Open {booking.virtual_meeting_provider === 'zoom' ? 'Zoom' : 'Google Meet'}</Text>
            </TouchableOpacity>
          ) : booking.session_type === 'virtual' && !isPending ? (
            <Text style={[styles.meetingPending, { color: colors.muted }]}>Connect Zoom or Google Calendar to auto-create a meeting link.</Text>
          ) : null}
          {booking.notes ? <Text style={[styles.notes, { color: colors.muted }]} numberOfLines={2}>“{booking.notes}”</Text> : null}
        </View>
        {!isPending ? <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} /> : null}
      </View>

      {isPending && onConfirm && onDecline ? (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(booking)}>
            <Text style={styles.confirmText}>Confirm</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.declineBtn, { borderColor: colors.danger }]} onPress={() => onDecline(booking.id)}>
            <Text style={[styles.declineText, { color: colors.danger }]}>Decline</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default function Requests() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { colors, accent } = useTheme();
  const bookingsQuery = useMyBookingsAsTrainer(userId);
  const updateStatus = useUpdateBookingStatus(userId, 'trainer');
  const ensureVirtualMeeting = useEnsureVirtualMeeting();

  const allBookings = bookingsQuery.data ?? [];
  const pending = allBookings.filter((b) => b.status === 'pending');
  const confirmed = allBookings.filter((b) => b.status === 'confirmed');

  const handleConfirm = async (booking: BookingWithNames) => {
    try {
      await updateStatus.mutateAsync({ id: booking.id, status: 'confirmed' });
      if (booking.session_type === 'virtual') {
        try {
          const result = await ensureVirtualMeeting.mutateAsync(booking.id);
          if (result.skipped && result.reason === 'no_virtual_provider') {
            Alert.alert('Session confirmed', 'The booking is confirmed. Connect Zoom or Google Calendar in Integrations to generate virtual-session links automatically.');
          } else if (result.join_url) {
            Alert.alert('Session confirmed', `${result.provider === 'zoom' ? 'Zoom' : 'Google Meet'} link created automatically.`);
          }
        } catch {
          Alert.alert('Session confirmed', 'The booking is confirmed, but TrainerHub could not create the virtual meeting link. You can reconnect your provider and try again.');
        }
      }
      await bookingsQuery.refetch();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDecline = (bookingId: string) => {
    Alert.alert('Decline request?', 'The client will be notified.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        try { await updateStatus.mutateAsync({ id: bookingId, status: 'declined' }); }
        catch (err: unknown) { Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error'); }
      } },
    ]);
  };

  if (bookingsQuery.isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={[]}
        keyExtractor={() => 'placeholder'}
        renderItem={null}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={bookingsQuery.isFetching && !bookingsQuery.isLoading} onRefresh={bookingsQuery.refetch} />}
        ListHeaderComponent={
          <>
            <EnergyHero eyebrow="TRAINER INBOX" title="Requests" subtitle="Respond quickly, protect your calendar, and turn interest into booked sessions." icon="notifications-outline" compact />

            <View style={styles.sectionRow}>
              <View><Text style={[styles.sectionEyebrow, { color: accent }]}>NEEDS ACTION</Text><Text style={[styles.sectionTitle, { color: colors.ink }]}>{pending.length} pending</Text></View>
              <View style={styles.sectionBeam} />
            </View>
            {pending.length === 0 ? (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.ink }]}>Inbox clear.</Text>
                <Text style={[styles.empty, { color: colors.muted }]}>New session requests will appear here.</Text>
              </View>
            ) : pending.map((b) => <BookingCard key={b.id} booking={b} onConfirm={handleConfirm} onDecline={handleDecline} />)}

            <View style={styles.sectionRow}>
              <View><Text style={[styles.sectionEyebrow, { color: accent }]}>LOCKED IN</Text><Text style={[styles.sectionTitle, { color: colors.ink }]}>Confirmed</Text></View>
              <View style={styles.sectionBeam} />
            </View>
            {confirmed.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>No confirmed bookings yet.</Text> : confirmed.map((b) => <BookingCard key={b.id} booking={b} />)}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 48 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 24, marginBottom: 10 },
  sectionEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginTop: 2 },
  sectionBeam: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.22, marginBottom: 5 },
  emptyState: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 18, marginBottom: spacing.md },
  emptyTitle: { fontSize: 15, fontWeight: '900' },
  empty: { fontSize: typography.sm, marginTop: 3, marginBottom: spacing.md },
  card: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: 14, marginBottom: 10 },
  cardRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.7 },
  cardBody: { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  clientName: { fontSize: 16, fontWeight: '900', marginTop: 3 },
  cardDate: { fontSize: typography.sm, marginTop: 4, fontWeight: '700' },
  cardMeta: { fontSize: typography.xs, marginTop: 3 },
  meetingPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND.purple, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, marginTop: 10 },
  meetingPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  meetingPending: { fontSize: 10, lineHeight: 15, marginTop: 8 },
  notes: { fontSize: typography.xs, marginTop: spacing.sm, fontStyle: 'italic', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, padding: 10, borderTopWidth: 1 },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: BRAND.navy, borderRadius: 9, paddingVertical: 10 },
  confirmText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  declineBtn: { flex: 1, borderWidth: 1, borderRadius: 9, paddingVertical: 10, alignItems: 'center' },
  declineText: { fontSize: 13, fontWeight: '800' },
});
