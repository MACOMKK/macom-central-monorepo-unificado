import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3.4.7";

const INTRANET_SYSTEM_SLUG = "intranet";
const TRUSTED_IP_USER_ID = "00000000-0000-0000-0000-000000000000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SqlClient = ReturnType<typeof postgres>;
type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type CurrentUser = {
  id: string;
  collaborator_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string;
  access_level: string | null;
  position?: string | null;
  function_role?: string | null;
  status?: string | null;
  permissions: Record<string, string>;
  backend_status: "ok";
  backend_reason: null;
  backend_error_detail: null;
  auth_mode?: "supabase" | "trusted_ip";
  trusted_ip_access_id?: string | null;
  client_ip?: string | null;
};

let sqlClient: SqlClient | null = null;

function normalizeAccessLevel(value: string | null | undefined) {
  if (!value) return "user";
  if (value === "admin") return "admin";
  if (value === "usuario") return "user";
  return value;
}

function normalizePermissionLevel(value: unknown) {
  return ["none", "view", "edit"].includes(String(value)) ? String(value) : "view";
}

function formatDateOnly(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  return String(value).slice(0, 10) || null;
}

function normalizeRecurrence(value: unknown) {
  const recurrence = String(value || "none");
  return ["none", "weekly", "monthly"].includes(recurrence) ? recurrence : "none";
}

function normalizeDateArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => formatDateOnly(item)).filter(Boolean)));
}

function normalizeIdArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
}

function normalizeNullableTextInput(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeStringArrayInput(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeJsonObjectInput(value: unknown) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function createAccessError(message: string, code: string, status = 403) {
  const error = new Error(message);
  Object.assign(error, { code, status });
  return error;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: (error as Error & { details?: string }).details ?? null,
      hint: (error as Error & { hint?: string }).hint ?? null,
      code: (error as Error & { code?: string }).code ?? null,
      status: (error as Error & { status?: number }).status ?? 500,
    };
  }

  return {
    message: "Unexpected error",
    details: null,
    hint: null,
    code: null,
    status: 500,
  };
}

function getForwardedIp(value: string | null) {
  if (!value) return null;

  const firstValue = value.split(",").map((item) => item.trim()).find(Boolean);
  if (!firstValue) return null;

  if (firstValue.startsWith("[") && firstValue.includes("]")) {
    return firstValue.slice(1, firstValue.indexOf("]"));
  }

  const withoutForwardedPrefix = firstValue.match(/for="?([^";,\s]+)"?/i)?.[1] || firstValue;
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(withoutForwardedPrefix)) {
    return withoutForwardedPrefix.slice(0, withoutForwardedPrefix.lastIndexOf(":"));
  }

  return withoutForwardedPrefix.replace(/^"|"$/g, "");
}

function getClientIp(req: Request) {
  return (
    getForwardedIp(req.headers.get("cf-connecting-ip")) ||
    getForwardedIp(req.headers.get("x-real-ip")) ||
    getForwardedIp(req.headers.get("x-forwarded-for")) ||
    getForwardedIp(req.headers.get("forwarded"))
  );
}

function createAuthSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization") ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing for intranet-api.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getSqlClient() {
  const databaseUrl = Deno.env.get("DATABASE_URL") ?? Deno.env.get("SUPABASE_DB_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or SUPABASE_DB_URL is required for intranet-api.");
  }

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      prepare: false,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
    });
  }

  return sqlClient;
}

function getDisplayName(authUser: AuthUser) {
  const metadataName = typeof authUser.user_metadata?.full_name === "string"
    ? authUser.user_metadata.full_name
    : null;
  return metadataName || authUser.email?.split("@")[0] || "Usuario";
}

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toKey(value: unknown) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const DEPARTMENT_ALIASES: Record<string, string[]> = {
  diretoria: ["diretoria"],
  rh: ["rh", "recursos_humanos", "recursos_humanos_rh"],
  ti: ["ti", "tecnologia", "tecnologia_da_informacao"],
  financeiro: ["financeiro"],
  vendas: ["vendas", "comercial"],
  pos_vendas: ["pos_vendas", "posvendas"],
  marketing: ["marketing"],
  administrativo: ["administrativo", "administracao"],
};

const UNIT_ALIASES: Record<string, string[]> = {
  ananindeua: ["ananindeua"],
  belem: ["belem", "belem_pa", "mitsubishi_macom_belem"],
  paragominas: ["paragominas"],
};

function resolveAlias(aliases: Record<string, string[]>, input: unknown) {
  const normalized = toKey(input);
  return Object.entries(aliases).find(([, values]) => values.includes(normalized))?.[0] || normalized;
}

function departmentKeyFromRecord(record: Record<string, unknown>) {
  return resolveAlias(DEPARTMENT_ALIASES, record.nome || record.descricao || "");
}

function unitKeyFromRecord(record: Record<string, unknown>) {
  return resolveAlias(UNIT_ALIASES, record.cidade || record.nome || "");
}

async function getCurrentAuthUser(req: Request) {
  const supabase = createAuthSupabaseClient(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    const normalized = new Error(error.message || "Auth error");
    Object.assign(normalized, error);
    throw normalized;
  }

  return user as AuthUser | null;
}

async function resolveTrustedIpUser(req: Request, sql: SqlClient): Promise<CurrentUser | null> {
  const clientIp = getClientIp(req);
  if (!clientIp) return null;

  try {
    const rows = await sql<Array<Record<string, any>>>`
      select
        id,
        nome,
        nivel_acesso,
        mod_avisos,
        mod_links,
        mod_colaboradores,
        mod_documentos,
        mod_calendario,
        mod_conhecimento,
        mod_feedback
      from gestao_intranet.acessos_ip_confiavel
      where ativo = true
        and ${clientIp}::inet <<= ip_cidr
      order by criado_em desc
      limit 1
    `;

    const row = rows[0];
    if (!row) return null;

    await sql`
      update gestao_intranet.acessos_ip_confiavel
      set ultimo_ip = ${clientIp},
          ultimo_acesso_em = now()
      where id = ${row.id}::uuid
    `;

    const accessLevel = normalizeAccessLevel(row.nivel_acesso);

    return {
      id: TRUSTED_IP_USER_ID,
      collaborator_id: null,
      email: null,
      full_name: row.nome || "Acesso automatico por rede",
      role: accessLevel,
      access_level: row.nivel_acesso || null,
      position: "Rede liberada",
      function_role: "trusted_ip",
      status: "ativo",
      permissions: {
        avisos: normalizePermissionLevel(row.mod_avisos),
        links: normalizePermissionLevel(row.mod_links),
        colaboradores: normalizePermissionLevel(row.mod_colaboradores),
        documentos: normalizePermissionLevel(row.mod_documentos),
        calendario: normalizePermissionLevel(row.mod_calendario),
        conhecimento: normalizePermissionLevel(row.mod_conhecimento),
        feedback: normalizePermissionLevel(row.mod_feedback),
      },
      backend_status: "ok",
      backend_reason: null,
      backend_error_detail: null,
      auth_mode: "trusted_ip",
      trusted_ip_access_id: row.id,
      client_ip: clientIp,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    if (normalized.code === "42P01") {
      return null;
    }
    throw error;
  }
}

async function resolveCurrentUser(req: Request): Promise<CurrentUser | null> {
  const sql = getSqlClient();
  let authUser: AuthUser | null = null;

  try {
    authUser = await getCurrentAuthUser(req);
  } catch (error) {
    const trustedIpUser = await resolveTrustedIpUser(req, sql);
    if (trustedIpUser) return trustedIpUser;
    throw error;
  }

  if (!authUser) {
    return resolveTrustedIpUser(req, sql);
  }

  const rowsById = await sql<Array<Record<string, any>>>`
    select
      c.id,
      c.nome,
      c.email,
      c.cargo,
      c.funcao,
      c.status,
      aus.nivel_acesso,
      pu.mod_avisos,
      pu.mod_links,
      pu.mod_colaboradores,
      pu.mod_documentos,
      pu.mod_calendario,
      pu.mod_conhecimento,
      pu.mod_feedback
    from public.colaboradores c
    left join public.sistemas s
      on s.slug = ${INTRANET_SYSTEM_SLUG}
     and s.ativo = true
    left join public.acessos_usuario_sistema aus
      on aus.colaborador_id = c.id
     and aus.sistema_id = s.id
     and aus.ativo = true
    left join gestao_intranet.permissoes_usuario pu
      on pu.colaborador_id = c.id
    where c.id = ${authUser.id}::uuid
    limit 1
  `;

  let row = rowsById[0] || null;

  if (!row && authUser.email) {
    const rowsByEmail = await sql<Array<Record<string, any>>>`
      select
        c.id,
        c.nome,
        c.email,
        c.cargo,
        c.funcao,
        c.status,
        aus.nivel_acesso,
        pu.mod_avisos,
        pu.mod_links,
        pu.mod_colaboradores,
        pu.mod_documentos,
        pu.mod_calendario,
        pu.mod_conhecimento,
        pu.mod_feedback
      from public.colaboradores c
      left join public.sistemas s
        on s.slug = ${INTRANET_SYSTEM_SLUG}
       and s.ativo = true
      left join public.acessos_usuario_sistema aus
        on aus.colaborador_id = c.id
       and aus.sistema_id = s.id
       and aus.ativo = true
      left join gestao_intranet.permissoes_usuario pu
        on pu.colaborador_id = c.id
      where lower(trim(c.email)) = lower(trim(${authUser.email}))
      limit 1
    `;

    row = rowsByEmail[0] || null;
  }

  if (!row) {
    throw createAccessError(
      "Seu usuario autenticado nao esta vinculado a um colaborador da intranet.",
      "INTRANET_COLLABORATOR_NOT_FOUND",
    );
  }

  if (row.status !== "ativo") {
    throw createAccessError(
      "Seu cadastro de colaborador esta inativo e o acesso a intranet foi bloqueado.",
      "INTRANET_COLLABORATOR_INACTIVE",
    );
  }

  if (!row.nivel_acesso) {
    throw createAccessError(
      "Seu colaborador esta ativo, mas nao possui acesso liberado para a intranet.",
      "INTRANET_SYSTEM_ACCESS_NOT_GRANTED",
    );
  }

  const accessLevel = normalizeAccessLevel(row.nivel_acesso);

  return {
    id: authUser.id,
    collaborator_id: row.id,
    email: row.email || authUser.email || null,
    full_name: row.nome || getDisplayName(authUser),
    role: accessLevel,
    access_level: row.nivel_acesso || null,
    position: row.cargo || null,
    function_role: row.funcao || null,
    status: row.status || null,
    permissions: {
      avisos: row.mod_avisos || "view",
      links: row.mod_links || "view",
      colaboradores: row.mod_colaboradores || "view",
      documentos: row.mod_documentos || "view",
      calendario: row.mod_calendario || "view",
      conhecimento: row.mod_conhecimento || "view",
      feedback: row.mod_feedback || "view",
    },
    backend_status: "ok",
    backend_reason: null,
    backend_error_detail: null,
    auth_mode: "supabase",
    trusted_ip_access_id: null,
    client_ip: getClientIp(req),
  };
}

function requireUser(currentUser: CurrentUser | null) {
  if (!currentUser) {
    const error = new Error("Authentication required.");
    Object.assign(error, { status: 401 });
    throw error;
  }
  return currentUser;
}

function canEditModule(currentUser: CurrentUser, module: string) {
  return currentUser.role === "admin" || currentUser.permissions?.[module] === "edit";
}

function assertModuleEdit(currentUser: CurrentUser, module: string) {
  if (!canEditModule(currentUser, module)) {
    const error = new Error(`Edit access denied for module: ${module}`);
    Object.assign(error, { status: 403 });
    throw error;
  }
}

function assertAdmin(currentUser: CurrentUser) {
  if (currentUser.role !== "admin") {
    const error = new Error("Admin access required.");
    Object.assign(error, { status: 403 });
    throw error;
  }
}

async function listDepartments(sql: SqlClient) {
  const rows = await sql<Array<Record<string, any>>>`
    select id, nome, descricao
    from public.departamentos
    order by nome asc
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    description: row.descricao,
    key: departmentKeyFromRecord(row),
  }));
}

async function listUnits(sql: SqlClient) {
  const rows = await sql<Array<Record<string, any>>>`
    select id, nome, cidade
    from public.unidades
    where ativo = true
    order by nome asc
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    city: row.cidade,
    key: unitKeyFromRecord(row),
  }));
}

async function resolveDepartmentId(sql: SqlClient, input: unknown) {
  if (!input) return null;
  const departments = await listDepartments(sql);
  const normalized = toKey(input);
  return (
    departments.find((item) =>
      item.id === input || item.key === normalized || toKey(item.name) === normalized
    )?.id || null
  );
}

async function resolveUnitId(sql: SqlClient, input: unknown) {
  if (!input) return null;
  const units = await listUnits(sql);
  const normalized = toKey(input);
  return (
    units.find((item) =>
      item.id === input ||
      item.key === normalized ||
      toKey(item.name) === normalized ||
      toKey(item.city) === normalized
    )?.id || null
  );
}

function coalesceOrder(orderBy: string | undefined, allowed: Record<string, string>, fallback: string) {
  const value = orderBy || fallback;
  const ascending = !value.startsWith("-");
  const key = ascending ? value : value.slice(1);
  const column = allowed[key] || allowed[fallback.replace(/^-/, "")] || Object.values(allowed)[0];
  return { column, ascending };
}

function orderSql(sql: SqlClient, orderBy: string | undefined, allowed: Record<string, string>, fallback: string) {
  const { column, ascending } = coalesceOrder(orderBy, allowed, fallback);
  return sql`${sql.unsafe(column)} ${ascending ? sql`asc` : sql`desc`}`;
}

function limitValue(limit?: number, fallback = 100) {
  if (!limit || Number.isNaN(Number(limit))) return fallback;
  return Math.max(1, Math.min(Number(limit), 500));
}

function mapPermissionRow(row: Record<string, any>) {
  return {
    id: row.id,
    collaborator_id: row.colaborador_id,
    user_email: row.user_email || null,
    full_name: row.full_name || null,
    created_by_id: row.criado_por || null,
    created_date: row.criado_em || null,
    updated_date: row.atualizado_em || null,
    modules: {
      avisos: row.mod_avisos,
      links: row.mod_links,
      colaboradores: row.mod_colaboradores,
      documentos: row.mod_documentos,
      calendario: row.mod_calendario,
      conhecimento: row.mod_conhecimento,
      feedback: row.mod_feedback,
    },
  };
}

async function listAnnouncements(sql: SqlClient, orderBy?: string, limit?: number) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      a.id,
      a.titulo,
      a.conteudo,
      a.categoria,
      a.prioridade,
      a.fixado,
      a.expira_em,
      a.criado_em,
      a.atualizado_em,
      a.criado_por,
      c.email as created_by_email,
      c.nome as created_by_name
    from gestao_intranet.avisos a
    left join public.colaboradores c on c.id = a.criado_por
    order by ${orderSql(sql, orderBy, {
      created_date: "a.criado_em",
      updated_date: "a.atualizado_em",
      title: "a.titulo",
      category: "a.categoria",
      priority: "a.prioridade",
      pinned: "a.fixado",
    }, "-created_date")}
    limit ${limitValue(limit, 50)}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.titulo,
    content: row.conteudo,
    category: row.categoria,
    priority: row.prioridade,
    pinned: row.fixado,
    expiration_date: row.expira_em,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: row.created_by_email || row.created_by_name || null,
    created_by_id: row.criado_por,
  }));
}

async function listAnnouncementComments(sql: SqlClient, announcementId?: string) {
  const rows = announcementId
    ? await sql<Array<Record<string, any>>>`
        select
          ac.id,
          ac.aviso_id,
          ac.conteudo,
          ac.criado_em,
          ac.atualizado_em,
          ac.criado_por,
          c.email as created_by_email,
          c.nome as created_by_name
        from gestao_intranet.comentarios_avisos ac
        left join public.colaboradores c on c.id = ac.criado_por
        where ac.aviso_id = ${announcementId}::uuid
        order by ac.criado_em asc
      `
    : await sql<Array<Record<string, any>>>`
        select
          ac.id,
          ac.aviso_id,
          ac.conteudo,
          ac.criado_em,
          ac.atualizado_em,
          ac.criado_por,
          c.email as created_by_email,
          c.nome as created_by_name
        from gestao_intranet.comentarios_avisos ac
        left join public.colaboradores c on c.id = ac.criado_por
        order by ac.criado_em asc
      `;

  return rows.map((row) => ({
    id: row.id,
    announcement_id: row.aviso_id,
    content: row.conteudo,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: row.created_by_email || row.created_by_name || null,
    created_by_name: row.created_by_name || null,
    created_by_id: row.criado_por,
  }));
}

async function listAnnouncementReactions(sql: SqlClient, announcementId?: string) {
  const rows = announcementId
    ? await sql<Array<Record<string, any>>>`
        select
          ar.id,
          ar.aviso_id,
          ar.emoji,
          ar.criado_em,
          ar.atualizado_em,
          ar.criado_por,
          c.email as created_by_email,
          c.nome as created_by_name
        from gestao_intranet.reacoes_avisos ar
        left join public.colaboradores c on c.id = ar.criado_por
        where ar.aviso_id = ${announcementId}::uuid
        order by ar.criado_em asc
      `
    : await sql<Array<Record<string, any>>>`
        select
          ar.id,
          ar.aviso_id,
          ar.emoji,
          ar.criado_em,
          ar.atualizado_em,
          ar.criado_por,
          c.email as created_by_email,
          c.nome as created_by_name
        from gestao_intranet.reacoes_avisos ar
        left join public.colaboradores c on c.id = ar.criado_por
        order by ar.criado_em asc
      `;

  return rows.map((row) => ({
    id: row.id,
    announcement_id: row.aviso_id,
    emoji: row.emoji,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: row.created_by_email || row.created_by_name || null,
    created_by_id: row.criado_por,
  }));
}

async function listQuickLinks(sql: SqlClient, orderBy?: string, limit?: number) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      l.id,
      l.nome,
      l.url,
      l.descricao,
      l.icone,
      l.categoria,
      l.mostrar_na_dashboard,
      l.criado_em,
      l.atualizado_em,
      l.criado_por,
      c.email as created_by_email,
      c.nome as created_by_name
    from gestao_intranet.links_uteis l
    left join public.colaboradores c on c.id = l.criado_por
    order by ${orderSql(sql, orderBy, {
      created_date: "l.criado_em",
      updated_date: "l.atualizado_em",
      category: "l.categoria",
    }, "created_date")}
    limit ${limitValue(limit, 100)}
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    url: row.url,
    description: row.descricao,
    icon: row.icone,
    category: row.categoria,
    show_on_dashboard: row.mostrar_na_dashboard,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: row.created_by_email || row.created_by_name || null,
    created_by_id: row.criado_por,
  }));
}

async function listCalendarParticipants(sql: SqlClient, eventIds: string[]) {
  const ids = normalizeIdArray(eventIds);
  if (ids.length === 0) return new Map<string, Record<string, any>[]>();

  const rows = await sql<Array<Record<string, any>>>`
    select
      p.evento_id,
      p.colaborador_id,
      p.status,
      c.nome,
      c.email
    from gestao_intranet.eventos_calendario_participantes p
    left join public.colaboradores c on c.id = p.colaborador_id
    where p.evento_id = any(${ids}::uuid[])
    order by c.nome asc nulls last, c.email asc nulls last
  `;

  const participantsByEvent = new Map<string, Record<string, any>[]>();
  rows.forEach((row) => {
    const eventId = String(row.evento_id || "");
    const participants = participantsByEvent.get(eventId) || [];
    participants.push({
      id: row.colaborador_id,
      collaborator_id: row.colaborador_id,
      name: row.nome,
      email: row.email,
      status: row.status || "convidado",
    });
    participantsByEvent.set(eventId, participants);
  });
  return participantsByEvent;
}

async function syncCalendarParticipants(sql: SqlClient, eventId: string, participantIds: unknown) {
  const ids = normalizeIdArray(participantIds);
  await sql`delete from gestao_intranet.eventos_calendario_participantes where evento_id = ${eventId}::uuid`;
  if (ids.length === 0) return;

  await sql`
    insert into gestao_intranet.eventos_calendario_participantes (evento_id, colaborador_id, status)
    select ${eventId}::uuid, unnest(${ids}::uuid[]), 'convidado'
    on conflict (evento_id, colaborador_id) do nothing
  `;
}

async function listCalendarEvents(sql: SqlClient, orderBy?: string, limit?: number) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      e.id,
      e.titulo,
      e.descricao,
      e.data_evento,
      e.horario,
      e.tipo,
      e.local,
      e.recorrencia_tipo,
      e.recorrencia_fim,
      e.recorrencia_ativa,
      e.recorrencia_cancelamentos,
      e.departamento_id,
      d.nome as department_name,
      d.descricao as department_description,
      e.unidade_id,
      u.nome as unit_name,
      u.cidade as unit_city,
      e.criado_em,
      e.atualizado_em,
      e.criado_por,
      c.email as created_by_email,
      c.nome as created_by_name
    from gestao_intranet.eventos_calendario e
    left join public.departamentos d on d.id = e.departamento_id
    left join public.unidades u on u.id = e.unidade_id
    left join public.colaboradores c on c.id = e.criado_por
    order by ${orderSql(sql, orderBy, {
      date: "e.data_evento",
      created_date: "e.criado_em",
      updated_date: "e.atualizado_em",
      type: "e.tipo",
    }, "date")}
    limit ${limitValue(limit, 200)}
  `;

  const participantsByEvent = await listCalendarParticipants(sql, rows.map((row) => String(row.id)));

  return rows.map((row) => ({
    id: row.id,
    title: row.titulo,
    description: row.descricao,
    date: row.data_evento,
    time: row.horario,
    type: row.tipo,
    location: row.local,
    recurrence: normalizeRecurrence(row.recorrencia_tipo),
    recurrence_until: formatDateOnly(row.recorrencia_fim),
    recurrence_active: row.recorrencia_ativa !== false,
    recurrence_cancelled_dates: normalizeDateArray(row.recorrencia_cancelamentos),
    department_id: row.departamento_id,
    department: row.department_name ? departmentKeyFromRecord({ nome: row.department_name, descricao: row.department_description }) : null,
    department_name: row.department_name || null,
    unit_id: row.unidade_id,
    unit: row.unit_city || row.unit_name ? unitKeyFromRecord({ nome: row.unit_name, cidade: row.unit_city }) : null,
    unit_name: row.unit_city || row.unit_name || null,
    participants: participantsByEvent.get(String(row.id)) || [],
    participant_ids: (participantsByEvent.get(String(row.id)) || []).map((participant) => participant.collaborator_id || participant.id),
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: row.created_by_email || row.created_by_name || null,
    created_by_id: row.criado_por,
  }));
}

async function listDocuments(sql: SqlClient, orderBy?: string, limit?: number) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      d.id,
      d.titulo,
      d.descricao,
      d.arquivo_url,
      d.categoria,
      d.departamento_id,
      dp.nome as department_name,
      dp.descricao as department_description,
      d.criado_em,
      d.atualizado_em,
      d.criado_por,
      c.email as created_by_email,
      c.nome as created_by_name
    from gestao_intranet.documentos d
    left join public.departamentos dp on dp.id = d.departamento_id
    left join public.colaboradores c on c.id = d.criado_por
    order by ${orderSql(sql, orderBy, {
      created_date: "d.criado_em",
      updated_date: "d.atualizado_em",
      category: "d.categoria",
    }, "-created_date")}
    limit ${limitValue(limit, 100)}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.titulo,
    description: row.descricao,
    file_url: row.arquivo_url,
    category: row.categoria,
    department_id: row.departamento_id,
    department: row.department_name ? departmentKeyFromRecord({ nome: row.department_name, descricao: row.department_description }) : null,
    department_name: row.department_name || null,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: row.created_by_email || row.created_by_name || null,
    created_by_id: row.criado_por,
  }));
}

async function listEmployees(sql: SqlClient) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      c.id,
      c.nome,
      c.email,
      c.telefone,
      c.departamento_id,
      d.nome as department_name,
      d.descricao as department_description,
      c.cargo,
      c.funcao,
      c.unidade_id,
      u.nome as unit_name,
      u.cidade as unit_city,
      c.data_nascimento,
      c.status,
      c.criado_em,
      c.atualizado_em,
      p.foto_url,
      p.bio,
      p.frase_status,
      p.linkedin_url,
      p.whatsapp_url,
      p.localizacao_interna,
      p.habilidades,
      p.interesses,
      p.preferencias,
      aus.nivel_acesso
    from public.colaboradores c
    left join public.departamentos d on d.id = c.departamento_id
    left join public.unidades u on u.id = c.unidade_id
    left join gestao_intranet.perfis_colaboradores p on p.colaborador_id = c.id
    left join public.sistemas s on s.slug = ${INTRANET_SYSTEM_SLUG} and s.ativo = true
    left join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.sistema_id = s.id and aus.ativo = true
    order by c.nome asc
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    email: row.email,
    phone: row.telefone,
    department_id: row.departamento_id,
    department: row.department_name ? departmentKeyFromRecord({ nome: row.department_name, descricao: row.department_description }) : null,
    department_name: row.department_name || null,
    position: row.cargo,
    function_role: row.funcao,
    unit_id: row.unidade_id,
    unit: row.unit_city || row.unit_name ? unitKeyFromRecord({ nome: row.unit_name, cidade: row.unit_city }) : null,
    unit_name: row.unit_city || row.unit_name || null,
    photo_url: row.foto_url,
    bio: row.bio || null,
    status_message: row.frase_status || null,
    linkedin_url: row.linkedin_url || null,
    whatsapp_url: row.whatsapp_url || null,
    office_location: row.localizacao_interna || null,
    skills: Array.isArray(row.habilidades) ? row.habilidades : [],
    interests: Array.isArray(row.interesses) ? row.interesses : [],
    preferences: row.preferencias && typeof row.preferencias === "object" ? row.preferencias : {},
    birth_date: formatDateOnly(row.data_nascimento),
    status: row.status,
    role: normalizeAccessLevel(row.nivel_acesso),
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
  }));
}

async function listUsers(sql: SqlClient) {
  const employees = await listEmployees(sql);
  return employees.map((employee) => ({
    id: employee.id,
    email: employee.email,
    full_name: employee.name,
    role: employee.role,
  }));
}

async function listFeedback(sql: SqlClient, orderBy?: string, limit?: number) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      f.id,
      f.tipo,
      f.categoria,
      f.titulo,
      f.conteudo,
      f.anonimo,
      f.status,
      f.resposta_admin,
      f.criado_em,
      f.atualizado_em,
      f.criado_por,
      c.email as created_by_email,
      c.nome as created_by_name
    from gestao_intranet.feedback f
    left join public.colaboradores c on c.id = f.criado_por
    order by ${orderSql(sql, orderBy, {
      created_date: "f.criado_em",
      updated_date: "f.atualizado_em",
      type: "f.tipo",
      category: "f.categoria",
      status: "f.status",
    }, "-created_date")}
    limit ${limitValue(limit, 100)}
  `;

  return rows.map((row) => ({
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
    created_by: row.anonimo ? null : row.created_by_email || row.created_by_name || null,
    created_by_id: row.criado_por,
  }));
}

async function listKnowledgeBase(sql: SqlClient, orderBy?: string, limit?: number) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      k.id,
      k.titulo,
      k.conteudo,
      k.categoria,
      k.tipo,
      k.tags,
      k.fixado,
      k.contador_util,
      k.criado_em,
      k.atualizado_em,
      k.criado_por,
      c.email as created_by_email,
      c.nome as created_by_name
    from gestao_intranet.base_conhecimento k
    left join public.colaboradores c on c.id = k.criado_por
    order by ${orderSql(sql, orderBy, {
      created_date: "k.criado_em",
      updated_date: "k.atualizado_em",
      category: "k.categoria",
      type: "k.tipo",
      pinned: "k.fixado",
    }, "-created_date")}
    limit ${limitValue(limit, 200)}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.titulo,
    content: row.conteudo,
    category: row.categoria,
    type: row.tipo,
    tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
    pinned: row.fixado,
    helpful_count: row.contador_util,
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
    created_by: row.created_by_email || row.created_by_name || null,
    created_by_id: row.criado_por,
  }));
}

async function listUserPermissions(sql: SqlClient) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      pu.*,
      c.email as user_email,
      c.nome as full_name
    from gestao_intranet.permissoes_usuario pu
    left join public.colaboradores c on c.id = pu.colaborador_id
    order by c.nome asc nulls last, c.email asc nulls last
  `;

  return rows.map(mapPermissionRow);
}

async function listTrustedIpAccesses(sql: SqlClient) {
  const rows = await sql<Array<Record<string, any>>>`
    select
      id,
      nome,
      descricao,
      ip_cidr::text as ip_cidr,
      nivel_acesso,
      mod_avisos,
      mod_links,
      mod_colaboradores,
      mod_documentos,
      mod_calendario,
      mod_conhecimento,
      mod_feedback,
      ativo,
      ultimo_ip,
      ultimo_acesso_em,
      criado_em,
      atualizado_em
    from gestao_intranet.acessos_ip_confiavel
    order by nome asc
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    description: row.descricao || null,
    ip_cidr: row.ip_cidr,
    access_level: row.nivel_acesso,
    active: Boolean(row.ativo),
    last_ip: row.ultimo_ip || null,
    last_access_date: row.ultimo_acesso_em || null,
    modules: {
      avisos: row.mod_avisos || "view",
      links: row.mod_links || "view",
      colaboradores: row.mod_colaboradores || "view",
      documentos: row.mod_documentos || "view",
      calendario: row.mod_calendario || "view",
      conhecimento: row.mod_conhecimento || "view",
      feedback: row.mod_feedback || "view",
    },
    created_date: row.criado_em,
    updated_date: row.atualizado_em,
  }));
}

async function filterUserPermissions(sql: SqlClient, filters?: Record<string, unknown>) {
  if (filters?.collaborator_id) {
    const rows = await sql<Array<Record<string, any>>>`
      select
        pu.*,
        c.email as user_email,
        c.nome as full_name
      from gestao_intranet.permissoes_usuario pu
      left join public.colaboradores c on c.id = pu.colaborador_id
      where pu.colaborador_id = ${String(filters.collaborator_id)}::uuid
    `;
    return rows.map(mapPermissionRow);
  }

  return listUserPermissions(sql);
}

async function createAnnouncement(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "avisos");
  const rows = await sql<Array<Record<string, any>>>`
    insert into gestao_intranet.avisos (titulo, conteudo, categoria, prioridade, fixado, expira_em, criado_por)
    values (
      ${payload.title},
      ${payload.content},
      ${payload.category || "geral"},
      ${payload.priority || "media"},
      ${Boolean(payload.pinned)},
      ${payload.expiration_date || null},
      ${currentUser.collaborator_id}::uuid
    )
    returning id
  `;
  return (await listAnnouncements(sql, "-created_date", 1)).find((item) => item.id === rows[0]?.id) || null;
}

async function updateAnnouncement(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "avisos");
  const expirationValue = Object.prototype.hasOwnProperty.call(payload, "expiration_date")
    ? sql`${payload.expiration_date || null}::date`
    : sql`expira_em`;
  await sql`
    update gestao_intranet.avisos
    set
      titulo = coalesce(${payload.title ?? null}, titulo),
      conteudo = coalesce(${payload.content ?? null}, conteudo),
      categoria = coalesce(${payload.category ?? null}, categoria),
      prioridade = coalesce(${payload.priority ?? null}, prioridade),
      fixado = coalesce(${payload.pinned ?? null}, fixado),
      expira_em = ${expirationValue},
      atualizado_em = now()
    where id = ${id}::uuid
  `;
  return (await listAnnouncements(sql, "-created_date", 100)).find((item) => item.id === id) || null;
}

async function createComment(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  requireUser(currentUser);
  const rows = await sql<Array<Record<string, any>>>`
    insert into gestao_intranet.comentarios_avisos (aviso_id, conteudo, criado_por)
    values (${payload.announcement_id}::uuid, ${payload.content}, ${currentUser.collaborator_id}::uuid)
    returning id
  `;
  return (await listAnnouncementComments(sql, payload.announcement_id)).find((item) => item.id === rows[0]?.id) || null;
}

async function createReaction(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  requireUser(currentUser);
  const existing = await sql<Array<Record<string, any>>>`
    select id
    from gestao_intranet.reacoes_avisos
    where aviso_id = ${payload.announcement_id}::uuid
      and emoji = ${payload.emoji}
      and criado_por = ${currentUser.collaborator_id}::uuid
    limit 1
  `;

  const reactionId = existing[0]?.id || (
    await sql<Array<Record<string, any>>>`
      insert into gestao_intranet.reacoes_avisos (aviso_id, emoji, criado_por)
      values (${payload.announcement_id}::uuid, ${payload.emoji}, ${currentUser.collaborator_id}::uuid)
      returning id
    `
  )[0]?.id;

  return (await listAnnouncementReactions(sql, payload.announcement_id)).find((item) => item.id === reactionId) || null;
}

async function createQuickLink(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "links");
  await sql`
    insert into gestao_intranet.links_uteis (
      nome, url, descricao, icone, categoria, mostrar_na_dashboard, criado_por
    )
    values (
      ${payload.name},
      ${payload.url},
      ${payload.description || null},
      ${payload.icon || null},
      ${payload.category || "sistema"},
      ${Boolean(payload.show_on_dashboard)},
      ${currentUser.collaborator_id}::uuid
    )
  `;
  return null;
}

async function updateQuickLink(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "links");
  await sql`
    update gestao_intranet.links_uteis
    set
      nome = coalesce(${payload.name ?? null}, nome),
      url = coalesce(${payload.url ?? null}, url),
      descricao = coalesce(${payload.description ?? null}, descricao),
      icone = coalesce(${payload.icon ?? null}, icone),
      categoria = coalesce(${payload.category ?? null}, categoria),
      mostrar_na_dashboard = coalesce(${payload.show_on_dashboard ?? null}, mostrar_na_dashboard),
      atualizado_em = now()
    where id = ${id}::uuid
  `;
  return (await listQuickLinks(sql, "created_date", 100)).find((item) => item.id === id) || null;
}

async function createCalendarEvent(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "calendario");
  const departmentId = await resolveDepartmentId(sql, payload.department || payload.department_id);
  const unitId = await resolveUnitId(sql, payload.unit || payload.unit_id);
  const rows = await sql<Array<{ id: string }>>`
    insert into gestao_intranet.eventos_calendario (
      titulo, descricao, data_evento, horario, tipo, local, recorrencia_tipo, recorrencia_fim, recorrencia_ativa, departamento_id, unidade_id, criado_por
    )
    values (
      ${payload.title},
      ${payload.description || null},
      ${payload.date},
      ${payload.time || null},
      ${payload.type || "evento"},
      ${payload.location || null},
      ${normalizeRecurrence(payload.recurrence)},
      ${payload.recurrence_until || null},
      ${payload.recurrence_active !== false},
      ${departmentId}::uuid,
      ${unitId}::uuid,
      ${currentUser.collaborator_id}::uuid
    )
    returning id
  `;
  if ("participants" in payload || "participant_ids" in payload) {
    await syncCalendarParticipants(sql, rows[0]?.id, payload.participant_ids || payload.participants || []);
  }
  return (await listCalendarEvents(sql, "date", 1000)).find((item) => item.id === rows[0]?.id) || null;
}

async function updateCalendarEvent(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "calendario");
  const departmentId = ("department" in payload || "department_id" in payload)
    ? await resolveDepartmentId(sql, payload.department || payload.department_id)
    : undefined;
  const unitId = ("unit" in payload || "unit_id" in payload)
    ? await resolveUnitId(sql, payload.unit || payload.unit_id)
    : undefined;

  await sql`
    update gestao_intranet.eventos_calendario
    set
      titulo = coalesce(${payload.title ?? null}, titulo),
      descricao = coalesce(${payload.description ?? null}, descricao),
      data_evento = coalesce(${payload.date ?? null}, data_evento),
      horario = coalesce(${payload.time ?? null}, horario),
      tipo = coalesce(${payload.type ?? null}, tipo),
      local = coalesce(${payload.location ?? null}, local),
      recorrencia_tipo = coalesce(${payload.recurrence === undefined ? null : normalizeRecurrence(payload.recurrence)}, recorrencia_tipo),
      recorrencia_fim = ${"recurrence_until" in payload ? sql`${payload.recurrence_until || null}::date` : sql`recorrencia_fim`},
      recorrencia_ativa = ${"recurrence_active" in payload ? sql`${payload.recurrence_active !== false}` : sql`recorrencia_ativa`},
      recorrencia_cancelamentos = ${"recurrence_cancelled_dates" in payload ? sql`${normalizeDateArray(payload.recurrence_cancelled_dates)}::date[]` : sql`recorrencia_cancelamentos`},
      departamento_id = ${departmentId === undefined ? sql`departamento_id` : sql`${departmentId}::uuid`},
      unidade_id = ${unitId === undefined ? sql`unidade_id` : sql`${unitId}::uuid`},
      atualizado_em = now()
    where id = ${id}::uuid
  `;
  if ("participants" in payload || "participant_ids" in payload) {
    await syncCalendarParticipants(sql, id, payload.participant_ids || payload.participants || []);
  }
  return (await listCalendarEvents(sql, "date", 1000)).find((item) => item.id === id) || null;
}

async function createDocument(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "documentos");
  const departmentId = await resolveDepartmentId(sql, payload.department || payload.department_id);
  await sql`
    insert into gestao_intranet.documentos (titulo, descricao, arquivo_url, categoria, departamento_id, criado_por)
    values (
      ${payload.title},
      ${payload.description || null},
      ${payload.file_url || null},
      ${payload.category || "outros"},
      ${departmentId}::uuid,
      ${currentUser.collaborator_id}::uuid
    )
  `;
  return null;
}

async function updateDocument(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "documentos");
  const departmentId = ("department" in payload || "department_id" in payload)
    ? await resolveDepartmentId(sql, payload.department || payload.department_id)
    : undefined;

  await sql`
    update gestao_intranet.documentos
    set
      titulo = coalesce(${payload.title ?? null}, titulo),
      descricao = coalesce(${payload.description ?? null}, descricao),
      arquivo_url = coalesce(${payload.file_url ?? null}, arquivo_url),
      categoria = coalesce(${payload.category ?? null}, categoria),
      departamento_id = ${departmentId === undefined ? sql`departamento_id` : sql`${departmentId}::uuid`},
      atualizado_em = now()
    where id = ${id}::uuid
  `;
  return (await listDocuments(sql, "-created_date", 100)).find((item) => item.id === id) || null;
}

async function updateEmployee(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "colaboradores");
  const departmentId = ("department" in payload || "department_id" in payload)
    ? await resolveDepartmentId(sql, payload.department || payload.department_id)
    : undefined;
  const unitId = ("unit" in payload || "unit_id" in payload)
    ? await resolveUnitId(sql, payload.unit || payload.unit_id)
    : undefined;
  const birthDate = "birth_date" in payload
    ? normalizeNullableTextInput(payload.birth_date)
    : undefined;
  const photoUrl = normalizeNullableTextInput(payload.photo_url);
  const bio = normalizeNullableTextInput(payload.bio);
  const statusMessage = normalizeNullableTextInput(payload.status_message);
  const linkedinUrl = normalizeNullableTextInput(payload.linkedin_url);
  const whatsappUrl = normalizeNullableTextInput(payload.whatsapp_url);
  const officeLocation = normalizeNullableTextInput(payload.office_location);
  const skills = normalizeStringArrayInput(payload.skills);
  const interests = normalizeStringArrayInput(payload.interests);
  const preferences = normalizeJsonObjectInput(payload.preferences);

  await sql`
    update public.colaboradores
    set
      nome = coalesce(${payload.name ?? null}, nome),
      email = coalesce(${payload.email ?? null}, email),
      telefone = coalesce(${payload.phone ?? null}, telefone),
      departamento_id = ${departmentId === undefined ? sql`departamento_id` : sql`${departmentId}::uuid`},
      cargo = coalesce(${payload.position ?? null}, cargo),
      funcao = coalesce(${payload.function_role ?? null}, funcao),
      unidade_id = ${unitId === undefined ? sql`unidade_id` : sql`${unitId}::uuid`},
      data_nascimento = ${birthDate === undefined ? sql`data_nascimento` : sql`${birthDate}::date`},
      atualizado_em = now()
    where id = ${id}::uuid
  `;

  await sql`
    insert into gestao_intranet.perfis_colaboradores (
      colaborador_id,
      foto_url,
      bio,
      frase_status,
      linkedin_url,
      whatsapp_url,
      localizacao_interna,
      habilidades,
      interesses,
      preferencias
    )
    values (
      ${id}::uuid,
      ${photoUrl ?? null},
      ${bio ?? null},
      ${statusMessage ?? null},
      ${linkedinUrl ?? null},
      ${whatsappUrl ?? null},
      ${officeLocation ?? null},
      ${skills ?? []},
      ${interests ?? []},
      ${preferences ?? {}}
    )
    on conflict (colaborador_id) do update
      set foto_url = ${photoUrl === undefined ? sql`gestao_intranet.perfis_colaboradores.foto_url` : sql`${photoUrl}`},
          bio = ${bio === undefined ? sql`gestao_intranet.perfis_colaboradores.bio` : sql`${bio}`},
          frase_status = ${statusMessage === undefined ? sql`gestao_intranet.perfis_colaboradores.frase_status` : sql`${statusMessage}`},
          linkedin_url = ${linkedinUrl === undefined ? sql`gestao_intranet.perfis_colaboradores.linkedin_url` : sql`${linkedinUrl}`},
          whatsapp_url = ${whatsappUrl === undefined ? sql`gestao_intranet.perfis_colaboradores.whatsapp_url` : sql`${whatsappUrl}`},
          localizacao_interna = ${officeLocation === undefined ? sql`gestao_intranet.perfis_colaboradores.localizacao_interna` : sql`${officeLocation}`},
          habilidades = ${skills === undefined ? sql`gestao_intranet.perfis_colaboradores.habilidades` : sql`${skills}`},
          interesses = ${interests === undefined ? sql`gestao_intranet.perfis_colaboradores.interesses` : sql`${interests}`},
          preferencias = ${preferences === undefined ? sql`gestao_intranet.perfis_colaboradores.preferencias` : sql`${preferences}::jsonb`},
          atualizado_em = now()
  `;

  return (await listEmployees(sql)).find((item) => item.id === id) || null;
}

async function createFeedback(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  requireUser(currentUser);
  await sql`
    insert into gestao_intranet.feedback (
      tipo, categoria, titulo, conteudo, anonimo, status, resposta_admin, criado_por
    )
    values (
      ${payload.type || "sugestao"},
      ${payload.category || "geral"},
      ${payload.title},
      ${payload.content},
      ${Boolean(payload.anonymous)},
      ${payload.status || "pendente"},
      ${payload.admin_response || null},
      ${currentUser.collaborator_id}::uuid
    )
  `;
  return null;
}

async function updateFeedback(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  if (payload.status !== undefined || payload.admin_response !== undefined) {
    assertModuleEdit(currentUser, "feedback");
  }

  await sql`
    update gestao_intranet.feedback
    set
      tipo = coalesce(${payload.type ?? null}, tipo),
      categoria = coalesce(${payload.category ?? null}, categoria),
      titulo = coalesce(${payload.title ?? null}, titulo),
      conteudo = coalesce(${payload.content ?? null}, conteudo),
      anonimo = coalesce(${payload.anonymous ?? null}, anonimo),
      status = coalesce(${payload.status ?? null}, status),
      resposta_admin = coalesce(${payload.admin_response ?? null}, resposta_admin),
      atualizado_em = now()
    where id = ${id}::uuid
  `;
  return (await listFeedback(sql, "-created_date", 100)).find((item) => item.id === id) || null;
}

async function createKnowledgeBase(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  assertModuleEdit(currentUser, "conhecimento");
  await sql`
    insert into gestao_intranet.base_conhecimento (
      titulo, conteudo, categoria, tipo, tags, fixado, contador_util, criado_por
    )
    values (
      ${payload.title},
      ${payload.content},
      ${payload.category || "geral"},
      ${payload.type || "faq"},
      ${payload.tags ? String(payload.tags).split(",").map((tag) => tag.trim()).filter(Boolean) : []},
      ${Boolean(payload.pinned)},
      ${payload.helpful_count || 0},
      ${currentUser.collaborator_id}::uuid
    )
  `;
  return null;
}

async function updateKnowledgeBase(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  if ("helpful_count" in payload) {
    requireUser(currentUser);
  } else {
    assertModuleEdit(currentUser, "conhecimento");
  }

  await sql`
    update gestao_intranet.base_conhecimento
    set
      titulo = coalesce(${payload.title ?? null}, titulo),
      conteudo = coalesce(${payload.content ?? null}, conteudo),
      categoria = coalesce(${payload.category ?? null}, categoria),
      tipo = coalesce(${payload.type ?? null}, tipo),
      tags = ${"tags" in payload ? (payload.tags ? String(payload.tags).split(",").map((tag) => tag.trim()).filter(Boolean) : []) : sql`tags`},
      fixado = coalesce(${payload.pinned ?? null}, fixado),
      contador_util = coalesce(${payload.helpful_count ?? null}, contador_util),
      atualizado_em = now()
    where id = ${id}::uuid
  `;
  return (await listKnowledgeBase(sql, "-created_date", 200)).find((item) => item.id === id) || null;
}

async function resolveCollaboratorIdByEmail(sql: SqlClient, email?: string) {
  if (!email) return null;
  const rows = await sql<Array<{ id: string }>>`
    select id
    from public.colaboradores
    where lower(email) = lower(${email})
    limit 1
  `;
  return rows[0]?.id || null;
}

function normalizeTrustedIpPayload(payload: Record<string, any>) {
  return {
    name: String(payload.name || payload.nome || "").trim(),
    description: normalizeNullableTextInput(payload.description || payload.descricao),
    ipCidr: String(payload.ip_cidr || payload.ip || "").trim(),
    accessLevel: payload.access_level === "admin" ? "admin" : "usuario",
    active: payload.active === undefined ? true : Boolean(payload.active),
    modules: payload.modules && typeof payload.modules === "object" ? payload.modules : {},
  };
}

async function createTrustedIpAccess(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  assertAdmin(currentUser);
  const data = normalizeTrustedIpPayload(payload);
  if (!data.name) {
    throw new Error("Informe um nome para a rede liberada.");
  }
  if (!data.ipCidr) {
    throw new Error("Informe o IP ou faixa CIDR da rede.");
  }

  const rows = await sql<Array<{ id: string }>>`
    insert into gestao_intranet.acessos_ip_confiavel (
      nome,
      descricao,
      ip_cidr,
      nivel_acesso,
      mod_avisos,
      mod_links,
      mod_colaboradores,
      mod_documentos,
      mod_calendario,
      mod_conhecimento,
      mod_feedback,
      ativo
    )
    values (
      ${data.name},
      ${data.description ?? null},
      ${data.ipCidr}::cidr,
      ${data.accessLevel},
      ${data.modules.avisos || "view"},
      ${data.modules.links || "view"},
      ${data.modules.colaboradores || "view"},
      ${data.modules.documentos || "view"},
      ${data.modules.calendario || "view"},
      ${data.modules.conhecimento || "view"},
      ${data.modules.feedback || "view"},
      ${data.active}
    )
    returning id
  `;

  return (await listTrustedIpAccesses(sql)).find((item) => item.id === rows[0]?.id) || null;
}

async function updateTrustedIpAccess(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  assertAdmin(currentUser);
  const data = normalizeTrustedIpPayload(payload);
  if (!data.name) {
    throw new Error("Informe um nome para a rede liberada.");
  }
  if (!data.ipCidr) {
    throw new Error("Informe o IP ou faixa CIDR da rede.");
  }

  await sql`
    update gestao_intranet.acessos_ip_confiavel
    set
      nome = ${data.name},
      descricao = ${data.description ?? null},
      ip_cidr = ${data.ipCidr}::cidr,
      nivel_acesso = ${data.accessLevel},
      mod_avisos = ${data.modules.avisos || "view"},
      mod_links = ${data.modules.links || "view"},
      mod_colaboradores = ${data.modules.colaboradores || "view"},
      mod_documentos = ${data.modules.documentos || "view"},
      mod_calendario = ${data.modules.calendario || "view"},
      mod_conhecimento = ${data.modules.conhecimento || "view"},
      mod_feedback = ${data.modules.feedback || "view"},
      ativo = ${data.active},
      atualizado_em = now()
    where id = ${id}::uuid
  `;

  return (await listTrustedIpAccesses(sql)).find((item) => item.id === id) || null;
}

async function createUserPermission(sql: SqlClient, currentUser: CurrentUser, payload: Record<string, any>) {
  assertAdmin(currentUser);
  const collaboratorId = payload.collaborator_id || await resolveCollaboratorIdByEmail(sql, payload.user_email);
  if (!collaboratorId) {
    throw new Error("Nenhum colaborador encontrado para o e-mail informado.");
  }

  await sql`
    insert into gestao_intranet.permissoes_usuario (
      colaborador_id, mod_avisos, mod_links, mod_colaboradores, mod_documentos, mod_calendario, mod_conhecimento, mod_feedback
    )
    values (
      ${collaboratorId}::uuid,
      ${payload.modules?.avisos || "view"},
      ${payload.modules?.links || "view"},
      ${payload.modules?.colaboradores || "view"},
      ${payload.modules?.documentos || "view"},
      ${payload.modules?.calendario || "view"},
      ${payload.modules?.conhecimento || "view"},
      ${payload.modules?.feedback || "view"}
    )
    on conflict (colaborador_id) do update
      set mod_avisos = excluded.mod_avisos,
          mod_links = excluded.mod_links,
          mod_colaboradores = excluded.mod_colaboradores,
          mod_documentos = excluded.mod_documentos,
          mod_calendario = excluded.mod_calendario,
          mod_conhecimento = excluded.mod_conhecimento,
          mod_feedback = excluded.mod_feedback,
          atualizado_em = now()
  `;

  return (await filterUserPermissions(sql, { collaborator_id: collaboratorId }))[0] || null;
}

async function updateUserPermission(sql: SqlClient, currentUser: CurrentUser, id: string, payload: Record<string, any>) {
  assertAdmin(currentUser);
  await sql`
    update gestao_intranet.permissoes_usuario
    set
      mod_avisos = ${payload.modules?.avisos || "view"},
      mod_links = ${payload.modules?.links || "view"},
      mod_colaboradores = ${payload.modules?.colaboradores || "view"},
      mod_documentos = ${payload.modules?.documentos || "view"},
      mod_calendario = ${payload.modules?.calendario || "view"},
      mod_conhecimento = ${payload.modules?.conhecimento || "view"},
      mod_feedback = ${payload.modules?.feedback || "view"},
      atualizado_em = now()
    where id = ${id}::uuid
  `;
  return (await listUserPermissions(sql)).find((item) => item.id === id) || null;
}

async function deleteById(sql: SqlClient, table: string, id: string) {
  await sql`delete from ${sql.unsafe(table)} where id = ${id}::uuid`;
  return { success: true };
}

async function deleteOwnedOrAdmin(
  sql: SqlClient,
  currentUser: CurrentUser,
  table: string,
  id: string,
) {
  if (currentUser.role === "admin") {
    return deleteById(sql, table, id);
  }

  const rows = await sql<Array<{ criado_por: string | null }>>`
    select criado_por
    from ${sql.unsafe(table)}
    where id = ${id}::uuid
    limit 1
  `;

  const row = rows[0];
  if (!row) {
    const error = new Error("Registro nao encontrado.");
    Object.assign(error, { status: 404 });
    throw error;
  }

  if (row.criado_por !== currentUser.collaborator_id) {
    const error = new Error("Voce nao tem permissao para excluir este registro.");
    Object.assign(error, { status: 403 });
    throw error;
  }

  return deleteById(sql, table, id);
}

async function handleEntityRequest(sql: SqlClient, currentUser: CurrentUser, body: Record<string, any>) {
  const entity = body.entity as string;
  const action = body.action as string;

  switch (action) {
    case "list":
      switch (entity) {
        case "Announcement":
          return listAnnouncements(sql, body.orderBy, body.limit);
        case "AnnouncementComment":
          return listAnnouncementComments(sql);
        case "AnnouncementReaction":
          return listAnnouncementReactions(sql);
        case "CalendarEvent":
          return listCalendarEvents(sql, body.orderBy, body.limit);
        case "Document":
          return listDocuments(sql, body.orderBy, body.limit);
        case "Employee":
          return listEmployees(sql);
        case "Feedback":
          return listFeedback(sql, body.orderBy, body.limit);
        case "KnowledgeBase":
          return listKnowledgeBase(sql, body.orderBy, body.limit);
        case "QuickLink":
          return listQuickLinks(sql, body.orderBy, body.limit);
        case "User":
          assertAdmin(currentUser);
          return listUsers(sql);
        case "UserPermission":
          assertAdmin(currentUser);
          return listUserPermissions(sql);
        case "TrustedIpAccess":
          assertAdmin(currentUser);
          return listTrustedIpAccesses(sql);
        default:
          throw new Error(`Unknown entity for list: ${entity}`);
      }
    case "filter":
      switch (entity) {
        case "AnnouncementComment":
          return listAnnouncementComments(sql, body.filters?.announcement_id);
        case "AnnouncementReaction":
          return listAnnouncementReactions(sql, body.filters?.announcement_id);
        case "UserPermission":
          assertAdmin(currentUser);
          return filterUserPermissions(sql, body.filters);
        default:
          throw new Error(`Unknown entity for filter: ${entity}`);
      }
    case "create":
      switch (entity) {
        case "Announcement":
          return createAnnouncement(sql, currentUser, body.payload || {});
        case "AnnouncementComment":
          return createComment(sql, currentUser, body.payload || {});
        case "AnnouncementReaction":
          return createReaction(sql, currentUser, body.payload || {});
        case "CalendarEvent":
          return createCalendarEvent(sql, currentUser, body.payload || {});
        case "Document":
          return createDocument(sql, currentUser, body.payload || {});
        case "Feedback":
          return createFeedback(sql, currentUser, body.payload || {});
        case "KnowledgeBase":
          return createKnowledgeBase(sql, currentUser, body.payload || {});
        case "QuickLink":
          return createQuickLink(sql, currentUser, body.payload || {});
        case "UserPermission":
          return createUserPermission(sql, currentUser, body.payload || {});
        case "TrustedIpAccess":
          return createTrustedIpAccess(sql, currentUser, body.payload || {});
        default:
          throw new Error(`Unknown entity for create: ${entity}`);
      }
    case "update":
      switch (entity) {
        case "Announcement":
          return updateAnnouncement(sql, currentUser, body.id, body.payload || {});
        case "CalendarEvent":
          return updateCalendarEvent(sql, currentUser, body.id, body.payload || {});
        case "Document":
          return updateDocument(sql, currentUser, body.id, body.payload || {});
        case "Employee":
          return updateEmployee(sql, currentUser, body.id, body.payload || {});
        case "Feedback":
          return updateFeedback(sql, currentUser, body.id, body.payload || {});
        case "KnowledgeBase":
          return updateKnowledgeBase(sql, currentUser, body.id, body.payload || {});
        case "QuickLink":
          return updateQuickLink(sql, currentUser, body.id, body.payload || {});
        case "UserPermission":
          return updateUserPermission(sql, currentUser, body.id, body.payload || {});
        case "TrustedIpAccess":
          return updateTrustedIpAccess(sql, currentUser, body.id, body.payload || {});
        default:
          throw new Error(`Unknown entity for update: ${entity}`);
      }
    case "delete":
      switch (entity) {
        case "Announcement":
          assertModuleEdit(currentUser, "avisos");
          return deleteById(sql, "gestao_intranet.avisos", body.id);
        case "AnnouncementComment":
          return deleteOwnedOrAdmin(sql, currentUser, "gestao_intranet.comentarios_avisos", body.id);
        case "AnnouncementReaction":
          return deleteOwnedOrAdmin(sql, currentUser, "gestao_intranet.reacoes_avisos", body.id);
        case "CalendarEvent":
          assertModuleEdit(currentUser, "calendario");
          return deleteById(sql, "gestao_intranet.eventos_calendario", body.id);
        case "Document":
          assertModuleEdit(currentUser, "documentos");
          return deleteById(sql, "gestao_intranet.documentos", body.id);
        case "Feedback":
          assertModuleEdit(currentUser, "feedback");
          return deleteById(sql, "gestao_intranet.feedback", body.id);
        case "KnowledgeBase":
          assertModuleEdit(currentUser, "conhecimento");
          return deleteById(sql, "gestao_intranet.base_conhecimento", body.id);
        case "QuickLink":
          assertModuleEdit(currentUser, "links");
          return deleteById(sql, "gestao_intranet.links_uteis", body.id);
        case "UserPermission":
          assertAdmin(currentUser);
          return deleteById(sql, "gestao_intranet.permissoes_usuario", body.id);
        case "TrustedIpAccess":
          assertAdmin(currentUser);
          return deleteById(sql, "gestao_intranet.acessos_ip_confiavel", body.id);
        case "Employee":
          {
            const error = new Error("A exclusao de colaboradores nao e permitida pela intranet.");
            Object.assign(error, { status: 403, code: "INTRANET_EMPLOYEE_DELETE_DISABLED" });
            throw error;
          }
        default:
          throw new Error(`Unknown entity for delete: ${entity}`);
      }
    default:
      throw new Error(`Unknown entity action: ${action}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const sql = getSqlClient();
    const currentUser = await resolveCurrentUser(req);

    let data: unknown;

    switch (body.resource) {
      case "auth":
        if (!["me", "trustedIpAccess"].includes(body.action)) {
          throw new Error(`Unknown auth action: ${body.action}`);
        }
        data = currentUser;
        break;
      case "catalog":
        requireUser(currentUser);
        if (body.action === "listDepartments") {
          data = await listDepartments(sql);
          break;
        }
        if (body.action === "listUnits") {
          data = await listUnits(sql);
          break;
        }
        throw new Error(`Unknown catalog action: ${body.action}`);
      case "entity":
        data = await handleEntityRequest(sql, requireUser(currentUser), body);
        break;
      default:
        throw new Error(`Unknown resource: ${body.resource}`);
    }

    return jsonResponse(200, { data });
  } catch (error) {
    const normalized = normalizeError(error);
    console.error("[intranet-api] request failed", {
      method: req.method,
      url: req.url,
      error: normalized,
    });
    return jsonResponse(normalized.status || 500, {
      error: normalized,
    });
  }
});
