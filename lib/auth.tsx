import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { registerPushToken } from './notifications';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  retryProfile: () => void;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  profileError: null,
  retryProfile: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .catch((err) => {
        // Network failure or corrupted persisted session — log and proceed
        // unauthenticated so the sign-in screen renders instead of hanging.
        console.warn('[auth] getSession failed:', err);
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(!!next?.user);
      setSession(next);
      if (next?.user) {
        // Silent registration only — never prompt at sign-in. The prompt
        // is owned by NotificationsNudge / onboarding (explicit user
        // action). See registerPushToken docstring for the App Review
        // history behind this.
        registerPushToken(next.user.id).catch(() => null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError(null);
      return;
    }
    let active = true;
    setProfile(null);
    setProfileLoading(true);
    setProfileError(null);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.warn('[auth] profile fetch failed:', error.message);
          setProfileError(error.message);
          return;
        }
        if (data) {
          setProfile(data as Profile);
          return;
        }

        // No profile row yet (e.g. user created via dashboard before the
        // auth.users → profiles trigger existed). Create a minimal one.
        const { data: created, error: createErr } = await supabase
            .from('profiles')
            .upsert(
              { id: session.user.id, email: session.user.email ?? '', role: 'client' },
              { onConflict: 'id' },
            )
            .select('*')
            .maybeSingle();
        if (!active) return;
        if (createErr) {
          console.warn('[auth] profile bootstrap failed:', createErr.message);
          setProfileError(createErr.message);
        } else if (created) {
          setProfile(created as Profile);
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id, profileRefreshKey]);

  // Do not route an authenticated user to onboarding until their existing
  // profile lookup has completed. On a slow connection, treating `null` as a
  // missing profile caused a false onboarding screen and could overwrite role
  // data before the real profile arrived.
  const loading = sessionLoading || (!!session?.user && profileLoading);
  const retryProfile = () => setProfileRefreshKey((key) => key + 1);

  return (
    <AuthContext.Provider value={{ session, profile, loading, profileError, retryProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export async function signInWithOtp(
  email: string,
  options?: { role?: 'client' | 'trainer' },
): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: options?.role ? { data: { role: options.role } } : undefined,
  });
  if (error) throw new Error(error.message);
}

export async function verifyOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error(error.message);
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = Linking.createURL('reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function establishRecoverySession(url: string): Promise<void> {
  // Supabase may return PKCE `code` in the query or an implicit session in the
  // fragment depending on the project's Auth flow configuration.
  const [base, fragment = ''] = url.split('#', 2);
  const normalized = fragment
    ? `${base}${base.includes('?') ? '&' : '?'}${fragment}`
    : base;
  const params = new URL(normalized).searchParams;
  const authError = params.get('error_description') ?? params.get('error');
  if (authError) throw new Error(authError);

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(error.message);
    return;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    throw new Error('This password reset link is incomplete or has expired.');
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
