import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

// ── Filter chip definitions ────────────────────────────────────────────────────

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

// ── Per-card wrapper: owns its own fav state ─────────────────────────────────

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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BrowseIndex() {
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search text by 300ms
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  // Build filters from active chip + search text
  const chip = FILTER_CHIPS.find((c) => c.id === activeFilter) ?? FILTER_CHIPS[0];
  const filters = {
    search: debouncedSearch || undefined,
    specialty: chip.specialty,
    sessionType: chip.sessionType,
    maxRateCents: chip.maxRateCents,
    availableToday: chip.availableToday,
  };

  const { data: trainers = [], isLoading } = useBrowseTrainers(filters);

  const handleCardPress = useCallback(
    (trainer: TrainerListing) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (router as any).push({ pathname: '/(tabs)/browse/[trainerId]', params: { trainerId: trainer.user_id } });
    },
    [router],
  );

  const renderHeader = () => (
    <View>
      {/* Search bar */}
      <View style={[styles.searchWrap, { paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
        <View
          style={[
            styles.searchInner,
            { backgroundColor: colors.surface, borderColor: colors.borderInput, borderRadius: radius.lg },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.ink, fontSize: typography.md }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search trainers, specialties…"
            placeholderTextColor={colors.placeholder}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterScroll, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}
      >
        {FILTER_CHIPS.map((fc) => {
          const isActive = activeFilter === fc.id;
          return (
            <TouchableOpacity
              key={fc.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.ink : colors.surface,
                  borderColor: isActive ? colors.ink : colors.border,
                  borderRadius: radius.pill,
                },
              ]}
              onPress={() => setActiveFilter(fc.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: isActive ? colors.white : colors.inkSoft,
                    fontSize: typography.sm,
                  },
                ]}
              >
                {fc.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Match Quiz CTA */}
      <TouchableOpacity
        style={[
          styles.quizBanner,
          {
            backgroundColor: colors.infoBg,
            borderColor: colors.info,
            borderRadius: radius.lg,
            marginHorizontal: spacing.md,
            marginBottom: spacing.sm,
          },
        ]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onPress={() => (router as any).push('/(tabs)/browse/quiz')}
        activeOpacity={0.8}
      >
        <View style={styles.quizBannerInner}>
          <Text style={[styles.quizText, { color: colors.info, fontSize: typography.sm }]}>
            Not sure who&apos;s right for you? Take the 5-question match quiz
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.info} />
        </View>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={trainers}
        keyExtractor={(t) => t.user_id}
        contentContainerStyle={[
          { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
          trainers.length === 0 && { flex: 1 },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={40} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.ink, fontSize: typography.lg }]}>
              No trainers found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted, fontSize: typography.sm }]}>
              Try adjusting your filters or search terms.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TrainerCardItem
            trainer={item}
            userId={userId}
            onPress={() => handleCardPress(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { paddingBottom: 4 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  searchIcon: {},
  searchInput: { flex: 1 },
  filterScroll: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterChipText: { fontWeight: '500' },
  quizBanner: {
    padding: 12,
    borderWidth: 1,
  },
  quizBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quizText: { flex: 1, fontWeight: '500' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 60,
  },
  emptyTitle: { fontWeight: '600', marginTop: 8 },
  emptySubtitle: { textAlign: 'center' },
});
