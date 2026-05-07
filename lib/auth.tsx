import { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { registerPushToken } from './notifications';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
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
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn('[auth] profile fetch failed:', error.message);
          return;
        }
        if (data) {
          setProfile(data as Profile);
        } else {
          // No profile row yet (e.g. user created via dashboard before
          // the auth.users → profiles trigger existed). Create a minimal one.
          supabase
            .from('profiles')
            .upsert(
              { id: session.user.id, email: session.user.email ?? '', role: 'client' },
              { onConflict: 'id' },
            )
            .select('*')
            .maybeSingle()
            .then(({ data: created, error: createErr }) => {
              if (!active) return;
              if (createErr) {
                console.warn('[auth] profile bootstrap failed:', createErr.message);
              } else if (created) {
                setProfile(created as Profile);
              }
            });
        }
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export async function signInWithOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
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

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
