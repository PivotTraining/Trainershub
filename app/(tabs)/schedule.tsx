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
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { useClientSessions, useTrainerSessions } from '@/lib/queries/sessions';
import { radius, spacing, typography } from '@/lib/theme';
import type { Session, SessionWithClient } from '@/lib/types';
import { useRealtimeSessions } from '@/lib/useRealtimeSessions';
import { useTheme } from '@/lib/useTheme';

const STATUS_ICON: Record<Session['status'], React.ComponentProps<typeof Ionicons>['name']> = {
  scheduled: 'time-outline',
  completed: 'checkmark-circle-outline',
  canceled:  'close-circle-outline',
};

function groupByDay(sessions: SessionWithClient[]): { title: string; data: SessionWithClient[] }[] {
  const buckets = new Map<string, SessionWithClient[]>();
  for (const s of sessions) {
    const key = new Date(s.starts_at).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const existing = buckets.get(key);
    buckets.set(key, existing ? [...existing, s] : [s]);
  }
  return Array.from(buckets.entries()).map(([title, data]) => ({ title, data }));
}

export default function Schedule() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors, accent } = useTheme();
  const isTrainer = profile?.role === 'trainer';
  const userId = session?.user.id;
  const trainer = useTrainerSessions(isTrainer ? userId : undefined);
  const client  = useClientSessions(!isTrainer ? userId : undefined);
  const query   = isTrainer ? trainer : client;

  useRealtimeSessions(isTrainer ? userId : undefined);
  const sections = useMemo(() => groupByDay(query.data ?? []), [query.data]);

  const STATUS_COLOR: Record<Session['status'], string> = {
    scheduled: colors.success,
    completed: colors.info,
    canceled:  colors.danger,
  };

  if (query.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[
          { padding: spacing.md },
          sections.length === 0 && { flex: 1 },
        ]}
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
          <Text style={[styles.sectionHeader, { color: colors.muted }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: item.id } })}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTime, { color: colors.ink }]}>
                {new Date(item.starts_at).toLocaleTimeString([], {
                  hour: 'numeric', minute: '2-digit',
                })}
              </Text>
              <Text style={[styles.rowMeta, { color: colors.muted }]}>
                {item.duration_min} min
                {isTrainer && item.clientName
                  ? `  ·  ${item.clientName}`
                  : item.clientEmail
                  ? `  ·  ${item.clientEmail}`
                  : ''}
              </Text>
              {item.notes ? (
                <Text style={[styles.rowNotes, { color: colors.placeholder }]} numberOfLines={1}>
                  {item.notes}
                </Text>
              ) : null}
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
            <Text style={[styles.chevron, { color: colors.placeholder }]}>›</Text>
          </TouchableOpacity>
        )}
      />
      {isTrainer && sections.length > 0 && (
        <Link href="/session/new" asChild>
          <TouchableOpacity style={[styles.fab, { backgroundColor: accent }]}>
            <Text style={styles.fabText}>+ New session</Text>
          </TouchableOpacity>
        </Link>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    fontSize: typography.xs,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  rowLeft:   { flex: 1 },
  rowTime:   { fontSize: typography.base, fontWeight: '600' },
  rowMeta:   { fontSize: typography.xs, marginTop: 2 },
  rowNotes:  { fontSize: typography.xs, marginTop: 2, fontStyle: 'italic' },
  rowRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowStatus: { fontSize: typography.xs, fontWeight: '600', textTransform: 'capitalize' },
  chevron:   { fontSize: 20 },
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
