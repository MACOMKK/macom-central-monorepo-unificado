import { supabase } from '@/api/supabaseClient';

const SORT_KEY_MAP = {
  created_date: 'created_at'
};

const toError = (error, fallbackMessage) => {
  if (!error) return null;
  const err = new Error(error.message || fallbackMessage);
  err.status = error.status || 500;
  err.details = error;
  return err;
};

const toFunctionError = async (error, fallbackMessage) => {
  if (!error) return null;

  let message = error.message || fallbackMessage;
  let status = error.status || 500;
  let details = error;

  if (error.context) {
    status = error.context.status || status;
    try {
      const payload = await error.context.json();
      message = payload?.error || payload?.message || message;
      details = payload || details;
    } catch {
      try {
        const text = await error.context.text();
        if (text) message = text;
      } catch {
        // Keep the original error when the function response body cannot be parsed.
      }
    }
  }

  const err = new Error(message || fallbackMessage);
  err.status = status;
  err.details = details;
  return err;
};

const parseSort = (sort) => {
  if (!sort) return null;
  const desc = sort.startsWith('-');
  const rawKey = desc ? sort.slice(1) : sort;
  const key = SORT_KEY_MAP[rawKey] || rawKey;
  return { key, ascending: !desc };
};

const maybeSingle = async (query) => {
  const { data, error } = await query;
  if (error) {
    throw toError(error, 'Query failed');
  }
  return data;
};

const queryByFilters = (table, filters = {}) => {
  let query = supabase.from(table).select('*');
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  return query;
};

const normalizeProfile = (user, profile) => ({
  id: user.id,
  email: user.email || profile?.email || '',
  full_name:
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    '',
  role: profile?.role || 'user',
  active: profile?.active !== false,
  unit_id: profile?.unit_id || null,
  unit_name: profile?.unit_name || ''
});

const ensureProfile = async (user) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw toError(error, 'Unable to load user profile');
  }

  if (data) return data;

  const payload = {
    id: user.id,
    email: user.email || '',
    full_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Usuario',
    role: 'user',
    active: true,
    unit_id: null,
    unit_name: null
  };

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert(payload)
    .select('*')
    .single();

  if (insertError) {
    throw toError(insertError, 'Unable to create user profile');
  }

  return inserted;
};

const createEntity = (table) => ({
  list: async (sort) => {
    let query = supabase.from(table).select('*');
    const parsed = parseSort(sort);
    if (parsed) {
      query = query.order(parsed.key, { ascending: parsed.ascending });
    }
    return maybeSingle(query);
  },
  filter: async (filters) => {
    return maybeSingle(queryByFilters(table, filters));
  },
  create: async (payload) => {
    const { data, error } = await supabase
      .from(table)
      .insert(payload)
      .select('*')
      .single();
    if (error) throw toError(error, `Unable to create row in ${table}`);
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw toError(error, `Unable to update row in ${table}`);
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw toError(error, `Unable to delete row from ${table}`);
    return { id };
  },
  bulkCreate: async (rows) => {
    const { data, error } = await supabase.from(table).insert(rows).select('*');
    if (error) throw toError(error, `Unable to insert rows into ${table}`);
    return data;
  }
});

export const dataClient = {
  auth: {
    me: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        const authError = toError(error, 'Authentication required') || new Error('Authentication required');
        authError.status = 401;
        throw authError;
      }
      const profile = await ensureProfile(data.user);
      if (profile?.active === false) {
        await supabase.auth.signOut();
        const inactiveError = new Error('Usuario inativo. Procure um administrador.');
        inactiveError.status = 403;
        inactiveError.code = 'user_inactive';
        throw inactiveError;
      }
      return normalizeProfile(data.user, profile);
    },
    logout: async (redirectTo = '/login') => {
      const { error } = await supabase.auth.signOut();
      if (error) throw toError(error, 'Unable to logout');
      if (typeof window !== 'undefined' && redirectTo) {
        window.location.href = redirectTo;
      }
    },
    redirectToLogin: (fromUrl) => {
      if (typeof window === 'undefined') return;
      const target = fromUrl || `${window.location.pathname}${window.location.search}`;
      const encoded = encodeURIComponent(target);
      window.location.href = `/login?from=${encoded}`;
    }
  },
  users: {
    inviteUser: async (email, role = 'user', initialPassword = '', fullName = '') => {
      const redirectTo = `${window.location.origin}/set-password`;
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, role, redirectTo, initialPassword, fullName }
      });
      if (error) throw await toFunctionError(error, 'Unable to send invite');
      return data || { ok: true };
    },
    setUserPassword: async (userId, password) => {
      const { data, error } = await supabase.functions.invoke('set-user-password', {
        body: { userId, password }
      });
      if (error) throw await toFunctionError(error, 'Unable to update user password');
      return data || { ok: true };
    },
    manageUser: async (userId, action) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { userId, action }
      });
      if (error) throw await toFunctionError(error, 'Unable to manage user');
      return data || { ok: true };
    }
  },
  entities: {
    Report: createEntity('reports'),
    Unit: createEntity('units'),
    ReportPermission: createEntity('report_permissions'),
    User: createEntity('profiles')
  }
};
