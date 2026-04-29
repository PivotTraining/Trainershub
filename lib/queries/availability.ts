import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { AvailabilitySlot, DayOfWeek } from '../types';

export function useAvailabilitySlots(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['availability', trainerId],
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('trainer_id', trainerId!)
        .order('day_of_week')
        .order('start_time');
      if (error) throw new Error(error.message);
      return (data ?? []) as AvailabilitySlot[];
    },
  });
}

export function useCreateSlot(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      day_of_week: DayOfWeek;
      start_time: string;
      end_time: string;
    }): Promise<AvailabilitySlot> => {
      const { data, error } = await supabase
        .from('availability_slots')
        .insert({ trainer_id: trainerId, ...input })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as AvailabilitySlot;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', trainerId] }),
  });
}

export function useDeleteSlot(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('availability_slots').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', trainerId] }),
  });
}
