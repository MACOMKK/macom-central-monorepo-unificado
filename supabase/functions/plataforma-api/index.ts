import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const databaseUrl = Deno.env.get('DATABASE_URL');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sql = databaseUrl ? postgres(databaseUrl, { prepare: false }) : null;

const ENTITY_CONFIG = {
  colaboradores: {
    schema: 'public',
    table: 'colaboradores',
    orderBy: 'nome',
    orderDirection: 'asc',
    allowedFilters: ['id', 'email', 'funcao', 'status', 'departamento_id', 'cargo_id', 'unidade_id'],
  },
  sistemas: {
    schema: 'public',
    table: 'sistemas',
    orderBy: 'nome',
    orderDirection: 'asc',
    allowedFilters: ['id', 'slug', 'ativo'],
  },
  acessos_usuario_sistema: {
    schema: 'public',
    table: 'acessos_usuario_sistema',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFilters: ['id', 'colaborador_id', 'sistema_id', 'nivel_acesso', 'ativo'],
  },
  permissoes_central: {
    schema: 'gestao_ativos',
    table: 'permissoes_central',
    orderBy: 'modulo',
    orderDirection: 'asc',
    allowedFilters: ['id', 'funcao', 'modulo', 'nivel_acesso'],
  },
  permissoes_funcoes_relatorios: {
    schema: 'gestao_relatorio',
    table: 'permissoes_funcoes',
    orderBy: 'modulo',
    orderDirection: 'asc',
    allowedFilters: ['id', 'nivel_acesso', 'modulo', 'permissao'],
  },
  logs_auditoria: {
    schema: 'gestao_plataforma',
    table: 'logs_auditoria',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFilters: ['entidade', 'acao', 'registro_id', 'responsavel_colaborador_id'],
  },
} as const;

type EntityKey = keyof typeof ENTITY_CONFIG;
type AuditAction = 'criar' | 'atualizar' | 'excluir' | 'redefinir_senha' | 'desvincular' | 'importar';

const AUDIT_ACTIONS = new Set(['criar', 'atualizar', 'excluir', 'redefinir_senha', 'desvincular', 'importar']);
const CENTRAL_MODULES = [
  'dashboard',
  'ativos',
  'departamentos',
  'cargos',
  'unidades',
  'colaboradores',
  'contatos',
  'linhas_corporativas',
  'infra_estrutura',
  'acessos_usuario_sistema',
  'logs_auditoria',
  'termos_posse',
] as const;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function requireConfig() {
  if (!sql || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Ambiente Supabase incompleto.');
  }
}

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Service role do Supabase nao configurada.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function mapAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (message.includes('already been registered') || message.includes('User already registered')) {
    return 'Ja existe um colaborador com este email.';
  }

  return message || 'Falha ao atualizar usuario no Auth.';
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function sanitizeFilters(entity: EntityKey, filters: Record<string, unknown> = {}) {
  const config = ENTITY_CONFIG[entity];
  return Object.fromEntries(
    Object.entries(filters).filter(([key, value]) =>
      (config.allowedFilters as readonly string[]).includes(key) && value !== undefined && value !== null && value !== '',
    ),
  );
}

function buildSqlFilters(filters: Record<string, unknown>, startIndex = 1, alias = 'l') {
  const clauses: string[] = [];
  const values: unknown[] = [];

  Object.entries(filters).forEach(([key, value], index) => {
    clauses.push(`${alias}.${key} = $${startIndex + index}`);
    values.push(value);
  });

  return { clauses, values };
}

async function getAuthenticatedUser(request: Request) {
  const token = getBearerToken(request);

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function getAuthenticatedCollaborator(authUser: { id: string; email?: string | null }) {
  if (!sql) return null;

  const byIdRows = await sql.unsafe(
    `
      select id, nome, email, funcao, status
      from public.colaboradores
      where id = $1
      limit 1;
    `,
    [authUser.id],
  );

  if (byIdRows[0]) {
    return byIdRows[0];
  }

  const normalizedEmail = typeof authUser.email === 'string' ? authUser.email.trim().toLowerCase() : null;
  if (!normalizedEmail) {
    return null;
  }

  const byEmailRows = await sql.unsafe(
    `
      select id, nome, email, funcao, status
      from public.colaboradores
      where lower(trim(email)) = lower(trim($1))
      limit 1;
    `,
    [normalizedEmail],
  );

  return byEmailRows[0] || null;
}

async function getCentralPermissions(funcao: string | null | undefined) {
  if (!sql || !funcao) return [];

  if (funcao === 'admin') {
    return CENTRAL_MODULES.map((modulo) => ({
      id: `admin-${modulo}`,
      funcao,
      modulo,
      nivel_acesso: 'gerenciar',
    }));
  }

  const rows = await sql.unsafe(
    `
      select id, funcao, modulo, nivel_acesso, criado_em, atualizado_em
      from gestao_ativos.permissoes_central
      where funcao = $1
      order by modulo asc;
    `,
    [funcao],
  );

  return rows;
}

async function getSystemAccessForCollaborator({
  collaboratorId,
  systemSlug,
}: {
  collaboratorId?: string | null;
  systemSlug?: string | null;
}) {
  if (!sql || !collaboratorId || !systemSlug) return null;

  const rows = await sql.unsafe(
    `
      select
        aus.*,
        row_to_json(s) as sistema
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      where aus.colaborador_id = $1
        and s.slug = $2
      order by aus.ativo desc, aus.atualizado_em desc nulls last, aus.criado_em desc
      limit 1;
    `,
    [collaboratorId, systemSlug],
  );

  return rows[0] || null;
}

function canAccessPlataforma(collaborator: Record<string, unknown> | null) {
  return (
    collaborator?.status !== 'inativo' &&
    (collaborator?.funcao === 'admin' || collaborator?.funcao === 'gestor')
  );
}

function isGlobalAdmin(collaborator: Record<string, unknown>) {
  return collaborator.funcao === 'admin' && collaborator.status !== 'inativo';
}

async function fetchRowById(schema: string, table: string, id: string) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `select * from ${schema}.${table} where id = $1 limit 1;`,
    [id],
  );

  return rows[0] || null;
}

async function syncIntranetPermissionOnAccessChange(accessRow?: Record<string, unknown> | null) {
  if (!sql || !accessRow?.colaborador_id || !accessRow?.sistema_id) return;

  const relatedSystem = await fetchRowById('public', 'sistemas', String(accessRow.sistema_id));
  if (relatedSystem?.slug !== 'intranet') return;

  if (accessRow.ativo === true) {
    await sql.unsafe(
      `
        insert into gestao_intranet.permissoes_usuario (
          colaborador_id,
          mod_avisos,
          mod_links,
          mod_colaboradores,
          mod_documentos,
          mod_calendario,
          mod_conhecimento,
          mod_feedback
        )
        values ($1, 'view', 'view', 'view', 'view', 'view', 'view', 'view')
        on conflict (colaborador_id) do nothing;
      `,
      [String(accessRow.colaborador_id)],
    );
    return;
  }

  await sql.unsafe(
    `
      delete from gestao_intranet.permissoes_usuario
      where colaborador_id = $1;
    `,
    [String(accessRow.colaborador_id)],
  );
}

function sanitizeSystemAccessPayload(payload: Record<string, unknown> = {}) {
  const sanitized: Record<string, unknown> = {};

  if (typeof payload.colaborador_id === 'string') sanitized.colaborador_id = payload.colaborador_id;
  if (typeof payload.sistema_id === 'string') sanitized.sistema_id = payload.sistema_id;
  if (typeof payload.nivel_acesso === 'string') sanitized.nivel_acesso = payload.nivel_acesso;
  if (typeof payload.ativo === 'boolean') sanitized.ativo = payload.ativo;

  return sanitized;
}

function sanitizeCollaboratorAccessPayload(payload: Record<string, unknown> = {}) {
  const sanitized: Record<string, unknown> = {};

  if (typeof payload.funcao === 'string') sanitized.funcao = payload.funcao;
  if (typeof payload.status === 'string') sanitized.status = payload.status;

  return sanitized;
}

async function updateCollaboratorAccessProfile({
  id,
  payload,
  collaborator,
}: {
  id?: string | null;
  payload: Record<string, unknown>;
  collaborator: Record<string, unknown>;
}) {
  if (!id) return json({ error: 'ID obrigatorio.' }, 400);

  const sanitized = sanitizeCollaboratorAccessPayload(payload);
  if (!Object.keys(sanitized).length) {
    return json({ error: 'Payload vazio.' }, 400);
  }

  const beforeRow = await fetchRowById('public', 'colaboradores', id);
  if (!beforeRow) {
    return json({ error: 'Colaborador nao encontrado.' }, 404);
  }

  if (!isGlobalAdmin(collaborator) && sanitized.funcao && sanitized.funcao !== 'usuario') {
    return json({ error: 'Apenas administradores podem definir colaboradores como admin ou gestor.' }, 403);
  }

  if (
    !isGlobalAdmin(collaborator) &&
    sanitized.status === 'inativo' &&
    ['admin', 'gestor'].includes(String(beforeRow.funcao || '')) &&
    beforeRow.status !== 'inativo'
  ) {
    return json({ error: 'Apenas administradores podem inativar colaboradores admin ou gestor.' }, 403);
  }

  const rows = await sql!.unsafe(
    `
      update public.colaboradores
      set
        funcao = coalesce($2, funcao),
        status = coalesce($3, status),
        atualizado_em = now()
      where id = $1
      returning *;
    `,
    [
      id,
      sanitized.funcao ?? null,
      sanitized.status ?? null,
    ],
  );

  return json({ row: rows[0] || null });
}

async function updateCollaboratorPassword({
  id,
  password,
  collaborator,
}: {
  id?: string | null;
  password?: string | null;
  collaborator: Record<string, unknown>;
}) {
  if (!id) return json({ error: 'ID obrigatorio.' }, 400);
  if (!password || password.length < 6) {
    return json({ error: 'Senha obrigatoria com pelo menos 6 caracteres.' }, 400);
  }

  const collaboratorRow = await fetchRowById('public', 'colaboradores', id);
  if (!collaboratorRow) {
    return json({ error: 'Colaborador nao encontrado.' }, 404);
  }

  if (!isGlobalAdmin(collaborator) && collaboratorRow.funcao === 'admin') {
    return json({ error: 'Apenas administradores podem redefinir senha de colaboradores admin.' }, 403);
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(id, { password });

  if (error) {
    return json({ error: mapAuthError(error.message || 'Falha ao atualizar senha no Auth.') }, 400);
  }

  return json({ success: true });
}

async function updateCollaboratorEmail({
  id,
  email,
  resetPassword,
  collaborator,
}: {
  id?: string | null;
  email?: string | null;
  resetPassword?: boolean;
  collaborator: Record<string, unknown>;
}) {
  if (!id) return json({ error: 'ID obrigatorio.' }, 400);

  const nextEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!nextEmail) {
    return json({ error: 'Novo email obrigatorio.' }, 400);
  }

  const collaboratorRow = await fetchRowById('public', 'colaboradores', id);
  if (!collaboratorRow) {
    return json({ error: 'Colaborador nao encontrado.' }, 404);
  }

  if (!isGlobalAdmin(collaborator) && (collaboratorRow.funcao === 'admin' || collaboratorRow.funcao === 'gestor')) {
    return json({ error: 'Apenas administradores podem alterar email de colaboradores admin ou gestor.' }, 403);
  }

  const emailRows = await sql!.unsafe(
    'select id from public.colaboradores where lower(trim(email)) = lower(trim($1)) and id <> $2 limit 1;',
    [nextEmail, id],
  );

  if (emailRows[0]) {
    return json({ error: 'Ja existe um colaborador com este email.' }, 400);
  }

  const updateAuthPayload: Record<string, unknown> = {
    email: nextEmail,
    email_confirm: true,
  };

  if (resetPassword === true) {
    updateAuthPayload.password = 'Kmacom.123';
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(id, updateAuthPayload);

  if (error) {
    return json({ error: mapAuthError(error.message || 'Falha ao atualizar email no Auth.') }, 400);
  }

  const rows = await sql!.unsafe(
    `
      update public.colaboradores
      set email = $2, atualizado_em = now()
      where id = $1
      returning *;
    `,
    [id, nextEmail],
  );

  return json({ row: rows[0] || null });
}

async function saveSystemAccess({
  payload,
  collaborator,
}: {
  payload: Record<string, unknown>;
  collaborator: Record<string, unknown>;
}) {
  const sanitized = sanitizeSystemAccessPayload(payload);
  const colaboradorId = typeof sanitized.colaborador_id === 'string' ? sanitized.colaborador_id : null;
  const sistemaId = typeof sanitized.sistema_id === 'string' ? sanitized.sistema_id : null;
  const nextAccessLevel = typeof sanitized.nivel_acesso === 'string' ? sanitized.nivel_acesso : 'usuario';

  if (!colaboradorId || !sistemaId) {
    return json({ error: 'Colaborador e sistema sao obrigatorios.' }, 400);
  }

  if (!isGlobalAdmin(collaborator) && nextAccessLevel === 'admin') {
    return json({ error: 'Apenas administradores podem liberar acesso admin aos sistemas.' }, 403);
  }

  const rows = await sql!.unsafe(
    `
      insert into public.acessos_usuario_sistema (
        colaborador_id,
        sistema_id,
        nivel_acesso,
        ativo
      )
      values ($1, $2, $3, $4)
      on conflict (colaborador_id, sistema_id)
      do update set
        nivel_acesso = excluded.nivel_acesso,
        ativo = excluded.ativo,
        atualizado_em = now()
      returning *;
    `,
    [
      colaboradorId,
      sistemaId,
      nextAccessLevel,
      sanitized.ativo ?? true,
    ],
  );

  await syncIntranetPermissionOnAccessChange(rows[0] || null);
  return json({ row: rows[0] || null });
}

async function updateSystemAccess({
  id,
  payload,
  collaborator,
}: {
  id?: string | null;
  payload: Record<string, unknown>;
  collaborator: Record<string, unknown>;
}) {
  if (!id) return json({ error: 'ID obrigatorio.' }, 400);

  const sanitized = sanitizeSystemAccessPayload(payload);
  delete sanitized.colaborador_id;
  delete sanitized.sistema_id;

  if (!Object.keys(sanitized).length) {
    return json({ error: 'Payload vazio.' }, 400);
  }

  if (!isGlobalAdmin(collaborator) && sanitized.nivel_acesso === 'admin') {
    return json({ error: 'Apenas administradores podem liberar acesso admin aos sistemas.' }, 403);
  }

  const sets = Object.keys(sanitized).map((field, index) => `${field} = $${index + 2}`);
  const values = [id, ...Object.values(sanitized)];
  const rows = await sql!.unsafe(
    `
      update public.acessos_usuario_sistema
      set ${sets.join(', ')}, atualizado_em = now()
      where id = $1
      returning *;
    `,
    values,
  );

  await syncIntranetPermissionOnAccessChange(rows[0] || null);
  return json({ row: rows[0] || null });
}

async function deleteSystemAccess(id?: string | null) {
  if (!id) return json({ error: 'ID obrigatorio.' }, 400);

  const beforeRow = await fetchRowById('public', 'acessos_usuario_sistema', id);
  if (beforeRow) {
    await syncIntranetPermissionOnAccessChange({
      ...beforeRow,
      ativo: false,
    });
  }

  await sql!.unsafe('delete from public.acessos_usuario_sistema where id = $1;', [id]);
  return json({ success: true });
}

async function saveCentralPermission(payload: Record<string, unknown> = {}) {
  const funcao = typeof payload.funcao === 'string' ? payload.funcao : null;
  const modulo = typeof payload.modulo === 'string' ? payload.modulo : null;
  const nivelAcesso = typeof payload.nivel_acesso === 'string' ? payload.nivel_acesso : 'sem';

  if (!funcao || !modulo) {
    return json({ error: 'Funcao e modulo sao obrigatorios.' }, 400);
  }

  const rows = await sql!.unsafe(
    `
      insert into gestao_ativos.permissoes_central (
        funcao,
        modulo,
        nivel_acesso
      )
      values ($1, $2, $3)
      on conflict (funcao, modulo)
      do update set
        nivel_acesso = excluded.nivel_acesso,
        atualizado_em = now()
      returning *;
    `,
    [funcao, modulo, nivelAcesso],
  );

  return json({ row: rows[0] || null });
}

async function saveReportsFunctionPermission(payload: Record<string, unknown> = {}) {
  const nivelAcesso = typeof payload.nivel_acesso === 'string' ? payload.nivel_acesso : null;
  const modulo = typeof payload.modulo === 'string' ? payload.modulo : null;
  const permissao = typeof payload.permissao === 'string' ? payload.permissao : 'sem';

  if (!nivelAcesso || !modulo) {
    return json({ error: 'Nivel de acesso e modulo sao obrigatorios.' }, 400);
  }

  const rows = await sql!.unsafe(
    `
      insert into gestao_relatorio.permissoes_funcoes (
        nivel_acesso,
        modulo,
        permissao
      )
      values ($1, $2, $3)
      on conflict (nivel_acesso, modulo)
      do update set
        permissao = excluded.permissao,
        atualizado_em = now()
      returning *;
    `,
    [nivelAcesso, modulo, permissao],
  );

  return json({ row: rows[0] || null });
}

function sanitizeAuditPayload(payload: Record<string, unknown> = {}) {
  const action = typeof payload.acao === 'string' ? payload.acao : '';
  const entity = typeof payload.entidade === 'string' ? payload.entidade.trim() : '';

  if (!AUDIT_ACTIONS.has(action)) {
    throw new Error('Acao de auditoria invalida.');
  }

  if (!entity) {
    throw new Error('Entidade de auditoria obrigatoria.');
  }

  return {
    action: action as AuditAction,
    entity,
    recordId: typeof payload.registro_id === 'string' && payload.registro_id ? payload.registro_id : null,
    before: payload.antes && typeof payload.antes === 'object' ? payload.antes as Record<string, unknown> : null,
    after: payload.depois && typeof payload.depois === 'object' ? payload.depois as Record<string, unknown> : null,
    metadata: payload.metadados && typeof payload.metadados === 'object' ? payload.metadados as Record<string, unknown> : {},
  };
}

async function insertAuditLog({
  payload,
  collaborator,
  userEmail,
}: {
  payload: Record<string, unknown>;
  collaborator: Record<string, unknown>;
  userEmail?: string | null;
}) {
  const sanitized = sanitizeAuditPayload(payload);
  const metadata = {
    source_app: 'console',
    origem: 'console',
    audit_scope: 'governanca',
    ...(sanitized.metadata || {}),
  };

  const rows = await sql!.unsafe(
    `
      insert into gestao_plataforma.logs_auditoria (
        entidade,
        acao,
        registro_id,
        responsavel_colaborador_id,
        responsavel_email,
        antes,
        depois,
        metadados
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
      returning *;
    `,
    [
      sanitized.entity,
      sanitized.action,
      sanitized.recordId,
      collaborator.id ?? null,
      userEmail || collaborator.email || null,
      sanitized.before ? JSON.stringify(sanitized.before) : null,
      sanitized.after ? JSON.stringify(sanitized.after) : null,
      JSON.stringify(metadata),
    ],
  );

  return rows[0] || null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    requireConfig();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return json({ error: 'Sessao expirada. Faca login novamente.', code: 'auth_required' }, 401);
    }

    const collaborator = await getAuthenticatedCollaborator({
      id: user.id,
      email: user.email ?? null,
    });

    const body = await request.json().catch(() => ({}));
    const { action, entity } = body || {};

    if (action === 'me' && entity === 'colaboradores') {
      const activeCollaborator = collaborator as Record<string, unknown> | null;
      const systemSlug = typeof body.system_slug === 'string' ? body.system_slug.trim() : '';
      const permissions = await getCentralPermissions(
        typeof activeCollaborator?.funcao === 'string' ? activeCollaborator.funcao : null,
      );
      const access = systemSlug
        ? await getSystemAccessForCollaborator({
            collaboratorId: typeof activeCollaborator?.id === 'string' ? activeCollaborator.id : null,
            systemSlug,
          })
        : null;

      return json({
        row: activeCollaborator || null,
        access,
        permissions,
      });
    }

    if (!canAccessPlataforma(collaborator)) {
      return json({ error: 'Acesso restrito ao MACOM Console.' }, 403);
    }
    const activeCollaborator = collaborator as Record<string, unknown>;

    if (action === 'create' && entity === 'logs_auditoria') {
      const row = await insertAuditLog({
        payload: body.payload || {},
        collaborator: activeCollaborator,
        userEmail: user.email ?? null,
      });

      return json({ row });
    }

    if (action === 'save' && entity === 'acessos_usuario_sistema') {
      return saveSystemAccess({
        payload: body.payload || {},
        collaborator: activeCollaborator,
      });
    }

    if (action === 'save' && entity === 'permissoes_central') {
      return saveCentralPermission(body.payload || {});
    }

    if (action === 'save' && entity === 'permissoes_funcoes_relatorios') {
      return saveReportsFunctionPermission(body.payload || {});
    }

    if (action === 'update' && entity === 'colaboradores') {
      return updateCollaboratorAccessProfile({
        id: typeof body.id === 'string' ? body.id : null,
        payload: body.payload || {},
        collaborator: activeCollaborator,
      });
    }

    if (action === 'update_password' && entity === 'colaboradores') {
      return updateCollaboratorPassword({
        id: typeof body.id === 'string' ? body.id : null,
        password: typeof body.password === 'string' ? body.password : null,
        collaborator: activeCollaborator,
      });
    }

    if (action === 'update_email' && entity === 'colaboradores') {
      return updateCollaboratorEmail({
        id: typeof body.id === 'string' ? body.id : null,
        email: typeof body.email === 'string' ? body.email : null,
        resetPassword: body.reset_password === true,
        collaborator: activeCollaborator,
      });
    }

    if (action === 'update' && entity === 'acessos_usuario_sistema') {
      return updateSystemAccess({
        id: typeof body.id === 'string' ? body.id : null,
        payload: body.payload || {},
        collaborator: activeCollaborator,
      });
    }

    if (action === 'delete' && entity === 'acessos_usuario_sistema') {
      return deleteSystemAccess(typeof body.id === 'string' ? body.id : null);
    }

    if (action !== 'list' || !(entity in ENTITY_CONFIG)) {
      return json({ error: 'Acao ou entidade invalida.' }, 400);
    }

    const entityKey = entity as EntityKey;
    const config = ENTITY_CONFIG[entityKey];
    const filters = sanitizeFilters(entityKey, body.filters || {});
    const { clauses, values } = buildSqlFilters(filters);
    const whereSql = clauses.length ? `where ${clauses.join(' and ')}` : '';
    const rawLimit = typeof body.limit === 'number' ? body.limit : Number(body.limit);
    const rawOffset = typeof body.offset === 'number' ? body.offset : Number(body.offset);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : null;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const totalRows = await sql!.unsafe(
      `select count(*)::int as total from ${config.schema}.${config.table} l ${whereSql};`,
      values,
    );
    const paginatedSql = limit != null
      ? `
          select *
          from ${config.schema}.${config.table} l
          ${whereSql}
          order by l.${config.orderBy} ${config.orderDirection}
          limit ${limit} offset ${offset};
        `
      : `
          select *
          from ${config.schema}.${config.table} l
          ${whereSql}
          order by l.${config.orderBy} ${config.orderDirection};
        `;
    const rows = await sql!.unsafe(paginatedSql, values);

    return json({
      rows,
      total: totalRows[0]?.total ?? rows.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('plataforma-api error', error);
    return json({ error: error instanceof Error ? error.message : 'Falha na API da plataforma.' }, 500);
  }
});
