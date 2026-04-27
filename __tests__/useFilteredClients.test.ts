import { act, renderHook } from '@testing-library/react-hooks';
import { useFilteredClients } from '@/lib/useFilteredClients';
import type { ClientWithProfile } from '@/lib/types';

const makeClient = (
  id: string,
  full_name: string | null,
  email: string,
  goals: string | null = null,
): ClientWithProfile => ({
  id,
  user_id: `user-${id}`,
  trainer_id: 'trainer-1',
  goals,
  notes: null,
  created_at: new Date().toISOString(),
  profile: { full_name, email },
});

const clients: ClientWithProfile[] = [
  makeClient('1', 'Alice Johnson', 'alice@example.com', 'Run a marathon'),
  makeClient('2', 'Bob Smith', 'bob@example.com', 'Lose weight'),
  makeClient('3', null, 'charlie@example.com', 'Build muscle'),
];

describe('useFilteredClients', () => {
  it('returns all clients when query is empty', () => {
    const { result } = renderHook(() => useFilteredClients(clients));
    expect(result.current.results).toHaveLength(3);
  });

  it('filters by name (case-insensitive)', () => {
    const { result } = renderHook(() => useFilteredClients(clients));
    act(() => result.current.setQuery('alice'));
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('1');
  });

  it('filters by email', () => {
    const { result } = renderHook(() => useFilteredClients(clients));
    act(() => result.current.setQuery('bob@'));
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('2');
  });

  it('filters by goals text', () => {
    const { result } = renderHook(() => useFilteredClients(clients));
    act(() => result.current.setQuery('muscle'));
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('3');
  });

  it('returns empty array when nothing matches', () => {
    const { result } = renderHook(() => useFilteredClients(clients));
    act(() => result.current.setQuery('zzznomatch'));
    expect(result.current.results).toHaveLength(0);
  });

  it('handles null full_name without throwing', () => {
    const { result } = renderHook(() => useFilteredClients(clients));
    act(() => result.current.setQuery('charlie'));
    expect(result.current.results).toHaveLength(1);
  });

  it('resets to all results when query is cleared', () => {
    const { result } = renderHook(() => useFilteredClients(clients));
    act(() => result.current.setQuery('alice'));
    act(() => result.current.setQuery(''));
    expect(result.current.results).toHaveLength(3);
  });

  it('trims whitespace from the query', () => {
    const { result } = renderHook(() => useFilteredClients(clients));
    act(() => result.current.setQuery('  alice  '));
    expect(result.current.results).toHaveLength(1);
  });
});
