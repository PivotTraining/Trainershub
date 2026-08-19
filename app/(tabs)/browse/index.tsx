import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { EnergyHero } from '@/components/EnergyHero';
import { TrainerCard } from '@/components/TrainerCard';
import { useAuth } from '@/lib/auth';
import { useBrowseTrainers } from '@/lib/queries/browse';
import { useIsFavorite, useToggleFavorite } from '@/lib/queries/favorites';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { TrainerListing } from '@/lib/types';

interface FilterChip {
  id: string;
  label: string;
  specialty?: string;
  sessionType?: 'in-person' | 'virtual';
  maxRateCents?: number;
  availableToday?: boolean;
}

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'fitness', label: 'Fitness', specialty: 'fitness' },
  { id: 'life-coaching', label: 'Life Coaching', specialty: 'life coaching' },
  { id: 'mental-wellness', label: 'Mental Wellness', specialty: 'mental wellness' },
  { id: 'nutrition', label: 'Nutrition', specialty: 'nutrition' },
  { id: 'yoga', label: 'Yoga', specialty: 'yoga' },
  { id: 'in-person', label: 'In-Person', sessionType: 'in-person' },
  { id: 'virtual', label: 'Virtual', sessionType: 'virtual' },
  { id: 'available-today', label: 'Available Today', availableToday: true },
  { id: 'under-100', label: 'Under $100/hr', maxRateCents: 10000 },
];

interface TrainerCardItemProps {
  trainer: TrainerListing;
  userId: string | undefined;
  onPress: () => void;
}

function TrainerCardItem({ trainer, userId, onPress }: TrainerCardItemProps) {
  const isFav = useIsFavorite(userId, trainer.user_id);
  const toggle = useToggleFavorite(userId ?? '');

  const handleFavPress = useCallback(() => {
    if (!userId) return;
    toggle.mutate({ trainerId: trainer.user_id, isFav: isFav.data ?? false });
  }, [userId, trainer.user_id, toggle, isFav.data]);

  return (
    <TrainerCard
      trainer={trainer}
      isFavorite={isFav.data ?? false}
      onPress={onPress}
      onFavoritePress={handleFavPress}
    />
  );
}

export default function BrowseIndex() {
  const router = useRouter();
  const params = useLocalSearchParams<{ specialty?: string; sessionType?: string; maxRateCents?: string }>();
  const { colors, spacing, typography, accent } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const chip = FILTER_CHIPS.find((c) => c.id === activeFilter) ?? FILTER_CHIPS[0];
  const quizSessionType = params.sessionType === 'in-person' || params.sessionType === 'virtual' ? params.sessionType : undefined;
  const quizMaxRateCents = params.maxRateCents ? Number(params.maxRateCents) : undefined;
  const filters = {
    search: debouncedSearch || undefined,
    specialty: chip.specialty ?? params.specialty,
    sessionType: chip.sessionType ?? quizSessionType,
    maxRateCents: chip.maxRateCents ?? (Number.isFinite(quizMaxRateCents) ? quizMaxRateCents : undefined),
    availableToday: chip.availableToday,
  };

  const { data: trainers = [], isLoading } = useBrowseTrainers(filters);

  const handleCardPress = useCallback((trainer: TrainerListing) => {
    router.push({ pathname: '/(tabs)/browse/[trainerId]', params: { trainerId: trainer.user_id } });
  }, [router]);

  const renderHeader = () => (
    <View>
      <View style={{ marginHorizontal: spacing.md, marginTop: spacing.md }}>
        <EnergyHero
          eyebrow="DISCOVER"
          title="Find your fit."
          subtitle="Search verified trainers by goal, style, format, availability and price."
          icon="search-outline"
          compact
        />
      </View>

      <View style={[styles.searchWrap, { paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
        <View style={[styles.searchInner, { backgroundColor: colors.surface, borderColor: colors.borderInput }]}>
          <Ionicons name="search-outline" size={18} color={accent} />
          <TextInput
            style={[styles.searchInput, { color: colors.ink, fontSize: typography.md }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search trainer, goal or specialty…"
            placeholderTextColor={colors.placeholder}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={[styles.searchBeam, { backgroundColor: accent }]} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
        {FILTER_CHIPS.map((fc) => {
          const isActive = activeFilter === fc.id;
          return (
            <TouchableOpacity
              key={fc.id}
              style={[
                styles.filterChip,
                { borderColor: isActive ? accent : colors.border, backgroundColor: isActive ? BRAND.navy : colors.surface },
              ]}
              onPress={() => setActiveFilter(fc.id)}
            >
              {isActive ? <View style={[styles.filterRail, { backgroundColor: accent }]} /> : null}
              <Text style={[styles.filterChipText, { color: isActive ? '#FFFFFF' : colors.inkSoft, fontSize: typography.sm }]}>{fc.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.quizBanner, { backgroundColor: colors.surfaceCard, borderColor: colors.border, marginHorizontal: spacing.md }]}
        onPress={() => router.push('/(tabs)/browse/quiz')}
        activeOpacity={0.84}
      >
        <View style={[styles.quizRail, { backgroundColor: BRAND.purple }]} />
        <Ionicons name="options-outline" size={19} color={accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.quizTitle, { color: colors.ink, fontSize: typography.sm }]}>Not sure who fits?</Text>
          <Text style={[styles.quizText, { color: colors.muted, fontSize: typography.xs }]}>Take the 5-question Trainer Match quiz.</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={accent} />
      </TouchableOpacity>

      <View style={[styles.resultsRow, { paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm }]}>
        <View>
          <Text style={[styles.resultsEyebrow, { color: accent }]}>MATCHES</Text>
          <Text style={[styles.resultsTitle, { color: colors.ink, fontSize: typography.md }]}>{trainers.length} trainer{trainers.length === 1 ? '' : 's'} found</Text>
        </View>
        <View style={styles.resultsBeam} />
        {activeFilter !== 'all' && (
          <TouchableOpacity onPress={() => setActiveFilter('all')}>
            <Text style={[styles.clearText, { color: accent, fontSize: typography.sm }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={trainers}
        keyExtractor={(t) => t.user_id}
        contentContainerStyle={[{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }, trainers.length === 0 && { flex: 1 }]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={36} color={accent} />
            <Text style={[styles.emptyTitle, { color: colors.ink, fontSize: typography.lg }]}>No trainers found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted, fontSize: typography.sm }]}>Try another specialty, price range, or session type.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => { setActiveFilter('all'); setSearch(''); }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Show all trainers</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => <TrainerCardItem trainer={item} userId={userId} onPress={() => handleCardPress(item)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { paddingBottom: 4 },
  searchInner: { position: 'relative', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, gap: 8, overflow: 'hidden' },
  searchInput: { flex: 1 },
  searchBeam: { position: 'absolute', left: 0, bottom: 0, width: 90, height: 2, opacity: 0.7 },
  filterScroll: { gap: 7 },
  filterChip: { position: 'relative', overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderRadius: 9 },
  filterRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2 },
  filterChipText: { fontWeight: '700' },
  quizBanner: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderWidth: 1, borderRadius: 14 },
  quizRail: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, opacity: 0.74 },
  quizTitle: { fontWeight: '900' },
  quizText: { marginTop: 2 },
  resultsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  resultsEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  resultsTitle: { fontWeight: '900', marginTop: 2 },
  resultsBeam: { flex: 1, height: 1, marginBottom: 5, backgroundColor: BRAND.blue, opacity: 0.22 },
  clearText: { fontWeight: '800' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyTitle: { fontWeight: '800', marginTop: 8 },
  emptySubtitle: { textAlign: 'center', maxWidth: 320 },
  emptyButton: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, backgroundColor: BRAND.navy },
});
