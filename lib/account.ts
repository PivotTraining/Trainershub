import { supabase } from './supabase';

/**
 * Permanently delete the currently authenticated account.
 *
 * The server derives the user ID from the verified JWT. Never accept an ID
 * from the device for an account-deletion operation.
 */
export async function deleteCurrentAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error) {
    throw new Error(error.message || 'Account deletion failed');
  }

  // The Auth user no longer exists. Clear the persisted device session so the
  // auth listener routes away immediately instead of waiting for token expiry.
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) {
    console.warn('[account] local session cleanup failed:', signOutError.message);
  }
}
