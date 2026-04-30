/**
 * Journal — kept entirely on the user's device via AsyncStorage.
 *
 * Privacy: journal entries are personal and never leave the phone.  No row in
 * the Supabase database, no sync.  React Query is still used for cache so the
 * UI stays consistent.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { JournalEntry } from '../types';

const KEY = '@trainerhub:journal_entries';

async function readAll(): Promise<JournalEntry[]> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as JournalEntry[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeAll(list: JournalEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

function newId(): string {
  return `j_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useJournalEntries(clientId: string | undefined) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['journal', clientId],
    queryFn: async (): Promise<JournalEntry[]> => {
      const all = await readAll();
      return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
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
      const list = await readAll();
      const entry: JournalEntry = {
        id: newId(),
        client_id: clientId,
        session_id: input.session_id ?? null,
        mood: input.mood ?? null,
        body: input.body ?? null,
        created_at: new Date().toISOString(),
      };
      await writeAll([entry, ...list]);
      return entry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', clientId] }),
  });
}

export function useDeleteJournalEntry(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const list = await readAll();
      await writeAll(list.filter((e) => e.id !== id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', clientId] }),
  });
}
