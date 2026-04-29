import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Review } from '../types';

export function useMyReviewForSession(sessionId: string | undefined, clientId: string | undefined) {
  return useQuery({
    enabled: !!sessionId && !!clientId,
    queryKey: ['my_review', sessionId],
    queryFn: async (): Promise<Review | null> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('session_id', sessionId!)
        .eq('client_id', clientId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Review | null) ?? null;
    },
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      trainer_id: string;
      client_id: string;
      session_id: string;
      rating: number;
      body?: string | null;
    }): Promise<Review> => {
      const { data, error } = await supabase
        .from('reviews')
        .insert(input)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Review;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['reviews', r.trainer_id] });
      qc.invalidateQueries({ queryKey: ['my_review', r.session_id] });
    },
  });
}
