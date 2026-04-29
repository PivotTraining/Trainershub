import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useMyBookingsAsTrainer, useUpdateBookingStatus } from '@/lib/queries/bookings';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { BookingWithNames } from '@/lib/types';

interface BookingCardProps {
  booking: BookingWithNames;
  onConfirm?: (id: string) => void;
  onDecline?: (id: string) => void;
}

function BookingCard({ booking, onConfirm, onDecline }: BookingCardProps) {
  const { colors } = useTheme();
  const isPending = booking.status === 'pending';
  const bookingDate = new Date(booking.starts_at);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={styles.cardBody}>
        <View style={styles.cardLeft}>
          <Text style={[styles.clientName, { color: colors.ink }]}>
            {booking.clientName ?? 'Client'}
          </Text>
          <Text style={[styles.cardDate, { color: colors.muted }]}>
            {bookingDate.toLocaleString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.muted }]}>
            {booking.duration_min} min · {booking.session_type === 'in-person' ? 'In-Person' : 'Virtual'}
          </Text>
          {booking.notes ? (
            <Text style={[styles.notes, { color: colors.muted }]} numberOfLines={2}>
              &quot;{booking.notes}&quot;
            </Text>
          ) : null}
        </View>
        {!isPending && (
          <View style={[styles.confirmedBadge, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.confirmedBadgeText, { color: colors.success }]}>Confirmed</Text>
          </View>
        )}
      </View>
      {isPending && onConfirm && onDecline && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.successBg, borderColor: colors.success }]}
            onPress={() => onConfirm(booking.id)}
          >
            <Text style={[styles.actionBtnText, { color: colors.success }]}>✓ Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
            onPress={() => onDecline(booking.id)}
          >
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>✗ Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function Requests() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { colors } = useTheme();

  const bookingsQuery = useMyBookingsAsTrainer(userId);
  const updateStatus = useUpdateBookingStatus(userId);

  const allBookings = bookingsQuery.data ?? [];
  const pending = allBookings.filter((b) => b.status === 'pending');
  const confirmed = allBookings.filter((b) => b.status === 'confirmed');

  const handleConfirm = async (bookingId: string) => {
    try {
      await updateStatus.mutateAsync({ id: bookingId, status: 'confirmed' });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDecline = (bookingId: string) => {
    Alert.alert('Decline request?', 'The client will be notified.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ id: bookingId, status: 'declined' });
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
            <Text style={[styles.sectionHeader, { color: colors.muted }]}>
              Pending Requests
            </Text>
            {pending.length === 0 ? (
              <Text style={[styles.empty, { color: colors.placeholder }]}>
                No pending requests.
              </Text>
            ) : (
              pending.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onConfirm={handleConfirm}
                  onDecline={handleDecline}
                />
              ))
            )}
            <Text style={[styles.sectionHeader, { color: colors.muted, marginTop: spacing.lg }]}>
              Confirmed
            </Text>
            {confirmed.length === 0 ? (
              <Text style={[styles.empty, { color: colors.placeholder }]}>
                No confirmed bookings.
              </Text>
            ) : (
              confirmed.map((b) => <BookingCard key={b.id} booking={b} />)
            )}
          </>
        }
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
  cardBody: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  cardLeft: { flex: 1 },
  clientName: { fontSize: typography.md, fontWeight: '600' },
  cardDate: { fontSize: typography.sm, marginTop: 2 },
  cardMeta: { fontSize: typography.xs, marginTop: 2 },
  notes: { fontSize: typography.xs, marginTop: spacing.xs, fontStyle: 'italic' },
  confirmedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  confirmedBadgeText: { fontSize: typography.xs, fontWeight: '600' },
  actions: {
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
  actionBtnText: { fontSize: typography.sm, fontWeight: '700' },
});
