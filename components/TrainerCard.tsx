import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { useTheme } from '@/lib/useTheme';
import type { TrainerListing } from '@/lib/types';

interface TrainerCardProps {
  trainer: TrainerListing;
  isFavorite?: boolean;
  onPress: () => void;
  onFavoritePress?: () => void;
}

export function TrainerCard({ trainer, isFavorite = false, onPress, onFavoritePress }: TrainerCardProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const displayedSpecialties = trainer.specialties.slice(0, 3);
  const rateLabel =
    trainer.hourly_rate_cents != null
      ? `$${Math.round(trainer.hourly_rate_cents / 100)}/hr`
      : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top row: avatar + content + favorite */}
      <View style={styles.topRow}>
        <Avatar seed={trainer.user_id} size={50} initial={trainer.full_name ?? trainer.email} />

        <View style={styles.content}>
          {/* Name + verified */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.ink, fontSize: typography.base }]} numberOfLines={1}>
              {trainer.full_name ?? trainer.email}
            </Text>
            {trainer.is_verified && (
              <Ionicons name="checkmark-circle" size={15} color={colors.info} style={styles.verifiedIcon} />
            )}
          </View>

          {/* Location */}
          {trainer.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.muted} />
              <Text style={[styles.locationText, { color: colors.muted, fontSize: typography.xs }]} numberOfLines={1}>
                {trainer.location}
              </Text>
            </View>
          ) : null}

          {/* Session type badges */}
          <View style={styles.badgeRow}>
            {trainer.session_types.map((type) => (
              <View
                key={type}
                style={[
                  styles.badge,
                  {
                    backgroundColor: type === 'virtual' ? colors.infoBg : colors.successBg,
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: type === 'virtual' ? colors.info : colors.success,
                      fontSize: typography.xs,
                    },
                  ]}
                >
                  {type === 'virtual' ? 'Virtual' : 'In-Person'}
                </Text>
              </View>
            ))}
            {trainer.instant_book && (
              <View style={[styles.badge, { backgroundColor: colors.warningBg, borderRadius: radius.sm }]}>
                <Text style={[styles.badgeText, { color: colors.warning, fontSize: typography.xs }]}>
                  Instant Book
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Favorite button */}
        {onFavoritePress != null && (
          <TouchableOpacity onPress={onFavoritePress} style={styles.heartButton} hitSlop={8}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#EF4444' : colors.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Specialty chips */}
      {displayedSpecialties.length > 0 && (
        <View style={[styles.specialtyRow, { marginTop: spacing.sm }]}>
          {displayedSpecialties.map((s) => (
            <View
              key={s}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderRadius: radius.pill,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.inkSoft, fontSize: typography.xs }]}>
                {s}
              </Text>
            </View>
          ))}
          {trainer.specialties.length > 3 && (
            <Text style={[styles.moreText, { color: colors.muted, fontSize: typography.xs }]}>
              +{trainer.specialties.length - 3} more
            </Text>
          )}
        </View>
      )}

      {/* Bottom row: rating + price */}
      <View style={[styles.bottomRow, { marginTop: spacing.sm }]}>
        <View style={styles.ratingRow}>
          <StarRating rating={trainer.avg_rating} size={13} />
          <Text style={[styles.ratingText, { color: colors.muted, fontSize: typography.sm }]}>
            {trainer.avg_rating > 0
              ? `${trainer.avg_rating.toFixed(1)} (${trainer.review_count})`
              : 'No reviews'}
          </Text>
        </View>
        {rateLabel != null && (
          <Text style={[styles.price, { color: colors.ink, fontSize: typography.sm }]}>
            {rateLabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontWeight: '600',
    flexShrink: 1,
  },
  verifiedIcon: {
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontWeight: '500',
  },
  heartButton: {
    padding: 2,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  chipText: {
    fontWeight: '500',
  },
  moreText: {
    fontWeight: '400',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {},
  price: {
    fontWeight: '600',
  },
});
