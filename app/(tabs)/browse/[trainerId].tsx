import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { useAuth } from '@/lib/auth';
import {
  usePublicTrainerProfile,
  useTrainerPackagesPublic,
  useTrainerReviewsPublic,
} from '@/lib/queries/browse';
import { useIsFavorite, useToggleFavorite } from '@/lib/queries/favorites';
import { useTheme } from '@/lib/useTheme';
import type { VibeTag } from '@/lib/types';

// ── Vibe tag config ────────────────────────────────────────────────────────────

const VIBE_CONFIG: Record<VibeTag, { emoji: string; label: string }> = {
  motivator:      { emoji: '🔥', label: 'Motivator' },
  disciplinarian: { emoji: '💪', label: 'Disciplinarian' },
  gentle:         { emoji: '🌿', label: 'Gentle' },
  'high-energy':  { emoji: '⚡', label: 'High Energy' },
  spiritual:      { emoji: '🧘', label: 'Spiritual' },
  'data-driven':  { emoji: '📊', label: 'Data-Driven' },
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function TrainerProfile() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: trainer, isLoading: loadingProfile } = usePublicTrainerProfile(trainerId);
  const { data: reviews = [], isLoading: loadingReviews } = useTrainerReviewsPublic(trainerId);
  const { data: packages = [], isLoading: loadingPackages } = useTrainerPackagesPublic(trainerId);

  const isFav = useIsFavorite(userId, trainerId);
  const toggleFav = useToggleFavorite(userId ?? '');

  const isLoading = loadingProfile || loadingReviews || loadingPackages;

  if (isLoading || !trainer) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const displayName = trainer.full_name ?? trainer.email;
  const rateLabel =
    trainer.hourly_rate_cents != null
      ? `$${Math.round(trainer.hourly_rate_cents / 100)}/hr`
      : null;

  const handleFavPress = () => {
    if (!userId) return;
    toggleFav.mutate({ trainerId, isFav: isFav.data ?? false });
  };

  const handleBook = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (router as any).push({ pathname: '/booking/new', params: { trainerId } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header ── */}
        <View style={[styles.hero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Avatar seed={trainer.user_id} size={80} initial={displayName} />

          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <Text style={[styles.heroName, { color: colors.ink, fontSize: typography.xl }]}>
                {displayName}
              </Text>
              {trainer.is_verified && (
                <Ionicons name="checkmark-circle" size={18} color={colors.info} />
              )}
            </View>

            {trainer.location ? (
              <View style={styles.heroLocationRow}>
                <Ionicons name="location-outline" size={13} color={colors.muted} />
                <Text style={[styles.heroLocation, { color: colors.muted, fontSize: typography.sm }]}>
                  {trainer.location}
                </Text>
              </View>
            ) : null}

            {/* Session type pills */}
            <View style={styles.pillRow}>
              {trainer.session_types.map((type) => (
                <View
                  key={type}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: type === 'virtual' ? colors.infoBg : colors.successBg,
                      borderRadius: radius.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
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
                <View style={[styles.pill, { backgroundColor: colors.warningBg, borderRadius: radius.pill }]}>
                  <Text style={[styles.pillText, { color: colors.warning, fontSize: typography.xs }]}>
                    Instant Book
                  </Text>
                </View>
              )}
            </View>

            {/* Rating */}
            <View style={styles.heroRatingRow}>
              <StarRating rating={trainer.avg_rating} size={14} />
              <Text style={[styles.heroRatingText, { color: colors.muted, fontSize: typography.sm }]}>
                {trainer.avg_rating > 0
                  ? `${trainer.avg_rating.toFixed(1)} · ${trainer.review_count} reviews`
                  : 'No reviews yet'}
              </Text>
            </View>

            {rateLabel != null && (
              <Text style={[styles.heroRate, { color: colors.ink, fontSize: typography.md }]}>
                {rateLabel}
              </Text>
            )}
          </View>
        </View>

        {/* ── About ── */}
        {trainer.bio ? (
          <Section title="About" colors={colors} spacing={spacing} typography={typography}>
            <Text style={[styles.bioText, { color: colors.inkSoft, fontSize: typography.md }]}>
              {trainer.bio}
            </Text>
          </Section>
        ) : null}

        {/* ── Specialties ── */}
        {trainer.specialties.length > 0 && (
          <Section title="Specialties" colors={colors} spacing={spacing} typography={typography}>
            <View style={styles.chipsWrap}>
              {trainer.specialties.map((s) => (
                <View
                  key={s}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.border,
                      borderRadius: radius.pill,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: colors.inkSoft, fontSize: typography.sm }]}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ── Vibe tags ── */}
        {trainer.vibe_tags.length > 0 && (
          <Section title="Vibe" colors={colors} spacing={spacing} typography={typography}>
            <View style={styles.chipsWrap}>
              {trainer.vibe_tags.map((tag) => {
                const config = VIBE_CONFIG[tag];
                if (!config) return null;
                return (
                  <View
                    key={tag}
                    style={[
                      styles.vibeChip,
                      {
                        backgroundColor: colors.surfaceRaised,
                        borderColor: colors.border,
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text style={styles.vibeEmoji}>{config.emoji}</Text>
                    <Text style={[styles.chipText, { color: colors.inkSoft, fontSize: typography.sm }]}>
                      {config.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Section>
        )}

        {/* ── Packages ── */}
        {packages.length > 0 && (
          <Section title="Packages" colors={colors} spacing={spacing} typography={typography}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: spacing.md }}
            >
              {packages.map((pkg) => (
                <View
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                    },
                  ]}
                >
                  <Text style={[styles.packageTitle, { color: colors.ink, fontSize: typography.md }]}>
                    {pkg.title}
                  </Text>
                  <Text style={[styles.packageSessions, { color: colors.muted, fontSize: typography.sm }]}>
                    {pkg.session_count} sessions
                  </Text>
                  {pkg.description ? (
                    <Text
                      style={[styles.packageDesc, { color: colors.inkSoft, fontSize: typography.xs }]}
                      numberOfLines={3}
                    >
                      {pkg.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.packagePrice, { color: colors.ink, fontSize: typography.lg }]}>
                    ${Math.round(pkg.price_cents / 100)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <Section title="Reviews" colors={colors} spacing={spacing} typography={typography}>
            <View style={{ gap: 10 }}>
              {reviews.map((review) => (
                <View
                  key={review.id}
                  style={[
                    styles.reviewCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                    },
                  ]}
                >
                  <View style={styles.reviewHeader}>
                    <StarRating rating={review.rating} size={13} />
                    <Text style={[styles.reviewDate, { color: colors.muted, fontSize: typography.xs }]}>
                      {new Date(review.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {review.body ? (
                    <Text style={[styles.reviewBody, { color: colors.inkSoft, fontSize: typography.sm }]}>
                      {review.body}
                    </Text>
                  ) : null}
                  {review.clientName ? (
                    <Text style={[styles.reviewAuthor, { color: colors.muted, fontSize: typography.xs }]}>
                      — {review.clientName}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Section>
        )}
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View
        style={[
          styles.stickyBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: colors.ink, borderRadius: radius.lg }]}
          onPress={handleBook}
          activeOpacity={0.85}
        >
          <Text style={[styles.bookButtonText, { fontSize: typography.md }]}>
            Book a Session
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.favButton,
            {
              borderColor: isFav ? '#EF4444' : colors.border,
              borderRadius: radius.lg,
            },
          ]}
          onPress={handleFavPress}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={22}
            color={isFav ? '#EF4444' : colors.muted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
}

function Section({ title, children, colors, spacing, typography }: SectionProps) {
  return (
    <View style={[styles.section, { paddingHorizontal: spacing.md, paddingTop: spacing.lg }]}>
      <Text style={[styles.sectionTitle, { color: colors.muted, fontSize: typography.xs }]}>
        {title.toUpperCase()}
      </Text>
      <View style={{ marginTop: spacing.sm }}>{children}</View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
  },
  heroInfo: { flex: 1, gap: 6 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroName: { fontWeight: '700', flexShrink: 1 },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroLocation: {},
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontWeight: '500' },
  heroRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroRatingText: {},
  heroRate: { fontWeight: '600' },

  section: {},
  sectionTitle: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bioText: { lineHeight: 22 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  chipText: { fontWeight: '500' },
  vibeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, gap: 4 },
  vibeEmoji: { fontSize: 14 },

  packageCard: {
    width: 180,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  packageTitle: { fontWeight: '600' },
  packageSessions: {},
  packageDesc: { lineHeight: 18 },
  packagePrice: { fontWeight: '700', marginTop: 4 },

  reviewCard: {
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: {},
  reviewBody: { lineHeight: 20 },
  reviewAuthor: { fontStyle: 'italic' },

  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  bookButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  bookButtonText: { color: '#fff', fontWeight: '600' },
  favButton: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
