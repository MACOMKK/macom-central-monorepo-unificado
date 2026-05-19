import React, { createContext, useState, useContext, useEffect } from 'react';
import { appClient } from '@/api/client';

const AuthContext = createContext();

const INTRANET_ACCESS_DENIED_CODES = new Set([
  'INTRANET_COLLABORATOR_NOT_FOUND',
  'INTRANET_COLLABORATOR_INACTIVE',
  'INTRANET_SYSTEM_ACCESS_NOT_GRANTED',
]);

const isInvalidSessionClaimError = (error) =>
  typeof error?.message === 'string' &&
  error.message.toLowerCase().includes('missing sub claim');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrapAuth = async () => {
      try {
        setIsLoadingAuth(true);
        const session = await appClient.auth.getSession();
        if (!active) return;

        if (!session?.access_token) {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError(null);
          setAuthChecked(true);
          setIsLoadingAuth(false);
          return;
        }

        await checkUserAuth({ silent: false });
      } catch (error) {
        if (!active) return;
        console.error('Failed to bootstrap Supabase session:', error);
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: 'auth_error',
          message: error.message || 'Failed to load authenticated session',
        });
        setAuthChecked(true);
        setIsLoadingAuth(false);
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = appClient.auth.onAuthStateChange((event, session) => {
      console.log('[intranet] auth state change', {
        event,
        hasAccessToken: Boolean(session?.access_token),
        timestamp: new Date().toISOString(),
      });

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        return;
      }

      if (!session?.access_token) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        return;
      }

      checkUserAuth({ silent: true });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const isIntranetAccessDenied = (error) => INTRANET_ACCESS_DENIED_CODES.has(error?.code);

  const clearIntranetSession = async () => {
    try {
      await appClient.auth.clearSession();
    } catch (clearError) {
      console.error('Failed to clear Supabase session after intranet access denial:', clearError);
    }
  };

  const checkUserAuth = async ({ silent = false } = {}) => {
    console.log('[intranet] checkUserAuth:start', {
      silent,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!silent) {
        setIsLoadingAuth(true);
      }
      setAuthError(null);
      const currentUser = await appClient.auth.me();
      console.log('[intranet] checkUserAuth:success', {
        userId: currentUser?.id || null,
        backendStatus: currentUser?.backend_status || null,
        backendReason: currentUser?.backend_reason || null,
        backendErrorDetail: currentUser?.backend_error_detail || null,
        silent,
        timestamp: new Date().toISOString(),
      });
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setAuthChecked(true);
      if (!silent) {
        setIsLoadingAuth(false);
      }
    } catch (error) {
      if (isIntranetAccessDenied(error)) {
        console.warn('Intranet access denied during auth check:', {
          code: error?.code || null,
          message: error?.message || 'Unknown intranet access denial',
        });
      } else {
        console.error('Supabase auth check failed:', error);
      }
      console.log('[intranet] checkUserAuth:error', {
        message: error?.message || 'Unknown auth error',
        code: error?.code || null,
        silent,
        timestamp: new Date().toISOString(),
      });
      if (isIntranetAccessDenied(error) || isInvalidSessionClaimError(error)) {
        await clearIntranetSession();
      }
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_error',
        message: error.message || 'Failed to load authenticated user',
      });
      setAuthChecked(true);
      if (!silent) {
        setIsLoadingAuth(false);
      }
    }
  };

  const signIn = async (credentials) => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const currentUser = await appClient.auth.signIn(credentials);
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setAuthChecked(true);
      return currentUser;
    } catch (error) {
      if (isIntranetAccessDenied(error) || isInvalidSessionClaimError(error)) {
        await clearIntranetSession();
      }
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setAuthError({
        type: 'auth_error',
        message: error.message || 'Failed to load authenticated user',
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    if (shouldRedirect) {
      appClient.auth.logout('/login');
    } else {
      appClient.auth.logout();
    }
  };

  const navigateToLogin = () => {
    appClient.auth.redirectToLogin(window.location.pathname + window.location.search);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      authChecked,
      logout,
      signIn,
      navigateToLogin,
      checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

