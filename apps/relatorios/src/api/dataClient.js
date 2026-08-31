import { supabase } from '@/api/supabaseClient';
import { reportsApi } from '@/api/reportsApi';
import { reportsSystemAccessApi } from '@/api/reportsSystemAccessApi';
import { reportsAdminUsersApi } from '@/api/reportsAdminUsersApi';

const SORT_KEY_MAP = {
  created_date: 'criado_em'
};
const LOOKUP_CACHE_TTL_MS = 60 * 1000;

const navigateWithoutReload = (path, { replace = false } = {}) => {
  if (typeof window === 'undefined' || !path) return;

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
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

const createLookupCache = () => ({
  data: null,
  loadedAt: 0,
  promise: null,
});

const unitsCache = createLookupCache();
const collaboratorsCache = createLookupCache();

const REPORTS_FUNCTION_MODULES = [
  'relatorios',
  'permissoes_relatorios',
  'avisos_relatorios',
  'logs_auditoria',
];

const REPORTS_PERMISSION_LEVELS = {
  sem: 0,
  ver: 1,
  gerenciar: 2,
};

const isCacheFresh = (cache) =>
  Array.isArray(cache.data) && Date.now() - cache.loadedAt < LOOKUP_CACHE_TTL_MS;

const readCached = async (cache, loader, { force = false } = {}) => {
  if (!force && isCacheFresh(cache)) {
    return cache.data;
  }

  if (!force && cache.promise) {
    return cache.promise;
  }

  cache.promise = Promise.resolve(loader()).then((data) => {
    cache.data = data;
    cache.loadedAt = Date.now();
    cache.promise = null;
    return data;
  }).catch((error) => {
    cache.promise = null;
    throw error;
  });

  return cache.promise;
};

const invalidateUnitsCache = () => {
  unitsCache.data = null;
  unitsCache.loadedAt = 0;
  unitsCache.promise = null;
};

const invalidateCollaboratorsCache = () => {
  collaboratorsCache.data = null;
  collaboratorsCache.loadedAt = 0;
  collaboratorsCache.promise = null;
};

const mapReportRow = (row = {}, unitsById = new Map()) => {
  const unit = unitsById.get(row.unidade_id) || null;
  const embedCode = row.embed_code || '';
  const allUnits = row.todas_unidades === true;
  const unitIds = Array.isArray(row.unidade_ids)
    ? row.unidade_ids.filter(Boolean)
    : row.unidade_id
      ? [row.unidade_id]
      : [];
  const unitNames = Array.isArray(row.nomes_unidades)
    ? row.nomes_unidades.filter(Boolean)
    : [unit?.nome || row.nome_unidade || row.unidade_nome].filter(Boolean);
  const fallbackUnitName = unit?.nome || row.nome_unidade || row.unidade_nome || '';
  const normalizedUnitNames = allUnits
    ? ['Todas as unidades']
    : (unitNames.length ? unitNames : [fallbackUnitName].filter(Boolean));
  const unitLabel = allUnits
    ? 'Todas as unidades'
    : normalizedUnitNames.length > 1
      ? normalizedUnitNames.join(', ')
      : normalizedUnitNames[0] || '';

  return ({
  id: row.id,
  title: row.titulo || '',
  description: row.descricao || '',
  embed_code: embedCode,
  unit_id: unitIds[0] || row.unidade_id || null,
  unit_ids: unitIds,
  unit_name: unitLabel,
  unit_names: normalizedUnitNames,
  unit_label: unitLabel,
  all_units: allUnits,
  category: row.categoria || '',
  provider: detectReportProvider(embedCode),
  icon: row.icone || '',
  active: row.ativo !== false,
  created_at: row.criado_em || null,
  updated_at: row.atualizado_em || null,
  raw: row,
  });
};

const detectReportProvider = (embedCode = '') => {
  const normalizedCode = String(embedCode).toLowerCase();

  if (
    normalizedCode.includes('app.powerbi.com') ||
    normalizedCode.includes('powerbi')
  ) {
    return 'power_bi';
  }

  if (
    normalizedCode.includes('datastudio.google.com') ||
    normalizedCode.includes('lookerstudio.google.com') ||
    normalizedCode.includes('data studio') ||
    normalizedCode.includes('looker studio')
  ) {
    return 'data_studio';
  }

  return 'other';
};

const mapReportPayload = (payload = {}) => ({
  titulo: payload.title ?? payload.titulo ?? '',
  descricao: payload.description ?? payload.descricao ?? null,
  embed_code: payload.embed_code ?? payload.codigo_embed ?? '',
  unidade_id: payload.unit_id ?? payload.unidade_id ?? null,
  todas_unidades: payload.all_units ?? payload.todas_unidades ?? false,
  categoria: payload.category ?? payload.categoria ?? null,
  icone: payload.icon ?? payload.icone ?? null,
  ativo: payload.active ?? payload.ativo ?? true,
});

const mapReportUnitPayload = (payload = {}) => ({
  relatorio_id: payload.report_id ?? payload.relatorio_id ?? null,
  unidade_id: payload.unit_id ?? payload.unidade_id ?? null,
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

const mapReportsFunctionPermissionRow = (row = {}) => {
  const permission = row.permissao || 'sem';

  return {
    id: row.id,
    access_level: row.nivel_acesso || 'gestor',
    module: row.modulo || '',
    permission,
    can_view: REPORTS_PERMISSION_LEVELS[permission] >= REPORTS_PERMISSION_LEVELS.ver,
    can_manage: REPORTS_PERMISSION_LEVELS[permission] >= REPORTS_PERMISSION_LEVELS.gerenciar,
    raw: row,
  };
};

const buildReportsFunctionPermissionMap = (rows = []) => {
  const permissions = Object.fromEntries(REPORTS_FUNCTION_MODULES.map((module) => [module, 'sem']));

  rows.forEach((row) => {
    if (row.module && row.permission) {
      permissions[row.module] = row.permission;
    }
  });

  return permissions;
};

export const canReportsFunction = (permissions = {}, module, requiredPermission = 'ver') => {
  const currentLevel = REPORTS_PERMISSION_LEVELS[permissions?.[module] || 'sem'] || 0;
  const requiredLevel = REPORTS_PERMISSION_LEVELS[requiredPermission] || REPORTS_PERMISSION_LEVELS.ver;
  return currentLevel >= requiredLevel;
};

const getReportsFunctionPermissions = async (accessLevel, accessToken) => {
  if (accessLevel !== 'gestor') {
    return [];
  }

  const rows = await reportsApi.permissoes_funcoes_relatorios.list(
    { filters: { nivel_acesso: accessLevel } },
    accessToken,
  );

  return rows.map(mapReportsFunctionPermissionRow);
};

const mapReportNoticeRow = (row = {}) => ({
  id: row.id,
  report_id: row.relatorio_id || null,
  report_title: row.relatorio_titulo || '',
  title: row.titulo || '',
  message: row.mensagem || '',
  version: Number(row.versao || 1),
  required: row.obrigatorio !== false,
  active: row.ativo !== false,
  created_by: row.criado_por || null,
  created_at: row.criado_em || null,
  updated_at: row.atualizado_em || null,
  raw: row,
});

const mapReportNoticePayload = (payload = {}) => ({
  relatorio_id: payload.report_id ?? payload.relatorio_id ?? null,
  titulo: payload.title ?? payload.titulo ?? '',
  mensagem: payload.message ?? payload.mensagem ?? '',
  versao: payload.version ?? payload.versao ?? 1,
  obrigatorio: payload.required ?? payload.obrigatorio ?? true,
  ativo: payload.active ?? payload.ativo ?? true,
  criado_por: payload.created_by ?? payload.criado_por ?? null,
});

const mapReportNoticeAcceptanceRow = (row = {}) => ({
  id: row.id,
  notice_id: row.aviso_id || null,
  report_id: row.relatorio_id || null,
  collaborator_id: row.colaborador_id || null,
  accepted_version: Number(row.versao_aceita || 0),
  accepted_at: row.aceito_em || null,
  notice_title: row.aviso_titulo || '',
  report_title: row.relatorio_titulo || '',
  raw: row,
});

const mapReportNoticeAcceptancePayload = (payload = {}) => ({
  aviso_id: payload.notice_id ?? payload.aviso_id ?? null,
  relatorio_id: payload.report_id ?? payload.relatorio_id ?? null,
  colaborador_id: payload.collaborator_id ?? payload.colaborador_id ?? payload.user_id ?? null,
  versao_aceita: payload.accepted_version ?? payload.versao_aceita ?? null,
});

const parseJsonField = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
};

const mapAuditLogRow = (row = {}) => ({
  id: row.id,
  entity: row.entidade || '',
  action: row.acao || '',
  record_id: row.registro_id || null,
  actor_collaborator_id: row.actor_colaborador_id || null,
  actor_email: row.actor_email || '',
  before: parseJsonField(row.antes),
  after: parseJsonField(row.depois),
  metadata: parseJsonField(row.metadados) || {},
  created_at: row.criado_em || null,
  raw: row,
});

const hydrateReports = async (rows = []) => {
  const rowsAlreadyContainUnitData = rows.every(
    (row) =>
      row?.todas_unidades === true ||
      Array.isArray(row?.nomes_unidades) ||
      !row?.unidade_id ||
      Boolean(row?.nome_unidade || row?.unidade_nome)
  );

  if (rowsAlreadyContainUnitData) {
    return rows.map((row) => mapReportRow(row));
  }

  let unitsById = new Map();
  try {
    const units = await readCached(unitsCache, () => reportsApi.unidades.list());
    unitsById = new Map(units.map((unit) => [unit.id, unit]));
  } catch (error) {
    if (error?.message !== 'Acesso restrito a administradores.') {
      throw error;
    }
  }

  return rows.map((row) => mapReportRow(row, unitsById));
};

const hydrateReportPermissions = async (rows = []) => {
  const [collaborators, reportRows] = await Promise.all([
    readCached(collaboratorsCache, () => reportsApi.colaboradores.list()),
    reportsApi.relatorios.list().then((items) => hydrateReports(items)),
  ]);

  const collaboratorsById = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));
  const reportsById = new Map(reportRows.map((report) => [report.id, report]));

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

const mapReportPermissions = (rows = []) => rows.map(mapReportPermissionRow);

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
  const system = await reportsSystemAccessApi.systems.findBySlug('relatorios');
  if (!system?.id) {
    throw new Error('Sistema de relatorios nao encontrado.');
  }
  return system;
};

const getRelatoriosAccessMap = async () => {
  const [system, accesses] = await Promise.all([
    getRelatoriosSystem(),
    reportsSystemAccessApi.accesses.list(),
  ]);

  const accessMap = new Map(
    accesses
      .filter((entry) => entry.sistema_id === system.id)
      .map((entry) => [entry.colaborador_id, entry])
  );

  return { system, accessMap };
};

const ensureReportsSystemAccess = async (profile, accessToken, prefetchedAccess = null) => {
  const collaboratorId = profile?.collaborator?.id;
  if (!collaboratorId) {
    const accessError = new Error('Seu usuario nao esta vinculado ao cadastro central.');
    accessError.status = 403;
    accessError.code = 'user_not_registered';
    throw accessError;
  }

  const access =
    prefetchedAccess ||
    (await reportsSystemAccessApi.accesses.findByCollaboratorAndSystem(
      collaboratorId,
      'relatorios',
      accessToken,
    ));
  const hasActiveAccess = access?.ativo === true && access?.sistema?.ativo === true;

  if (!hasActiveAccess) {
    const accessError = new Error('Seu usuario nao possui acesso liberado ao sistema de relatorios.');
    accessError.status = 403;
    accessError.code = 'user_not_registered';
    throw accessError;
  }

  const permissionRows = await getReportsFunctionPermissions(access.nivel_acesso, accessToken);

  return {
    ...profile,
    role: mapSystemAccessLevelToRole(access.nivel_acesso),
    system_access_id: access.id,
    system_access_level: access.nivel_acesso || 'usuario',
    reports_permission_rows: permissionRows,
    reports_permissions: buildReportsFunctionPermissionMap(permissionRows),
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
    const rows = await readCached(unitsCache, () => reportsApi.unidades.list());
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
    const rows = await readCached(unitsCache, () => reportsApi.unidades.list());
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
      readCached(collaboratorsCache, () => reportsApi.colaboradores.list()),
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
    const result = await reportsAdminUsersApi.create({
      nome: payload.full_name || payload.nome || '',
      email: payload.email || '',
      password: payload.password || '',
      funcao: 'usuario',
      unidade_id: payload.unit_id || null,
      status: payload.active === false ? 'inativo' : 'ativo',
    });

    const system = await getRelatoriosSystem();
    const access = await reportsSystemAccessApi.accesses.save({
      colaborador_id: result.id,
      sistema_id: system.id,
      nivel_acesso: mapRoleToSystemAccessLevel(payload.role),
      ativo: payload.active !== false,
    });
    invalidateCollaboratorsCache();

    return normalizeCentralCollaborator(result, null, access);
  },
  update: async (id, payload) => {
    let collaborator = null;
    const nextUnitId = payload.unit_id === 'none' ? null : payload.unit_id;
    const hasCentralChanges = 'full_name' in payload || 'nome' in payload || 'unit_id' in payload;

    if (hasCentralChanges) {
      collaborator = await reportsApi.colaboradores.update(id, {
        nome: payload.full_name || payload.nome,
        unidade_id: nextUnitId,
      });
      invalidateCollaboratorsCache();
    } else {
      const rows = await readCached(collaboratorsCache, () => reportsApi.colaboradores.list());
      collaborator = rows.find((row) => row.id === id) || null;
    }

    let access = null;
    if (payload.access_id && ('role' in payload || 'active' in payload)) {
      access = await reportsSystemAccessApi.accesses.update(payload.access_id, {
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
    const rows = await reportsApi.relatorios.list();
    const reports = await hydrateReports(rows);
    return sortRows(reports, sort);
  },
  filter: async (filters = {}) => {
    const rows = await reportsApi.relatorios.list({
      filters: {
        id: filters.id,
        ativo: 'active' in filters ? filters.active : filters.ativo,
        categoria: filters.category ?? filters.categoria,
      },
    });
    const reports = await hydrateReports(rows);
    return reports.filter((report) => {
      if (filters.unit_id || filters.unidade_id) {
        const targetUnit = filters.unit_id ?? filters.unidade_id;
        if (report.all_units !== true && !report.unit_ids.includes(targetUnit)) {
          return false;
        }
      }
      return true;
    });
  },
  create: async (payload) => {
    const unitIds = Array.isArray(payload.unit_ids)
      ? [...new Set(payload.unit_ids.filter(Boolean))]
      : [payload.unit_id ?? payload.unidade_id].filter(Boolean);
    const allUnits = payload.all_units === true || payload.todas_unidades === true;
    const row = await reportsApi.relatorios.create(
      mapReportPayload({
        ...payload,
        unit_id: allUnits ? null : unitIds[0] || null,
        all_units: allUnits,
      }),
    );

    if (!allUnits && unitIds.length) {
      await Promise.all(
        unitIds.map((unitId) => reportsApi.relatorios_unidades.create(mapReportUnitPayload({
          report_id: row.id,
          unit_id: unitId,
        }))),
      );
    }

    const refreshedRows = await reportsApi.relatorios.list({ filters: { id: row.id } });
    const refreshedRow = refreshedRows[0] || row;
    return (await hydrateReports([refreshedRow]))[0];
  },
  update: async (id, payload) => {
    const unitIds = Array.isArray(payload.unit_ids)
      ? [...new Set(payload.unit_ids.filter(Boolean))]
      : [payload.unit_id ?? payload.unidade_id].filter(Boolean);
    const allUnits = payload.all_units === true || payload.todas_unidades === true;
    const row = await reportsApi.relatorios.update(id, mapReportPayload({
      ...payload,
      unit_id: allUnits ? null : unitIds[0] || null,
      all_units: allUnits,
    }));

    const existingRelations = await reportsApi.relatorios_unidades.list({ filters: { relatorio_id: id } });
    await Promise.all(existingRelations.map((relation) => reportsApi.relatorios_unidades.remove(relation.id)));

    if (!allUnits && unitIds.length) {
      await Promise.all(
        unitIds.map((unitId) => reportsApi.relatorios_unidades.create(mapReportUnitPayload({
          report_id: id,
          unit_id: unitId,
        }))),
      );
    }

    const refreshedRows = await reportsApi.relatorios.list({ filters: { id } });
    const refreshedRow = refreshedRows[0] || row;
    return (await hydrateReports([refreshedRow]))[0];
  },
  delete: async (id) => {
    await reportsApi.relatorios.remove(id);
    return { id };
  },
  bulkCreate: async (rows) => {
    const created = await Promise.all(rows.map((row) => reportsApi.relatorios.create(mapReportPayload(row))));
    return hydrateReports(created);
  },
});

const createCatalogReportPermissionEntity = () => ({
  list: async (sort) => {
    const rows = await reportsApi.permissoes_relatorios.list();
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

    const rows = await reportsApi.permissoes_relatorios.list({ filters: payload });
    return mapReportPermissions(rows);
  },
  create: async (payload) => {
    const row = await reportsApi.permissoes_relatorios.create(mapReportPermissionPayload(payload));
    return (await hydrateReportPermissions([row]))[0];
  },
  update: async (id, payload) => {
    const row = await reportsApi.permissoes_relatorios.update(id, mapReportPermissionPayload(payload));
    return (await hydrateReportPermissions([row]))[0];
  },
  delete: async (id) => {
    await reportsApi.permissoes_relatorios.remove(id);
    return { id };
  },
  bulkCreate: async (rows) => {
    const created = await Promise.all(
      rows.map((row) => reportsApi.permissoes_relatorios.create(mapReportPermissionPayload(row)))
    );
    return hydrateReportPermissions(created);
  },
});

const createCatalogAuditLogEntity = () => ({
  list: async (sort) => {
    const result = await reportsApi.logs_auditoria_relatorios.list();
    return sortRows(result.rows.map(mapAuditLogRow), sort);
  },
  filter: async (filters = {}) => {
    const payload = {};
    if (filters.entity) payload.entidade = filters.entity;
    if (filters.action) payload.acao = filters.action;
    if (filters.record_id || filters.registro_id) payload.registro_id = filters.record_id || filters.registro_id;
    if (filters.actor_collaborator_id || filters.colaborador_id) {
      payload.actor_colaborador_id = filters.actor_collaborator_id || filters.colaborador_id;
    }
    const result = await reportsApi.logs_auditoria_relatorios.list({ filters: payload });
    return result.rows.map(mapAuditLogRow);
  },
  listPage: async ({ sort = '-created_at', page = 1, pageSize = 50, filters = {} } = {}) => {
    const payload = {};
    if (filters.entity && filters.entity !== 'all') payload.entidade = filters.entity;
    if (filters.action && filters.action !== 'all') payload.acao = filters.action;
    if (filters.record_id || filters.registro_id) payload.registro_id = filters.record_id || filters.registro_id;
    if (filters.actor_collaborator_id || filters.colaborador_id) {
      payload.actor_colaborador_id = filters.actor_collaborator_id || filters.colaborador_id;
    }

    const offset = Math.max(0, (page - 1) * pageSize);
    const result = await reportsApi.logs_auditoria_relatorios.list({
      filters: payload,
      limit: pageSize,
      offset,
    });
    const rows = sortRows(result.rows.map(mapAuditLogRow), sort);

    return {
      rows,
      total: result.total ?? rows.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((result.total ?? rows.length) / pageSize)),
    };
  },
});

const createCatalogReportNoticeEntity = () => ({
  list: async (sort = '-updated_at') => {
    const rows = await reportsApi.avisos_relatorios.list();
    return sortRows(rows.map(mapReportNoticeRow), sort);
  },
  filter: async (filters = {}, sort = '-updated_at') => {
    const payload = {};
    if (filters.id) payload.id = filters.id;
    if (filters.report_id || filters.relatorio_id) payload.relatorio_id = filters.report_id || filters.relatorio_id;
    if (filters.active !== undefined || filters.ativo !== undefined) payload.ativo = filters.active ?? filters.ativo;
    const rows = await reportsApi.avisos_relatorios.list({ filters: payload });
    return sortRows(rows.map(mapReportNoticeRow), sort);
  },
  create: async (payload) => {
    const row = await reportsApi.avisos_relatorios.create(mapReportNoticePayload(payload));
    return mapReportNoticeRow(row);
  },
  update: async (id, payload) => {
    const row = await reportsApi.avisos_relatorios.update(id, mapReportNoticePayload(payload));
    return mapReportNoticeRow(row);
  },
  delete: async (id) => {
    await reportsApi.avisos_relatorios.remove(id);
    return { id };
  },
});

const createCatalogReportNoticeAcceptanceEntity = () => ({
  list: async (sort = '-accepted_at') => {
    const rows = await reportsApi.avisos_relatorios_aceites.list();
    return sortRows(rows.map(mapReportNoticeAcceptanceRow), sort);
  },
  filter: async (filters = {}, sort = '-accepted_at') => {
    const payload = {};
    if (filters.id) payload.id = filters.id;
    if (filters.notice_id || filters.aviso_id) payload.aviso_id = filters.notice_id || filters.aviso_id;
    if (filters.report_id || filters.relatorio_id) payload.relatorio_id = filters.report_id || filters.relatorio_id;
    if (filters.collaborator_id || filters.colaborador_id || filters.user_id) {
      payload.colaborador_id = filters.collaborator_id || filters.colaborador_id || filters.user_id;
    }
    const rows = await reportsApi.avisos_relatorios_aceites.list({ filters: payload });
    return sortRows(rows.map(mapReportNoticeAcceptanceRow), sort);
  },
  create: async (payload) => {
    const row = await reportsApi.avisos_relatorios_aceites.create(mapReportNoticeAcceptancePayload(payload));
    return mapReportNoticeAcceptanceRow(row);
  },
});

export const dataClient = {
  auth: {
    me: async (sessionOverride = null) => {
      const sessionData = sessionOverride
        ? { data: { session: sessionOverride }, error: null }
        : await supabase.auth.getSession();
      const session = sessionData?.data?.session || null;

      if (sessionData?.error || !session?.user || !session?.access_token) {
        const authError =
          toError(sessionData?.error, 'Authentication required') || new Error('Authentication required');
        authError.status = 401;
        throw authError;
      }

      const authUser = session.user;
      const authPayload = await reportsApi.auth.me(session.access_token);
      const collaborator = authPayload?.row || null;
      const profile = normalizeCentralCollaborator(collaborator, authUser);

      if (!profile.active) {
        await supabase.auth.signOut({ scope: 'local' });
        const inactiveError = new Error('Usuario inativo. Procure um administrador.');
        inactiveError.status = 403;
        inactiveError.code = 'user_inactive';
        throw inactiveError;
      }

      return ensureReportsSystemAccess(profile, session.access_token, authPayload?.access || null);
    },
    logout: async (redirectTo = '/entrar') => {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw toError(error, 'Unable to logout');
      navigateWithoutReload(redirectTo, { replace: true });
    },
    redirectToLogin: (fromUrl) => {
      if (typeof window === 'undefined') return;
      const target = fromUrl || `${window.location.pathname}${window.location.search}`;
      const encoded = encodeURIComponent(target);
      navigateWithoutReload(`/entrar?from=${encoded}`, { replace: true });
    }
  },
  users: {
    inviteUser: async (email, role = 'user', initialPassword = '', fullName = '') => {
      const collaborator = await reportsAdminUsersApi.create({
        nome: fullName,
        email,
        password: initialPassword,
        funcao: 'usuario',
        status: 'ativo',
      });
      const system = await getRelatoriosSystem();
      await reportsSystemAccessApi.accesses.save({
        colaborador_id: collaborator.id,
        sistema_id: system.id,
        nivel_acesso: mapRoleToSystemAccessLevel(role),
        ativo: true,
      });
      invalidateCollaboratorsCache();
      return collaborator;
    },
    setUserPassword: async (userId, password) => {
      await reportsAdminUsersApi.updatePassword(userId, password);
      return { ok: true };
    },
    manageUser: async (userId, action, accessId) => {
      void userId;
      if (!accessId) {
        throw new Error('Acesso do usuario ao sistema de relatorios nao encontrado.');
      }

      if (action === 'delete') {
        await reportsSystemAccessApi.accesses.remove(accessId);
        return { ok: true };
      }

      if (action === 'deactivate') {
        await reportsSystemAccessApi.accesses.update(accessId, { ativo: false });
        return { ok: true };
      }

      if (action === 'activate') {
        await reportsSystemAccessApi.accesses.update(accessId, { ativo: true });
        return { ok: true };
      }

      throw new Error('Acao de usuario nao suportada.');
    }
  },
  entities: {
    Report: createCatalogReportEntity(),
    ReportNotice: createCatalogReportNoticeEntity(),
    ReportNoticeAcceptance: createCatalogReportNoticeAcceptanceEntity(),
    Unit: createCentralUnitEntity(),
    ReportPermission: createCatalogReportPermissionEntity(),
    User: createCentralUserEntity(),
    AuditLog: createCatalogAuditLogEntity()
  }
};
