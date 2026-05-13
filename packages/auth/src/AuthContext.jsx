import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { catalogApi } from '@macom/api-client/catalogApi';
import { assertSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const inFlightValidationRef = useRef(null);
  const validatedTokenRef = useRef(null);
  const profileRef = useRef(null);

  function clearAuthState() {
    validatedTokenRef.current = null;
    profileRef.current = null;
    setSession(null);
    setProfile(null);
    setLoading(false);
  }

  async function runAdminValidation(nextSession) {
    if (!nextSession?.user) {
      clearAuthState();
      return;
    }

    try {
      const collaborator = await catalogApi.auth.me(nextSession.access_token);

      if (collaborator?.funcao !== 'admin' || collaborator?.status === 'inativo') {
        await supabase.auth.signOut();
        clearAuthState();
        throw new Error('Acesso restrito a administradores.');
      }

      validatedTokenRef.current = nextSession.access_token;
      profileRef.current = collaborator;
      setSession(nextSession);
      setProfile(collaborator);
      setLoading(false);
    } catch (error) {
      await supabase.auth.signOut().catch(() => null);
      clearAuthState();
      throw error;
    }
  }

  async function validateAdminSession(nextSession, options = {}) {
    const accessToken = nextSession?.access_token || null;
    const { force = false } = options;

    if (!nextSession?.user) {
      return runAdminValidation(nextSession);
    }

    if (!force && validatedTokenRef.current && validatedTokenRef.current === accessToken && profileRef.current) {
      setSession(nextSession);
      setProfile(profileRef.current);
      setLoading(false);
      return;
    }

    if (!force && inFlightValidationRef.current?.token === accessToken) {
      return inFlightValidationRef.current.promise;
    }

    const validationPromise = runAdminValidation(nextSession).finally(() => {
      if (inFlightValidationRef.current?.token === accessToken) {
        inFlightValidationRef.current = null;
      }
    });

    inFlightValidationRef.current = {
      token: accessToken,
      promise: validationPromise,
    };

    return validationPromise;
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
        clearAuthState();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
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
        await validateAdminSession(data.session || null, { force: true });
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
