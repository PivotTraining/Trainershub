/**
 * Unit tests for the three delete mutations:
 *   useDeleteClient  (lib/queries/clients.ts)
 *   useDeleteProgram (lib/queries/programs.ts)
 *   useDeleteSession (lib/queries/sessions.ts)
 *
 * Each test drives the mutationFn / onSuccess directly — no React provider
 * required — by relying on the useMutation mock that returns its options object.
 */

// ── Supabase mock ─────────────────────────────────────────────────────────────
// Spy references are set on the mock object itself so tests can access them
// after hoisting resolves.

jest.mock('@/lib/supabase', () => {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const del = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ delete: del });
  return {
    supabase: { from },
    // Expose spies for assertions
    __spies: { from, delete: del, eq },
  };
});

// ── Notification mock ─────────────────────────────────────────────────────────
jest.mock('@/lib/notifications', () => ({
  cancelSessionReminder: jest.fn().mockResolvedValue(undefined),
  scheduleSessionReminder: jest.fn().mockResolvedValue(undefined),
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
}));

// ── TanStack Query mock ───────────────────────────────────────────────────────
jest.mock('@tanstack/react-query', () => {
  const removeQueries = jest.fn();
  const invalidateQueries = jest.fn().mockResolvedValue(undefined);
  const qc = { removeQueries, invalidateQueries };
  return {
    useQueryClient: () => qc,
    useMutation: (opts: unknown) => opts,
    useQuery: jest.fn(),
    __qc: qc,
  };
});

// ── Imports (after mocks are registered) ─────────────────────────────────────
import * as SupabaseMod from '@/lib/supabase';
import * as ReactQuery from '@tanstack/react-query';
import { cancelSessionReminder } from '@/lib/notifications';
import { useDeleteClient } from '@/lib/queries/clients';
import { useDeleteProgram } from '@/lib/queries/programs';
import { useDeleteSession } from '@/lib/queries/sessions';

// ── Typed spy accessors ───────────────────────────────────────────────────────
const spies = (SupabaseMod as unknown as { __spies: { from: jest.Mock; delete: jest.Mock; eq: jest.Mock } }).__spies;
const qc = (ReactQuery as unknown as { __qc: { removeQueries: jest.Mock; invalidateQueries: jest.Mock } }).__qc;

// ── Helpers ───────────────────────────────────────────────────────────────────
type MutationOpts<T> = {
  mutationFn: (arg: T) => Promise<void>;
  onSuccess?: (v: void, arg: T) => void;
};

function asMut<T>(hook: unknown): MutationOpts<T> {
  return hook as MutationOpts<T>;
}

// ── useDeleteClient ───────────────────────────────────────────────────────────
describe('useDeleteClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spies.eq.mockResolvedValue({ error: null });
  });

  it('deletes from "clients" table by id', async () => {
    await asMut<string>(useDeleteClient('trainer-1')).mutationFn('client-abc');
    expect(spies.from).toHaveBeenCalledWith('clients');
    expect(spies.eq).toHaveBeenCalledWith('id', 'client-abc');
  });

  it('throws when supabase returns an error', async () => {
    spies.eq.mockResolvedValueOnce({ error: { message: 'row not found' } });
    await expect(
      asMut<string>(useDeleteClient('trainer-1')).mutationFn('bad-id'),
    ).rejects.toThrow('row not found');
  });

  it('onSuccess: removes client query and invalidates list', () => {
    asMut<string>(useDeleteClient('trainer-1')).onSuccess?.(undefined, 'client-abc');
    expect(qc.removeQueries).toHaveBeenCalledWith({ queryKey: ['client', 'client-abc'] });
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['clients', 'trainer-1'] });
  });
});

// ── useDeleteProgram ──────────────────────────────────────────────────────────
describe('useDeleteProgram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spies.eq.mockResolvedValue({ error: null });
  });

  it('deletes from "programs" table by id', async () => {
    await asMut<string>(useDeleteProgram()).mutationFn('prog-xyz');
    expect(spies.from).toHaveBeenCalledWith('programs');
    expect(spies.eq).toHaveBeenCalledWith('id', 'prog-xyz');
  });

  it('throws when supabase returns an error', async () => {
    spies.eq.mockResolvedValueOnce({ error: { message: 'delete denied' } });
    await expect(
      asMut<string>(useDeleteProgram()).mutationFn('prog-xyz'),
    ).rejects.toThrow('delete denied');
  });

  it('onSuccess: removes program + assignment queries, invalidates list', () => {
    asMut<string>(useDeleteProgram()).onSuccess?.(undefined, 'prog-xyz');
    expect(qc.removeQueries).toHaveBeenCalledWith({ queryKey: ['program', 'prog-xyz'] });
    expect(qc.removeQueries).toHaveBeenCalledWith({
      queryKey: ['program_assignments', 'program', 'prog-xyz'],
    });
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['programs'] });
  });
});

// ── useDeleteSession ──────────────────────────────────────────────────────────
describe('useDeleteSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spies.eq.mockResolvedValue({ error: null });
  });

  it('deletes from "sessions" table by id', async () => {
    await asMut<string>(useDeleteSession()).mutationFn('sess-1');
    expect(spies.from).toHaveBeenCalledWith('sessions');
    expect(spies.eq).toHaveBeenCalledWith('id', 'sess-1');
  });

  it('throws when supabase returns an error', async () => {
    spies.eq.mockResolvedValueOnce({ error: { message: 'not found' } });
    await expect(
      asMut<string>(useDeleteSession()).mutationFn('sess-1'),
    ).rejects.toThrow('not found');
  });

  it('onSuccess: cancels reminder, removes session query, invalidates list', () => {
    asMut<string>(useDeleteSession()).onSuccess?.(undefined, 'sess-1');
    expect(cancelSessionReminder).toHaveBeenCalledWith('sess-1');
    expect(qc.removeQueries).toHaveBeenCalledWith({ queryKey: ['session', 'sess-1'] });
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessions'] });
  });
});
