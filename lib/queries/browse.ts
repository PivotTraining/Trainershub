import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Package, Review, TrainerListing } from '../types';

export interface BrowseFilters {
  specialty?: string;
  sessionType?: 'in-person' | 'virtual';
  maxRateCents?: number;
  minRateCents?: number;
  language?: string;
  availableToday?: boolean;
}

export function useBrowseTrainers(filters: BrowseFilters = {}) {
  return useQuery({
    queryKey: ['browse', 'trainers', filters],
    queryFn: async (): Promise<TrainerListing[]> => {
      // Join trainer_profiles with profiles to get full_name + email
      let q = supabase
        .from('trainer_profiles')
        .select('*, profiles!user_id(full_name, email)')
        .order('avg_rating', { ascending: false });

      if (filters.specialty) {
        q = q.contains('specialties', [filters.specialty]);
      }
      if (filters.sessionType) {
        q = q.contains('session_types', [filters.sessionType]);
      }
      if (filters.maxRateCents != null) {
        q = q.lte('hourly_rate_cents', filters.maxRateCents);
      }
      if (filters.minRateCents != null) {
        q = q.gte('hourly_rate_cents', filters.minRateCents);
      }
      if (filters.language) {
        q = q.contains('languages', [filters.language]);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      return (data ?? []).map((row: any) => ({
        ...row,
        full_name: row.profiles?.full_name ?? null,
        email: row.profiles?.email ?? '',
      })) as TrainerListing[];
    },
  });
}

export function usePublicTrainerProfile(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['trainer_public', trainerId],
    queryFn: async (): Promise<TrainerListing | null> => {
      const { data, error } = await supabase
        .from('trainer_profiles')
        .select('*, profiles!user_id(full_name, email)')
        .eq('user_id', trainerId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        ...(data as any),
        full_name: (data as any).profiles?.full_name ?? null,
        email: (data as any).profiles?.email ?? '',
      } as TrainerListing;
    },
  });
}

export function useTrainerReviewsPublic(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['reviews', trainerId],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles!client_id(full_name)')
        .eq('trainer_id', trainerId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => ({
        ...r,
        clientName: r.profiles?.full_name ?? null,
      })) as Review[];
    },
  });
}

export function useTrainerPackagesPublic(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['packages', 'public', trainerId],
    queryFn: async (): Promise<Package[]> => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('trainer_id', trainerId!)
        .eq('is_active', true)
        .order('price_cents', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Package[];
    },
  });
}
