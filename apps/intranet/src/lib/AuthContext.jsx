import React, { createContext, useState, useContext, useEffect } from 'react';
import { appClient } from '@/api/client';

const AuthContext = createContext();
const DEFAULT_INITIAL_PASSWORD = 'Kmacom.123';
const PASSWORD_CHANGE_REQUIRED_PREFIX = 'intranet:password-change-required:';
const TEMPORARY_EMAIL_PATTERN = /^[^@\s]+@cadastro\.macom\.(local|com\.br)$/i;
const TRUSTED_IP_ACCESS_STORAGE_KEY = 'intranet:trusted-ip-access';
const TRUSTED_IP_AUTO_SUPPRESSED_STORAGE_KEY = 'intranet:trusted-ip-auto-suppressed';
const INSTALL_PROMPT_DISMISSED_STORAGE_KEY = 'intranet:install-prompt-dismissed-until';

const INTRANET_ACCESS_DENIED_CODES = new Set([
  'INTRANET_COLLABORATOR_NOT_FOUND',
  'INTRANET_COLLABORATOR_INACTIVE',
  'INTRANET_SYSTEM_ACCESS_NOT_GRANTED',
]);

const isInvalidSessionClaimError = (error) =>
  typeof error?.message === 'string' &&
  error.message.toLowerCase().includes('missing sub claim');

const isUnauthenticatedSessionError = (error) => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return (
    error?.code === 'auth_required' ||
    error?.status === 401 ||
    message.includes('sessao expirada') ||
    message.includes('nao autenticado') ||
    message.includes('auth session missing')
  );
};

function getPasswordChangeStorageKey(user) {
  const userKey = user?.id || user?.collaborator_id || user?.email;
  return userKey ? `${PASSWORD_CHANGE_REQUIRED_PREFIX}${userKey}` : null;
}

function readPasswordChangeRequired(user) {
  const key = getPasswordChangeStorageKey(user);
  if (!key) return false;

  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writePasswordChangeRequired(user, required) {
  const key = getPasswordChangeStorageKey(user);
  if (!key) return;

  try {
    if (required) {
      window.localStorage.setItem(key, 'true');
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Local storage is only a client-side reminder for the active session.
  }
}

function isTemporaryCadastroEmail(value) {
  return typeof value === 'string' && TEMPORARY_EMAIL_PATTERN.test(value.trim());
}

function writeTrustedIpAccessEnabled(enabled) {
  try {
    if (enabled) {
      window.sessionStorage.setItem(TRUSTED_IP_ACCESS_STORAGE_KEY, 'true');
    } else {
      window.sessionStorage.removeItem(TRUSTED_IP_ACCESS_STORAGE_KEY);
      window.localStorage.removeItem(TRUSTED_IP_ACCESS_STORAGE_KEY);
    }
  } catch {
    // Best effort only; the backend still validates the trusted IP.
  }
}

function readTrustedIpAccessEnabled() {
  try {
    return window.sessionStorage.getItem(TRUSTED_IP_ACCESS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function readTrustedIpAutoSuppressed() {
  try {
    return window.sessionStorage.getItem(TRUSTED_IP_AUTO_SUPPRESSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeTrustedIpAutoSuppressed(suppressed) {
  try {
    if (suppressed) {
      window.sessionStorage.setItem(TRUSTED_IP_AUTO_SUPPRESSED_STORAGE_KEY, 'true');
    } else {
      window.sessionStorage.removeItem(TRUSTED_IP_AUTO_SUPPRESSED_STORAGE_KEY);
    }
  } catch {
    // Session storage only avoids immediate re-entry after a manual logout.
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [mustChangeEmail, setMustChangeEmail] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrapAuth = async () => {
      try {
        setIsLoadingAuth(true);
        const session = await appClient.auth.getSession();
        if (!active) return;

        if (!session?.access_token) {
          if (readTrustedIpAutoSuppressed() || !readTrustedIpAccessEnabled()) {
            writeTrustedIpAccessEnabled(false);
            setUser(null);
            setMustChangePassword(false);
            setMustChangeEmail(false);
            setIsAuthenticated(false);
            setAuthError(null);
            setAuthChecked(true);
            setIsLoadingAuth(false);
            return;
          }

          try {
            const trustedIpUser = await appClient.auth.trustedIpAccess();
            if (!active) return;
            writeTrustedIpAccessEnabled(Boolean(trustedIpUser));
            setUser(trustedIpUser);
            setMustChangePassword(false);
            setMustChangeEmail(false);
            setIsAuthenticated(Boolean(trustedIpUser));
            setAuthError(null);
            setAuthChecked(true);
            setIsLoadingAuth(false);
          } catch {
            if (!active) return;
            writeTrustedIpAccessEnabled(false);
            setUser(null);
            setIsAuthenticated(false);
            setAuthError(null);
            setAuthChecked(true);
            setIsLoadingAuth(false);
          }
          return;
        }

        await checkUserAuth({ silent: false });
      } catch (error) {
        if (!active) return;
        console.error('Failed to bootstrap Supabase session:', error);
        setUser(null);
        setIsAuthenticated(false);
        setMustChangeEmail(false);
        setAuthError({
          source: 'bootstrap',
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
      if (event === 'INITIAL_SESSION') {
        // bootstrapAuth() above already resolves the initial session; acting on
        // this event too would fire a second, redundant 'me' call (and a
        // duplicate access-log entry) on every page load.
        return;
      }

      if (event === 'SIGNED_OUT') {
        window.localStorage.removeItem(INSTALL_PROMPT_DISMISSED_STORAGE_KEY);
        setUser(null);
        setMustChangePassword(false);
        setMustChangeEmail(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        return;
      }

      if (!session?.access_token) {
        setUser(null);
        setMustChangePassword(false);
        setMustChangeEmail(false);
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
    writeTrustedIpAccessEnabled(false);
    try {
      await appClient.auth.clearSession();
    } catch (clearError) {
      console.error('Failed to clear Supabase session after intranet access denial:', clearError);
    }
  };

  const checkUserAuth = async ({ silent = false, forceTrustedIpAccess = false } = {}) => {
    try {
      if (!silent) {
        setIsLoadingAuth(true);
      }
      setAuthError(null);
      const currentUser = await appClient.auth.me();
      writeTrustedIpAccessEnabled(currentUser?.auth_mode === 'trusted_ip');
      setUser(currentUser);
      setMustChangePassword(readPasswordChangeRequired(currentUser));
      setMustChangeEmail(isTemporaryCadastroEmail(currentUser?.email));
      setIsAuthenticated(Boolean(currentUser));
      setAuthChecked(true);
      if (!silent) {
        setIsLoadingAuth(false);
      }
      return currentUser;
    } catch (error) {
      if (isUnauthenticatedSessionError(error) && forceTrustedIpAccess) {
        try {
          const trustedIpUser = await appClient.auth.trustedIpAccess();
          writeTrustedIpAutoSuppressed(false);
          writeTrustedIpAccessEnabled(Boolean(trustedIpUser));
          setUser(trustedIpUser);
          setMustChangePassword(false);
          setMustChangeEmail(false);
          setIsAuthenticated(Boolean(trustedIpUser));
          setAuthError(null);
          setAuthChecked(true);
          if (!silent) {
            setIsLoadingAuth(false);
          }
          return trustedIpUser;
        } catch {
          writeTrustedIpAccessEnabled(false);
        }
      }

      if (isIntranetAccessDenied(error)) {
        console.warn('Intranet access denied during auth check:', {
          code: error?.code || null,
          message: error?.message || 'Unknown intranet access denial',
        });
      } else {
        console.error('Supabase auth check failed:', error);
      }
      if (isIntranetAccessDenied(error) || isInvalidSessionClaimError(error) || isUnauthenticatedSessionError(error)) {
        await clearIntranetSession();
      }
      writeTrustedIpAccessEnabled(false);
      setUser(null);
      setMustChangePassword(false);
      setMustChangeEmail(false);
      setIsAuthenticated(false);
      setAuthError(
        isUnauthenticatedSessionError(error)
          ? null
          : {
              source: 'session_check',
              type: 'auth_error',
              message: error.message || 'Failed to load authenticated user',
            }
      );
      setAuthChecked(true);
      if (!silent) {
        setIsLoadingAuth(false);
      }
      return null;
    }
  };

  const signIn = async (credentials) => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const currentUser = await appClient.auth.signIn(credentials);
      writeTrustedIpAutoSuppressed(false);
      writeTrustedIpAccessEnabled(false);
      const shouldRequirePasswordChange = credentials?.password === DEFAULT_INITIAL_PASSWORD;
      writePasswordChangeRequired(currentUser, shouldRequirePasswordChange);
      setUser(currentUser);
      setMustChangePassword(shouldRequirePasswordChange);
      setMustChangeEmail(isTemporaryCadastroEmail(currentUser?.email));
      setIsAuthenticated(Boolean(currentUser));
      setAuthChecked(true);
      return currentUser;
    } catch (error) {
      if (isIntranetAccessDenied(error) || isInvalidSessionClaimError(error)) {
        await clearIntranetSession();
      }
      setUser(null);
      setMustChangePassword(false);
      setMustChangeEmail(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setAuthError({
        source: 'sign_in',
        type: 'auth_error',
        message: error.message || 'Failed to load authenticated user',
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    writeTrustedIpAutoSuppressed(true);
    writeTrustedIpAccessEnabled(false);
    if (shouldRedirect) {
      appClient.auth.logout('/login');
    } else {
      appClient.auth.logout();
    }
  };

  const changePassword = async (newPassword) => {
    await appClient.auth.updatePassword(newPassword);
    writePasswordChangeRequired(user, false);
    setMustChangePassword(false);
    await checkUserAuth({ silent: true });
  };

  const changeTemporaryEmail = async (email) => {
    const updatedUser = await appClient.entities.Profile.update(user?.collaborator_id || user?.id, { email });
    const refreshedUser = await checkUserAuth({ silent: true });
    setMustChangeEmail(isTemporaryCadastroEmail(refreshedUser?.email));
    return updatedUser;
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
      changePassword,
      navigateToLogin,
      checkUserAuth,
      defaultInitialPassword: DEFAULT_INITIAL_PASSWORD,
      mustChangePassword,
      mustChangeEmail,
      changeTemporaryEmail,
      isTemporaryCadastroEmail,
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

