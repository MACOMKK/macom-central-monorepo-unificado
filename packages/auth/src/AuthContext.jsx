import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { assertSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';

const AuthContext = createContext(null);
const CENTRAL_ACCESS_ROLES = new Set(['admin', 'gestor']);
const CENTRAL_PERMISSION_LEVELS = {
  none: 'sem',
  view: 'ver',
  manage: 'gerenciar',
};

function canAccessCentral(profile) {
  return CENTRAL_ACCESS_ROLES.has(profile?.funcao) && profile?.status !== 'inativo';
}

function hasCentralPermission(profile, permissions = [], moduleKey, requiredLevel = CENTRAL_PERMISSION_LEVELS.view) {
  if (profile?.funcao === 'admin' && profile?.status !== 'inativo') {
    return true;
  }

  const permission = permissions.find((item) => item.modulo === moduleKey);
  const level = permission?.nivel_acesso || CENTRAL_PERMISSION_LEVELS.none;

  if (requiredLevel === CENTRAL_PERMISSION_LEVELS.view) {
    return level === CENTRAL_PERMISSION_LEVELS.view || level === CENTRAL_PERMISSION_LEVELS.manage;
  }

  return level === CENTRAL_PERMISSION_LEVELS.manage;
}

function toCentralApiError(message, status = 500, code) {
  const error = new Error(message || 'Falha ao consultar a Central.');
  error.status = status;
  if (code) error.code = code;
  return error;
}

async function getCentralAuthProfile(accessToken) {
  assertSupabaseConfigured();

  if (!accessToken) {
    throw toCentralApiError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
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
      system_slug: 'central',
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw toCentralApiError(
      result?.error || 'Falha ao consultar a Central.',
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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [centralPermissions, setCentralPermissions] = useState([]);
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
    setCentralPermissions([]);
    setLoading(false);
  }

  async function runCentralAccessValidation(nextSession) {
    if (!nextSession?.user) {
      clearAuthState();
      return;
    }

    try {
      const authPayload = await getCentralAuthProfile(nextSession.access_token);
      const collaborator = authPayload?.row || null;
      const permissions = Array.isArray(authPayload?.permissions) ? authPayload.permissions : [];

      if (!canAccessCentral(collaborator)) {
        await supabase.auth.signOut();
        clearAuthState();
        throw new Error('Acesso restrito a administradores e gestores.');
      }

      validatedTokenRef.current = nextSession.access_token;
      profileRef.current = collaborator;
      permissionsRef.current = permissions;
      setSession(nextSession);
      setProfile(collaborator);
      setCentralPermissions(permissions);
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
      return runCentralAccessValidation(nextSession);
    }

    if (!force && validatedTokenRef.current && validatedTokenRef.current === accessToken && profileRef.current) {
      setSession(nextSession);
      setProfile(profileRef.current);
      setCentralPermissions(permissionsRef.current);
      setLoading(false);
      return;
    }

    if (!force && inFlightValidationRef.current?.token === accessToken) {
      return inFlightValidationRef.current.promise;
    }

    const validationPromise = runCentralAccessValidation(nextSession).finally(() => {
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
      isAuthenticated: Boolean(session?.user && canAccessCentral(profile)),
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
        setCentralPermissions([]);
      },
      centralPermissions,
      canCentral(moduleKey, requiredLevel = CENTRAL_PERMISSION_LEVELS.view) {
        return hasCentralPermission(profile, centralPermissions, moduleKey, requiredLevel);
      },
    }),
    [centralPermissions, loading, profile, session]
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
