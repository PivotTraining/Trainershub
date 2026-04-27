import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Session, SessionStatus } from '../types';
import type { SessionCreateInput } from '../validators/session';

export function useSession(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['session', id],
    queryFn: async (): Promise<Session | null> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Session | null) ?? null;
    },
  });
}

export function useTrainerSessions(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['sessions', 'trainer', trainerId],
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('trainer_id', trainerId!)
        .order('starts_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Session[];
    },
  });
}

export function useClientSessions(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['sessions', 'client', userId],
    queryFn: async (): Promise<Session[]> => {
      const { data: clientRows, error: cErr } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId!);
      if (cErr) throw new Error(cErr.message);
      const ids = (clientRows ?? []).map((r) => r.id as string);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .in('client_id', ids)
        .order('starts_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Session[];
    },
  });
}

export function useCreateSession(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SessionCreateInput): Promise<Session> => {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          trainer_id: trainerId,
          client_id: input.client_id,
          starts_at: input.starts_at,
          duration_min: input.duration_min,
          notes: input.notes ?? null,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Session;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; status: SessionStatus }): Promise<Session> => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ status: args.status })
        .eq('id', args.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Session;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session', data.id] });
    },
  });
}
