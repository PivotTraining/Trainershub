import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BrandLockup } from '@/components/BrandLockup';
import { StarRating } from '@/components/StarRating';
import { useAuth } from '@/lib/auth';
import { usePublicTrainerProfile, useTrainerPackagesPublic, useTrainerReviewsPublic } from '@/lib/queries/browse';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export default function PublicTrainerProfile() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { colors } = useTheme();
  const { data: trainer, isLoading } = usePublicTrainerProfile(trainerId);
  const { data: reviews = [] } = useTrainerReviewsPublic(trainerId);
  const { data: packages = [] } = useTrainerPackagesPublic(trainerId);

  const displayName = trainer?.full_name ?? 'Trainer';

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !trainer || !trainerId) return;

    const canonicalUrl = `https://trainershub.app/trainers/${trainerId}`;
    const location = trainer.location ? ` in ${trainer.location}` : '';
    const specialty = trainer.specialties[0] ? ` | ${trainer.specialties[0]}` : '';
    const description = trainer.bio?.slice(0, 155) || `View ${displayName}'s TrainerHub profile, specialties, ratings, session options and pricing.`;

    document.title = `${displayName} - Trainer${location}${specialty} | TrainerHub`;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const existing = document.getElementById('trainerhub-trainer-jsonld');
    existing?.remove();
    const jsonLd = document.createElement('script');
    jsonLd.id = 'trainerhub-trainer-jsonld';
    jsonLd.type = 'application/ld+json';
    jsonLd.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: displayName,
      url: canonicalUrl,
      image: trainer.avatar_url || undefined,
      description: trainer.bio || description,
      knowsAbout: trainer.specialties,
      address: trainer.location ? { '@type': 'PostalAddress', addressLocality: trainer.location } : undefined,
      aggregateRating: trainer.review_count > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: trainer.avg_rating,
        reviewCount: trainer.review_count,
        bestRating: 5,
      } : undefined,
      memberOf: { '@type': 'Organization', name: 'TrainerHub', url: 'https://trainershub.app' },
    });
    document.head.appendChild(jsonLd);

    return () => jsonLd.remove();
  }, [trainer, trainerId, displayName]);

  if (isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  if (!trainer) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.muted }}>Trainer profile not found.</Text></View>;

  const rateLabel = trainer.hourly_rate_cents != null ? `$${Math.round(trainer.hourly_rate_cents / 100)}/hr` : 'Rate on request';
  const firstName = displayName.split(' ')[0];

  const handleBook = () => {
    if (!session) {
      router.push('/(auth)/sign-in');
      return;
    }
    router.push({ pathname: '/booking/new', params: { trainerId } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/trainers')} style={styles.back}>
            <Ionicons name="arrow-back" size={17} color={colors.muted} />
            <Text style={[styles.backText, { color: colors.muted }]}>All trainers</Text>
          </TouchableOpacity>
          <BrandLockup compact />
        </View>

        <View style={styles.hero}>
          <Avatar seed={trainer.user_id} size={88} initial={displayName} imageUrl={trainer.avatar_url} />
          <View style={styles.heroBody}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              {trainer.is_verified ? <Ionicons name="checkmark-circle" size={19} color="#7ED3FF" /> : null}
            </View>
            {trainer.location ? <Text style={styles.location}>{trainer.location}</Text> : null}
            <View style={styles.ratingRow}>
              <StarRating rating={trainer.avg_rating} size={14} />
              <Text style={styles.ratingText}>{trainer.avg_rating > 0 ? `${trainer.avg_rating.toFixed(1)} · ${trainer.review_count} reviews` : 'New on TrainerHub'}</Text>
            </View>
            <Text style={styles.rate}>{rateLabel}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {trainer.bio ? <Section title="About"><Text style={[styles.body, { color: colors.inkSoft }]}>{trainer.bio}</Text></Section> : null}

          {trainer.specialties.length > 0 ? (
            <Section title="Specialties">
              <View style={styles.chips}>{trainer.specialties.map((item) => <View key={item} style={[styles.chip, { borderColor: colors.border }]}><Text style={[styles.chipText, { color: colors.inkSoft }]}>{item}</Text></View>)}</View>
            </Section>
          ) : null}

          <Section title="Training options">
            <View style={styles.signalGrid}>
              {trainer.session_types.map((item) => <Signal key={item} icon={item === 'virtual' ? 'videocam-outline' : 'people-outline'} label={item === 'virtual' ? 'Virtual sessions' : 'In-person sessions'} />)}
              <Signal icon="time-outline" label={`${trainer.cancellation_hours}h cancellation policy`} />
              <Signal icon="flash-outline" label={trainer.instant_book ? 'Instant booking available' : 'Request to book'} />
            </View>
          </Section>

          {packages.length > 0 ? (
            <Section title="Packages">
              <View style={styles.stack}>{packages.map((pkg) => <View key={pkg.id} style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}><Text style={[styles.panelTitle, { color: colors.ink }]}>{pkg.title}</Text><Text style={[styles.meta, { color: colors.muted }]}>{pkg.session_count} sessions</Text><Text style={[styles.panelPrice, { color: colors.ink }]}>${Math.round(pkg.price_cents / 100)}</Text>{pkg.description ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{pkg.description}</Text> : null}</View>)}</View>
            </Section>
          ) : null}

          <Section title="Reviews">
            {reviews.length > 0 ? <View style={styles.stack}>{reviews.map((review) => <View key={review.id} style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}><StarRating rating={review.rating} size={13} />{review.body ? <Text style={[styles.body, { color: colors.inkSoft }]}>{review.body}</Text> : null}<Text style={[styles.meta, { color: colors.muted }]}>{new Date(review.created_at).toLocaleDateString()}</Text></View>)}</View> : <Text style={[styles.meta, { color: colors.muted }]}>No reviews yet.</Text>}
          </Section>
        </View>
      </ScrollView>

      <View style={[styles.sticky, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View><Text style={[styles.stickyRate, { color: colors.ink }]}>{rateLabel}</Text><Text style={[styles.meta, { color: colors.muted }]}>single-session rate</Text></View>
        <TouchableOpacity style={[styles.book, { backgroundColor: BRAND.navy }]} onPress={handleBook}>
          <Text style={styles.bookText}>{session ? `Book ${firstName}` : 'Sign in to book'}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>{children}</View>;
}

function Signal({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return <View style={styles.signal}><Ionicons name={icon} size={16} color="#6F8DA8" /><Text style={styles.signalText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  page: { width: '100%', maxWidth: 880, alignSelf: 'center', paddingBottom: 116 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText: { fontSize: 13, fontWeight: '800' },
  hero: { flexDirection: 'row', gap: 18, alignItems: 'center', backgroundColor: BRAND.navy, padding: 24, marginHorizontal: 20, borderRadius: 24 },
  heroBody: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  location: { color: '#AEBFD2', fontSize: 13, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ratingText: { color: '#C7D4E0', fontSize: 12, fontWeight: '700' },
  rate: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 2 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  section: { paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D9E0E6', gap: 12 },
  sectionTitle: { color: '#718096', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  body: { fontSize: 14, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '700' },
  signalGrid: { gap: 9 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalText: { color: '#4A5568', fontSize: 13, fontWeight: '700' },
  stack: { gap: 10 },
  panel: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  panelTitle: { fontSize: 15, fontWeight: '900' },
  panelPrice: { fontSize: 18, fontWeight: '900' },
  meta: { fontSize: 11, lineHeight: 16 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  stickyRate: { fontSize: 16, fontWeight: '900' },
  book: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 10 },
  bookText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
