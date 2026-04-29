import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { JournalEntry } from '../types';

export function useJournalEntries(clientId: string | undefined) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['journal', clientId],
    queryFn: async (): Promise<JournalEntry[]> => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as JournalEntry[];
    },
  });
}

export function useCreateJournalEntry(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      session_id?: string | null;
      mood?: number | null;
      body?: string | null;
    }): Promise<JournalEntry> => {
      const { data, error } = await supabase
        .from('journal_entries')
        .insert({ client_id: clientId, ...input })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as JournalEntry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', clientId] }),
  });
}

export function useDeleteJournalEntry(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', clientId] }),
  });
}
