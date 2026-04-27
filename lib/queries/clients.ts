import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Client, ClientWithProfile } from '../types';
import type { ClientCreateInput, ClientUpdateInput } from '../validators/client';

const CLIENT_WITH_PROFILE_SELECT = '*, profile:profiles!user_id(full_name, email)' as const;

function rowToClientWithProfile(row: unknown): ClientWithProfile {
  const r = row as Client & {
    profile: { full_name: string | null; email: string } | null;
  };
  return {
    id: r.id,
    user_id: r.user_id,
    trainer_id: r.trainer_id,
    goals: r.goals,
    notes: r.notes,
    created_at: r.created_at,
    profile: r.profile ?? null,
  };
}

export function useClients(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['clients', trainerId],
    queryFn: async (): Promise<ClientWithProfile[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select(CLIENT_WITH_PROFILE_SELECT)
        .eq('trainer_id', trainerId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(rowToClientWithProfile);
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['client', id],
    queryFn: async (): Promise<ClientWithProfile | null> => {
      const { data, error } = await supabase
        .from('clients')
        .select(CLIENT_WITH_PROFILE_SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? rowToClientWithProfile(data) : null;
    },
  });
}

export function useCreateClient(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientCreateInput): Promise<Client> => {
      // Delegate to the invite-client Edge Function which handles both
      // existing users and new invites via Supabase Auth admin.
      const { data, error } = await supabase.functions.invoke('invite-client', {
        body: {
          email: input.email,
          goals: input.goals ?? null,
          notes: input.notes ?? null,
        },
      });
      if (error) throw new Error(error.message);

      const { clientId } = data as { clientId: string };

      // Fetch the full row so callers get a typed Client back
      const { data: row, error: rowError } = await supabase
        .from('clients')
        .select(CLIENT_WITH_PROFILE_SELECT)
        .eq('id', clientId)
        .single();
      if (rowError) throw new Error(rowError.message);
      return rowToClientWithProfile(row) as unknown as Client;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients', trainerId] });
    },
  });
}

export function useDeleteClient(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['clients', trainerId] });
    },
  });
}

export function useUpdateClient(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string } & ClientUpdateInput): Promise<ClientWithProfile> => {
      const { id, ...patch } = args;
      const { data, error } = await supabase
        .from('clients')
        .update(patch)
        .eq('id', id)
        .select(CLIENT_WITH_PROFILE_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return rowToClientWithProfile(data);
    },
    onSuccess: (updated) => {
      qc.setQueryData(['client', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['clients', trainerId] });
    },
  });
}
