import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { dataClient } from '@/api/dataClient';
import { hasSupabaseEnv, supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

const mapAuthError = (error) => {
  if (error?.status === 401 || error?.status === 403) {
    return {
      type:
        error.code === 'user_inactive'
          ? 'user_inactive'
          : error.code === 'user_not_registered'
            ? 'user_not_registered'
            : 'auth_required',
      message: error.message || 'Authentication required',
    };
  }

  return {
    type: 'unknown',
    message: error?.message || 'Failed to authenticate',
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const validatedTokenRef = useRef(null);
  const userRef = useRef(null);
  const inFlightValidationRef = useRef(null);

  function clearAuthState() {
    validatedTokenRef.current = null;
    userRef.current = null;
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthChecked(true);
  }

  async function runAuthValidation(nextSession) {
    if (!hasSupabaseEnv) {
      setAuthError({
        type: 'config',
        message: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local da raiz do monorepo',
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return null;
    }

    if (!nextSession?.user || !nextSession?.access_token) {
      clearAuthState();
      return null;
    }

    try {
      const currentUser = await dataClient.auth.me(nextSession);
      validatedTokenRef.current = nextSession.access_token;
      userRef.current = currentUser;
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return currentUser;
    } catch (error) {
      console.error('Auth check failed:', error);
      validatedTokenRef.current = null;
      userRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(mapAuthError(error));
      throw error;
    } finally {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }

  const checkUserAuth = async (sessionOverride = null, options = {}) => {
    const { force = false } = options;

    if (!hasSupabaseEnv) {
      await runAuthValidation(null);
      return null;
    }

    const sessionData = sessionOverride
      ? { data: { session: sessionOverride }, error: null }
      : await supabase.auth.getSession();
    const nextSession = sessionData?.data?.session || null;
    const nextToken = nextSession?.access_token || null;

    setIsLoadingPublicSettings(true);
    setIsLoadingAuth(true);

    if (!nextSession?.user || !nextToken) {
      clearAuthState();
      return null;
    }

    if (!force && validatedTokenRef.current === nextToken && userRef.current) {
      setUser(userRef.current);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return userRef.current;
    }

    if (!force && inFlightValidationRef.current?.token === nextToken) {
      return inFlightValidationRef.current.promise;
    }

    const validationPromise = runAuthValidation(nextSession).finally(() => {
      if (inFlightValidationRef.current?.token === nextToken) {
        inFlightValidationRef.current = null;
      }
    });

    inFlightValidationRef.current = {
      token: nextToken,
      promise: validationPromise,
    };

    return validationPromise;
  };

  useEffect(() => {
    let mounted = true;

    checkUserAuth().catch(() => null);

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !nextSession) {
        clearAuthState();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          await checkUserAuth(nextSession);
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

  const logout = async (shouldRedirect = true) => {
    clearAuthState();
    await dataClient.auth.logout(shouldRedirect ? '/entrar' : null);
  };

  const navigateToLogin = () => {
    dataClient.auth.redirectToLogin(window.location.href);
  };

  const checkAppState = checkUserAuth;

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }),
    [
      appPublicSettings,
      authChecked,
      authError,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
