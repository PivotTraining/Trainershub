import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
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

const VIBE_CONFIG: Record<VibeTag, { emoji: string; label: string }> = {
  motivator: { emoji: '🔥', label: 'Motivator' },
  disciplinarian: { emoji: '💪', label: 'Disciplinarian' },
  gentle: { emoji: '🌿', label: 'Gentle' },
  'high-energy': { emoji: '⚡', label: 'High Energy' },
  spiritual: { emoji: '🧘', label: 'Spiritual' },
  'data-driven': { emoji: '📊', label: 'Data-Driven' },
};

export default function TrainerProfile() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const router = useRouter();
  const { colors, spacing, radius, typography, accent } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: trainer, isLoading: loadingProfile } = usePublicTrainerProfile(trainerId);
  const { data: reviews = [], isLoading: loadingReviews } = useTrainerReviewsPublic(trainerId);
  const { data: packages = [], isLoading: loadingPackages } = useTrainerPackagesPublic(trainerId);

  const isFav = useIsFavorite(userId, trainerId);
  const toggleFav = useToggleFavorite(userId ?? '');

  const handlePackagePress = (pkg: { id: string; title: string; session_count: number; price_cents: number }) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to purchase a package.');
      return;
    }
    Alert.alert(
      'Secure checkout required',
      `${pkg.title} is $${(pkg.price_cents / 100).toFixed(2)}. Package checkout is temporarily unavailable while secure payment processing is completed. You can still book a single session.`,
    );
  };

  const isLoading = loadingProfile || loadingReviews || loadingPackages;

  if (isLoading || !trainer) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const displayName = trainer.full_name ?? 'Trainer';
  const firstName = displayName.split(' ')[0];
  const rateLabel = trainer.hourly_rate_cents != null
    ? `$${Math.round(trainer.hourly_rate_cents / 100)}/hr`
    : 'Rate on request';

  const handleFavPress = () => {
    if (!userId) {
      router.push('/(auth)/sign-in');
      return;
    }
    toggleFav.mutate({ trainerId, isFav: isFav.data ?? false });
  };

  const handleBook = () => {
    router.push({ pathname: '/booking/new', params: { trainerId } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 118 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Avatar seed={trainer.user_id} size={88} initial={displayName} imageUrl={trainer.avatar_url} />

          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <Text style={[styles.heroName, { color: colors.ink, fontSize: typography.xl }]}>{displayName}</Text>
              {trainer.is_verified && (
                <View style={[styles.verifiedPill, { backgroundColor: colors.infoBg, borderRadius: radius.pill }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.info} />
                  <Text style={[styles.verifiedText, { color: colors.info }]}>TrainerHub Verified</Text>
                </View>
              )}
            </View>

            {trainer.location ? (
              <View style={styles.heroLocationRow}>
                <Ionicons name="location-outline" size={13} color={colors.muted} />
                <Text style={[styles.heroLocation, { color: colors.muted, fontSize: typography.sm }]}>{trainer.location}</Text>
              </View>
            ) : null}

            <View style={styles.heroRatingRow}>
              <StarRating rating={trainer.avg_rating} size={14} />
              <Text style={[styles.heroRatingText, { color: colors.muted, fontSize: typography.sm }]}>
                {trainer.avg_rating > 0 ? `${trainer.avg_rating.toFixed(1)} · ${trainer.review_count} review${trainer.review_count === 1 ? '' : 's'}` : 'New on TrainerHub'}
              </Text>
            </View>

            <Text style={[styles.heroRate, { color: colors.ink, fontSize: typography.md }]}>{rateLabel}</Text>
          </View>
        </View>

        <View style={[styles.trustPanel, { backgroundColor: colors.surfaceCard, borderColor: colors.border, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.lg }]}>
          <View style={styles.trustHeader}>
            <Ionicons name="shield-checkmark-outline" size={22} color={accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.trustTitle, { color: colors.ink, fontSize: typography.md }]}>Book with more confidence</Text>
              <Text style={[styles.trustSub, { color: colors.muted, fontSize: typography.xs }]}>Use verified profile details, reviews and policies to decide if this trainer fits.</Text>
            </View>
          </View>
          <View style={styles.trustGrid}>
            <TrustItem icon="checkmark-circle-outline" label={trainer.is_verified ? 'Verified profile' : 'Profile listed'} colors={colors} />
            <TrustItem icon="star-outline" label={trainer.review_count > 0 ? `${trainer.review_count} reviews` : 'New trainer'} colors={colors} />
            <TrustItem icon="time-outline" label={`${trainer.cancellation_hours}h cancellation policy`} colors={colors} />
            <TrustItem icon="flash-outline" label={trainer.instant_book ? 'Instant Book' : 'Request to book'} colors={colors} />
          </View>
        </View>

        <View style={[styles.sessionSignals, { paddingHorizontal: spacing.md, marginTop: spacing.md }]}>
          {trainer.session_types.map((type) => (
            <View key={type} style={[styles.pill, { backgroundColor: type === 'virtual' ? colors.infoBg : colors.successBg, borderRadius: radius.pill }]}>
              <Ionicons name={type === 'virtual' ? 'videocam-outline' : 'people-outline'} size={13} color={type === 'virtual' ? colors.info : colors.success} />
              <Text style={[styles.pillText, { color: type === 'virtual' ? colors.info : colors.success, fontSize: typography.xs }]}>{type === 'virtual' ? 'Virtual' : 'In-Person'}</Text>
            </View>
          ))}
          {trainer.languages.map((language) => (
            <View key={language} style={[styles.pill, { backgroundColor: colors.surfaceRaised, borderRadius: radius.pill }]}>
              <Ionicons name="language-outline" size={13} color={colors.muted} />
              <Text style={[styles.pillText, { color: colors.inkSoft, fontSize: typography.xs }]}>{language}</Text>
            </View>
          ))}
        </View>

        {trainer.bio ? (
          <Section title="Why train with me" colors={colors} spacing={spacing} typography={typography}>
            <Text style={[styles.bioText, { color: colors.inkSoft, fontSize: typography.md }]}>{trainer.bio}</Text>
          </Section>
        ) : null}

        {trainer.specialties.length > 0 && (
          <Section title="Specialties" colors={colors} spacing={spacing} typography={typography}>
            <View style={styles.chipsWrap}>
              {trainer.specialties.map((specialty) => (
                <View key={specialty} style={[styles.chip, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.pill }]}>
                  <Text style={[styles.chipText, { color: colors.inkSoft, fontSize: typography.sm }]}>{specialty}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {trainer.vibe_tags.length > 0 && (
          <Section title="Coaching style" colors={colors} spacing={spacing} typography={typography}>
            <View style={styles.chipsWrap}>
              {trainer.vibe_tags.map((tag) => {
                const config = VIBE_CONFIG[tag];
                if (!config) return null;
                return (
                  <View key={tag} style={[styles.vibeChip, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.pill }]}>
                    <Text style={styles.vibeEmoji}>{config.emoji}</Text>
                    <Text style={[styles.chipText, { color: colors.inkSoft, fontSize: typography.sm }]}>{config.label}</Text>
                  </View>
                );
              })}
            </View>
          </Section>
        )}

        {packages.length > 0 && (
          <Section title="Packages" colors={colors} spacing={spacing} typography={typography}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: spacing.md }}>
              {packages.map((pkg) => {
                const perSession = pkg.session_count > 0 ? (pkg.price_cents / pkg.session_count / 100).toFixed(2) : '—';
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    onPress={() => handlePackagePress(pkg)}
                    activeOpacity={0.75}
                    style={[styles.packageCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
                  >
                    <Text style={[styles.packageTitle, { color: colors.ink, fontSize: typography.md }]}>{pkg.title}</Text>
                    <Text style={[styles.packageSessions, { color: colors.muted, fontSize: typography.sm }]}>{pkg.session_count} sessions · ${perSession}/session</Text>
                    {pkg.description ? <Text style={[styles.packageDesc, { color: colors.inkSoft, fontSize: typography.xs }]} numberOfLines={3}>{pkg.description}</Text> : null}
                    <Text style={[styles.packagePrice, { color: colors.ink, fontSize: typography.lg }]}>${Math.round(pkg.price_cents / 100)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Section>
        )}

        <Section title="Reviews" colors={colors} spacing={spacing} typography={typography}>
          {reviews.length > 0 ? (
            <View style={{ gap: 10 }}>
              {reviews.map((review) => (
                <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
                  <View style={styles.reviewHeader}>
                    <StarRating rating={review.rating} size={13} />
                    <Text style={[styles.reviewDate, { color: colors.muted, fontSize: typography.xs }]}>
                      {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  {review.body ? <Text style={[styles.reviewBody, { color: colors.inkSoft, fontSize: typography.sm }]}>{review.body}</Text> : null}
                  {review.clientName ? <Text style={[styles.reviewAuthor, { color: colors.muted, fontSize: typography.xs }]}>— {review.clientName}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.noReviews, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
              <Ionicons name="star-outline" size={22} color={colors.muted} />
              <Text style={[styles.noReviewsTitle, { color: colors.ink }]}>No reviews yet</Text>
              <Text style={[styles.noReviewsText, { color: colors.muted }]}>This trainer is new to TrainerHub. Review the profile, specialties and policies before booking.</Text>
            </View>
          )}
        </Section>
      </ScrollView>

      <View style={[styles.stickyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.stickyPriceWrap}>
          <Text style={[styles.stickyPrice, { color: colors.ink }]}>{rateLabel}</Text>
          <Text style={[styles.stickyPriceSub, { color: colors.muted }]}>single-session rate</Text>
        </View>
        <TouchableOpacity style={[styles.bookButton, { backgroundColor: colors.ink, borderRadius: radius.lg }]} onPress={handleBook} activeOpacity={0.85}>
          <Text style={[styles.bookButtonText, { fontSize: typography.sm }]}>Book {firstName}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.favButton, { borderColor: isFav.data ? '#EF4444' : colors.border, borderRadius: radius.lg }]} onPress={handleFavPress} activeOpacity={0.75}>
          <Ionicons name={isFav.data ? 'heart' : 'heart-outline'} size={22} color={isFav.data ? '#EF4444' : colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TrustItem({ icon, label, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.trustItem}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <Text style={[styles.trustItemText, { color: colors.inkSoft }]}>{label}</Text>
    </View>
  );
}

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
      <Text style={[styles.sectionTitle, { color: colors.muted, fontSize: typography.xs }]}>{title.toUpperCase()}</Text>
      <View style={{ marginTop: spacing.sm }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', padding: 20, gap: 16, borderBottomWidth: 1 },
  heroInfo: { flex: 1, gap: 7 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  heroName: { fontWeight: '900', flexShrink: 1 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { fontSize: 10, fontWeight: '900' },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroLocation: {},
  heroRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroRatingText: { fontWeight: '600' },
  heroRate: { fontWeight: '900' },
  trustPanel: { padding: 16, borderWidth: 1 },
  trustHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  trustTitle: { fontWeight: '900' },
  trustSub: { lineHeight: 17, marginTop: 2 },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  trustItem: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustItemText: { flex: 1, fontSize: 11, fontWeight: '700' },
  sessionSignals: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5 },
  pillText: { fontWeight: '700' },
  section: {},
  sectionTitle: { fontWeight: '800', letterSpacing: 0.8 },
  bioText: { lineHeight: 23 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontWeight: '700' },
  vibeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, gap: 4 },
  vibeEmoji: { fontSize: 14 },
  packageCard: { width: 190, padding: 15, borderWidth: 1, gap: 5 },
  packageTitle: { fontWeight: '800' },
  packageSessions: {},
  packageDesc: { lineHeight: 18 },
  packagePrice: { fontWeight: '900', marginTop: 4 },
  reviewCard: { padding: 14, borderWidth: 1, gap: 7 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: {},
  reviewBody: { lineHeight: 20 },
  reviewAuthor: { fontStyle: 'italic', fontWeight: '600' },
  noReviews: { padding: 18, alignItems: 'center' },
  noReviewsTitle: { fontSize: 14, fontWeight: '800', marginTop: 7 },
  noReviewsText: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  stickyPriceWrap: { minWidth: 88 },
  stickyPrice: { fontSize: 14, fontWeight: '900' },
  stickyPriceSub: { fontSize: 9, marginTop: 1 },
  bookButton: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  bookButtonText: { color: '#fff', fontWeight: '900' },
  favButton: { width: 50, height: 50, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
