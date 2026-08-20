import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { useAuth } from '@/lib/auth';
import { useBrowseTrainers } from '@/lib/queries/browse';
import { useIsFavorite, useToggleFavorite } from '@/lib/queries/favorites';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { TrainerListing } from '@/lib/types';

type SortMode = 'recommended' | 'top-rated' | 'price';

function TrainerResult({ trainer, userId, onPress }: { trainer: TrainerListing; userId?: string; onPress: () => void }) {
  const isFav = useIsFavorite(userId, trainer.user_id);
  const toggle = useToggleFavorite(userId ?? '');
  const displayName = trainer.full_name ?? 'Trainer';
  const specialty = trainer.specialties[0] ?? 'Personal Trainer';
  const rate = trainer.hourly_rate_cents != null ? `$${Math.round(trainer.hourly_rate_cents / 100)} / session` : 'Rate on request';

  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.avatarShell}><Avatar seed={trainer.user_id} size={78} initial={displayName} imageUrl={trainer.avatar_url} /></View>
      <View style={styles.resultBody}>
        <View style={styles.nameRow}>
          <Text style={styles.resultName} numberOfLines={1}>{displayName}</Text>
          {trainer.is_verified ? <Ionicons name="checkmark-circle" size={15} color="#3578F6" /> : null}
        </View>
        <Text style={styles.resultSpecialty} numberOfLines={1}>{specialty}</Text>
        <View style={styles.metaRow}>
          <StarRating rating={trainer.avg_rating} size={11} />
          <Text style={styles.metaText}>{trainer.avg_rating > 0 ? `${trainer.avg_rating.toFixed(1)} (${trainer.review_count})` : 'New'}</Text>
          {trainer.location ? <><Text style={styles.dot}>•</Text><Text style={styles.metaText} numberOfLines={1}>{trainer.location}</Text></> : null}
        </View>
        <Text style={styles.resultRate}>{rate}</Text>
      </View>
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={(event) => {
          event.stopPropagation();
          if (!userId) return;
          toggle.mutate({ trainerId: trainer.user_id, isFav: isFav.data ?? false });
        }}
      >
        <Ionicons name={isFav.data ? 'heart' : 'heart-outline'} size={20} color={isFav.data ? BRAND.purple : BRAND.navy} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function BrowseIndex() {
  const router = useRouter();
  const params = useLocalSearchParams<{ specialty?: string; sessionType?: string; maxRateCents?: string }>();
  const { colors } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  const sessionType = params.sessionType === 'in-person' || params.sessionType === 'virtual' ? params.sessionType : undefined;
  const maxRateCents = params.maxRateCents ? Number(params.maxRateCents) : undefined;
  const { data: trainers = [], isLoading } = useBrowseTrainers({
    search: debouncedSearch || undefined,
    specialty: params.specialty,
    sessionType,
    maxRateCents: Number.isFinite(maxRateCents) ? maxRateCents : undefined,
  });

  const sorted = useMemo(() => {
    const copy = [...trainers];
    if (sortMode === 'top-rated') return copy.sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count);
    if (sortMode === 'price') return copy.sort((a, b) => (a.hourly_rate_cents ?? Number.MAX_SAFE_INTEGER) - (b.hourly_rate_cents ?? Number.MAX_SAFE_INTEGER));
    return copy.sort((a, b) => Number(b.is_verified) - Number(a.is_verified) || b.review_count - a.review_count);
  }, [trainers, sortMode]);

  const handleCardPress = useCallback((trainer: TrainerListing) => {
    router.push({ pathname: '/(tabs)/browse/[trainerId]', params: { trainerId: trainer.user_id } });
  }, [router]);

  if (isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.eyebrow}>DISCOVER</Text>
                <Text style={styles.title}>Top Trainers</Text>
              </View>
              <TouchableOpacity style={styles.quizButton} onPress={() => router.push('/(tabs)/browse/quiz')}>
                <Ionicons name="options-outline" size={17} color={BRAND.purple} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#777B87" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search trainers, skills, or location"
                placeholderTextColor="#9A9EAA"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Ionicons name="filter-outline" size={18} color={BRAND.purple} />
            </View>

            {params.specialty || params.sessionType ? (
              <View style={styles.contextPill}>
                <Text style={styles.contextText}>{params.specialty || params.sessionType}</Text>
                <TouchableOpacity onPress={() => router.setParams({ specialty: undefined, sessionType: undefined })}><Ionicons name="close" size={15} color="#FFFFFF" /></TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.sortRow}>
              <SortChip label="Recommended" active={sortMode === 'recommended'} onPress={() => setSortMode('recommended')} />
              <SortChip label="Top Rated" active={sortMode === 'top-rated'} onPress={() => setSortMode('top-rated')} />
              <SortChip label="Best Price" active={sortMode === 'price'} onPress={() => setSortMode('price')} />
            </View>

            <Text style={styles.resultCount}>{sorted.length} trainer{sorted.length === 1 ? '' : 's'} available</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="search" size={25} color={BRAND.purple} /></View>
            <Text style={styles.emptyTitle}>No trainers match that yet.</Text>
            <Text style={styles.emptyText}>Try a broader search or clear the category filter.</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={() => { setSearch(''); router.setParams({ specialty: undefined, sessionType: undefined, maxRateCents: undefined }); }}><Text style={styles.emptyCtaText}>Show all trainers</Text></TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => <TrainerResult trainer={item} userId={userId} onPress={() => handleCardPress(item)} />}
      />
    </View>
  );
}

function SortChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.sortChip, active && styles.sortChipActive]} onPress={onPress}><Text style={[styles.sortText, active && styles.sortTextActive]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 44 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  eyebrow: { color: BRAND.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: BRAND.navy, fontSize: 30, fontWeight: '900', letterSpacing: -1.1, marginTop: 3 },
  quizButton: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1F7' },
  searchBox: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: '#E3E1E7', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: BRAND.navy, fontSize: 13, fontWeight: '600' },
  contextPill: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: BRAND.navy, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  contextText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 18 },
  sortChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#E4E0E8', backgroundColor: '#FFFFFF' },
  sortChipActive: { backgroundColor: BRAND.purple, borderColor: BRAND.purple },
  sortText: { color: '#4D5260', fontSize: 11, fontWeight: '800' },
  sortTextActive: { color: '#FFFFFF' },
  resultCount: { color: '#777B87', fontSize: 11, fontWeight: '700', marginBottom: 10 },
  resultCard: { minHeight: 122, marginBottom: 12, borderRadius: 18, borderWidth: 1, borderColor: '#E8E4EC', backgroundColor: '#FFFFFF', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 13, position: 'relative' },
  avatarShell: { width: 94, height: 94, borderRadius: 15, backgroundColor: '#EEEAF2', alignItems: 'center', justifyContent: 'center' },
  resultBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resultName: { color: BRAND.navy, fontSize: 15, fontWeight: '900', flexShrink: 1 },
  resultSpecialty: { color: '#5B64D8', fontSize: 10, fontWeight: '800', marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  metaText: { color: '#6E7280', fontSize: 10, fontWeight: '700', maxWidth: 110 },
  dot: { color: '#A0A3AB', fontSize: 10 },
  resultRate: { color: BRAND.navy, fontSize: 13, fontWeight: '900', marginTop: 8 },
  favoriteButton: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5F9' },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#F2ECFB', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: BRAND.navy, fontSize: 18, fontWeight: '900', marginTop: 16 },
  emptyText: { color: '#777B87', fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  emptyCta: { marginTop: 16, borderRadius: 12, backgroundColor: BRAND.navy, paddingHorizontal: 18, paddingVertical: 12 },
  emptyCtaText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});
