jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    auth: { signOut: jest.fn() },
  },
}));

import { deleteCurrentAccount } from '@/lib/account';
import { supabase } from '@/lib/supabase';

const invoke = supabase.functions.invoke as jest.Mock;
const signOut = supabase.auth.signOut as jest.Mock;

describe('deleteCurrentAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invoke.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
  });

  it('lets the server derive identity and clears the local session after deletion', async () => {
    await deleteCurrentAccount();

    expect(invoke).toHaveBeenCalledWith('delete-account', { body: {} });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('does not sign out or claim success when deletion fails', async () => {
    invoke.mockResolvedValueOnce({ error: { message: 'Service unavailable' } });

    await expect(deleteCurrentAccount()).rejects.toThrow('Service unavailable');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('does not turn a completed deletion into a failure when local cleanup fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    signOut.mockResolvedValueOnce({ error: { message: 'Session already removed' } });

    await expect(deleteCurrentAccount()).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
