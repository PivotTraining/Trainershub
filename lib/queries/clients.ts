import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Client } from '../types';
import type { ClientCreateInput, ClientUpdateInput } from '../validators/client';

export function useClients(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['clients', trainerId],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', trainerId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Client[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['client', id],
    queryFn: async (): Promise<Client | null> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Client | null) ?? null;
    },
  });
}

export function useCreateClient(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientCreateInput): Promise<Client> => {
      // Step 1: invite the client user via auth (admin call requires server). For MVP we
      // assume the user record exists or is created out-of-band; we link by email lookup.
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
    mutationFn: async (args: { id: string } & ClientUpdateInput): Promise<Client> => {
      const { id, ...patch } = args;
      const { data, error } = await supabase
        .from('clients')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Client;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['client', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['clients', trainerId] });
    },
  });
}
