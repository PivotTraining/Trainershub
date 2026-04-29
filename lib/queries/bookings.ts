import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Booking, BookingStatus, BookingWithNames } from '../types';

const BOOKING_SELECT =
  '*, trainer:profiles!trainer_id(full_name), client:profiles!client_id(full_name)' as const;

function rowToBookingWithNames(row: any): BookingWithNames {
  return {
    ...row,
    trainerName: row.trainer?.full_name ?? null,
    clientName: row.client?.full_name ?? null,
  };
}

export function useMyBookingsAsClient(clientId: string | undefined) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['bookings', 'client', clientId],
    queryFn: async (): Promise<BookingWithNames[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('client_id', clientId!)
        .order('starts_at', { ascending: true });
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
      const { data, error } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('trainer_id', trainerId!)
        .order('starts_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map(rowToBookingWithNames);
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Booking, 'id' | 'status' | 'created_at'>): Promise<Booking> => {
      const { data, error } = await supabase
        .from('bookings')
        .insert({ ...input, status: 'pending' })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Booking;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['bookings', 'client', b.client_id] });
    },
  });
}

export function useUpdateBookingStatus(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; status: BookingStatus }): Promise<Booking> => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: args.status })
        .eq('id', args.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Booking;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', 'trainer', trainerId] }),
  });
}
