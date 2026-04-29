import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { useClients } from '@/lib/queries/clients';
import { radius, spacing, typography } from '@/lib/theme';
import { useFilteredClients } from '@/lib/useFilteredClients';
import { useTheme } from '@/lib/useTheme';

export default function ClientsList() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, accent } = useTheme();
  const { data, isLoading, error, isFetching, refetch } = useClients(session?.user.id);
  const { query, setQuery, results } = useFilteredClients(data ?? []);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{(error as Error).message}</Text>
      </View>
    );
  }

  const isEmpty = (data ?? []).length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      {!isEmpty && (
        <View style={[styles.searchWrap]}>
          <TextInput
            style={[styles.searchInput, {
              backgroundColor: colors.surface,
              borderColor: colors.borderInput,
              color: colors.ink,
            }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search clients…"
            placeholderTextColor={colors.placeholder}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[{ padding: spacing.md }, results.length === 0 && { flex: 1 }]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          query ? (
            <EmptyState
              icon="search-outline"
              title="No matches"
              subtitle={`No clients match "${query}".`}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title="No clients yet"
              subtitle="Add your first client and start scheduling sessions."
              actionLabel="Add client"
              onAction={() => router.push('/(tabs)/clients/new')}
            />
          )
        }
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/(tabs)/clients/[id]', params: { id: item.id } }}
            asChild
          >
            <TouchableOpacity
              style={[styles.row, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: accent }]}>
                <Text style={styles.avatarText}>
                  {(item.profile?.full_name ?? item.profile?.email ?? '?')
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowName, { color: colors.ink }]}>
                  {item.profile?.full_name ?? item.profile?.email ?? 'Unknown'}
                </Text>
                {item.goals ? (
                  <Text style={[styles.rowGoal, { color: colors.muted }]} numberOfLines={1}>
                    {item.goals}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.chevron, { color: colors.placeholder }]}>›</Text>
            </TouchableOpacity>
          </Link>
        )}
      />

      {!isEmpty && (
        <Link href="/(tabs)/clients/new" asChild>
          <TouchableOpacity style={[styles.fab, { backgroundColor: accent }]}>
            <Text style={styles.fabText}>+ Add client</Text>
          </TouchableOpacity>
        </Link>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: typography.base },
  rowBody:    { flex: 1 },
  rowName:    { fontSize: typography.md, fontWeight: '600' },
  rowGoal:    { fontSize: typography.sm, marginTop: 2 },
  chevron:    { fontSize: 20 },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 30,
  },
  fabText: { color: '#fff', fontWeight: '600' },
});
