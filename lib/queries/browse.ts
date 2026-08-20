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

function matchesSearch(trainer: TrainerListing, rawSearch: string | undefined): boolean {
  const search = rawSearch?.trim().toLowerCase();
  if (!search) return true;

  const searchable = [
    trainer.full_name,
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
      }

      const { data, error } = await supabase.rpc('get_trainer_directory', {
        p_trainer_id: null,
      });
      if (error) throw new Error(error.message);

      return ((data ?? []) as TrainerListing[]).filter((trainer) =>
        matchesSearch(trainer, filters.search)
        && (!filters.specialty || trainer.specialties.includes(filters.specialty))
        && (!filters.sessionType || trainer.session_types.includes(filters.sessionType))
        && (filters.maxRateCents == null || (trainer.hourly_rate_cents != null && trainer.hourly_rate_cents <= filters.maxRateCents))
        && (filters.minRateCents == null || (trainer.hourly_rate_cents != null && trainer.hourly_rate_cents >= filters.minRateCents))
        && (!filters.language || trainer.languages.includes(filters.language))
        && (!availableTrainerIds || availableTrainerIds.includes(trainer.user_id)),
      );
    },
  });
}

export function usePublicTrainerDirectory() {
  return useQuery({
    queryKey: ['trainer_public_directory'],
    queryFn: async (): Promise<TrainerListing[]> => {
      const { data, error } = await supabase.rpc('get_public_trainer_directory', {
        p_trainer_id: null,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as TrainerListing[];
    },
  });
}

export function usePublicTrainerProfile(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['trainer_public', trainerId],
    queryFn: async (): Promise<TrainerListing | null> => {
      const { data, error } = await supabase.rpc('get_public_trainer_directory', {
        p_trainer_id: trainerId!,
      });
      if (error) throw new Error(error.message);
      return ((data ?? [])[0] as TrainerListing | undefined) ?? null;
    },
  });
}

export function useTrainerReviewsPublic(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['reviews', trainerId],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase.rpc('get_public_trainer_reviews', {
        p_trainer_id: trainerId!,
      });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<Pick<Review, 'id' | 'trainer_id' | 'rating' | 'body' | 'created_at'>>).map((review) => ({
        ...review,
        client_id: null,
        session_id: null,
        booking_id: null,
        clientName: null,
      }));
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
