import { Link } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { useClientSessions, useTrainerSessions } from '@/lib/queries/sessions';
import type { Session } from '@/lib/types';

function groupByDay(sessions: Session[]): { title: string; data: Session[] }[] {
  const buckets = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = new Date(s.starts_at).toLocaleDateString();
    const existing = buckets.get(key);
    if (existing) {
      buckets.set(key, [...existing, s]);
    } else {
      buckets.set(key, [s]);
    }
  }
  return Array.from(buckets.entries()).map(([title, data]) => ({ title, data }));
}

export default function Schedule() {
  const { session, profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const userId = session?.user.id;
  const trainer = useTrainerSessions(isTrainer ? userId : undefined);
  const client = useClientSessions(!isTrainer ? userId : undefined);
  const query = isTrainer ? trainer : client;
  const sections = useMemo(() => groupByDay(query.data ?? []), [query.data]);

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No sessions yet.</Text>}
        renderSectionHeader={({ section }) => (
          <Text style={styles.section}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTime}>
              {new Date(item.starts_at).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.rowMeta}>
              {item.duration_min} min · {item.status}
            </Text>
          </View>
        )}
      />
      {isTrainer && (
        <Link href="/session/new" asChild>
          <TouchableOpacity style={styles.fab}>
            <Text style={styles.fabText}>+ New session</Text>
          </TouchableOpacity>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#666', textAlign: 'center', marginTop: 32 },
  section: {
    fontSize: 13,
    color: '#888',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },
  rowTime: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, color: '#666', marginTop: 2 },
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
