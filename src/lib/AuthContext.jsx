import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { catalogApi } from '@/lib/catalogApi';
import { assertSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function validateAdminSession(nextSession) {
    if (!nextSession?.user) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const collaborator = await catalogApi.auth.me(nextSession.access_token);

      if (collaborator?.funcao !== 'admin' || collaborator?.status === 'inativo') {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        throw new Error('Acesso restrito a administradores.');
      }

      setSession(nextSession);
      setProfile(collaborator);
      setLoading(false);
    } catch (error) {
      await supabase.auth.signOut().catch(() => null);
      setSession(null);
      setProfile(null);
      setLoading(false);
      throw error;
    }
  }

  useEffect(() => {
    assertSupabaseConfigured();

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      try {
        await validateAdminSession(data.session || null);
      } catch {
        return;
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !nextSession) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          await validateAdminSession(nextSession);
        } catch {
          return;
        }
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      user: session?.user || null,
      isAuthenticated: Boolean(session?.user && profile?.funcao === 'admin'),
      loading,
      async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await validateAdminSession(data.session || null);
      },
      async logout() {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      },
    }),
    [loading, profile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
