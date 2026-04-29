import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Favorite, TrainerListing } from '../types';

export function useMyFavorites(clientId: string | undefined) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['favorites', clientId],
    queryFn: async (): Promise<(Favorite & { trainer: TrainerListing | null })[]> => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, trainer_profiles!trainer_id(*, profiles!user_id(full_name, email))')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        ...row,
        trainer: row.trainer_profiles
          ? {
              ...row.trainer_profiles,
              full_name: row.trainer_profiles.profiles?.full_name ?? null,
              email: row.trainer_profiles.profiles?.email ?? '',
            }
          : null,
      }));
    },
  });
}

export function useIsFavorite(clientId: string | undefined, trainerId: string | undefined) {
  return useQuery({
    enabled: !!clientId && !!trainerId,
    queryKey: ['is_favorite', clientId, trainerId],
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('client_id', clientId!)
        .eq('trainer_id', trainerId!)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useToggleFavorite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      trainerId,
      isFav,
    }: {
      trainerId: string;
      isFav: boolean;
    }): Promise<void> => {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('client_id', clientId)
          .eq('trainer_id', trainerId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ client_id: clientId, trainer_id: trainerId });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_v, { trainerId }) => {
      qc.invalidateQueries({ queryKey: ['favorites', clientId] });
      qc.invalidateQueries({ queryKey: ['is_favorite', clientId, trainerId] });
    },
  });
}
