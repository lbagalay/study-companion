import type { Session, User } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';

import { getSupabaseClient } from '@/lib/supabase/client';

type RegisterInput = { email: string; password: string; fullName: string; preferredName: string };
type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: RegisterInput) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const supabase = getSupabaseClient();
  const incomingUrl = Linking.useURL();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data.session); setLoading(false); }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !incomingUrl) return;
    const normalized = incomingUrl.replace('#', incomingUrl.includes('?') ? '&' : '?');
    const url = new URL(normalized); const code = url.searchParams.get('code'); const accessToken = url.searchParams.get('access_token'); const refreshToken = url.searchParams.get('refresh_token');
    if (code) void supabase.auth.exchangeCodeForSession(code);
    else if (accessToken && refreshToken) void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }, [incomingUrl, supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Connect Supabase in .env before signing in.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, [supabase]);

  const signUp = useCallback(async ({ email, password, fullName, preferredName }: RegisterInput) => {
    if (!supabase) throw new Error('Connect Supabase in .env before registering.');
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, preferred_name: preferredName } } });
    if (error) throw error;
    return Boolean(data.session);
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Connect Supabase in .env before resetting a password.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL('/reset-password') });
    if (error) throw error;
  }, [supabase]);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Connect Supabase in .env before resetting a password.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => ({
    configured: Boolean(supabase), loading, session, user: session?.user ?? null, signIn, signOut, signUp, sendPasswordReset, updatePassword,
  }), [loading, sendPasswordReset, session, signIn, signOut, signUp, supabase, updatePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
