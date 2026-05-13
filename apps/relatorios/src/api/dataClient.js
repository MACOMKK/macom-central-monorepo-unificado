import { supabase } from '@/api/supabaseClient';
import { catalogApi } from '@macom/api-client/catalogApi';
import { systemAccessApi } from '@macom/api-client/systemAccessApi';

const SORT_KEY_MAP = {
  created_date: 'criado_em'
};

const toError = (error, fallbackMessage) => {
  if (!error) return null;
  const err = new Error(error.message || fallbackMessage);
  err.status = error.status || 500;
  err.details = error;
  return err;
};

const parseSort = (sort) => {
  if (!sort) return null;
  const desc = sort.startsWith('-');
  const rawKey = desc ? sort.slice(1) : sort;
  const key = SORT_KEY_MAP[rawKey] || rawKey;
  return { key, ascending: !desc };
};

const sortRows = (rows = [], sort) => {
  const parsed = parseSort(sort);
  if (!parsed) return rows;

  return [...rows].sort((left, right) => {
    const leftValue = left?.[parsed.key];
    const rightValue = right?.[parsed.key];

    if (leftValue == null && rightValue == null) return 0;
    if (leftValue == null) return parsed.ascending ? 1 : -1;
    if (rightValue == null) return parsed.ascending ? -1 : 1;

    if (typeof leftValue === 'boolean' || typeof rightValue === 'boolean') {
      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      return parsed.ascending ? leftNumber - rightNumber : rightNumber - leftNumber;
    }

    return parsed.ascending
      ? String(leftValue).localeCompare(String(rightValue), 'pt-BR')
      : String(rightValue).localeCompare(String(leftValue), 'pt-BR');
  });
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
    if (value === undefined) return;
    query = query.eq(key, value);
  });
  return query;
};

const matchesFilters = (row, filters = {}) =>
  Object.entries(filters).every(([key, value]) => row?.[key] === value);

const mapReportRow = (row = {}, unitsById = new Map()) => {
  const unit = unitsById.get(row.unidade_id) || null;

  return ({
  id: row.id,
  title: row.titulo || '',
  description: row.descricao || '',
  embed_code: row.embed_code || '',
  unit_id: row.unidade_id || null,
  unit_name: unit?.nome || row.nome_unidade || row.unidade_nome || '',
  category: row.categoria || '',
  icon: row.icone || '',
  active: row.ativo !== false,
  created_at: row.criado_em || null,
  updated_at: row.atualizado_em || null,
  raw: row,
  });
};

const mapReportPayload = (payload = {}) => ({
  titulo: payload.title ?? payload.titulo ?? '',
  descricao: payload.description ?? payload.descricao ?? null,
  embed_code: payload.embed_code ?? payload.codigo_embed ?? '',
  unidade_id: payload.unit_id ?? payload.unidade_id ?? null,
  categoria: payload.category ?? payload.categoria ?? null,
  icone: payload.icon ?? payload.icone ?? null,
  ativo: payload.active ?? payload.ativo ?? true,
});

const mapReportPermissionRow = (row = {}) => ({
  id: row.id,
  collaborator_id: row.colaborador_id || null,
  user_id: row.colaborador_id || null,
  report_id: row.relatorio_id || null,
  created_at: row.criado_em || null,
  updated_at: row.atualizado_em || null,
  raw: row,
});

const mapReportPermissionPayload = (payload = {}) => ({
  colaborador_id: payload.collaborator_id ?? payload.colaborador_id ?? payload.user_id ?? null,
  relatorio_id: payload.report_id ?? payload.relatorio_id ?? null,
});

const hydrateReports = async (rows = []) => {
  const units = await catalogApi.unidades.list();
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  return rows.map((row) => mapReportRow(row, unitsById));
};

const hydrateReportPermissions = async (rows = []) => {
  const [collaborators, reportRows] = await Promise.all([
    catalogApi.colaboradores.list(),
    catalogApi.relatorios.list(),
  ]);

  const collaboratorsById = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));
  const reports = await hydrateReports(reportRows);
  const reportsById = new Map(reports.map((report) => [report.id, report]));

  return rows.map((row) => {
    const base = mapReportPermissionRow(row);
    const collaborator = collaboratorsById.get(base.collaborator_id) || null;
    const report = reportsById.get(base.report_id) || null;

    return {
      ...base,
      user_email: collaborator?.email || '',
      user_name: collaborator?.nome || '',
      report_title: report?.title || '',
      unit_id: report?.unit_id || null,
      unit_name: report?.unit_name || '',
    };
  });
};

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

const createCatalogReportEntity = () => ({
  list: async (sort) => {
    const rows = await catalogApi.relatorios.list();
    const reports = await hydrateReports(rows);
    return sortRows(reports, sort);
  },
  filter: async (filters = {}) => {
    const rows = await catalogApi.relatorios.list({
      filters: {
        id: filters.id,
        ativo: 'active' in filters ? filters.active : filters.ativo,
        unidade_id: filters.unit_id ?? filters.unidade_id,
        categoria: filters.category ?? filters.categoria,
      },
    });
    return hydrateReports(rows);
  },
  create: async (payload) => {
    const row = await catalogApi.relatorios.create(mapReportPayload(payload));
    return (await hydrateReports([row]))[0];
  },
  update: async (id, payload) => {
    const row = await catalogApi.relatorios.update(id, mapReportPayload(payload));
    return (await hydrateReports([row]))[0];
  },
  delete: async (id) => {
    await catalogApi.relatorios.remove(id);
    return { id };
  },
  bulkCreate: async (rows) => {
    const created = await Promise.all(rows.map((row) => catalogApi.relatorios.create(mapReportPayload(row))));
    return hydrateReports(created);
  },
});

const createCatalogReportPermissionEntity = () => ({
  list: async (sort) => {
    const rows = await catalogApi.permissoes_relatorios.list();
    const permissions = await hydrateReportPermissions(rows);
    return sortRows(permissions, sort);
  },
  filter: async (filters = {}) => {
    const payload = {};
    if (filters.user_email || filters.user_id || filters.collaborator_id) {
      payload.colaborador_id = filters.user_id || filters.collaborator_id || filters.user_email;
    }
    if (filters.report_id || filters.relatorio_id) {
      payload.relatorio_id = filters.report_id || filters.relatorio_id;
    }

    const rows = await catalogApi.permissoes_relatorios.list({ filters: payload });
    return hydrateReportPermissions(rows);
  },
  create: async (payload) => {
    const row = await catalogApi.permissoes_relatorios.create(mapReportPermissionPayload(payload));
    return (await hydrateReportPermissions([row]))[0];
  },
  update: async (id, payload) => {
    const row = await catalogApi.permissoes_relatorios.update(id, mapReportPermissionPayload(payload));
    return (await hydrateReportPermissions([row]))[0];
  },
  delete: async (id) => {
    await catalogApi.permissoes_relatorios.remove(id);
    return { id };
  },
  bulkCreate: async (rows) => {
    const created = await Promise.all(
      rows.map((row) => catalogApi.permissoes_relatorios.create(mapReportPermissionPayload(row)))
    );
    return hydrateReportPermissions(created);
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
    logout: async (redirectTo = '/entrar') => {
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
      window.location.href = `/entrar?from=${encoded}`;
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
    Report: createCatalogReportEntity(),
    Unit: createCentralUnitEntity(),
    ReportPermission: createCatalogReportPermissionEntity(),
    User: createCentralUserEntity()
  }
};
