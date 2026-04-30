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

import { useAuth } from '@/lib/auth';
import { useMyBookingsAsClient, useUpdateBookingStatus } from '@/lib/queries/bookings';
import { useCreateReview } from '@/lib/queries/reviews';
import { useCreatePaymentIntent } from '@/lib/queries/stripe';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { BookingWithNames, BookingStatus } from '@/lib/types';

const STATUS_COLORS: Record<BookingStatus, { bg: string; text: string }> = {
  pending:   { bg: '#FFFAE6', text: '#FF8B00' },
  confirmed: { bg: '#E3FCEF', text: '#00875A' },
  declined:  { bg: '#FFEBE6', text: '#CC3333' },
  canceled:  { bg: '#F5F5F5', text: '#888888' },
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
        session_id: booking.id,
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
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.ink }]}>Leave a Review</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={createReview.isPending}>
            {createReview.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={[styles.modalSubmit, { color: accent }]}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {booking && (
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Session with {booking.trainerName ?? 'trainer'} on{' '}
              {new Date(booking.starts_at).toLocaleDateString()}
            </Text>
          )}
          <Text style={[styles.label, { color: colors.muted }]}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.starIcon, { color: star <= rating ? '#F59E0B' : colors.disabled }]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>Comment (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
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
}

function BookingCard({ booking, onCancel, onReview, onPay, isPayingThisCard }: BookingCardProps) {
  const { colors } = useTheme();
  const now = new Date();
  const bookingDate = new Date(booking.starts_at);
  const isPast = bookingDate < now;
  const statusStyle = STATUS_COLORS[booking.status];
  const canCancel = booking.status === 'pending' && !isPast;
  const canReview = booking.status === 'confirmed' && isPast;
  const canPay =
    booking.status === 'confirmed' &&
    !isPast &&
    booking.payment_status === 'unpaid' &&
    !booking.package_purchase_id;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      {/* Activity chip pulls double-duty: identifies the discipline at a glance */}
      {booking.trainerSpecialty && (
        <View style={[styles.activityChip, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.activityText, { color: colors.ink }]}>
            {booking.trainerSpecialty}
          </Text>
        </View>
      )}
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.cardTrainer, { color: colors.ink }]}>
            with {booking.trainerName ?? 'Trainer'}
          </Text>
          <Text style={[styles.cardDate, { color: colors.muted }]}>
            {bookingDate.toLocaleString([], {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.muted }]}>
            {booking.duration_min} min · {booking.session_type === 'in-person' ? 'In-Person' : 'Virtual'}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {booking.status}
            </Text>
          </View>
        </View>
      </View>
      {(canCancel || canReview || canPay) && (
        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          {canPay && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.payBtn]}
              onPress={() => onPay(booking)}
              disabled={isPayingThisCard}
            >
              {isPayingThisCard ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Pay Now</Text>
              )}
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.danger }]}
              onPress={() => onCancel(booking.id)}
            >
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          {canReview && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.info }]}
              onPress={() => onReview(booking)}
            >
              <Text style={[styles.actionBtnText, { color: colors.info }]}>Leave Review</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function Bookings() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { colors } = useTheme();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const bookingsQuery = useMyBookingsAsClient(userId);
  const updateStatus = useUpdateBookingStatus(userId);
  const createPaymentIntent = useCreatePaymentIntent();

  const [reviewBooking, setReviewBooking] = useState<BookingWithNames | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  const handlePay = async (booking: BookingWithNames) => {
    setPayingBookingId(booking.id);
    try {
      const clientSecret = await createPaymentIntent.mutateAsync(booking.id);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'TrainerHub',
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message);
        }
        return; // User dismissed — no alert needed
      }

      Alert.alert('Payment successful!', 'Your session is confirmed and paid.');
      bookingsQuery.refetch();
    } catch (err: unknown) {
      Alert.alert('Payment failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPayingBookingId(null);
    }
  };

  const allBookings = bookingsQuery.data ?? [];
  const now = new Date();

  const upcoming = allBookings.filter(
    (b) =>
      (b.status === 'pending' || b.status === 'confirmed') &&
      new Date(b.starts_at) >= now,
  );
  const past = allBookings.filter(
    (b) =>
      new Date(b.starts_at) < now ||
      b.status === 'declined' ||
      b.status === 'canceled',
  );

  const handleCancel = (bookingId: string) => {
    Alert.alert('Cancel booking?', 'This action cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ id: bookingId, status: 'canceled' });
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  if (bookingsQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={[]}
        keyExtractor={() => 'placeholder'}
        renderItem={null}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={bookingsQuery.isFetching && !bookingsQuery.isLoading}
            onRefresh={bookingsQuery.refetch}
          />
        }
        ListHeaderComponent={
          <>
            <Text style={[styles.sectionHeader, { color: colors.muted }]}>Upcoming</Text>
            {upcoming.length === 0 ? (
              <Text style={[styles.empty, { color: colors.placeholder }]}>No upcoming bookings.</Text>
            ) : (
              upcoming.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onCancel={handleCancel}
                  onReview={setReviewBooking}
                  onPay={handlePay}
                  isPayingThisCard={payingBookingId === b.id}
                />
              ))
            )}
            <Text style={[styles.sectionHeader, { color: colors.muted, marginTop: spacing.lg }]}>Past</Text>
            {past.length === 0 ? (
              <Text style={[styles.empty, { color: colors.placeholder }]}>No past bookings.</Text>
            ) : (
              past.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onCancel={handleCancel}
                  onReview={setReviewBooking}
                  onPay={handlePay}
                />
              ))
            )}
          </>
        }
      />
      <ReviewModal
        visible={reviewBooking !== null}
        booking={reviewBooking}
        clientId={userId}
        onClose={() => setReviewBooking(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md },
  sectionHeader: {
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  empty: { fontSize: typography.sm, marginBottom: spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardTrainer: { fontSize: typography.md, fontWeight: '600' },
  cardDate: { fontSize: typography.sm, marginTop: 4, fontWeight: '500' },
  cardMeta: { fontSize: typography.xs, marginTop: 4 },
  activityChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    marginLeft: spacing.md,
    marginBottom: -2,
  },
  activityText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize', letterSpacing: 0.3 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  typeBadge: {},
  badgeText: { fontSize: typography.xs, fontWeight: '600', textTransform: 'capitalize' },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: typography.sm, fontWeight: '600' },
  payBtn: { backgroundColor: '#635BFF', borderColor: '#635BFF' },
  // Modal
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: typography.md, fontWeight: '700' },
  modalCancel: { fontSize: typography.md },
  modalSubmit: { fontSize: typography.md, fontWeight: '600' },
  modalContent: { padding: spacing.lg },
  modalSubtitle: { fontSize: typography.sm, marginBottom: spacing.md },
  label: { fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  starsRow: { flexDirection: 'row', gap: spacing.sm },
  starIcon: { fontSize: 36 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
});
