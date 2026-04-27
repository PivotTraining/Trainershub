import { useMemo, useState } from 'react';
import type { ClientWithProfile } from './types';

interface FilteredClients {
  query: string;
  setQuery: (q: string) => void;
  results: ClientWithProfile[];
}

export function useFilteredClients(clients: ClientWithProfile[]): FilteredClients {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = (c.profile?.full_name ?? '').toLowerCase();
      const email = (c.profile?.email ?? '').toLowerCase();
      const goals = (c.goals ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || goals.includes(q);
    });
  }, [clients, query]);

  return { query, setQuery, results };
}
