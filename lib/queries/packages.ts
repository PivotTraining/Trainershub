import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Package, PackagePurchase } from '../types';

// ── Trainer: manage own packages ─────────────────────────────────────────────

export function useMyPackages(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['packages', 'mine', trainerId],
    queryFn: async (): Promise<Package[]> => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('trainer_id', trainerId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Package[];
    },
  });
}

export function useCreatePackage(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Package, 'id' | 'trainer_id' | 'created_at'>): Promise<Package> => {
      const { data, error } = await supabase
        .from('packages')
        .insert({ ...input, trainer_id: trainerId })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Package;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages', 'mine', trainerId] }),
  });
}

export function useDeletePackage(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages', 'mine', trainerId] }),
  });
}

// ── Client: purchase + view purchases ────────────────────────────────────────

export function useMyPackagePurchases(clientId: string | undefined) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['package_purchases', clientId],
    queryFn: async (): Promise<PackagePurchase[]> => {
      const { data, error } = await supabase
        .from('package_purchases')
        .select('*, package:packages(*)')
        .eq('client_id', clientId!)
        .order('purchased_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as PackagePurchase[];
    },
  });
}

export function usePurchasePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      package_id: string;
      client_id: string;
      trainer_id: string;
      sessions_remaining: number;
    }): Promise<PackagePurchase> => {
      const { data, error } = await supabase
        .from('package_purchases')
        .insert(input)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as PackagePurchase;
    },
    onSuccess: (p) => qc.invalidateQueries({ queryKey: ['package_purchases', p.client_id] }),
  });
}
