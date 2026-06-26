import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { assertSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';

const AuthContext = createContext(null);

export const DEFAULT_SYSTEM_SLUG = 'central';
export const DEFAULT_ACCESS_ROLES = ['admin', 'gestor'];
export const PERMISSION_LEVELS = {
  none: 'sem',
  view: 'ver',
  manage: 'gerenciar',
};

function canAccessSystem(profile, accessRoles = DEFAULT_ACCESS_ROLES) {
  return accessRoles.includes(profile?.funcao) && profile?.status !== 'inativo';
}

function hasPermission(profile, permissions = [], moduleKey, requiredLevel = PERMISSION_LEVELS.view) {
  if (profile?.funcao === 'admin' && profile?.status !== 'inativo') {
    return true;
  }

  const permission = permissions.find((item) => item.modulo === moduleKey);
  const level = permission?.nivel_acesso || PERMISSION_LEVELS.none;

  if (requiredLevel === PERMISSION_LEVELS.view) {
    return level === PERMISSION_LEVELS.view || level === PERMISSION_LEVELS.manage;
  }

  return level === PERMISSION_LEVELS.manage;
}

function toAuthApiError(message, status = 500, code) {
  const error = new Error(message || 'Falha ao consultar autenticacao.');
  error.status = status;
  if (code) error.code = code;
  return error;
}

async function getAuthProfile(accessToken, systemSlug) {
  assertSupabaseConfigured();

  if (!accessToken) {
    throw toAuthApiError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/central-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'me',
      entity: 'colaboradores',
      system_slug: systemSlug,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw toAuthApiError(
      result?.error || 'Falha ao consultar autenticacao.',
      response.status,
      result?.code || (response.status === 401 ? 'auth_required' : undefined),
    );
  }

  return {
    row: result.row || null,
    access: result.access || null,
    permissions: result.permissions || [],
  };
}

export function AuthProvider({
  children,
  systemSlug = DEFAULT_SYSTEM_SLUG,
  accessRoles = DEFAULT_ACCESS_ROLES,
  accessDeniedMessage = 'Acesso restrito a administradores e gestores.',
}) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const inFlightValidationRef = useRef(null);
  const validatedTokenRef = useRef(null);
  const profileRef = useRef(null);
  const permissionsRef = useRef([]);

  function clearAuthState() {
    validatedTokenRef.current = null;
    profileRef.current = null;
    permissionsRef.current = [];
    setSession(null);
    setProfile(null);
    setPermissions([]);
    setLoading(false);
  }

  function scheduleSignOut() {
    window.setTimeout(() => {
      supabase.auth.signOut().catch(() => null);
    }, 0);
  }

  async function runAccessValidation(nextSession) {
    if (!nextSession?.user) {
      clearAuthState();
      return;
    }

    try {
      const authPayload = await getAuthProfile(nextSession.access_token, systemSlug);
      const collaborator = authPayload?.row || null;
      const nextPermissions = Array.isArray(authPayload?.permissions) ? authPayload.permissions : [];

      if (!canAccessSystem(collaborator, accessRoles)) {
        clearAuthState();
        scheduleSignOut();
        throw new Error(accessDeniedMessage);
      }

      validatedTokenRef.current = nextSession.access_token;
      profileRef.current = collaborator;
      permissionsRef.current = nextPermissions;
      setSession(nextSession);
      setProfile(collaborator);
      setPermissions(nextPermissions);
      setLoading(false);
    } catch (error) {
      clearAuthState();
      scheduleSignOut();
      throw error;
    }
  }

  async function validateSession(nextSession, options = {}) {
    const accessToken = nextSession?.access_token || null;
    const { force = false } = options;

    if (!nextSession?.user) {
      return runAccessValidation(nextSession);
    }

    if (!force && validatedTokenRef.current && validatedTokenRef.current === accessToken && profileRef.current) {
      setSession(nextSession);
      setProfile(profileRef.current);
      setPermissions(permissionsRef.current);
      setLoading(false);
      return;
    }

    if (!force && inFlightValidationRef.current?.token === accessToken) {
      return inFlightValidationRef.current.promise;
    }

    const validationPromise = runAccessValidation(nextSession).finally(() => {
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
        await validateSession(data.session || null);
      } catch {
        clearAuthState();
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
          await validateSession(nextSession);
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
      isAuthenticated: Boolean(session?.user && canAccessSystem(profile, accessRoles)),
      loading,
      systemSlug,
      async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await validateSession(data.session || null, { force: true });
      },
      async logout() {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setPermissions([]);
      },
      permissions,
      canAccessModule(moduleKey, requiredLevel = PERMISSION_LEVELS.view) {
        return hasPermission(profile, permissions, moduleKey, requiredLevel);
      },
      centralPermissions: permissions,
      canCentral(moduleKey, requiredLevel = PERMISSION_LEVELS.view) {
        return hasPermission(profile, permissions, moduleKey, requiredLevel);
      },
    }),
    [accessRoles, loading, permissions, profile, session, systemSlug]
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
