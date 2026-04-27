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

import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { useClients } from '@/lib/queries/clients';
import { useFilteredClients } from '@/lib/useFilteredClients';

export default function ClientsList() {
  const router = useRouter();
  const { session } = useAuth();
  const { data, isLoading, error, isFetching, refetch } = useClients(session?.user.id);
  const { query, setQuery, results } = useFilteredClients(data ?? []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{(error as Error).message}</Text>
      </View>
    );
  }

  const isEmpty = (data ?? []).length === 0;

  return (
    <View style={styles.container}>
      {!isEmpty && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search clients…"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[{ padding: 16 }, results.length === 0 && { flex: 1 }]}
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
            <TouchableOpacity style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.profile?.full_name ?? item.profile?.email ?? '?')
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>
                  {item.profile?.full_name ?? item.profile?.email ?? 'Unknown'}
                </Text>
                {item.goals ? (
                  <Text style={styles.rowGoal} numberOfLines={1}>
                    {item.goals}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </Link>
        )}
      />

      {!isEmpty && (
        <Link href="/(tabs)/clients/new" asChild>
          <TouchableOpacity style={styles.fab}>
            <Text style={styles.fabText}>+ Add client</Text>
          </TouchableOpacity>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c00' },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowGoal: { fontSize: 13, color: '#888', marginTop: 2 },
  chevron: { fontSize: 20, color: '#bbb' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#111',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 30,
  },
  fabText: { color: '#fff', fontWeight: '600' },
});
