import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const databaseUrl = Deno.env.get('DATABASE_URL');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

const sql = databaseUrl
  ? postgres(databaseUrl, {
      prepare: false,
      max: 3,
      idle_timeout: 5,
      connect_timeout: 15,
    })
  : null;

const INTRANET_SCHEMA = 'gestao_intranet';
const INTRANET_SYSTEM_SLUG = 'intranet';
const DOCUMENTS_STORAGE_BUCKET = 'documents';

const ENTITY_CONFIG = {
  Announcement: {
    schema: INTRANET_SCHEMA,
    table: 'avisos',
    defaultOrder: '-created_date',
    orderMap: {
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
      title: 'titulo',
      category: 'categoria',
      priority: 'prioridade',
      pinned: 'fixado',
    },
    filterMap: {
      id: 'id',
      category: 'categoria',
      priority: 'prioridade',
      pinned: 'fixado',
    },
    createFields: ['title', 'content', 'category', 'priority', 'pinned', 'expiration_date'],
    updateFields: ['title', 'content', 'category', 'priority', 'pinned', 'expiration_date'],
  },
  AnnouncementComment: {
    schema: INTRANET_SCHEMA,
    table: 'comentarios_avisos',
    defaultOrder: 'created_date',
    orderMap: {
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
    },
    filterMap: {
      id: 'id',
      announcement_id: 'aviso_id',
    },
    createFields: ['announcement_id', 'content'],
  },
  AnnouncementReaction: {
    schema: INTRANET_SCHEMA,
    table: 'reacoes_avisos',
    defaultOrder: 'created_date',
    orderMap: {
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
    },
    filterMap: {
      id: 'id',
      announcement_id: 'aviso_id',
      emoji: 'emoji',
    },
    createFields: ['announcement_id', 'emoji'],
  },
  CalendarEvent: {
    schema: INTRANET_SCHEMA,
    table: 'eventos_calendario',
    defaultOrder: 'date',
    orderMap: {
      date: 'data_evento',
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
      type: 'tipo',
    },
    filterMap: {
      id: 'id',
      type: 'tipo',
      date: 'data_evento',
    },
    createFields: ['title', 'description', 'date', 'time', 'type', 'location', 'department', 'department_id', 'unit', 'unit_id'],
    updateFields: ['title', 'description', 'date', 'time', 'type', 'location', 'department', 'department_id', 'unit', 'unit_id'],
  },
  Document: {
    schema: INTRANET_SCHEMA,
    table: 'documentos',
    defaultOrder: '-created_date',
    orderMap: {
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
      category: 'categoria',
    },
    filterMap: {
      id: 'id',
      category: 'categoria',
      department_id: 'departamento_id',
    },
    createFields: ['title', 'description', 'file_url', 'file_path', 'file_name', 'file_type', 'file_size', 'category', 'department', 'department_id'],
    updateFields: ['title', 'description', 'file_url', 'file_path', 'file_name', 'file_type', 'file_size', 'category', 'department', 'department_id'],
  },
  Feedback: {
    schema: INTRANET_SCHEMA,
    table: 'feedback',
    defaultOrder: '-created_date',
    orderMap: {
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
      type: 'tipo',
      category: 'categoria',
      status: 'status',
    },
    filterMap: {
      id: 'id',
      type: 'tipo',
      category: 'categoria',
      status: 'status',
    },
    createFields: ['type', 'category', 'title', 'content', 'anonymous', 'status', 'admin_response'],
    updateFields: ['type', 'category', 'title', 'content', 'anonymous', 'status', 'admin_response'],
  },
  KnowledgeBase: {
    schema: INTRANET_SCHEMA,
    table: 'base_conhecimento',
    defaultOrder: '-created_date',
    orderMap: {
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
      category: 'categoria',
      type: 'tipo',
      pinned: 'fixado',
    },
    filterMap: {
      id: 'id',
      category: 'categoria',
      type: 'tipo',
      pinned: 'fixado',
    },
    createFields: ['title', 'content', 'category', 'type', 'tags', 'pinned', 'helpful_count'],
    updateFields: ['title', 'content', 'category', 'type', 'tags', 'pinned', 'helpful_count'],
  },
  QuickLink: {
    schema: INTRANET_SCHEMA,
    table: 'links_uteis',
    defaultOrder: 'order',
    orderMap: {
      order: 'ordem',
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
      category: 'categoria',
    },
    filterMap: {
      id: 'id',
      category: 'categoria',
    },
    createFields: ['name', 'url', 'description', 'icon', 'category', 'order', 'show_on_dashboard'],
    updateFields: ['name', 'url', 'description', 'icon', 'category', 'order', 'show_on_dashboard'],
  },
  UserPermission: {
    schema: INTRANET_SCHEMA,
    table: 'permissoes_usuario',
    defaultOrder: 'created_date',
    orderMap: {
      created_date: 'criado_em',
      updated_date: 'atualizado_em',
    },
    filterMap: {
      id: 'id',
      collaborator_id: 'colaborador_id',
    },
    createFields: ['collaborator_id', 'user_email', 'modules'],
    updateFields: ['modules'],
  },
} as const;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Erro interno.');
  return message || 'Erro interno.';
}

function getErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}

function getErrorStatus(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  const message = normalizeError(error);

  if (
    message.includes('Nao autenticado') ||
    message.includes('Sessao expirada')
  ) {
    return 401;
  }

  if (
    message.includes('acesso') ||
    message.includes('administrador') ||
    message.includes('inativo')
  ) {
    return 403;
  }

  if (
    message.includes('obrigatorio') ||
    message.includes('Payload vazio') ||
    message.includes('Nenhum campo para atualizar') ||
    message.includes('Nao encontrado') ||
    message.includes('invalido')
  ) {
    return 400;
  }

  return 500;
}

function normalizeText(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toKey(value: string | null | undefined) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

const DEPARTMENT_ALIASES: Record<string, string[]> = {
  diretoria: ['diretoria'],
  rh: ['rh', 'recursos_humanos', 'recursos_humanos_rh'],
  ti: ['ti', 'tecnologia', 'tecnologia_da_informacao'],
  financeiro: ['financeiro'],
  vendas: ['vendas', 'comercial'],
  pos_vendas: ['pos_vendas', 'posvendas'],
  marketing: ['marketing'],
  administrativo: ['administrativo', 'administracao'],
};

const UNIT_ALIASES: Record<string, string[]> = {
  ananindeua: ['ananindeua'],
  belem: ['belem', 'belem_pa', 'mitsubishi_macom_belem'],
  paragominas: ['paragominas'],
};

function resolveAlias(aliases: Record<string, string[]>, input: string | null | undefined) {
  const normalized = toKey(input);
  return Object.entries(aliases).find(([, values]) => values.includes(normalized))?.[0] || normalized;
}

function departmentKeyFromRecord(record: Record<string, unknown>) {
  return resolveAlias(DEPARTMENT_ALIASES, String(record?.nome || record?.descricao || ''));
}

function unitKeyFromRecord(record: Record<string, unknown>) {
  return resolveAlias(UNIT_ALIASES, String(record?.cidade || record?.nome || ''));
}

function sanitizePayload(payload: Record<string, unknown> = {}, allowedFields: readonly string[] = []) {
  return allowedFields.reduce<Record<string, unknown>>((acc, field) => {
    if (field in payload) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value !== 'string') return [];
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

async function runSql<T = Record<string, unknown>>(query: string, values: unknown[] = []) {
  if (!sql) throw new Error('Conexao com banco indisponivel.');
  return (await sql.unsafe(query, values)) as T[];
}

async function resolveAuthenticatedCollaborators(authUser: { id: string; email?: string | null }) {
  const rows = await runSql<Record<string, unknown>>(
    `
      select *
      from public.colaboradores
      where id = $1
         or lower(trim(email)) = lower(trim($2))
      order by case when id = $1 then 0 else 1 end;
    `,
    [authUser.id, authUser.email || null],
  );

  const uniqueRows = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : null;
    if (id && !uniqueRows.has(id)) {
      uniqueRows.set(id, row);
    }
  }

  return [...uniqueRows.values()];
}

async function getIntranetSystem() {
  const rows = await runSql<Record<string, unknown>>(
    `
      select id, nome, slug, ativo
      from public.sistemas
      where slug = $1
      limit 1;
    `,
    [INTRANET_SYSTEM_SLUG],
  );

  return rows[0] || null;
}

async function getAccessForCollaborator(collaboratorId: string, systemId: string) {
  const rows = await runSql<Record<string, unknown>>(
    `
      select *
      from public.acessos_usuario_sistema
      where colaborador_id = $1
        and sistema_id = $2
        and ativo = true
      order by atualizado_em desc nulls last, criado_em desc
      limit 1;
    `,
    [collaboratorId, systemId],
  );

  return rows[0] || null;
}

async function getPermissionRowForCollaborator(collaboratorId: string) {
  const rows = await runSql<Record<string, unknown>>(
    `
      select *
      from gestao_intranet.permissoes_usuario
      where colaborador_id = $1
      limit 1;
    `,
    [collaboratorId],
  );

  return rows[0] || null;
}

async function listDepartments() {
  const rows = await runSql<Record<string, unknown>>(
    `
      select id, nome, descricao
      from public.departamentos
      order by nome asc;
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    description: row.descricao,
    key: departmentKeyFromRecord(row),
  }));
}

async function listUnits() {
  const rows = await runSql<Record<string, unknown>>(
    `
      select id, nome, cidade, ativo
      from public.unidades
      where ativo = true
      order by nome asc;
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    city: row.cidade,
    key: unitKeyFromRecord(row),
  }));
}

async function resolveDepartment(input: unknown) {
  if (!input) return null;
  const departments = await listDepartments();
  const normalized = toKey(String(input));
  return (
    departments.find((item) => item.id === input) ||
    departments.find((item) => item.key === normalized) ||
    departments.find((item) => toKey(item.name) === normalized) ||
    null
  );
}

async function resolveUnit(input: unknown) {
  if (!input) return null;
  const units = await listUnits();
  const normalized = toKey(String(input));
  return (
    units.find((item) => item.id === input) ||
    units.find((item) => item.key === normalized) ||
    units.find((item) => toKey(item.name) === normalized) ||
    units.find((item) => toKey(item.city) === normalized) ||
    null
  );
}

async function fetchCollaboratorsByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return new Map<string, Record<string, unknown>>();

  const rows = await runSql<Record<string, unknown>>(
    `
      select id, nome, email
      from public.colaboradores
      where id = any($1::uuid[]);
    `,
    [uniqueIds],
  );

  return new Map(rows.map((row) => [String(row.id), row]));
}

function mapPermissionRow(row: Record<string, unknown>, collaboratorMap = new Map<string, Record<string, unknown>>()) {
  const collaborator = collaboratorMap.get(String(row.colaborador_id));
  return {
    id: row.id,
    collaborator_id: row.colaborador_id,
    user_email: collaborator?.email || null,
    full_name: collaborator?.nome || null,
    created_by_id: row.criado_por || null,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    modules: {
      avisos: row.mod_avisos || 'view',
      links: row.mod_links || 'view',
      colaboradores: row.mod_colaboradores || 'view',
      documentos: row.mod_documentos || 'view',
      calendario: row.mod_calendario || 'view',
      conhecimento: row.mod_conhecimento || 'view',
      feedback: row.mod_feedback || 'view',
    },
  };
}

function permissionLevel(user: Record<string, unknown>, moduleKey: string) {
  if (user.role === 'admin') return 'edit';
  const permissions = (user.permissions || {}) as Record<string, string>;
  return permissions[moduleKey] || 'none';
}

function canViewModule(user: Record<string, unknown>, moduleKey: string) {
  const level = permissionLevel(user, moduleKey);
  return level === 'view' || level === 'edit';
}

function canEditModule(user: Record<string, unknown>, moduleKey: string) {
  return permissionLevel(user, moduleKey) === 'edit';
}

function assertModuleView(user: Record<string, unknown>, moduleKey: string) {
  if (!canViewModule(user, moduleKey)) {
    const error = new Error('Seu usuario nao possui permissao para visualizar este modulo.');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

function assertModuleEdit(user: Record<string, unknown>, moduleKey: string) {
  if (!canEditModule(user, moduleKey) && user.role !== 'admin') {
    const error = new Error('Seu usuario nao possui permissao para editar este modulo.');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

function assertAdmin(user: Record<string, unknown>) {
  if (user.role !== 'admin') {
    const error = new Error('Apenas administradores podem executar esta operacao.');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

function createAccessError(message: string, code: string, status = 403) {
  const error = new Error(message);
  (error as Error & { code?: string; status?: number }).code = code;
  (error as Error & { code?: string; status?: number }).status = status;
  return error;
}

async function buildCurrentUser(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const collaborators = await resolveAuthenticatedCollaborators(authUser);
  const collaborator = collaborators.find((row) => row.id === authUser.id) || collaborators[0] || null;

  if (!collaborator) {
    throw createAccessError(
      'Seu usuario autenticado nao esta vinculado a um colaborador da intranet.',
      'INTRANET_COLLABORATOR_NOT_FOUND',
    );
  }

  if (collaborator.status !== 'ativo') {
    throw createAccessError(
      'Seu cadastro de colaborador esta inativo e o acesso a intranet foi bloqueado.',
      'INTRANET_COLLABORATOR_INACTIVE',
    );
  }

  const intranetSystem = await getIntranetSystem();
  const access = intranetSystem?.id ? await getAccessForCollaborator(String(collaborator.id), String(intranetSystem.id)) : null;

  if (!access) {
    throw createAccessError(
      'Seu colaborador esta ativo, mas nao possui acesso liberado para a intranet.',
      'INTRANET_SYSTEM_ACCESS_NOT_GRANTED',
    );
  }

  const permissionRow = await getPermissionRowForCollaborator(String(collaborator.id));
  const permission = permissionRow ? mapPermissionRow(permissionRow).modules : defaultModulePermissions();

  return {
    id: authUser.id,
    collaborator_id: collaborator.id,
    email: collaborator.email || authUser.email || null,
    full_name: collaborator.nome || String(authUser.user_metadata?.full_name || authUser.email || 'Usuario'),
    role: access?.nivel_acesso === 'admin' ? 'admin' : access?.nivel_acesso || collaborator.funcao || 'user',
    access_level: access?.nivel_acesso || null,
    position: collaborator.cargo || null,
    function_role: collaborator.funcao || null,
    status: collaborator.status || null,
    permissions: permission,
    backend_status: 'ok',
    backend_reason: null,
  };
}

function defaultModulePermissions() {
  return {
    avisos: 'view',
    links: 'view',
    colaboradores: 'view',
    documentos: 'view',
    calendario: 'view',
    conhecimento: 'view',
    feedback: 'view',
  };
}

async function getContext(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const user = await buildCurrentUser(authUser);
  return {
    user,
    collaboratorId: typeof user.collaborator_id === 'string' ? user.collaborator_id : null,
    isAdmin: user.role === 'admin',
  };
}

function convertOrder(entityName: keyof typeof ENTITY_CONFIG, orderBy?: string) {
  const config = ENTITY_CONFIG[entityName];
  const normalizedOrder = orderBy || config.defaultOrder;
  const ascending = !normalizedOrder.startsWith('-');
  const key = ascending ? normalizedOrder : normalizedOrder.slice(1);
  const column = config.orderMap[key as keyof typeof config.orderMap] || key;
  return { column, ascending };
}

function buildWhereClause(entityName: keyof typeof ENTITY_CONFIG, filters: Record<string, unknown> = {}, startIndex = 1) {
  const config = ENTITY_CONFIG[entityName];
  const clauses: string[] = [];
  const values: unknown[] = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const column = config.filterMap[key as keyof typeof config.filterMap];
    if (!column) return;
    clauses.push(`"${column}" = $${startIndex + values.length}`);
    values.push(value);
  });

  return { clauses, values };
}

function mapAnnouncement(row: Record<string, unknown>, creatorMap = new Map<string, Record<string, unknown>>()) {
  const creator = creatorMap.get(String(row.criado_por));
  return {
    id: row.id,
    title: row.titulo,
    content: row.conteudo,
    category: row.categoria,
    priority: row.prioridade,
    pinned: row.fixado,
    expiration_date: row.expira_em,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: creator?.email || creator?.nome || null,
    created_by_id: row.criado_por || null,
  };
}

function mapAnnouncementComment(row: Record<string, unknown>, creatorMap = new Map<string, Record<string, unknown>>()) {
  const creator = creatorMap.get(String(row.criado_por));
  return {
    id: row.id,
    announcement_id: row.aviso_id,
    content: row.conteudo,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: creator?.email || creator?.nome || null,
    created_by_name: creator?.nome || null,
    created_by_id: row.criado_por || null,
  };
}

function mapAnnouncementReaction(row: Record<string, unknown>, creatorMap = new Map<string, Record<string, unknown>>()) {
  const creator = creatorMap.get(String(row.criado_por));
  return {
    id: row.id,
    announcement_id: row.aviso_id,
    emoji: row.emoji,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: creator?.email || creator?.nome || null,
    created_by_id: row.criado_por || null,
  };
}

function mapKnowledgeBase(row: Record<string, unknown>, creatorMap = new Map<string, Record<string, unknown>>()) {
  const creator = creatorMap.get(String(row.criado_por));
  return {
    id: row.id,
    title: row.titulo,
    content: row.conteudo,
    category: row.categoria,
    type: row.tipo,
    tags: Array.isArray(row.tags) ? row.tags.join(', ') : '',
    pinned: row.fixado,
    helpful_count: row.contador_util,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: creator?.email || creator?.nome || null,
    created_by_id: row.criado_por || null,
  };
}

function mapFeedback(row: Record<string, unknown>, creatorMap = new Map<string, Record<string, unknown>>()) {
  const creator = creatorMap.get(String(row.criado_por));
  return {
    id: row.id,
    type: row.tipo,
    category: row.categoria,
    title: row.titulo,
    content: row.conteudo,
    anonymous: row.anonimo,
    status: row.status,
    admin_response: row.resposta_admin,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: row.anonimo ? null : creator?.email || creator?.nome || null,
    created_by_id: row.criado_por || null,
  };
}

function mapQuickLink(row: Record<string, unknown>, creatorMap = new Map<string, Record<string, unknown>>()) {
  const creator = creatorMap.get(String(row.criado_por));
  return {
    id: row.id,
    name: row.nome,
    url: row.url,
    description: row.descricao,
    icon: row.icone,
    category: row.categoria,
    order: row.ordem,
    show_on_dashboard: row.mostrar_na_dashboard,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: creator?.email || creator?.nome || null,
    created_by_id: row.criado_por || null,
  };
}

function mapCalendarEvent(
  row: Record<string, unknown>,
  departmentsById: Map<string, Record<string, unknown>>,
  unitsById: Map<string, Record<string, unknown>>,
  creatorMap = new Map<string, Record<string, unknown>>(),
) {
  const creator = creatorMap.get(String(row.criado_por));
  const department = departmentsById.get(String(row.departamento_id));
  const unit = unitsById.get(String(row.unidade_id));

  return {
    id: row.id,
    title: row.titulo,
    description: row.descricao,
    date: row.data_evento,
    time: row.horario,
    type: row.tipo,
    location: row.local,
    department_id: row.departamento_id,
    department: department?.key || null,
    department_name: department?.name || null,
    unit_id: row.unidade_id,
    unit: unit?.key || null,
    unit_name: unit?.city || unit?.name || null,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: creator?.email || creator?.nome || null,
    created_by_id: row.criado_por || null,
  };
}

function mapDocument(
  row: Record<string, unknown>,
  departmentsById: Map<string, Record<string, unknown>>,
  creatorMap = new Map<string, Record<string, unknown>>(),
) {
  const creator = creatorMap.get(String(row.criado_por));
  const department = departmentsById.get(String(row.departamento_id));

  return {
    id: row.id,
    title: row.titulo,
    description: row.descricao,
    file_url: row.arquivo_url,
    file_path: row.arquivo_path || null,
    file_name: row.arquivo_nome || null,
    file_type: row.arquivo_tipo || null,
    file_size: row.arquivo_tamanho || null,
    category: row.categoria,
    department_id: row.departamento_id,
    department: department?.key || null,
    department_name: department?.name || null,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: creator?.email || creator?.nome || null,
    created_by_id: row.criado_por || null,
  };
}

function mapEmployee(
  row: Record<string, unknown>,
  profileRow: Record<string, unknown> | undefined,
  departmentsById: Map<string, Record<string, unknown>>,
  unitsById: Map<string, Record<string, unknown>>,
  accessLevel: string | null,
) {
  const department = departmentsById.get(String(row.departamento_id));
  const unit = unitsById.get(String(row.unidade_id));

  return {
    id: row.id,
    name: row.nome,
    email: row.email,
    phone: row.telefone,
    department: department?.key || null,
    department_name: department?.name || null,
    position: row.cargo || null,
    role: accessLevel || row.funcao || 'user',
    function_role: row.funcao || null,
    status: row.status,
    unit: unit?.key || null,
    unit_name: unit?.city || unit?.name || null,
    unit_id: row.unidade_id,
    photo_url: profileRow?.foto_url || null,
    birth_date: row.data_nascimento || null,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
  };
}

async function enrichWithCreators(rows: Record<string, unknown>[]) {
  const creatorIds = rows.map((row) => String(row.criado_por || '')).filter(Boolean);
  return fetchCollaboratorsByIds(creatorIds);
}

async function listBaseEntity(entityName: keyof typeof ENTITY_CONFIG, orderBy?: string, limit?: number) {
  const config = ENTITY_CONFIG[entityName];
  const { column, ascending } = convertOrder(entityName, orderBy);
  const limitSql = limit ? `limit ${Number(limit)}` : '';
  return runSql<Record<string, unknown>>(
    `select * from ${config.schema}.${config.table} order by "${column}" ${ascending ? 'asc' : 'desc'} ${limitSql};`,
  );
}

async function filterBaseEntity(
  entityName: keyof typeof ENTITY_CONFIG,
  filters: Record<string, unknown>,
  orderBy?: string,
  limit?: number,
) {
  const config = ENTITY_CONFIG[entityName];
  const { column, ascending } = convertOrder(entityName, orderBy);
  const { clauses, values } = buildWhereClause(entityName, filters);
  const whereSql = clauses.length ? `where ${clauses.join(' and ')}` : '';
  const limitSql = limit ? `limit ${Number(limit)}` : '';
  return runSql<Record<string, unknown>>(
    `select * from ${config.schema}.${config.table} ${whereSql} order by "${column}" ${ascending ? 'asc' : 'desc'} ${limitSql};`,
    values,
  );
}

async function listAnnouncements(orderBy?: string, limit?: number) {
  const rows = await listBaseEntity('Announcement', orderBy, limit);
  const creators = await enrichWithCreators(rows);
  return rows.map((row) => mapAnnouncement(row, creators));
}

async function listAnnouncementComments(filters: Record<string, unknown>, orderBy?: string, limit?: number) {
  const rows = await filterBaseEntity('AnnouncementComment', filters, orderBy, limit);
  const creators = await enrichWithCreators(rows);
  return rows.map((row) => mapAnnouncementComment(row, creators));
}

async function listAnnouncementReactions(filters: Record<string, unknown>, orderBy?: string, limit?: number) {
  const rows = await filterBaseEntity('AnnouncementReaction', filters, orderBy, limit);
  const creators = await enrichWithCreators(rows);
  return rows.map((row) => mapAnnouncementReaction(row, creators));
}

async function listKnowledgeBase(orderBy?: string, limit?: number) {
  const rows = await listBaseEntity('KnowledgeBase', orderBy, limit);
  const creators = await enrichWithCreators(rows);
  return rows.map((row) => mapKnowledgeBase(row, creators));
}

async function listFeedback(orderBy?: string, limit?: number) {
  const rows = await listBaseEntity('Feedback', orderBy, limit);
  const creators = await enrichWithCreators(rows);
  return rows.map((row) => mapFeedback(row, creators));
}

async function listQuickLinks(orderBy?: string, limit?: number) {
  const rows = await listBaseEntity('QuickLink', orderBy, limit);
  const creators = await enrichWithCreators(rows);
  return rows.map((row) => mapQuickLink(row, creators));
}

async function listCalendarEvents(orderBy?: string, limit?: number) {
  const rows = await listBaseEntity('CalendarEvent', orderBy, limit);
  const [departments, units, creators] = await Promise.all([listDepartments(), listUnits(), enrichWithCreators(rows)]);
  const departmentsById = new Map(departments.map((item) => [String(item.id), item]));
  const unitsById = new Map(units.map((item) => [String(item.id), item]));
  return rows.map((row) => mapCalendarEvent(row, departmentsById, unitsById, creators));
}

async function listDocuments(orderBy?: string, limit?: number) {
  const rows = await listBaseEntity('Document', orderBy, limit);
  const [departments, creators] = await Promise.all([listDepartments(), enrichWithCreators(rows)]);
  const departmentsById = new Map(departments.map((item) => [String(item.id), item]));
  return rows.map((row) => mapDocument(row, departmentsById, creators));
}

async function listEmployees() {
  const [employees, profiles, departments, units, accessRows, intranetSystem] = await Promise.all([
    runSql<Record<string, unknown>>(
      `
        select id, nome, email, telefone, departamento_id, cargo, funcao, unidade_id, data_nascimento, status, criado_em, atualizado_em
        from public.colaboradores
        order by nome asc;
      `,
    ),
    runSql<Record<string, unknown>>(
      `
        select colaborador_id, foto_url
        from gestao_intranet.perfis_colaboradores;
      `,
    ),
    listDepartments(),
    listUnits(),
    runSql<Record<string, unknown>>(
      `
        select colaborador_id, nivel_acesso, sistema_id, ativo
        from public.acessos_usuario_sistema
        where ativo = true;
      `,
    ),
    getIntranetSystem(),
  ]);

  const profilesById = new Map(profiles.map((row) => [String(row.colaborador_id), row]));
  const departmentsById = new Map(departments.map((row) => [String(row.id), row]));
  const unitsById = new Map(units.map((row) => [String(row.id), row]));
  const accessById = new Map(
    accessRows
      .filter((row) => String(row.sistema_id) === String(intranetSystem?.id || ''))
      .map((row) => [String(row.colaborador_id), String(row.nivel_acesso || '')]),
  );

  return employees.map((row) =>
    mapEmployee(row, profilesById.get(String(row.id)), departmentsById, unitsById, accessById.get(String(row.id)) || null),
  );
}

async function listUsers() {
  const employees = await listEmployees();
  return employees.map((employee) => ({
    id: employee.id,
    email: employee.email,
    full_name: employee.name,
    role: employee.role,
    status: employee.status,
  }));
}

async function listUserPermissions(orderBy?: string, limit?: number) {
  const rows = await listBaseEntity('UserPermission', orderBy, limit);
  const collaboratorIds = rows.map((row) => String(row.colaborador_id || '')).filter(Boolean);
  const collaborators = await fetchCollaboratorsByIds(collaboratorIds);
  return rows.map((row) => mapPermissionRow(row, collaborators));
}

async function filterUserPermissions(filters: Record<string, unknown>, orderBy?: string, limit?: number) {
  let dbFilters = { ...filters };
  if (dbFilters.user_email) {
    const rows = await runSql<Record<string, unknown>>(
      `
        select id, nome, email
        from public.colaboradores
        where lower(trim(email)) = lower(trim($1))
        limit 1;
      `,
      [dbFilters.user_email],
    );
    const collaborator = rows[0];
    if (!collaborator) return [];
    dbFilters = { collaborator_id: collaborator.id };
  }

  const rows = await filterBaseEntity('UserPermission', dbFilters, orderBy, limit);
  const collaboratorIds = rows.map((row) => String(row.colaborador_id || '')).filter(Boolean);
  const collaborators = await fetchCollaboratorsByIds(collaboratorIds);
  return rows.map((row) => mapPermissionRow(row, collaborators));
}

async function createAnnouncement(payload: Record<string, unknown>, collaboratorId: string | null) {
  const sanitized = sanitizePayload(payload, ENTITY_CONFIG.Announcement.createFields);
  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.avisos (
        titulo, conteudo, categoria, prioridade, fixado, expira_em, criado_por
      ) values ($1,$2,$3,$4,$5,$6,$7)
      returning *;
    `,
    [
      sanitized.title,
      sanitized.content,
      sanitized.category || 'geral',
      sanitized.priority || 'media',
      sanitized.pinned || false,
      sanitized.expiration_date || null,
      collaboratorId,
    ],
  );

  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapAnnouncement(rows[0], creators);
}

async function updateAnnouncement(id: string, payload: Record<string, unknown>) {
  const sanitized = sanitizePayload(payload, ENTITY_CONFIG.Announcement.updateFields);
  const updates: string[] = [];
  const values: unknown[] = [id];

  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`"${column}" = $${values.length}`);
  };

  if ('title' in sanitized) assign('titulo', sanitized.title);
  if ('content' in sanitized) assign('conteudo', sanitized.content);
  if ('category' in sanitized) assign('categoria', sanitized.category);
  if ('priority' in sanitized) assign('prioridade', sanitized.priority);
  if ('pinned' in sanitized) assign('fixado', sanitized.pinned);
  if ('expiration_date' in sanitized) assign('expira_em', sanitized.expiration_date);
  assign('atualizado_em', new Date().toISOString());

  const rows = await runSql<Record<string, unknown>>(
    `update gestao_intranet.avisos set ${updates.join(', ')} where id = $1 returning *;`,
    values,
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapAnnouncement(rows[0], creators);
}

async function createComment(payload: Record<string, unknown>, collaboratorId: string | null) {
  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.comentarios_avisos (aviso_id, conteudo, criado_por)
      values ($1,$2,$3)
      returning *;
    `,
    [payload.announcement_id, payload.content, collaboratorId],
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapAnnouncementComment(rows[0], creators);
}

async function createReaction(payload: Record<string, unknown>, collaboratorId: string | null) {
  const existing = await runSql<Record<string, unknown>>(
    `
      select *
      from gestao_intranet.reacoes_avisos
      where aviso_id = $1 and emoji = $2 and criado_por = $3
      limit 1;
    `,
    [payload.announcement_id, payload.emoji, collaboratorId],
  );

  if (existing[0]) {
    await runSql(`delete from gestao_intranet.reacoes_avisos where id = $1;`, [existing[0].id]);
    return { id: existing[0].id, deleted: true };
  }

  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.reacoes_avisos (aviso_id, emoji, criado_por)
      values ($1,$2,$3)
      returning *;
    `,
    [payload.announcement_id, payload.emoji, collaboratorId],
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapAnnouncementReaction(rows[0], creators);
}

async function createKnowledgeBase(payload: Record<string, unknown>, collaboratorId: string | null) {
  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.base_conhecimento (
        titulo, conteudo, categoria, tipo, tags, fixado, contador_util, criado_por
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning *;
    `,
    [
      payload.title,
      payload.content,
      payload.category || 'geral',
      payload.type || 'faq',
      parseTags(payload.tags),
      payload.pinned || false,
      payload.helpful_count || 0,
      collaboratorId,
    ],
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapKnowledgeBase(rows[0], creators);
}

async function updateKnowledgeBase(id: string, payload: Record<string, unknown>) {
  const updates: string[] = [];
  const values: unknown[] = [id];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`"${column}" = $${values.length}`);
  };

  if ('title' in payload) assign('titulo', payload.title);
  if ('content' in payload) assign('conteudo', payload.content);
  if ('category' in payload) assign('categoria', payload.category);
  if ('type' in payload) assign('tipo', payload.type);
  if ('tags' in payload) assign('tags', parseTags(payload.tags));
  if ('pinned' in payload) assign('fixado', payload.pinned);
  if ('helpful_count' in payload) assign('contador_util', payload.helpful_count);
  assign('atualizado_em', new Date().toISOString());

  const rows = await runSql<Record<string, unknown>>(
    `update gestao_intranet.base_conhecimento set ${updates.join(', ')} where id = $1 returning *;`,
    values,
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapKnowledgeBase(rows[0], creators);
}

async function createFeedback(payload: Record<string, unknown>, collaboratorId: string | null) {
  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.feedback (
        tipo, categoria, titulo, conteudo, anonimo, status, resposta_admin, criado_por
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning *;
    `,
    [
      payload.type || 'sugestao',
      payload.category || 'geral',
      payload.title,
      payload.content,
      payload.anonymous || false,
      payload.status || 'pendente',
      payload.admin_response || null,
      collaboratorId,
    ],
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapFeedback(rows[0], creators);
}

async function updateFeedback(id: string, payload: Record<string, unknown>) {
  const updates: string[] = [];
  const values: unknown[] = [id];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`"${column}" = $${values.length}`);
  };

  if ('type' in payload) assign('tipo', payload.type);
  if ('category' in payload) assign('categoria', payload.category);
  if ('title' in payload) assign('titulo', payload.title);
  if ('content' in payload) assign('conteudo', payload.content);
  if ('anonymous' in payload) assign('anonimo', payload.anonymous);
  if ('status' in payload) assign('status', payload.status);
  if ('admin_response' in payload) assign('resposta_admin', payload.admin_response);
  assign('atualizado_em', new Date().toISOString());

  const rows = await runSql<Record<string, unknown>>(
    `update gestao_intranet.feedback set ${updates.join(', ')} where id = $1 returning *;`,
    values,
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapFeedback(rows[0], creators);
}

async function createQuickLink(payload: Record<string, unknown>, collaboratorId: string | null) {
  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.links_uteis (
        nome, url, descricao, icone, categoria, ordem, mostrar_na_dashboard, criado_por
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning *;
    `,
    [
      payload.name,
      payload.url,
      payload.description || null,
      payload.icon || null,
      payload.category || 'sistema',
      payload.order || 0,
      payload.show_on_dashboard || false,
      collaboratorId,
    ],
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapQuickLink(rows[0], creators);
}

async function updateQuickLink(id: string, payload: Record<string, unknown>) {
  const updates: string[] = [];
  const values: unknown[] = [id];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`"${column}" = $${values.length}`);
  };

  if ('name' in payload) assign('nome', payload.name);
  if ('url' in payload) assign('url', payload.url);
  if ('description' in payload) assign('descricao', payload.description);
  if ('icon' in payload) assign('icone', payload.icon);
  if ('category' in payload) assign('categoria', payload.category);
  if ('order' in payload) assign('ordem', payload.order);
  if ('show_on_dashboard' in payload) assign('mostrar_na_dashboard', payload.show_on_dashboard);
  assign('atualizado_em', new Date().toISOString());

  const rows = await runSql<Record<string, unknown>>(
    `update gestao_intranet.links_uteis set ${updates.join(', ')} where id = $1 returning *;`,
    values,
  );
  const creators = await fetchCollaboratorsByIds([String(rows[0].criado_por || '')]);
  return mapQuickLink(rows[0], creators);
}

async function createCalendarEvent(payload: Record<string, unknown>, collaboratorId: string | null) {
  const department = await resolveDepartment(payload.department || payload.department_id);
  const unit = await resolveUnit(payload.unit || payload.unit_id);
  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.eventos_calendario (
        titulo, descricao, data_evento, horario, tipo, local, departamento_id, unidade_id, criado_por
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      returning *;
    `,
    [
      payload.title,
      payload.description || null,
      payload.date,
      payload.time || null,
      payload.type || 'evento',
      payload.location || null,
      department?.id || null,
      unit?.id || null,
      collaboratorId,
    ],
  );
  const [departments, units, creators] = await Promise.all([listDepartments(), listUnits(), fetchCollaboratorsByIds([String(rows[0].criado_por || '')])]);
  return mapCalendarEvent(
    rows[0],
    new Map(departments.map((item) => [String(item.id), item])),
    new Map(units.map((item) => [String(item.id), item])),
    creators,
  );
}

async function updateCalendarEvent(id: string, payload: Record<string, unknown>) {
  const department = await resolveDepartment(payload.department || payload.department_id);
  const unit = await resolveUnit(payload.unit || payload.unit_id);
  const updates: string[] = [];
  const values: unknown[] = [id];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`"${column}" = $${values.length}`);
  };

  if ('title' in payload) assign('titulo', payload.title);
  if ('description' in payload) assign('descricao', payload.description);
  if ('date' in payload) assign('data_evento', payload.date);
  if ('time' in payload) assign('horario', payload.time);
  if ('type' in payload) assign('tipo', payload.type);
  if ('location' in payload) assign('local', payload.location);
  if ('department' in payload || 'department_id' in payload) assign('departamento_id', department?.id || null);
  if ('unit' in payload || 'unit_id' in payload) assign('unidade_id', unit?.id || null);
  assign('atualizado_em', new Date().toISOString());

  const rows = await runSql<Record<string, unknown>>(
    `update gestao_intranet.eventos_calendario set ${updates.join(', ')} where id = $1 returning *;`,
    values,
  );
  const [departments, units, creators] = await Promise.all([listDepartments(), listUnits(), fetchCollaboratorsByIds([String(rows[0].criado_por || '')])]);
  return mapCalendarEvent(
    rows[0],
    new Map(departments.map((item) => [String(item.id), item])),
    new Map(units.map((item) => [String(item.id), item])),
    creators,
  );
}

async function createDocument(payload: Record<string, unknown>, collaboratorId: string | null) {
  const department = await resolveDepartment(payload.department || payload.department_id);
  if (!payload.file_url || !payload.file_path || !payload.file_name) {
    throw new Error('Arquivo obrigatorio para criar documento.');
  }
  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.documentos (
        titulo, descricao, arquivo_url, arquivo_path, arquivo_nome, arquivo_tipo, arquivo_tamanho, categoria, departamento_id, criado_por
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      returning *;
    `,
    [
      payload.title,
      payload.description || null,
      payload.file_url,
      payload.file_path,
      payload.file_name,
      payload.file_type || null,
      payload.file_size || null,
      payload.category || 'outros',
      department?.id || null,
      collaboratorId,
    ],
  );
  const [departments, creators] = await Promise.all([listDepartments(), fetchCollaboratorsByIds([String(rows[0].criado_por || '')])]);
  return mapDocument(rows[0], new Map(departments.map((item) => [String(item.id), item])), creators);
}

async function deleteStorageFile(authClient: ReturnType<typeof createClient>, filePath: unknown) {
  const normalizedPath = typeof filePath === 'string' ? filePath.trim() : '';
  if (!normalizedPath) return;

  const { error } = await authClient.storage.from(DOCUMENTS_STORAGE_BUCKET).remove([normalizedPath]);
  if (error) {
    throw new Error(error.message || 'Falha ao remover arquivo do storage.');
  }
}

async function updateDocument(authClient: ReturnType<typeof createClient>, id: string, payload: Record<string, unknown>) {
  const department = await resolveDepartment(payload.department || payload.department_id);
  const previousRows = await runSql<Record<string, unknown>>(
    'select * from gestao_intranet.documentos where id = $1 limit 1;',
    [id],
  );
  const previousDocument = previousRows[0];
  const updates: string[] = [];
  const values: unknown[] = [id];
  const assign = (column: string, value: unknown) => {
    values.push(value);
    updates.push(`"${column}" = $${values.length}`);
  };

  if ('title' in payload) assign('titulo', payload.title);
  if ('description' in payload) assign('descricao', payload.description);
  if ('file_url' in payload) assign('arquivo_url', payload.file_url);
  if ('file_path' in payload) assign('arquivo_path', payload.file_path);
  if ('file_name' in payload) assign('arquivo_nome', payload.file_name);
  if ('file_type' in payload) assign('arquivo_tipo', payload.file_type);
  if ('file_size' in payload) assign('arquivo_tamanho', payload.file_size);
  if ('category' in payload) assign('categoria', payload.category);
  if ('department' in payload || 'department_id' in payload) assign('departamento_id', department?.id || null);
  assign('atualizado_em', new Date().toISOString());

  const rows = await runSql<Record<string, unknown>>(
    `update gestao_intranet.documentos set ${updates.join(', ')} where id = $1 returning *;`,
    values,
  );
  const nextDocument = rows[0];
  if (
    previousDocument?.arquivo_path &&
    nextDocument?.arquivo_path &&
    previousDocument.arquivo_path !== nextDocument.arquivo_path
  ) {
    await deleteStorageFile(authClient, previousDocument.arquivo_path);
  }
  const [departments, creators] = await Promise.all([listDepartments(), fetchCollaboratorsByIds([String(rows[0].criado_por || '')])]);
  return mapDocument(rows[0], new Map(departments.map((item) => [String(item.id), item])), creators);
}

async function updateEmployee(id: string, payload: Record<string, unknown>) {
  const department = await resolveDepartment(payload.department || payload.department_id);
  const unit = await resolveUnit(payload.unit || payload.unit_id);
  const employeeRows = await runSql<Record<string, unknown>>(
    `
      update public.colaboradores
      set
        nome = $2,
        email = $3,
        telefone = $4,
        departamento_id = $5,
        cargo = $6,
        funcao = coalesce($7, funcao),
        unidade_id = $8,
        atualizado_em = now()
      where id = $1
      returning id, nome, email, telefone, departamento_id, cargo, funcao, unidade_id, status, criado_em, atualizado_em;
    `,
    [
      id,
      payload.name,
      payload.email || null,
      payload.phone || null,
      department?.id || null,
      payload.position || null,
      payload.function_role || null,
      unit?.id || null,
    ],
  );

  await runSql(
    `
      insert into gestao_intranet.perfis_colaboradores (colaborador_id, foto_url, atualizado_em)
      values ($1,$2,now())
      on conflict (colaborador_id) do update
      set foto_url = excluded.foto_url,
          atualizado_em = now();
    `,
    [id, payload.photo_url || null],
  );

  if ('birth_date' in payload) {
    await runSql(
      `
        update public.colaboradores
        set data_nascimento = $2,
            atualizado_em = now()
        where id = $1;
      `,
      [id, payload.birth_date || null],
    );
  }

  const [profiles, departments, units, intranetSystem] = await Promise.all([
    runSql<Record<string, unknown>>(
      `
        select colaborador_id, foto_url
        from gestao_intranet.perfis_colaboradores
        where colaborador_id = $1
        limit 1;
      `,
      [id],
    ),
    listDepartments(),
    listUnits(),
    getIntranetSystem(),
  ]);

  const accessRows = intranetSystem?.id
    ? await runSql<Record<string, unknown>>(
        `
          select nivel_acesso
          from public.acessos_usuario_sistema
          where colaborador_id = $1 and sistema_id = $2 and ativo = true
          limit 1;
        `,
        [id, intranetSystem.id],
      )
    : [];

  return mapEmployee(
    employeeRows[0],
    profiles[0],
    new Map(departments.map((item) => [String(item.id), item])),
    new Map(units.map((item) => [String(item.id), item])),
    accessRows[0]?.nivel_acesso ? String(accessRows[0].nivel_acesso) : null,
  );
}

async function deleteEmployee(id: string) {
  await runSql(`delete from public.colaboradores where id = $1;`, [id]);
  return { success: true };
}

async function resolveCollaboratorIdByEmail(email: unknown) {
  if (!email) return null;
  const rows = await runSql<Record<string, unknown>>(
    `
      select id
      from public.colaboradores
      where lower(trim(email)) = lower(trim($1))
      limit 1;
    `,
    [email],
  );
  return rows[0]?.id || null;
}

async function createUserPermission(payload: Record<string, unknown>) {
  const collaboratorId = payload.collaborator_id || (await resolveCollaboratorIdByEmail(payload.user_email));
  if (!collaboratorId) {
    throw new Error('Nenhum colaborador encontrado para o e-mail informado.');
  }

  const modules = (payload.modules || {}) as Record<string, unknown>;
  const rows = await runSql<Record<string, unknown>>(
    `
      insert into gestao_intranet.permissoes_usuario (
        colaborador_id, mod_avisos, mod_links, mod_colaboradores, mod_documentos,
        mod_calendario, mod_conhecimento, mod_feedback
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning *;
    `,
    [
      collaboratorId,
      modules.avisos || 'view',
      modules.links || 'view',
      modules.colaboradores || 'view',
      modules.documentos || 'view',
      modules.calendario || 'view',
      modules.conhecimento || 'view',
      modules.feedback || 'view',
    ],
  );
  const collaborators = await fetchCollaboratorsByIds([String(rows[0].colaborador_id || '')]);
  return mapPermissionRow(rows[0], collaborators);
}

async function updateUserPermission(id: string, payload: Record<string, unknown>) {
  const modules = (payload.modules || {}) as Record<string, unknown>;
  const rows = await runSql<Record<string, unknown>>(
    `
      update gestao_intranet.permissoes_usuario
      set
        mod_avisos = $2,
        mod_links = $3,
        mod_colaboradores = $4,
        mod_documentos = $5,
        mod_calendario = $6,
        mod_conhecimento = $7,
        mod_feedback = $8,
        atualizado_em = now()
      where id = $1
      returning *;
    `,
    [
      id,
      modules.avisos || 'view',
      modules.links || 'view',
      modules.colaboradores || 'view',
      modules.documentos || 'view',
      modules.calendario || 'view',
      modules.conhecimento || 'view',
      modules.feedback || 'view',
    ],
  );
  const collaborators = await fetchCollaboratorsByIds([String(rows[0].colaborador_id || '')]);
  return mapPermissionRow(rows[0], collaborators);
}

async function deleteBaseEntity(entityName: keyof typeof ENTITY_CONFIG, id: string) {
  const config = ENTITY_CONFIG[entityName];
  await runSql(`delete from ${config.schema}.${config.table} where id = $1;`, [id]);
  return { success: true };
}

async function deleteDocument(authClient: ReturnType<typeof createClient>, id: string) {
  const rows = await runSql<Record<string, unknown>>(
    'select * from gestao_intranet.documentos where id = $1 limit 1;',
    [id],
  );
  const document = rows[0];

  await deleteBaseEntity('Document', id);

  if (document?.arquivo_path) {
    await deleteStorageFile(authClient, document.arquivo_path);
  }

  return { success: true };
}

async function listEntity(entity: string, orderBy?: string, limit?: number) {
  switch (entity) {
    case 'Announcement':
      return listAnnouncements(orderBy, limit);
    case 'AnnouncementComment':
      return listAnnouncementComments({}, orderBy, limit);
    case 'AnnouncementReaction':
      return listAnnouncementReactions({}, orderBy, limit);
    case 'CalendarEvent':
      return listCalendarEvents(orderBy, limit);
    case 'Document':
      return listDocuments(orderBy, limit);
    case 'Employee':
      return listEmployees();
    case 'Feedback':
      return listFeedback(orderBy, limit);
    case 'KnowledgeBase':
      return listKnowledgeBase(orderBy, limit);
    case 'QuickLink':
      return listQuickLinks(orderBy, limit);
    case 'User':
      return listUsers();
    case 'UserPermission':
      return listUserPermissions(orderBy, limit);
    default:
      throw new Error('Entidade invalida.');
  }
}

function getEntityModule(entity: string) {
  switch (entity) {
    case 'Announcement':
    case 'AnnouncementComment':
    case 'AnnouncementReaction':
      return 'avisos';
    case 'CalendarEvent':
      return 'calendario';
    case 'Document':
      return 'documentos';
    case 'Employee':
    case 'User':
      return 'colaboradores';
    case 'Feedback':
      return 'feedback';
    case 'KnowledgeBase':
      return 'conhecimento';
    case 'QuickLink':
      return 'links';
    case 'UserPermission':
      return 'admin';
    default:
      return null;
  }
}

async function filterEntity(entity: string, filters: Record<string, unknown>, orderBy?: string, limit?: number) {
  switch (entity) {
    case 'AnnouncementComment':
      return listAnnouncementComments(filters, orderBy, limit);
    case 'AnnouncementReaction':
      return listAnnouncementReactions(filters, orderBy, limit);
    case 'UserPermission':
      return filterUserPermissions(filters, orderBy, limit);
    default:
      return listEntity(entity, orderBy, limit);
  }
}

async function createEntity(entity: string, payload: Record<string, unknown>, collaboratorId: string | null) {
  switch (entity) {
    case 'Announcement':
      return createAnnouncement(payload, collaboratorId);
    case 'AnnouncementComment':
      return createComment(payload, collaboratorId);
    case 'AnnouncementReaction':
      return createReaction(payload, collaboratorId);
    case 'CalendarEvent':
      return createCalendarEvent(payload, collaboratorId);
    case 'Document':
      return createDocument(payload, collaboratorId);
    case 'Feedback':
      return createFeedback(payload, collaboratorId);
    case 'KnowledgeBase':
      return createKnowledgeBase(payload, collaboratorId);
    case 'QuickLink':
      return createQuickLink(payload, collaboratorId);
    case 'UserPermission':
      return createUserPermission(payload);
    default:
      throw new Error('Criacao nao suportada para esta entidade.');
  }
}

async function updateEntity(authClient: ReturnType<typeof createClient>, entity: string, id: string, payload: Record<string, unknown>) {
  switch (entity) {
    case 'Announcement':
      return updateAnnouncement(id, payload);
    case 'CalendarEvent':
      return updateCalendarEvent(id, payload);
    case 'Document':
      return updateDocument(authClient, id, payload);
    case 'Employee':
      return updateEmployee(id, payload);
    case 'Feedback':
      return updateFeedback(id, payload);
    case 'KnowledgeBase':
      return updateKnowledgeBase(id, payload);
    case 'QuickLink':
      return updateQuickLink(id, payload);
    case 'UserPermission':
      return updateUserPermission(id, payload);
    default:
      throw new Error('Atualizacao nao suportada para esta entidade.');
  }
}

async function deleteEntity(authClient: ReturnType<typeof createClient>, entity: string, id: string) {
  switch (entity) {
    case 'Announcement':
      return deleteBaseEntity('Announcement', id);
    case 'AnnouncementComment':
      return deleteBaseEntity('AnnouncementComment', id);
    case 'AnnouncementReaction':
      return deleteBaseEntity('AnnouncementReaction', id);
    case 'CalendarEvent':
      return deleteBaseEntity('CalendarEvent', id);
    case 'Document':
      return deleteDocument(authClient, id);
    case 'Employee':
      return deleteEmployee(id);
    case 'Feedback':
      return deleteBaseEntity('Feedback', id);
    case 'KnowledgeBase':
      return deleteBaseEntity('KnowledgeBase', id);
    case 'QuickLink':
      return deleteBaseEntity('QuickLink', id);
    case 'UserPermission':
      return deleteBaseEntity('UserPermission', id);
    default:
      throw new Error('Remocao nao suportada para esta entidade.');
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey || !sql) {
      return json({ error: 'Secrets da function nao configurados.' }, 500);
    }

    const authHeader = request.headers.get('Authorization') || '';
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return json({ error: 'Nao autenticado.', code: 'auth_required' }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    const entity = typeof body.entity === 'string' ? body.entity : '';
    const orderBy = typeof body.orderBy === 'string' ? body.orderBy : undefined;
    const limit = typeof body.limit === 'number' ? body.limit : undefined;
    const id = typeof body.id === 'string' ? body.id : '';
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const filters = body.filters && typeof body.filters === 'object' ? body.filters : {};
    const catalog = typeof body.catalog === 'string' ? body.catalog : '';

    const context = await getContext({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    if (action === 'me') {
      return json({ user: context.user });
    }

    if (action === 'catalog') {
      if (catalog === 'departments') {
        return json({ rows: await listDepartments() });
      }

      if (catalog === 'units') {
        return json({ rows: await listUnits() });
      }

      return json({ error: 'Catalogo invalido.' }, 400);
    }

    if (action === 'list') {
      const moduleKey = getEntityModule(entity);
      if (moduleKey === 'admin') {
        assertAdmin(context.user as Record<string, unknown>);
      } else if (moduleKey) {
        assertModuleView(context.user as Record<string, unknown>, moduleKey);
      }
      return json({ rows: await listEntity(entity, orderBy, limit) });
    }

    if (action === 'filter') {
      const moduleKey = getEntityModule(entity);
      if (moduleKey === 'admin') {
        assertAdmin(context.user as Record<string, unknown>);
      } else if (moduleKey) {
        assertModuleView(context.user as Record<string, unknown>, moduleKey);
      }
      return json({ rows: await filterEntity(entity, filters as Record<string, unknown>, orderBy, limit) });
    }

    if (action === 'create') {
      const moduleKey = getEntityModule(entity);
      if (entity === 'AnnouncementComment' || entity === 'AnnouncementReaction') {
        assertModuleView(context.user as Record<string, unknown>, 'avisos');
      } else if (entity === 'Feedback') {
        assertModuleView(context.user as Record<string, unknown>, 'feedback');
      } else if (moduleKey === 'admin') {
        assertAdmin(context.user as Record<string, unknown>);
      } else if (moduleKey) {
        assertModuleEdit(context.user as Record<string, unknown>, moduleKey);
      }
      return json({ row: await createEntity(entity, payload as Record<string, unknown>, context.collaboratorId) });
    }

    if (action === 'update') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const moduleKey = getEntityModule(entity);
      if (moduleKey === 'admin') {
        assertAdmin(context.user as Record<string, unknown>);
      } else if (moduleKey) {
        assertModuleEdit(context.user as Record<string, unknown>, moduleKey);
      }
      return json({ row: await updateEntity(authClient, entity, id, payload as Record<string, unknown>) });
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const moduleKey = getEntityModule(entity);
      if (entity === 'AnnouncementReaction') {
        assertModuleView(context.user as Record<string, unknown>, 'avisos');
      } else if (moduleKey === 'admin') {
        assertAdmin(context.user as Record<string, unknown>);
      } else if (moduleKey) {
        assertModuleEdit(context.user as Record<string, unknown>, moduleKey);
      }
      return json(await deleteEntity(authClient, entity, id));
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json(
      {
        error: normalizeError(error),
        code: getErrorCode(error),
      },
      getErrorStatus(error),
    );
  }
});
