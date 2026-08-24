import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackEvent } from '../analytics';
import { supabase } from '../supabase';
import type { Booking, BookingStatus, BookingWithNames } from '../types';

function rowToBookingWithNames(row: any): BookingWithNames {
  const specialties: string[] | undefined = row.trainer?.trainer_profile?.specialties;
  return {
    ...row,
    trainerName: row.trainer_name ?? row.trainer?.full_name ?? null,
    clientName: row.client_name ?? row.client?.full_name ?? null,
    trainerSpecialty: row.trainer_specialty ?? (specialties && specialties.length > 0 ? specialties[0] : null),
  };
}

export function useMyBookingsAsClient(clientId: string | undefined) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['bookings', 'client', clientId],
    queryFn: async (): Promise<BookingWithNames[]> => {
      const { data, error } = await supabase.rpc('get_my_bookings', { p_actor: 'client' });
      if (error) throw new Error(error.message);
      return (data ?? []).map(rowToBookingWithNames);
    },
  });
}

export function useMyBookingsAsTrainer(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['bookings', 'trainer', trainerId],
    queryFn: async (): Promise<BookingWithNames[]> => {
      const { data, error } = await supabase.rpc('get_my_bookings', { p_actor: 'trainer' });
      if (error) throw new Error(error.message);
      return (data ?? []).map(rowToBookingWithNames);
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Booking, 'id' | 'status' | 'created_at' | 'payment_intent_id' | 'payment_status' | 'virtual_meeting_provider' | 'virtual_meeting_url' | 'virtual_meeting_external_id'>): Promise<Booking> => {
      void trackEvent('booking_started', {
        trainer_id: input.trainer_id,
        session_type: input.session_type,
        duration_min: input.duration_min,
        package_purchase_id: input.package_purchase_id,
      });
      const { data, error } = await supabase.from('bookings').insert({ ...input, status: 'pending' }).select('*').single();
      if (error) throw new Error(error.message);
      return data as Booking;
    },
    onSuccess: (b) => {
      void trackEvent('booking_requested', {
        booking_id: b.id,
        trainer_id: b.trainer_id,
        session_type: b.session_type,
        duration_min: b.duration_min,
      });
      qc.invalidateQueries({ queryKey: ['bookings', 'client', b.client_id] });
      import('../notifications').then(({ sendBookingCreatedNotification }) => {
        sendBookingCreatedNotification(b.id).catch(() => null);
      }).catch(() => null);
    },
  });
}

export const useBookings = useMyBookingsAsTrainer;

export function useUpdateBookingStatus(userId: string, actor: 'trainer' | 'client') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; status: BookingStatus }): Promise<Booking> => {
      let query = supabase.from('bookings').update({ status: args.status }).eq('id', args.id);
      query = actor === 'trainer' ? query.eq('trainer_id', userId) : query.eq('client_id', userId);
      const { data, error } = await query.select('*').single();
      if (error) throw new Error(error.message);
      return data as Booking;
    },
    onSuccess: (booking) => {
      if (actor === 'trainer' && booking.status === 'confirmed') {
        void trackEvent('booking_confirmed', {
          booking_id: booking.id,
          trainer_id: booking.trainer_id,
          client_id: booking.client_id,
          session_type: booking.session_type,
        });
      }
      qc.invalidateQueries({ queryKey: ['bookings', actor, userId] });
    },
  });
}
