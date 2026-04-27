import { Link } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { useClients } from '@/lib/queries/clients';

export default function ClientsList() {
  const { session } = useAuth();
  const { data, isLoading, error } = useClients(session?.user.id);

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

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No clients yet. Tap "Add client" to invite one.</Text>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/(tabs)/clients/[id]', params: { id: item.id } }} asChild>
            <TouchableOpacity style={styles.row}>
              <Text style={styles.rowTitle}>{item.goals ?? 'Client'}</Text>
              <Text style={styles.rowSub}>
                Added {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </Link>
        )}
      />
      <Link href="/(tabs)/clients/new" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>+ Add client</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#666', textAlign: 'center', marginTop: 32 },
  error: { color: '#c00' },
  row: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { color: '#888', marginTop: 4, fontSize: 12 },
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
