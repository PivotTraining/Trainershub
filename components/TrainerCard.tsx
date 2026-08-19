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
  const rateLabel = trainer.hourly_rate_cents != null
    ? `$${Math.round(trainer.hourly_rate_cents / 100)}/hr`
    : 'Rate on request';
  const ratingLabel = trainer.avg_rating > 0
    ? `${trainer.avg_rating.toFixed(1)} (${trainer.review_count})`
    : 'New on TrainerHub';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`View ${trainer.full_name ?? 'trainer'} profile`}
    >
      <View style={styles.topRow}>
        <Avatar
          seed={trainer.user_id}
          size={58}
          initial={trainer.full_name ?? 'Trainer'}
          imageUrl={trainer.avatar_url}
        />

        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.ink, fontSize: typography.md }]} numberOfLines={1}>
              {trainer.full_name ?? 'Trainer'}
            </Text>
            {trainer.is_verified && (
              <View style={[styles.verifiedPill, { backgroundColor: colors.infoBg, borderRadius: radius.pill }]}>
                <Ionicons name="checkmark-circle" size={13} color={colors.info} />
                <Text style={[styles.verifiedText, { color: colors.info }]}>Verified</Text>
              </View>
            )}
          </View>

          {trainer.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={[styles.locationText, { color: colors.muted, fontSize: typography.xs }]} numberOfLines={1}>
                {trainer.location}
              </Text>
            </View>
          ) : null}

          <View style={styles.ratingRow}>
            <StarRating rating={trainer.avg_rating} size={13} />
            <Text style={[styles.ratingText, { color: colors.muted, fontSize: typography.sm }]}>{ratingLabel}</Text>
          </View>
        </View>

        {onFavoritePress != null && (
          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation?.();
              onFavoritePress();
            }}
            style={styles.heartButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#EF4444' : colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {displayedSpecialties.length > 0 && (
        <View style={[styles.specialtyRow, { marginTop: spacing.sm }]}>
          {displayedSpecialties.map((specialty) => (
            <View key={specialty} style={[styles.chip, { backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.inkSoft, fontSize: typography.xs }]}>{specialty}</Text>
            </View>
          ))}
          {trainer.specialties.length > 3 && (
            <Text style={[styles.moreText, { color: colors.muted, fontSize: typography.xs }]}>+{trainer.specialties.length - 3}</Text>
          )}
        </View>
      )}

      <View style={[styles.signalRow, { marginTop: spacing.sm }]}>
        {trainer.session_types.map((type) => (
          <View key={type} style={[styles.signal, { backgroundColor: type === 'virtual' ? colors.infoBg : colors.successBg, borderRadius: radius.sm }]}>
            <Ionicons name={type === 'virtual' ? 'videocam-outline' : 'people-outline'} size={12} color={type === 'virtual' ? colors.info : colors.success} />
            <Text style={[styles.signalText, { color: type === 'virtual' ? colors.info : colors.success, fontSize: typography.xs }]}>
              {type === 'virtual' ? 'Virtual' : 'In-person'}
            </Text>
          </View>
        ))}
        {trainer.instant_book && (
          <View style={[styles.signal, { backgroundColor: colors.warningBg, borderRadius: radius.sm }]}>
            <Ionicons name="flash-outline" size={12} color={colors.warning} />
            <Text style={[styles.signalText, { color: colors.warning, fontSize: typography.xs }]}>Instant Book</Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomRow, { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm }]}>
        <View>
          <Text style={[styles.price, { color: colors.ink, fontSize: typography.base }]}>{rateLabel}</Text>
          <Text style={[styles.priceSub, { color: colors.muted, fontSize: typography.xs }]}>before any package savings</Text>
        </View>
        <View style={[styles.viewButton, { backgroundColor: colors.ink, borderRadius: radius.md }]}>
          <Text style={[styles.viewButtonText, { color: colors.white, fontSize: typography.sm }]}>View profile</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.white} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  content: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { fontWeight: '800', flexShrink: 1 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3 },
  verifiedText: { fontSize: 10, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { flexShrink: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { fontWeight: '600' },
  heartButton: { padding: 3 },
  specialtyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  chipText: { fontWeight: '600' },
  moreText: { fontWeight: '600' },
  signalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  signalText: { fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, gap: 12 },
  price: { fontWeight: '900' },
  priceSub: { marginTop: 1 },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  viewButtonText: { fontWeight: '800' },
});
