import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useClient } from '@/lib/queries/clients';

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = useClient(id);

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
  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Client not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.label}>Goals</Text>
      <Text style={styles.value}>{data.goals ?? '—'}</Text>
      <Text style={styles.label}>Notes</Text>
      <Text style={styles.value}>{data.notes ?? '—'}</Text>
      <Text style={styles.label}>Added</Text>
      <Text style={styles.value}>{new Date(data.created_at).toLocaleDateString()}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, color: '#888', marginTop: 16, marginBottom: 4 },
  value: { fontSize: 16 },
  error: { color: '#c00' },
});
