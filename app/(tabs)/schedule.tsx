import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { useClientSessions, useTrainerSessions } from '@/lib/queries/sessions';
import type { Session } from '@/lib/types';

const STATUS_ICON: Record<Session['status'], React.ComponentProps<typeof Ionicons>['name']> = {
  scheduled: 'time-outline',
  completed: 'checkmark-circle-outline',
  canceled: 'close-circle-outline',
};
const STATUS_COLOR: Record<Session['status'], string> = {
  scheduled: '#0a7',
  completed: '#048',
  canceled: '#c33',
};

function groupByDay(sessions: Session[]): { title: string; data: Session[] }[] {
  const buckets = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = new Date(s.starts_at).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const existing = buckets.get(key);
    buckets.set(key, existing ? [...existing, s] : [s]);
  }
  return Array.from(buckets.entries()).map(([title, data]) => ({ title, data }));
}

export default function Schedule() {
  const router = useRouter();
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
        contentContainerStyle={[{ padding: 16 }, sections.length === 0 && { flex: 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={query.refetch}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No sessions yet"
            subtitle={
              isTrainer
                ? 'Schedule your first session with a client.'
                : 'Your trainer will add sessions here.'
            }
            actionLabel={isTrainer ? '+ New session' : undefined}
            onAction={isTrainer ? () => router.push('/session/new') : undefined}
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.section}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: item.id } })}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTime}>
                {new Date(item.starts_at).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.rowMeta}>{item.duration_min} min</Text>
            </View>
            <View style={styles.rowRight}>
              <Ionicons
                name={STATUS_ICON[item.status]}
                size={18}
                color={STATUS_COLOR[item.status]}
              />
              <Text style={[styles.rowStatus, { color: STATUS_COLOR[item.status] }]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
      {isTrainer && sections.length > 0 && (
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
  section: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
    gap: 8,
  },
  rowLeft: { flex: 1 },
  rowTime: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowStatus: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
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
