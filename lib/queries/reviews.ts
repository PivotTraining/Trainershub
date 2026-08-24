import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackEvent } from '../analytics';
import { supabase } from '../supabase';
import type { Review } from '../types';

export function useMyReviewForBooking(bookingId: string | undefined, clientId: string | undefined) {
  return useQuery({
    enabled: !!bookingId && !!clientId,
    queryKey: ['my_review', bookingId],
    queryFn: async (): Promise<Review | null> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bookingId!)
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
      booking_id: string;
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
      void trackEvent('review_submitted', {
        review_id: r.id,
        booking_id: r.booking_id,
        trainer_id: r.trainer_id,
        rating: r.rating,
      });
      qc.invalidateQueries({ queryKey: ['reviews', r.trainer_id] });
      qc.invalidateQueries({ queryKey: ['my_review', r.booking_id] });
    },
  });
}
