import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@/lib/stripe';

import { EnergyHero } from '@/components/EnergyHero';
import { useAuth } from '@/lib/auth';
import { useMyBookingsAsClient, useUpdateBookingStatus } from '@/lib/queries/bookings';
import { useCreateReview } from '@/lib/queries/reviews';
import { useCreatePaymentIntent } from '@/lib/queries/stripe';
import { BRAND, spacing, typography } from '@/lib/theme';
import { useCorporateMember } from '@/lib/useCorporateMember';
import { useTheme } from '@/lib/useTheme';
import type { BookingWithNames, BookingStatus } from '@/lib/types';

const STATUS_COLORS: Record<BookingStatus, { bg: string; text: string }> = {
  pending: { bg: '#FFF5D8', text: '#9A5B00' },
  confirmed: { bg: '#E4F7EF', text: '#087354' },
  declined: { bg: '#FDE8E5', text: '#A9342B' },
  canceled: { bg: '#EFF2F5', text: '#6B7280' },
};

interface ReviewModalProps {
  visible: boolean;
  booking: BookingWithNames | null;
  clientId: string;
  onClose: () => void;
}

function ReviewModal({ visible, booking, clientId, onClose }: ReviewModalProps) {
  const { colors, accent } = useTheme();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');

  const handleSubmit = async () => {
    if (!booking || rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }
    try {
      await createReview.mutateAsync({
        booking_id: booking.id,
        client_id: clientId,
        trainer_id: booking.trainer_id,
        rating,
        body: body.trim() || null,
      });
      setRating(0);
      setBody('');
      onClose();
    } catch (err: unknown) {
      Alert.alert('Submit failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}><Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.ink }]}>Leave a Review</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={createReview.isPending}>
            {createReview.isPending ? <ActivityIndicator size="small" /> : <Text style={[styles.modalSubmit, { color: accent }]}>Submit</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {booking ? <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Session with {booking.trainerName ?? 'trainer'} on {new Date(booking.starts_at).toLocaleDateString()}</Text> : null}
          <Text style={[styles.label, { color: colors.muted }]}>How was it?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.starIcon, { color: star <= rating ? accent : colors.disabled }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>Comment (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surfaceCard }]}
            value={body}
            onChangeText={setBody}
            placeholder="Share your experience…"
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface BookingCardProps {
  booking: BookingWithNames;
  onCancel: (id: string) => void;
  onReview: (booking: BookingWithNames) => void;
  onPay: (booking: BookingWithNames) => void;
  isPayingThisCard?: boolean;
  isCorporateMember?: boolean;
}

function BookingCard({ booking, onCancel, onReview, onPay, isPayingThisCard, isCorporateMember }: BookingCardProps) {
  const { colors, accent } = useTheme();
  const now = new Date();
  const bookingDate = new Date(booking.starts_at);
  const isPast = bookingDate < now;
  const statusStyle = STATUS_COLORS[booking.status];
  const canCancel = booking.status === 'pending' && !isPast;
  const canReview = booking.status === 'confirmed' && isPast;
  const canPay = booking.status === 'confirmed' && !isPast && booking.payment_status === 'unpaid' && !booking.package_purchase_id;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={[styles.cardRail, { backgroundColor: booking.status === 'confirmed' ? BRAND.blue : accent }]} />
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          {booking.trainerSpecialty ? <Text style={[styles.activityText, { color: accent }]}>{booking.trainerSpecialty.toUpperCase()}</Text> : null}
          <Text style={[styles.cardTrainer, { color: colors.ink }]}>with {booking.trainerName ?? 'Trainer'}</Text>
          <Text style={[styles.cardDate, { color: colors.muted }]}>
            {bookingDate.toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.muted }]}>{booking.duration_min} min · {booking.session_type === 'in-person' ? 'In-Person' : 'Virtual'}</Text>
          {booking.payment_status === 'paid' ? <Text style={[styles.paymentConfirmed, { color: colors.success }]}>✓ Payment confirmed</Text> : null}
          {booking.payment_status === 'failed' ? <Text style={[styles.paymentConfirmed, { color: colors.danger }]}>Payment failed — try again</Text> : null}
        </View>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>{booking.status}</Text>
        </View>
      </View>

      {(canCancel || canReview || canPay) ? (
        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          {canPay && !isCorporateMember ? (
            <TouchableOpacity style={styles.primaryAction} onPress={() => onPay(booking)} disabled={isPayingThisCard}>
              {isPayingThisCard ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryActionText}>Pay now</Text>}
            </TouchableOpacity>
          ) : null}
          {canPay && isCorporateMember ? (
            <View style={[styles.actionBtn, { borderColor: colors.success }]}><Text style={[styles.actionBtnText, { color: colors.success }]}>Covered by your company</Text></View>
          ) : null}
          {canCancel ? (
            <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.danger }]} onPress={() => onCancel(booking.id)}>
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
          {canReview ? (
            <TouchableOpacity style={[styles.actionBtn, { borderColor: accent }]} onPress={() => onReview(booking)}>
              <Text style={[styles.actionBtnText, { color: accent }]}>Leave review</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function Bookings() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { colors } = useTheme();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { data: isCorporateMember = false } = useCorporateMember();

  const bookingsQuery = useMyBookingsAsClient(userId);
  const updateStatus = useUpdateBookingStatus(userId, 'client');
  const createPaymentIntent = useCreatePaymentIntent();

  const [reviewBooking, setReviewBooking] = useState<BookingWithNames | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  const handlePay = async (booking: BookingWithNames) => {
    setPayingBookingId(booking.id);
    try {
      const clientSecret = await createPaymentIntent.mutateAsync(booking.id);
      const { error: initError } = await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: 'TrainerHub', allowsDelayedPaymentMethods: false });
      if (initError) throw new Error(initError.message);
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') throw new Error(presentError.message);
        return;
      }
      const refreshed = await bookingsQuery.refetch();
      const latestBooking = refreshed.data?.find((item) => item.id === booking.id);
      if (latestBooking?.payment_status === 'paid') {
        Alert.alert('Payment confirmed', 'Stripe confirmed your payment. Your booking is paid.');
      } else {
        Alert.alert('Payment submitted', 'Stripe received your payment. TrainerHub will mark the booking paid after the secure payment confirmation arrives.');
      }
    } catch (err: unknown) {
      Alert.alert('Payment failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPayingBookingId(null);
    }
  };

  const allBookings = bookingsQuery.data ?? [];
  const now = new Date();
  const upcoming = allBookings.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.starts_at) >= now);
  const past = allBookings.filter((b) => new Date(b.starts_at) < now || b.status === 'declined' || b.status === 'canceled');

  const handleCancel = (bookingId: string) => {
    Alert.alert('Cancel booking?', 'This action cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: async () => {
        try { await updateStatus.mutateAsync({ id: bookingId, status: 'canceled' }); }
        catch (err: unknown) { Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error'); }
      } },
    ]);
  };

  if (bookingsQuery.isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  }

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
            <EnergyHero eyebrow="YOUR SESSIONS" title="Bookings" subtitle="See what’s pending, confirmed, completed and ready for payment." icon="calendar-outline" compact />

            <View style={styles.sectionRow}>
              <View><Text style={styles.sectionEyebrow}>UPCOMING</Text><Text style={[styles.sectionTitle, { color: colors.ink }]}>{upcoming.length} active</Text></View>
              <View style={styles.sectionBeam} />
            </View>
            {upcoming.length === 0 ? (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.ink }]}>Nothing on deck.</Text>
                <Text style={[styles.empty, { color: colors.muted }]}>Your next booking will appear here.</Text>
              </View>
            ) : upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} onCancel={handleCancel} onReview={setReviewBooking} onPay={handlePay} isPayingThisCard={payingBookingId === b.id} isCorporateMember={isCorporateMember} />
            ))}

            <View style={styles.sectionRow}>
              <View><Text style={styles.sectionEyebrow}>HISTORY</Text><Text style={[styles.sectionTitle, { color: colors.ink }]}>Past sessions</Text></View>
              <View style={styles.sectionBeam} />
            </View>
            {past.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>No past bookings yet.</Text> : past.map((b) => (
              <BookingCard key={b.id} booking={b} onCancel={handleCancel} onReview={setReviewBooking} onPay={handlePay} />
            ))}
          </>
        }
      />
      <ReviewModal visible={reviewBooking !== null} booking={reviewBooking} clientId={userId} onClose={() => setReviewBooking(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 48 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 25, marginBottom: 10 },
  sectionEyebrow: { color: BRAND.blue, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginTop: 2 },
  sectionBeam: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.22, marginBottom: 5 },
  emptyState: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 18, marginBottom: spacing.md },
  emptyTitle: { fontSize: 15, fontWeight: '900' },
  empty: { fontSize: typography.sm, marginTop: 3, marginBottom: spacing.md },
  card: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: 15, marginBottom: 10 },
  cardRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.72 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  cardLeft: { flex: 1 },
  activityText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  cardTrainer: { fontSize: 16, fontWeight: '900' },
  cardDate: { fontSize: typography.sm, marginTop: 5, fontWeight: '700' },
  cardMeta: { fontSize: typography.xs, marginTop: 3 },
  paymentConfirmed: { fontSize: typography.xs, marginTop: 7, fontWeight: '800' },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, padding: 10, borderTopWidth: 1 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 9, paddingVertical: 9, alignItems: 'center' },
  actionBtnText: { fontSize: typography.sm, fontWeight: '700' },
  primaryAction: { flex: 1, borderRadius: 9, paddingVertical: 10, alignItems: 'center', backgroundColor: BRAND.navy },
  primaryActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: typography.md, fontWeight: '800' },
  modalCancel: { fontSize: typography.md },
  modalSubmit: { fontSize: typography.md, fontWeight: '800' },
  modalContent: { padding: spacing.lg },
  modalSubtitle: { fontSize: typography.sm, marginBottom: spacing.md },
  label: { fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '700' },
  starsRow: { flexDirection: 'row', gap: spacing.sm },
  starIcon: { fontSize: 36 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.base },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
});
