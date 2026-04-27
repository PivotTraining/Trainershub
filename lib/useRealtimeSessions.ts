import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from './supabase';
import type { Session } from './types';

/**
 * Subscribes to Supabase realtime changes on the `sessions` table filtered by
 * trainer_id. Any INSERT / UPDATE / DELETE coming from the server is immediately
 * reflected in TanStack Query's cache so the schedule screen updates without a
 * manual pull-to-refresh.
 */
export function useRealtimeSessions(trainerId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!trainerId) return;

    const channel = supabase
      .channel(`sessions:trainer:${trainerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `trainer_id=eq.${trainerId}`,
        },
        (payload) => {
          // Always invalidate the list query so section grouping recalculates
          qc.invalidateQueries({ queryKey: ['sessions', 'trainer', trainerId] });

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as Session;
            qc.setQueryData(['session', updated.id], updated);
          }

          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            qc.removeQueries({ queryKey: ['session', deleted.id] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => null);
    };
  }, [trainerId, qc]);
}
