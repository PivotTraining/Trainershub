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
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', input.email)
        .maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (!profile) {
        throw new Error(
          'No user with that email yet. Have them sign up first, then add them here.',
        );
      }
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: profile.id,
          trainer_id: trainerId,
          goals: input.goals ?? null,
          notes: input.notes ?? null,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Client;
    },
    onSuccess: () => {
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
