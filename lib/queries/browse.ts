import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Package, Review, TrainerListing } from '../types';

export interface BrowseFilters {
  search?: string;
  specialty?: string;
  sessionType?: 'in-person' | 'virtual';
  maxRateCents?: number;
  minRateCents?: number;
  language?: string;
  availableToday?: boolean;
}

type TrainerListingRow = Omit<TrainerListing, 'full_name' | 'email'> & {
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type ReviewRow = Review & {
  profiles?: {
    full_name: string | null;
  } | null;
};

function toTrainerListing(row: TrainerListingRow): TrainerListing {
  const { profiles, ...trainer } = row;
  return {
    ...trainer,
    full_name: profiles?.full_name ?? null,
    email: profiles?.email ?? '',
  };
}

function matchesSearch(trainer: TrainerListing, rawSearch: string | undefined): boolean {
  const search = rawSearch?.trim().toLowerCase();
  if (!search) return true;

  const searchable = [
    trainer.full_name,
    trainer.email,
    trainer.bio,
    trainer.location,
    ...trainer.specialties,
    ...trainer.languages,
  ];

  return searchable.some((value) => value?.toLowerCase().includes(search));
}

export function useBrowseTrainers(filters: BrowseFilters = {}) {
  return useQuery({
    queryKey: ['browse', 'trainers', filters],
    queryFn: async (): Promise<TrainerListing[]> => {
      let availableTrainerIds: string[] | undefined;

      if (filters.availableToday) {
        const { data: slots, error: slotsError } = await supabase
          .from('availability_slots')
          .select('trainer_id')
          .eq('day_of_week', new Date().getDay());

        if (slotsError) throw new Error(slotsError.message);

        availableTrainerIds = [...new Set((slots ?? []).map((slot) => slot.trainer_id as string))];
        if (availableTrainerIds.length === 0) return [];

        // Limit the marketplace query to trainers who have any recurring slot today.
      }

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
      if (availableTrainerIds) {
        q = q.in('user_id', availableTrainerIds);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      return ((data ?? []) as TrainerListingRow[])
        .map(toTrainerListing)
        .filter((trainer) => matchesSearch(trainer, filters.search));
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
      return toTrainerListing(data as TrainerListingRow);
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
      return ((data ?? []) as ReviewRow[]).map((r) => ({
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
