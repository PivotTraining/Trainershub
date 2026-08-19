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

import { TrainerCard } from '@/components/TrainerCard';
import { useAuth } from '@/lib/auth';
import { useBrowseTrainers } from '@/lib/queries/browse';
import { useIsFavorite, useToggleFavorite } from '@/lib/queries/favorites';
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
  const { colors, spacing, radius, typography, accent } = useTheme();
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
      <View style={[styles.hero, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radius.lg, marginHorizontal: spacing.md, marginTop: spacing.md }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
          <Ionicons name="sparkles-outline" size={22} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.ink, fontSize: typography.lg }]}>Find the right trainer, faster.</Text>
          <Text style={[styles.heroSub, { color: colors.muted, fontSize: typography.sm }]}>Compare specialties, verified profiles, reviews, session type and price before you book.</Text>
        </View>
      </View>

      <View style={[styles.searchWrap, { paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
        <View style={[styles.searchInner, { backgroundColor: colors.surface, borderColor: colors.borderInput, borderRadius: radius.lg }]}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.ink, fontSize: typography.md }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by trainer, goal or specialty…"
            placeholderTextColor={colors.placeholder}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
        {FILTER_CHIPS.map((fc) => {
          const isActive = activeFilter === fc.id;
          return (
            <TouchableOpacity
              key={fc.id}
              style={[styles.filterChip, { backgroundColor: isActive ? colors.ink : colors.surface, borderColor: isActive ? colors.ink : colors.border, borderRadius: radius.pill }]}
              onPress={() => setActiveFilter(fc.id)}
            >
              <Text style={[styles.filterChipText, { color: isActive ? colors.white : colors.inkSoft, fontSize: typography.sm }]}>{fc.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.quizBanner, { backgroundColor: colors.infoBg, borderColor: colors.info, borderRadius: radius.lg, marginHorizontal: spacing.md }]}
        onPress={() => router.push('/(tabs)/browse/quiz')}
        activeOpacity={0.82}
      >
        <View style={styles.quizBannerInner}>
          <View style={[styles.quizIcon, { backgroundColor: colors.surface, borderRadius: radius.md }]}>
            <Ionicons name="options-outline" size={18} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quizTitle, { color: colors.info, fontSize: typography.sm }]}>Not sure who fits?</Text>
            <Text style={[styles.quizText, { color: colors.muted, fontSize: typography.xs }]}>Take the 5-question Trainer Match quiz.</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.info} />
        </View>
      </TouchableOpacity>

      <View style={[styles.resultsRow, { paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm }]}>
        <View>
          <Text style={[styles.resultsTitle, { color: colors.ink, fontSize: typography.md }]}>Top matches</Text>
          <Text style={[styles.resultsSub, { color: colors.muted, fontSize: typography.xs }]}>{trainers.length} trainer{trainers.length === 1 ? '' : 's'} found</Text>
        </View>
        {activeFilter !== 'all' && (
          <TouchableOpacity onPress={() => setActiveFilter('all')}>
            <Text style={[styles.clearText, { color: accent, fontSize: typography.sm }]}>Clear filter</Text>
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
            <Ionicons name="search-outline" size={40} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.ink, fontSize: typography.lg }]}>No trainers found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted, fontSize: typography.sm }]}>Try another specialty, price range, or session type.</Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.ink, borderRadius: radius.md }]} onPress={() => { setActiveFilter('all'); setSearch(''); }}>
              <Text style={{ color: colors.white, fontWeight: '800' }}>Show all trainers</Text>
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
  hero: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1 },
  heroIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontWeight: '900', letterSpacing: -0.2 },
  heroSub: { lineHeight: 19, marginTop: 3 },
  searchWrap: { paddingBottom: 4 },
  searchInner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
  searchInput: { flex: 1 },
  filterScroll: { gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  filterChipText: { fontWeight: '700' },
  quizBanner: { padding: 12, borderWidth: 1 },
  quizBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quizIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  quizTitle: { fontWeight: '800' },
  quizText: { marginTop: 2 },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultsTitle: { fontWeight: '900' },
  resultsSub: { marginTop: 2 },
  clearText: { fontWeight: '800' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyTitle: { fontWeight: '700', marginTop: 8 },
  emptySubtitle: { textAlign: 'center', maxWidth: 320 },
  emptyButton: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 11 },
});
