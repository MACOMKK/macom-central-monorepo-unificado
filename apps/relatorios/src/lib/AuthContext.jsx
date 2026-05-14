import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { dataClient } from '@/api/dataClient';
import { hasSupabaseEnv, supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const inFlightValidationRef = useRef(null);
  const validatedTokenRef = useRef(null);
  const userRef = useRef(null);

  const clearAuthState = useCallback(() => {
    validatedTokenRef.current = null;
    userRef.current = null;
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const applyAuthSuccess = useCallback((nextUser, accessToken) => {
    validatedTokenRef.current = accessToken || null;
    userRef.current = nextUser;
    setUser(nextUser);
    setIsAuthenticated(true);
    setAuthError(null);
  }, []);

  const applyAuthError = useCallback((error) => {
    clearAuthState();

    if (error?.status === 401 || error?.status === 403) {
      setAuthError({
        type:
          error.code === 'user_inactive'
            ? 'user_inactive'
            : error.code === 'user_not_registered'
              ? 'user_not_registered'
              : 'auth_required',
        message: error.message || 'Authentication required',
      });
      return;
    }

    setAuthError({
      type: 'unknown',
      message: error?.message || 'Failed to authenticate',
    });
  }, [clearAuthState]);

  const finishAuthCheck = useCallback(() => {
    setIsLoadingPublicSettings(false);
    setIsLoadingAuth(false);
    setAuthChecked(true);
  }, []);

  const runUserValidation = useCallback(async (nextSession) => {
    if (!nextSession?.user) {
      clearAuthState();
      finishAuthCheck();
      return null;
    }

    const currentUser = await dataClient.auth.me();
    applyAuthSuccess(currentUser, nextSession.access_token || null);
    finishAuthCheck();
    return currentUser;
  }, [applyAuthSuccess, clearAuthState, finishAuthCheck]);

  const validateUserSession = useCallback(async (nextSession, options = {}) => {
    const accessToken = nextSession?.access_token || null;
    const { force = false } = options;

    if (!nextSession?.user) {
      return runUserValidation(nextSession);
    }

    if (!force && validatedTokenRef.current && validatedTokenRef.current === accessToken && userRef.current) {
      setUser(userRef.current);
      setIsAuthenticated(true);
      setAuthError(null);
      finishAuthCheck();
      return userRef.current;
    }

    if (!force && inFlightValidationRef.current?.token === accessToken) {
      return inFlightValidationRef.current.promise;
    }

    setIsLoadingPublicSettings(true);
    setIsLoadingAuth(true);
    setAuthError(null);

    const validationPromise = runUserValidation(nextSession)
      .catch((error) => {
        console.error('Auth check failed:', error);
        applyAuthError(error);
        finishAuthCheck();
        throw error;
      })
      .finally(() => {
        if (inFlightValidationRef.current?.token === accessToken) {
          inFlightValidationRef.current = null;
        }
      });

    inFlightValidationRef.current = {
      token: accessToken,
      promise: validationPromise,
    };

    return validationPromise;
  }, [applyAuthError, finishAuthCheck, runUserValidation]);

  const checkUserAuth = useCallback(async (options = {}) => {
    if (!hasSupabaseEnv) {
      setAuthError({
        type: 'config',
        message: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local da raiz do monorepo',
      });
      finishAuthCheck();
      return null;
    }

    const nextSession = options.session || (await supabase.auth.getSession()).data.session || null;
    return validateUserSession(nextSession, options);
  }, [finishAuthCheck, validateUserSession]);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      checkUserAuth().catch(() => null);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      try {
        await validateUserSession(data.session || null);
      } catch {
        return;
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !nextSession) {
        clearAuthState();
        finishAuthCheck();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          await validateUserSession(nextSession);
        } catch {
          return;
        }
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [checkUserAuth, clearAuthState, finishAuthCheck, validateUserSession]);

  const logout = async (shouldRedirect = true) => {
    clearAuthState();
    finishAuthCheck();
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
      checkUserAuth,
      checkAppState,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      logout,
      user,
    ]
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
