import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Profile, TrainerProfileFull } from '../types';

// Re-export TrainerProfileFull under the legacy name for backward compatibility
export type { TrainerProfileFull as TrainerProfile } from '../types';

// ── Profile ───────────────────────────────────────────────────────────────────

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; full_name: string }): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: args.full_name.trim() || null })
        .eq('id', args.id)
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
