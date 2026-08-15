jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'trainerhub://reset-password'),
}));

jest.mock('@/lib/notifications', () => ({
  registerPushToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

import {
  establishRecoverySession,
  requestPasswordReset,
  updatePassword,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const auth = supabase.auth as unknown as {
  resetPasswordForEmail: jest.Mock;
  exchangeCodeForSession: jest.Mock;
  setSession: jest.Mock;
  updateUser: jest.Mock;
};

describe('password recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    auth.setSession.mockResolvedValue({ error: null });
    auth.updateUser.mockResolvedValue({ error: null });
  });

  it('requests a reset link back to the native app', async () => {
    await requestPasswordReset('person@example.com');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {
      redirectTo: 'trainerhub://reset-password',
    });
  });

  it('exchanges a PKCE recovery code', async () => {
    await establishRecoverySession('trainerhub://reset-password?code=secure-code');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('secure-code');
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it('accepts implicit tokens returned in a URL fragment', async () => {
    await establishRecoverySession(
      'trainerhub://reset-password?type=recovery#access_token=access&refresh_token=refresh',
    );
    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('rejects incomplete links and updates a recovered password', async () => {
    await expect(establishRecoverySession('trainerhub://reset-password')).rejects.toThrow(
      'incomplete or has expired',
    );
    await updatePassword('correct-horse-battery-staple');
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: 'correct-horse-battery-staple',
    });
  });
});
