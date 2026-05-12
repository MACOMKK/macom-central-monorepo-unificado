import { supabase } from '@/api/supabaseClient';
import { catalogApi } from '@macom/api-client/catalogApi';
import { systemAccessApi } from '@macom/api-client/systemAccessApi';

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

const matchesFilters = (row, filters = {}) =>
  Object.entries(filters).every(([key, value]) => row?.[key] === value);

const mapCentralUnit = (unit) => ({
  id: unit.id,
  name: unit.nome || '',
  code: unit.cidade || '',
  active: unit.ativo !== false,
  city: unit.cidade || '',
  address: unit.endereco || '',
  phone: unit.telefone || '',
  manager: unit.responsavel || '',
  raw: unit,
});

const mapRoleToCentral = (role) => {
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'gestor';
  return 'usuario';
};

const mapSystemAccessLevelToRole = (level) => {
  if (level === 'admin') return 'admin';
  if (level === 'gestor') return 'manager';
  return 'user';
};

const mapRoleToSystemAccessLevel = (role) => {
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'gestor';
  return 'usuario';
};

const normalizeCentralCollaborator = (collaborator, authUser, access = null) => ({
  id: collaborator?.id || authUser?.id,
  email: collaborator?.email || authUser?.email || '',
  full_name:
    collaborator?.nome ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')[0] ||
    'Usuario',
  role: access ? mapSystemAccessLevelToRole(access.nivel_acesso) : collaborator?.funcao === 'admin'
    ? 'admin'
    : collaborator?.funcao === 'gestor'
      ? 'manager'
      : 'user',
  central_role:
    collaborator?.funcao === 'admin'
      ? 'admin'
      : collaborator?.funcao === 'gestor'
        ? 'manager'
        : 'user',
  active: collaborator?.status !== 'inativo' && access?.ativo !== false,
  unit_id: collaborator?.unidade_id || null,
  unit_name: collaborator?.unidade_nome || '',
  access_id: access?.id || null,
  system_access_level: access?.nivel_acesso || null,
  system_access_active: access?.ativo ?? null,
  collaborator,
});

const getRelatoriosSystem = async () => {
  const system = await systemAccessApi.systems.findBySlug('relatorios');
  if (!system?.id) {
    throw new Error('Sistema de relatorios nao encontrado.');
  }
  return system;
};

const getRelatoriosAccessMap = async () => {
  const [system, accesses] = await Promise.all([
    getRelatoriosSystem(),
    systemAccessApi.accesses.list(),
  ]);

  const accessMap = new Map(
    accesses
      .filter((entry) => entry.sistema_id === system.id)
      .map((entry) => [entry.colaborador_id, entry])
  );

  return { system, accessMap };
};

const ensureReportsSystemAccess = async (profile) => {
  const collaboratorId = profile?.collaborator?.id;
  if (!collaboratorId) {
    const accessError = new Error('Seu usuario nao esta vinculado ao cadastro central.');
    accessError.status = 403;
    accessError.code = 'user_not_registered';
    throw accessError;
  }

  const access = await systemAccessApi.accesses.findByCollaboratorAndSystem(collaboratorId, 'relatorios');
  const hasActiveAccess = access?.ativo === true && access?.sistema?.ativo === true;

  if (!hasActiveAccess) {
    const accessError = new Error('Seu usuario nao possui acesso liberado ao sistema de relatorios.');
    accessError.status = 403;
    accessError.code = 'user_not_registered';
    throw accessError;
  }

  return {
    ...profile,
    role: mapSystemAccessLevelToRole(access.nivel_acesso),
    system_access_id: access.id,
    system_access_level: access.nivel_acesso || 'usuario',
  };
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

const createCentralUnitEntity = () => ({
  list: async (sort) => {
    const rows = await catalogApi.unidades.list();
    const mapped = rows.map(mapCentralUnit);
    const parsed = parseSort(sort);

    if (!parsed) return mapped;

    return [...mapped].sort((left, right) => {
      const leftValue = left?.[parsed.key];
      const rightValue = right?.[parsed.key];

      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return parsed.ascending ? 1 : -1;
      if (rightValue == null) return parsed.ascending ? -1 : 1;

      return parsed.ascending
        ? String(leftValue).localeCompare(String(rightValue), 'pt-BR')
        : String(rightValue).localeCompare(String(leftValue), 'pt-BR');
    });
  },
  filter: async (filters = {}) => {
    const rows = await catalogApi.unidades.list();
    return rows.map(mapCentralUnit).filter((row) => matchesFilters(row, filters));
  },
  create: async () => {
    throw new Error('As unidades sao gerenciadas no app Central.');
  },
  update: async () => {
    throw new Error('As unidades sao gerenciadas no app Central.');
  },
  delete: async () => {
    throw new Error('As unidades sao gerenciadas no app Central.');
  },
  bulkCreate: async () => {
    throw new Error('As unidades sao gerenciadas no app Central.');
  },
});

const createCentralUserEntity = () => ({
  list: async () => {
    const [rows, { accessMap }] = await Promise.all([
      catalogApi.colaboradores.list(),
      getRelatoriosAccessMap(),
    ]);

    return rows
      .map((row) => normalizeCentralCollaborator(row, null, accessMap.get(row.id) || null))
      .filter((row) => row.access_id);
  },
  filter: async (filters = {}) => {
    const rows = await createCentralUserEntity().list();
    return rows.filter((row) => matchesFilters(row, filters));
  },
  create: async (payload) => {
    const result = await catalogApi.colaboradores.create({
      nome: payload.full_name || payload.nome || '',
      email: payload.email || '',
      password: payload.password || '',
      funcao: 'usuario',
      unidade_id: payload.unit_id || null,
      status: payload.active === false ? 'inativo' : 'ativo',
    });

    const system = await getRelatoriosSystem();
    const access = await systemAccessApi.accesses.save({
      colaborador_id: result.id,
      sistema_id: system.id,
      nivel_acesso: mapRoleToSystemAccessLevel(payload.role),
      ativo: payload.active !== false,
    });

    return normalizeCentralCollaborator(result, null, access);
  },
  update: async (id, payload) => {
    let collaborator = null;
    const nextUnitId = payload.unit_id === 'none' ? null : payload.unit_id;
    const hasCentralChanges = 'full_name' in payload || 'nome' in payload || 'unit_id' in payload;

    if (hasCentralChanges) {
      collaborator = await catalogApi.colaboradores.update(id, {
        nome: payload.full_name || payload.nome,
        unidade_id: nextUnitId,
      });
    } else {
      const rows = await catalogApi.colaboradores.list();
      collaborator = rows.find((row) => row.id === id) || null;
    }

    let access = null;
    if (payload.access_id && ('role' in payload || 'active' in payload)) {
      access = await systemAccessApi.accesses.update(payload.access_id, {
        nivel_acesso: 'role' in payload ? mapRoleToSystemAccessLevel(payload.role) : undefined,
        ativo: 'active' in payload ? payload.active : undefined,
      });
    } else {
      const { accessMap } = await getRelatoriosAccessMap();
      access = accessMap.get(id) || null;
    }

    return normalizeCentralCollaborator(collaborator, null, access);
  },
  delete: async (id) => {
    throw new Error(`Use a remocao de acesso do sistema para o usuario ${id}.`);
  },
  bulkCreate: async () => {
    throw new Error('Operacao nao suportada para usuarios do Central.');
  },
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

      const collaborator = await catalogApi.auth.me();
      const profile = normalizeCentralCollaborator(collaborator, data.user);

      if (!profile.active) {
        await supabase.auth.signOut();
        const inactiveError = new Error('Usuario inativo. Procure um administrador.');
        inactiveError.status = 403;
        inactiveError.code = 'user_inactive';
        throw inactiveError;
      }

      return ensureReportsSystemAccess(profile);
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
      const collaborator = await catalogApi.colaboradores.create({
        nome: fullName,
        email,
        password: initialPassword,
        funcao: 'usuario',
        status: 'ativo',
      });
      const system = await getRelatoriosSystem();
      await systemAccessApi.accesses.save({
        colaborador_id: collaborator.id,
        sistema_id: system.id,
        nivel_acesso: mapRoleToSystemAccessLevel(role),
        ativo: true,
      });
      return collaborator;
    },
    setUserPassword: async (userId, password) => {
      await catalogApi.colaboradores.updatePassword(userId, password);
      return { ok: true };
    },
    manageUser: async (userId, action, accessId) => {
      void userId;
      if (!accessId) {
        throw new Error('Acesso do usuario ao sistema de relatorios nao encontrado.');
      }

      if (action === 'delete') {
        await systemAccessApi.accesses.remove(accessId);
        return { ok: true };
      }

      if (action === 'deactivate') {
        await systemAccessApi.accesses.update(accessId, { ativo: false });
        return { ok: true };
      }

      if (action === 'activate') {
        await systemAccessApi.accesses.update(accessId, { ativo: true });
        return { ok: true };
      }

      throw new Error('Acao de usuario nao suportada.');
    }
  },
  entities: {
    Report: createEntity('reports'),
    Unit: createCentralUnitEntity(),
    ReportPermission: createEntity('report_permissions'),
    User: createCentralUserEntity()
  }
};
