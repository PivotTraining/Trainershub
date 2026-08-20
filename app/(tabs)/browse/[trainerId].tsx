import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { useAuth } from '@/lib/auth';
import { usePublicTrainerProfile, useTrainerPackagesPublic, useTrainerReviewsPublic } from '@/lib/queries/browse';
import { useIsFavorite, useToggleFavorite } from '@/lib/queries/favorites';
import { BRAND } from '@/lib/theme';
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
  const { colors } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: trainer, isLoading: loadingProfile } = usePublicTrainerProfile(trainerId);
  const { data: reviews = [], isLoading: loadingReviews } = useTrainerReviewsPublic(trainerId);
  const { data: packages = [], isLoading: loadingPackages } = useTrainerPackagesPublic(trainerId);
  const isFav = useIsFavorite(userId, trainerId);
  const toggleFav = useToggleFavorite(userId ?? '');

  if (loadingProfile || loadingReviews || loadingPackages || !trainer) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  }

  const displayName = trainer.full_name ?? 'Trainer';
  const firstName = displayName.split(' ')[0];
  const rate = trainer.hourly_rate_cents != null ? `$${Math.round(trainer.hourly_rate_cents / 100)}` : null;
  const specialty = trainer.specialties[0] ?? 'Personal Trainer';

  const handleFavorite = () => {
    if (!userId) return router.push('/(auth)/sign-in');
    toggleFav.mutate({ trainerId, isFav: isFav.data ?? false });
  };

  const handlePackage = (pkg: { title: string; price_cents: number }) => {
    Alert.alert('Package checkout coming soon', `${pkg.title} is $${Math.round(pkg.price_cents / 100)}. You can book a single session now while package checkout is being finalized.`);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroIcon} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#FFFFFF" /></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.heroIcon}><Ionicons name="share-outline" size={19} color="#FFFFFF" /></TouchableOpacity>
              <TouchableOpacity style={styles.heroIcon} onPress={handleFavorite}><Ionicons name={isFav.data ? 'heart' : 'heart-outline'} size={20} color={isFav.data ? '#C04DFF' : '#FFFFFF'} /></TouchableOpacity>
            </View>
          </View>

          <View style={styles.avatarWrap}><Avatar seed={trainer.user_id} size={128} initial={displayName} imageUrl={trainer.avatar_url} /></View>
          <View style={styles.heroCopy}>
            <View style={styles.nameRow}><Text style={styles.name}>{displayName}</Text>{trainer.is_verified ? <Ionicons name="checkmark-circle" size={18} color="#70C7FF" /> : null}</View>
            <Text style={styles.specialty}>{specialty}</Text>
            {trainer.location ? <View style={styles.locationRow}><Ionicons name="location-outline" size={13} color="#D4DDE7" /><Text style={styles.location}>{trainer.location}</Text></View> : null}
            <View style={styles.ratingPill}><StarRating rating={trainer.avg_rating} size={13} /><Text style={styles.ratingPillText}>{trainer.avg_rating > 0 ? `${trainer.avg_rating.toFixed(1)} (${trainer.review_count} reviews)` : 'New on TrainerHub'}</Text></View>
          </View>

          <View style={styles.statStrip}>
            <Stat value={trainer.is_verified ? 'Verified' : 'Listed'} label="Profile" />
            <View style={styles.statDivider} />
            <Stat value={`${trainer.review_count}`} label="Reviews" />
            <View style={styles.statDivider} />
            <Stat value={trainer.instant_book ? 'Fast' : 'Request'} label="Booking" />
          </View>
        </View>

        <View style={styles.body}>
          {trainer.bio ? <Section title={`About ${firstName}`}><Text style={styles.bodyText}>{trainer.bio}</Text></Section> : null}

          {trainer.specialties.length ? (
            <Section title="Specialties">
              <View style={styles.chips}>{trainer.specialties.map((item, index) => <View key={item} style={[styles.chip, index === 0 && styles.chipActive]}><Text style={[styles.chipText, index === 0 && styles.chipTextActive]}>{item}</Text></View>)}</View>
            </Section>
          ) : null}

          <Section title="Training Options">
            <View style={styles.optionGrid}>
              {trainer.session_types.map((type) => <OptionSignal key={type} icon={type === 'virtual' ? 'videocam-outline' : 'people-outline'} title={type === 'virtual' ? 'Virtual' : 'In-person'} />)}
              <OptionSignal icon="time-outline" title={`${trainer.cancellation_hours}h cancellation`} />
              <OptionSignal icon="flash-outline" title={trainer.instant_book ? 'Instant Book' : 'Request to book'} />
            </View>
          </Section>

          {trainer.vibe_tags.length ? (
            <Section title="Coaching Style"><View style={styles.chips}>{trainer.vibe_tags.map((tag) => <View key={tag} style={styles.chip}><Text style={styles.chipText}>{VIBE_CONFIG[tag]?.emoji} {VIBE_CONFIG[tag]?.label}</Text></View>)}</View></Section>
          ) : null}

          <Section title="Pricing">
            <View style={styles.pricingRow}>
              <TouchableOpacity style={[styles.priceCard, styles.priceCardPrimary]} onPress={() => router.push({ pathname: '/booking/new', params: { trainerId } })}>
                <Text style={styles.priceLabel}>Single Session</Text>
                <Text style={styles.priceValue}>{rate ?? '—'}</Text>
                <Text style={styles.priceMeta}>60 min standard rate</Text>
              </TouchableOpacity>
              {packages[0] ? (
                <TouchableOpacity style={styles.priceCard} onPress={() => handlePackage(packages[0])}>
                  <Text style={styles.priceLabel}>Package</Text>
                  <Text style={styles.priceValue}>${Math.round(packages[0].price_cents / 100)}</Text>
                  <Text style={styles.priceMeta}>{packages[0].session_count} sessions</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.priceCard}><Text style={styles.priceLabel}>Session Types</Text><Text style={styles.priceValue}>{trainer.session_types.length}</Text><Text style={styles.priceMeta}>ways to train</Text></View>
              )}
            </View>
          </Section>

          {packages.length > 1 ? (
            <Section title="More Packages"><View style={{ gap: 9 }}>{packages.slice(1).map((pkg) => <TouchableOpacity key={pkg.id} style={styles.packageRow} onPress={() => handlePackage(pkg)}><View><Text style={styles.packageTitle}>{pkg.title}</Text><Text style={styles.packageMeta}>{pkg.session_count} sessions</Text></View><Text style={styles.packagePrice}>${Math.round(pkg.price_cents / 100)}</Text></TouchableOpacity>)}</View></Section>
          ) : null}

          <Section title="Reviews">
            {reviews.length ? <View style={{ gap: 10 }}>{reviews.slice(0, 4).map((review) => <View key={review.id} style={styles.reviewCard}><View style={styles.reviewTop}><StarRating rating={review.rating} size={12} /><Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text></View>{review.body ? <Text style={styles.reviewBody}>{review.body}</Text> : null}</View>)}</View> : <View style={styles.noReviews}><Ionicons name="star-outline" size={21} color={BRAND.purple} /><Text style={styles.noReviewsTitle}>No reviews yet</Text><Text style={styles.noReviewsText}>This trainer is new to TrainerHub.</Text></View>}
          </Section>
        </View>
      </ScrollView>

      <View style={styles.sticky}>
        <View><Text style={styles.stickyRate}>{rate ? `${rate}/hr` : 'Rate on request'}</Text><Text style={styles.stickyMeta}>single-session rate</Text></View>
        <TouchableOpacity style={styles.bookButton} onPress={() => router.push({ pathname: '/booking/new', params: { trainerId } })}>
          <Text style={styles.bookText}>Book a Session</Text><Ionicons name="calendar-outline" size={17} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}
function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function OptionSignal({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return <View style={styles.optionSignal}><View style={styles.signalIcon}><Ionicons name={icon} size={16} color={BRAND.purple} /></View><Text style={styles.signalText}>{title}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 118 },
  hero: { backgroundColor: BRAND.navy, minHeight: 430, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20, position: 'relative', overflow: 'hidden' },
  heroActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 3 },
  heroIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { marginTop: 20, alignItems: 'center' },
  heroCopy: { marginTop: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', letterSpacing: -1.2 },
  specialty: { color: '#D7DDE6', fontSize: 13, fontWeight: '700', marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  location: { color: '#D4DDE7', fontSize: 11, fontWeight: '700' },
  ratingPill: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.32)', paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  statStrip: { marginTop: 19, borderRadius: 17, backgroundColor: '#0D1320', paddingVertical: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  statLabel: { color: '#A9B1BE', fontSize: 9, fontWeight: '700', marginTop: 3 },
  statDivider: { width: 1, height: 29, backgroundColor: '#2A3341' },
  body: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  section: { paddingVertical: 21, borderBottomWidth: 1, borderBottomColor: '#ECE9EF', gap: 12 },
  sectionTitle: { color: BRAND.navy, fontSize: 15, fontWeight: '900' },
  bodyText: { color: '#505563', fontSize: 13, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#F0EEF2' },
  chipActive: { backgroundColor: BRAND.purple },
  chipText: { color: '#404552', fontSize: 11, fontWeight: '800' },
  chipTextActive: { color: '#FFFFFF' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  optionSignal: { width: '48%', minHeight: 52, borderRadius: 13, backgroundColor: '#F7F5F9', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11 },
  signalIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#EEE7F7', alignItems: 'center', justifyContent: 'center' },
  signalText: { color: BRAND.navy, fontSize: 10, fontWeight: '800', flex: 1 },
  pricingRow: { flexDirection: 'row', gap: 10 },
  priceCard: { flex: 1, minHeight: 128, borderRadius: 15, borderWidth: 1.5, borderColor: '#D8D2E2', backgroundColor: '#FFFFFF', padding: 14 },
  priceCardPrimary: { borderColor: BRAND.purple, backgroundColor: '#FBF8FF' },
  priceLabel: { color: '#5D626E', fontSize: 10, fontWeight: '800' },
  priceValue: { color: BRAND.navy, fontSize: 29, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  priceMeta: { color: '#777B87', fontSize: 9, marginTop: 4 },
  packageRow: { minHeight: 64, borderRadius: 13, backgroundColor: '#F7F5F9', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  packageTitle: { color: BRAND.navy, fontSize: 12, fontWeight: '900' },
  packageMeta: { color: '#777B87', fontSize: 10, marginTop: 2 },
  packagePrice: { color: BRAND.navy, fontSize: 16, fontWeight: '900' },
  reviewCard: { borderRadius: 14, backgroundColor: '#F7F5F9', padding: 13 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: { color: '#878B95', fontSize: 9 },
  reviewBody: { color: '#4D5260', fontSize: 12, lineHeight: 18, marginTop: 8 },
  noReviews: { borderRadius: 14, backgroundColor: '#F7F5F9', padding: 16, alignItems: 'center' },
  noReviewsTitle: { color: BRAND.navy, fontSize: 13, fontWeight: '900', marginTop: 7 },
  noReviewsText: { color: '#777B87', fontSize: 10, marginTop: 3 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E7E3EA', minHeight: 88, paddingHorizontal: 20, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  stickyRate: { color: BRAND.navy, fontSize: 16, fontWeight: '900' },
  stickyMeta: { color: '#858994', fontSize: 9, marginTop: 2 },
  bookButton: { flex: 1, maxWidth: 300, minHeight: 52, borderRadius: 13, backgroundColor: BRAND.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bookText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
