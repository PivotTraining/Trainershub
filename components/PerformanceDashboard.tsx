import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { StarRating } from '@/components/StarRating';
import { useMyBookingsAsTrainer } from '@/lib/queries/bookings';
import { usePublicTrainerProfile } from '@/lib/queries/browse';
import { useTrainerSessions } from '@/lib/queries/sessions';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export interface PerformanceDashboardProps {
  trainerId: string;
  hourlyRateCents: number | null;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color: colors.muted }]}>{sub}</Text> : null}
    </View>
  );
}

export function PerformanceDashboard({ trainerId, hourlyRateCents }: PerformanceDashboardProps) {
  const { colors, accent } = useTheme();

  const bookingsQuery = useMyBookingsAsTrainer(trainerId);
  const sessionsQuery = useTrainerSessions(trainerId);
  const profileQuery = usePublicTrainerProfile(trainerId);

  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  const sessionsThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return sessions.filter(
      (s) => s.status === 'completed' && new Date(s.starts_at) >= startOfMonth,
    );
  }, [sessions]);

  const revenueThisMonth = useMemo(() => {
    if (!hourlyRateCents) return 0;
    return sessionsThisMonth.reduce((sum, s) => {
      const fraction = s.duration_min / 60;
      return sum + Math.round(hourlyRateCents * fraction);
    }, 0);
  }, [sessionsThisMonth, hourlyRateCents]);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
  const conversionRate = totalBookings > 0 ? confirmedBookings / totalBookings : 0;

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
        .slice(0, 3),
    [bookings],
  );

  const trainerProfile = profileQuery.data;
  const avgRating = trainerProfile?.avg_rating ?? 0;
  const reviewCount = trainerProfile?.review_count ?? 0;

  const isLoading = bookingsQuery.isLoading || sessionsQuery.isLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Performance</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Sessions"
          value={String(sessionsThisMonth.length)}
          sub="this month"
        />
        <StatCard
          label="Revenue"
          value={hourlyRateCents ? formatDollars(revenueThisMonth) : '—'}
          sub="this month"
        />
        <StatCard label="Profile views" value="—" sub="Coming soon" />
      </View>

      {/* Conversion rate */}
      <View style={[styles.conversionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <View style={styles.conversionHeader}>
          <Text style={[styles.conversionLabel, { color: colors.ink }]}>Booking conversion</Text>
          <Text style={[styles.conversionRatio, { color: colors.muted }]}>
            {confirmedBookings} / {totalBookings} confirmed
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceRaised }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: accent,
                width: `${Math.round(conversionRate * 100)}%` as unknown as number,
              },
            ]}
          />
        </View>
        <Text style={[styles.conversionPct, { color: colors.muted }]}>
          {Math.round(conversionRate * 100)}%
        </Text>
      </View>

      {/* Reviews summary */}
      {reviewCount > 0 && (
        <View style={[styles.reviewsCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.reviewsRow}>
            <StarRating rating={avgRating} size={16} />
            <Text style={[styles.reviewsText, { color: colors.ink }]}>
              {avgRating.toFixed(1)}
            </Text>
            <Text style={[styles.reviewsCount, { color: colors.muted }]}>
              · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </Text>
          </View>
        </View>
      )}

      {/* Recent bookings */}
      {recentBookings.length > 0 && (
        <>
          <Text style={[styles.subTitle, { color: colors.muted }]}>Recent bookings</Text>
          {recentBookings.map((b) => (
            <View
              key={b.id}
              style={[styles.bookingRow, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}
            >
              <View style={styles.bookingLeft}>
                <Text style={[styles.bookingName, { color: colors.ink }]}>
                  {b.clientName ?? 'Client'}
                </Text>
                <Text style={[styles.bookingMeta, { color: colors.muted }]}>
                  {new Date(b.starts_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · {b.duration_min} min
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={[styles.statusBadgeText, { color: colors.muted }]}>
                  {b.status}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl },
  loadingContainer: { padding: spacing.xl, alignItems: 'center' },
  sectionTitle: { fontSize: typography.lg, fontWeight: '700', marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: typography.xl, fontWeight: '700' },
  statLabel: { fontSize: typography.xs, marginTop: 2, textAlign: 'center' },
  statSub: { fontSize: 10, marginTop: 1, textAlign: 'center' },
  conversionCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  conversionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  conversionLabel: { fontSize: typography.md, fontWeight: '600' },
  conversionRatio: { fontSize: typography.xs },
  progressTrack: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: radius.pill },
  conversionPct: { fontSize: typography.xs, marginTop: spacing.xs, textAlign: 'right' },
  reviewsCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  reviewsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reviewsText: { fontSize: typography.md, fontWeight: '600' },
  reviewsCount: { fontSize: typography.sm },
  subTitle: {
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  bookingLeft: { flex: 1 },
  bookingName: { fontSize: typography.sm, fontWeight: '600' },
  bookingMeta: { fontSize: typography.xs, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusBadgeText: { fontSize: typography.xs, fontWeight: '600', textTransform: 'capitalize' },
});
