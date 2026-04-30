import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Profile, TrainerProfileFull } from '../types';

// Re-export TrainerProfileFull under the legacy name for backward compatibility
export type { TrainerProfileFull as TrainerProfile } from '../types';

// ── Profile ───────────────────────────────────────────────────────────────────

interface ProfileUpdate {
  id: string;
  full_name?: string;
  date_of_birth?: string | null;
  phone?: string | null;
  location_city?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  streak_unit?: 'days' | 'weeks' | 'months';
  liability_accepted_at?: string | null;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: ProfileUpdate): Promise<Profile> => {
      const { id, ...rest } = args;
      const patch: Record<string, unknown> = {};
      if (rest.full_name !== undefined) patch.full_name = rest.full_name.trim() || null;
      if (rest.date_of_birth !== undefined) patch.date_of_birth = rest.date_of_birth;
      if (rest.phone !== undefined) patch.phone = rest.phone?.trim() || null;
      if (rest.location_city !== undefined) patch.location_city = rest.location_city;
      if (rest.location_lat !== undefined) patch.location_lat = rest.location_lat;
      if (rest.location_lng !== undefined) patch.location_lng = rest.location_lng;
      if (rest.streak_unit !== undefined) patch.streak_unit = rest.streak_unit;
      if (rest.liability_accepted_at !== undefined) patch.liability_accepted_at = rest.liability_accepted_at;

      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
    onSuccess: () => {
      // Auth context re-fetches profile on next render; also bust the clients list
      // so any display-name references refresh.
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// ── Trainer profile ───────────────────────────────────────────────────────────

export function useTrainerProfile(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['trainer_profile', userId],
    queryFn: async (): Promise<TrainerProfileFull | null> => {
      const { data, error } = await supabase
        .from('trainer_profiles')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as TrainerProfileFull | null) ?? null;
    },
  });
}

export function useUpsertTrainerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: Partial<TrainerProfileFull> & { user_id: string },
    ): Promise<TrainerProfileFull> => {
      const { data, error } = await supabase
        .from('trainer_profiles')
        .upsert(args, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as TrainerProfileFull;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['trainer_profile', updated.user_id], updated);
    },
  });
}
