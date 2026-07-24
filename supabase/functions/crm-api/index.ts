import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';
import { CRM_SCHEMA, buildAccessScope, getAccessLevel } from './access-scope.ts';
import type { EntityName } from './access-scope.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRM_SYSTEM_SLUG = 'crm';

const ENTITY_CONFIG = {
  clientes: {
    table: 'clientes',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'nome',
      'telefone',
      'telefone_normalizado',
      'email',
      'email_normalizado',
      'empresa',
      'status_relacionamento',
      'observacoes',
    ],
  },
  leads: {
    table: 'leads',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'cliente_id',
      'nome',
      'telefone',
      'telefone_normalizado',
      'email',
      'email_normalizado',
      'origem',
      'status',
      'modelo_interesse',
      'empresa',
      'convertido_em',
      'perdido_em',
      'motivo_perda',
      'motivo_descarte',
      'responsavel_id',
      'unidade_id',
      'primeiro_contato_em',
      'sla_primeiro_contato_em',
      'previsao_fechamento',
      'observacoes',
    ],
  },
  atendimentos: {
    table: 'atendimentos',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'lead_id',
      'cliente_id',
      'titulo',
      'status',
      'tipo_atendimento',
      'temperatura',
      'proximo_contato',
      'observacoes',
      'resultado',
      'motivo_resultado',
      'concluido_em',
    ],
  },
  historico_atendimentos: {
    table: 'historico_atendimentos',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'cliente_id',
      'lead_id',
      'atendimento_id',
      'tipo',
      'descricao',
      'entidade',
      'entidade_id',
      'status',
      'metadados',
    ],
  },
  veiculos_interesse: {
    table: 'veiculos_interesse',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'lead_id',
      'marca',
      'modelo',
      'versao',
      'ano',
      'condicao',
      'faixa_preco_min',
      'faixa_preco_max',
      'cor_preferida',
      'combustivel',
      'cambio',
      'principal',
      'observacoes',
    ],
  },
} as const;


const ORDER_FIELD_MAP: Record<string, string> = {
  created_date: 'criado_em',
  updated_date: 'atualizado_em',
  tipo_evento: 'tipo_atendimento',
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function mapDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (message.includes('idx_crm_leads_cliente_ativo_unique')) {
    return 'Ja existe um lead ativo para este cliente.';
  }

  if (message.includes('idx_crm_leads_cliente_triagem_unique')) {
    return 'Ja existe um pre-lead em triagem para este cliente.';
  }

  if (message.includes('idx_crm_atendimentos_lead_aberto_unique')) {
    return 'Este lead ja possui uma atividade planejada.';
  }

  if (message.includes('idx_crm_atendimentos_lead_planejada_unique')) {
    return 'Este lead ja possui uma atividade planejada.';
  }

  if (message.includes('idx_crm_clientes_telefone_unique')) {
    return 'Ja existe outro cliente com este telefone.';
  }

  if (message.includes('idx_crm_clientes_email_unique')) {
    return 'Ja existe outro cliente com este e-mail.';
  }

  if (message.includes('Motivo da perda e obrigatorio')) {
    return 'Informe o motivo da perda para encerrar este lead.';
  }

  if (message.includes('Motivo do descarte e obrigatorio')) {
    return 'Informe o motivo do descarte para encerrar este pre-lead.';
  }

  if (message.includes('Promova o pre-lead antes de registrar atividades')) {
    return 'Promova o pre-lead a lead antes de registrar atividades.';
  }

  if (message.includes('Informe o resultado para concluir')) {
    return 'Informe o resultado para concluir a atividade.';
  }

  if (message.includes('Informe o motivo da perda para concluir')) {
    return 'Informe o motivo da perda para concluir a atividade.';
  }

  if (message.includes('Atividade encerrada nao pode ser reaberta')) {
    return 'Atividade encerrada nao pode ser reaberta.';
  }

  if (message.includes('Responsavel deve possuir acesso')) {
    return 'O vendedor selecionado nao pertence a unidade do lead ou nao possui acesso ao CRM.';
  }

  if (message.includes('Nenhum vendedor elegivel')) {
    return 'Nenhum vendedor desta unidade esta disponivel para receber o lead.';
  }

  if (message.includes('Unidade do lead e obrigatoria')) {
    return 'Selecione a unidade responsavel pelo lead.';
  }

  return message || 'Falha ao consultar o CRM.';
}

function getErrorStatus(error: unknown) {
  const status = Number((error as { status?: number })?.status);
  if (Number.isFinite(status) && status >= 400) return status;
  return 500;
}

function sanitizePayload(entity: EntityName, payload: Record<string, unknown> = {}) {
  const allowedFields = ENTITY_CONFIG[entity].allowedFields;
  const sanitized: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in payload) {
      sanitized[field] = payload[field];
    }
  }

  return sanitized;
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildSqlFilters(filters: Record<string, unknown> = {}, startIndex = 1, tableAlias?: string) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const reservedFilters = new Set([
    'created_from',
    'created_to',
    'previsao_from',
    'previsao_to',
    'proximo_from',
    'proximo_to',
    'sla_status',
  ]);

  for (const [field, value] of Object.entries(filters)) {
    if (reservedFilters.has(field)) continue;
    if (value === undefined || value === null || value === '' || field.includes('.')) continue;
    if (value === '__NULL__') {
      clauses.push(`${prefix}${quoteIdentifier(field)} is null`);
      continue;
    }
    if (Array.isArray(value)) {
      if (!value.length) continue;
      const placeholders = value.map((_, index) => `$${startIndex + values.length + index}`).join(', ');
      clauses.push(`${prefix}${quoteIdentifier(field)} in (${placeholders})`);
      values.push(...value);
      continue;
    }
    clauses.push(`${prefix}${quoteIdentifier(field)} = $${startIndex + values.length}`);
    values.push(value);
  }

  return { clauses, values };
}

function parseOrFilter(orFilter: string | undefined, startIndex: number, tableAlias?: string) {
  if (!orFilter) return { clause: '', values: [] as unknown[] };

  const values: unknown[] = [];
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const clauses = orFilter
    .split(',')
    .map((part) => {
      const match = part.match(/^([a-zA-Z0-9_]+)\.eq\.(.*)$/);
      if (!match) return null;
      values.push(match[2]);
      return `${prefix}${quoteIdentifier(match[1])} = $${startIndex + values.length - 1}`;
    })
    .filter(Boolean);

  return {
    clause: clauses.length ? `(${clauses.join(' or ')})` : '',
    values,
  };
}

function parseInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

function appendDateRangeFilter(
  clauses: string[],
  values: unknown[],
  column: string,
  fromValue: unknown,
  toValue: unknown,
  startIndex = 1,
) {
  if (fromValue) {
    values.push(fromValue);
    clauses.push(`${column} >= $${startIndex + values.length - 1}`);
  }
  if (toValue) {
    values.push(toValue);
    clauses.push(`${column} <= $${startIndex + values.length - 1}`);
  }
}

function buildSearchFilter(entity: EntityName, search: string, startIndex: number) {
  const term = search.trim();
  if (!term) return { clause: '', values: [] as unknown[] };

  const normalizedTerm = `%${term.toLowerCase()}%`;
  const digits = term.replace(/\D/g, '');
  const values: unknown[] = [];
  const parts: string[] = [];
  const pushText = (expression: string) => {
    values.push(normalizedTerm);
    parts.push(`lower(coalesce(${expression}, '')) like $${startIndex + values.length - 1}`);
  };
  const pushPhone = (expression: string) => {
    if (!digits) return;
    values.push(`%${digits}%`);
    parts.push(`coalesce(${expression}, '') like $${startIndex + values.length - 1}`);
  };

  if (entity === 'leads') {
    pushText('l.nome');
    pushText('l.email');
    pushText('l.modelo_interesse');
    pushText('l.origem');
    pushText('r.nome');
    values.push(normalizedTerm);
    parts.push(`exists (
      select 1
      from ${CRM_SCHEMA}.veiculos_interesse vi
      where vi.lead_id = l.id
        and (
          lower(coalesce(vi.marca, '')) like $${startIndex + values.length - 1}
          or lower(coalesce(vi.modelo, '')) like $${startIndex + values.length - 1}
          or lower(coalesce(vi.versao, '')) like $${startIndex + values.length - 1}
        )
    )`);
    pushPhone('l.telefone_normalizado');
  } else if (entity === 'clientes') {
    pushText('nome');
    pushText('email');
    pushText('empresa');
    pushPhone('telefone_normalizado');
    values.push(normalizedTerm);
    parts.push(`exists (
      select 1
      from ${CRM_SCHEMA}.leads l
      where l.cliente_id = clientes.id
        and lower(coalesce(l.modelo_interesse, '')) like $${startIndex + values.length - 1}
    )`);
  } else if (entity === 'atendimentos') {
    pushText('a.titulo');
    pushText('a.observacoes');
    pushText('l.nome');
    pushText('l.modelo_interesse');
    pushText('c.nome');
    pushPhone('l.telefone_normalizado');
    pushPhone('c.telefone_normalizado');
  } else if (entity === 'historico_atendimentos') {
    pushText('descricao');
    pushText('tipo');
    pushText('status');
  }

  return {
    clause: parts.length ? `(${parts.join(' or ')})` : '',
    values,
  };
}

function buildAdvancedFilters(entity: EntityName, filters: Record<string, unknown>, startIndex: number) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  appendDateRangeFilter(
    clauses,
    values,
    scopedColumn(entity, 'criado_em'),
    filters.created_from,
    filters.created_to,
    startIndex,
  );

  if (entity === 'leads') {
    appendDateRangeFilter(clauses, values, 'l."previsao_fechamento"', filters.previsao_from, filters.previsao_to, startIndex);
    if (filters.sla_status === 'atrasado') {
      clauses.push(`l."primeiro_contato_em" is null and l."sla_primeiro_contato_em" < now()`);
    } else if (filters.sla_status === 'alerta') {
      clauses.push(`l."primeiro_contato_em" is null and l."sla_primeiro_contato_em" >= now() and l."sla_primeiro_contato_em" <= now() + (coalesce(cd."sla_alerta_minutos", 10) * interval '1 minute')`);
    } else if (filters.sla_status === 'no_prazo') {
      clauses.push(`l."primeiro_contato_em" is null and (l."sla_primeiro_contato_em" is null or l."sla_primeiro_contato_em" > now() + (coalesce(cd."sla_alerta_minutos", 10) * interval '1 minute'))`);
    } else if (filters.sla_status === 'concluido') {
      clauses.push(`l."primeiro_contato_em" is not null`);
    }
  }

  if (entity === 'atendimentos') {
    appendDateRangeFilter(clauses, values, 'a."proximo_contato"', filters.proximo_from, filters.proximo_to, startIndex);
    if (filters.empresa) {
      values.push(filters.empresa);
      clauses.push(`(l."empresa" = $${startIndex + values.length - 1} or c."empresa" = $${startIndex + values.length - 1})`);
    }
    if (filters.origem) {
      values.push(filters.origem);
      clauses.push(`l."origem" = $${startIndex + values.length - 1}`);
    }
    if (filters.responsavel_id) {
      values.push(filters.responsavel_id);
      clauses.push(`l."responsavel_id" = $${startIndex + values.length - 1}`);
    }
  }

  return { clauses, values };
}

function applyCreateScope(
  entity: EntityName,
  payload: Record<string, unknown>,
  access: Record<string, unknown> | null,
  collaborator: Record<string, unknown> | null,
) {
  const level = getAccessLevel(access);
  if (level === 'admin') return payload;

  const collaboratorId = String(collaborator?.id || '');
  const unitId = String(collaborator?.unidade_id || '');

  if (entity === 'leads') {
    if (!unitId) throw Object.assign(new Error('Usuario sem unidade vinculada.'), { status: 403 });
    payload.unidade_id = unitId;
    if (level === 'usuario') {
      payload.responsavel_id = collaboratorId;
    }
  }

  return payload;
}

async function ensureEntityAccess(
  entity: EntityName,
  id: string,
  access: Record<string, unknown> | null,
  collaborator: Record<string, unknown> | null,
) {
  const scope = buildAccessScope(entity, access, collaborator, 2);
  const whereScope = scope.clause ? `and ${scope.clause}` : '';
  const rows = await sql.unsafe(
    `${buildListSelect(entity)} where ${scopedColumn(entity, 'id')} = $1 ${whereScope} limit 1;`,
    [id, ...scope.values],
  );

  if (!rows[0]) {
    throw Object.assign(new Error('Registro nao encontrado ou sem permissao.'), { status: 403 });
  }
  return rows[0];
}

function buildInsertQuery(schema: string, table: string, payload: Record<string, unknown>) {
  const fields = Object.keys(payload);
  const columns = fields.map(quoteIdentifier).join(', ');
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
  return {
    text: `insert into ${schema}.${table} (${columns}) values (${placeholders}) returning *;`,
    values: fields.map((field) => payload[field]),
  };
}

function buildUpdateQuery(schema: string, table: string, id: string, payload: Record<string, unknown>) {
  const fields = Object.keys(payload);
  const assignments = fields.map((field, index) => `${quoteIdentifier(field)} = $${index + 2}`).join(', ');
  return {
    text: `update ${schema}.${table} set ${assignments} where id = $1 returning *;`,
    values: [id, ...fields.map((field) => payload[field])],
  };
}

function buildListSelect(entity: EntityName) {
  if (entity === 'leads') {
    return `
      select
        l.*,
        coalesce(cd.sla_alerta_minutos, 10) as sla_alerta_minutos,
        coalesce(cd.sla_primeiro_contato_minutos, 30) as sla_primeiro_contato_minutos,
        case
          when r.id is null then null
        else json_build_object(
          'id', r.id,
          'nome', r.nome,
          'email', r.email,
          'unidade_id', r.unidade_id
        )
        end as responsavel,
        vi_principal.veiculo_interesse
      from ${CRM_SCHEMA}.leads l
      left join public.colaboradores r on r.id = l.responsavel_id
      left join ${CRM_SCHEMA}.configuracoes_distribuicao cd on cd.unidade_id = l.unidade_id
      left join lateral (
        select row_to_json(vi) as veiculo_interesse
        from ${CRM_SCHEMA}.veiculos_interesse vi
        where vi.lead_id = l.id
        order by vi.principal desc, vi.criado_em asc
        limit 1
      ) vi_principal on true
    `;
  }

  if (entity !== 'atendimentos') {
    return `select * from ${CRM_SCHEMA}.${ENTITY_CONFIG[entity].table}`;
  }

  return `
    select
      a.*,
      row_to_json(l) as lead,
      row_to_json(c) as cliente,
      case
        when r.id is null then null
        else json_build_object(
          'id', r.id,
          'nome', r.nome,
          'email', r.email,
          'unidade_id', r.unidade_id
        )
      end as responsavel
    from ${CRM_SCHEMA}.atendimentos a
    left join ${CRM_SCHEMA}.leads l on l.id = a.lead_id
    left join ${CRM_SCHEMA}.clientes c on c.id = a.cliente_id
    left join public.colaboradores r on r.id = l.responsavel_id
  `;
}

function baseAlias(entity: EntityName) {
  if (entity === 'atendimentos') return 'a';
  if (entity === 'leads') return 'l';
  return '';
}

function scopedColumn(entity: EntityName, column: string) {
  const alias = baseAlias(entity);
  return alias ? `${alias}.${quoteIdentifier(column)}` : quoteIdentifier(column);
}

async function getAuthenticatedUser(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw Object.assign(new Error('Supabase nao configurado.'), { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    throw Object.assign(new Error('Sessao expirada. Faca login novamente.'), { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user) {
    throw Object.assign(new Error('Sessao expirada. Faca login novamente.'), { status: 401 });
  }

  return data.user;
}

async function getCurrentCollaborator(user: { id: string; email?: string }) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `
      select *
      from public.colaboradores
      where id = $1
         or lower(email) = lower($2)
      order by case when id = $1 then 0 else 1 end
      limit 1;
    `,
    [user.id, user.email || ''],
  );

  return rows[0] || null;
}

async function getCrmAccess(collaboratorId: string) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `
      select
        aus.*,
        row_to_json(s) as sistema
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      where aus.colaborador_id = $1
        and aus.ativo = true
        and s.slug = $2
        and s.ativo = true
      limit 1;
    `,
    [collaboratorId, CRM_SYSTEM_SLUG],
  );

  return rows[0] || null;
}

function ensureCanManage(access: Record<string, unknown> | null) {
  if (!access || !['admin', 'gestor', 'usuario'].includes(String(access.nivel_acesso || ''))) {
    throw Object.assign(new Error('Seu usuario nao possui acesso liberado ao CRM.'), { status: 403 });
  }
}

function ensureCanConfigure(access: Record<string, unknown> | null) {
  if (!access || !['admin', 'gestor'].includes(String(access.nivel_acesso || ''))) {
    throw Object.assign(new Error('Apenas administradores e gestores podem configurar a distribuicao.'), { status: 403 });
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!sql) {
      return json({ error: 'DATABASE_URL nao configurada.' }, 500);
    }

    const user = await getAuthenticatedUser(request);
    const collaborator = await getCurrentCollaborator(user);
    const access = collaborator?.id ? await getCrmAccess(String(collaborator.id)) : null;
    ensureCanManage(access);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'list');

    if (action === 'me') {
      return json({ row: collaborator, access });
    }

    if (action === 'list_responsaveis') {
      const level = getAccessLevel(access);
      const scopeUnitId = level === 'admin' ? null : (collaborator?.unidade_id || null);
      const scopeCollaboratorId = level === 'usuario' ? collaborator?.id : null;
      const rows = await sql.unsafe(
        `
          select distinct
            c.id,
            c.nome,
            c.email,
            c.unidade_id,
            u.nome as unidade_nome,
            aus.nivel_acesso
          from public.colaboradores c
          join public.acessos_usuario_sistema aus
            on aus.colaborador_id = c.id
            and aus.ativo = true
          join public.sistemas s
            on s.id = aus.sistema_id
            and s.slug = $1
            and s.ativo = true
          left join public.unidades u on u.id = c.unidade_id
          where c.status <> 'inativo'
            and ($2::uuid is null or c.unidade_id = $2::uuid)
            and ($3::uuid is null or c.id = $3::uuid)
          order by c.nome;
        `,
        [CRM_SYSTEM_SLUG, scopeUnitId, scopeCollaboratorId],
      );
      return json({ rows });
    }

    if (action === 'get_distribution_config') {
      ensureCanConfigure(access);
      const scopeUnitId = String(access?.nivel_acesso) === 'admin'
        ? null
        : (collaborator?.unidade_id || null);
      const units = await sql.unsafe(`
        select distinct
          u.id,
          u.nome,
          coalesce(cd.ativa, true) as ativa,
          coalesce(cd.estrategia, 'menor_carteira') as estrategia,
          cd.limite_padrao_leads_ativos,
          coalesce(cd.sla_primeiro_contato_minutos, 30) as sla_primeiro_contato_minutos,
          coalesce(cd.sla_alerta_minutos, 10) as sla_alerta_minutos
        from public.unidades u
        join public.colaboradores c on c.unidade_id = u.id and c.status <> 'inativo'
        join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.ativo = true
        join public.sistemas s on s.id = aus.sistema_id and s.slug = $1 and s.ativo = true
        left join ${CRM_SCHEMA}.configuracoes_distribuicao cd on cd.unidade_id = u.id
        where ($2::uuid is null or u.id = $2::uuid)
        order by u.nome;
      `, [CRM_SYSTEM_SLUG, scopeUnitId]);
      const sellers = await sql.unsafe(`
        select
          c.id,
          c.nome,
          c.email,
          c.unidade_id,
          coalesce(vd.ativo, true) as ativo,
          vd.limite_leads_ativos,
          vd.ultimo_lead_atribuido_em,
          count(l.id)::integer as leads_ativos
        from public.colaboradores c
        join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.ativo = true
        join public.sistemas s on s.id = aus.sistema_id and s.slug = $1 and s.ativo = true
        left join ${CRM_SCHEMA}.vendedores_distribuicao vd
          on vd.unidade_id = c.unidade_id and vd.colaborador_id = c.id
        left join ${CRM_SCHEMA}.leads l
          on l.responsavel_id = c.id
         and l.status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta')
        where c.status <> 'inativo' and c.unidade_id is not null
          and ($2::uuid is null or c.unidade_id = $2::uuid)
        group by c.id, c.nome, c.email, c.unidade_id, vd.ativo,
          vd.limite_leads_ativos, vd.ultimo_lead_atribuido_em
        order by c.nome;
      `, [CRM_SYSTEM_SLUG, scopeUnitId]);
      return json({ units, sellers });
    }

    if (action === 'save_distribution_config') {
      ensureCanConfigure(access);
      const unitId = String(body.unidade_id || '');
      const strategy = String(body.estrategia || 'menor_carteira');
      const defaultLimit = body.limite_padrao_leads_ativos === null || body.limite_padrao_leads_ativos === ''
        ? null
        : Number(body.limite_padrao_leads_ativos);
      const slaFirstContactMinutes = Number(body.sla_primeiro_contato_minutos || 30);
      const slaAlertMinutes = Number(body.sla_alerta_minutos ?? 10);
      const sellers = Array.isArray(body.sellers) ? body.sellers : [];

      if (!unitId) return json({ error: 'Unidade obrigatoria.' }, 400);
      if (String(access?.nivel_acesso) === 'gestor' && String(collaborator?.unidade_id || '') !== unitId) {
        return json({ error: 'Gestores podem configurar somente a propria unidade.' }, 403);
      }
      if (!['menor_carteira', 'rodizio'].includes(strategy)) return json({ error: 'Estrategia invalida.' }, 400);
      if (defaultLimit !== null && (!Number.isInteger(defaultLimit) || defaultLimit < 1)) {
        return json({ error: 'O limite padrao deve ser um numero maior que zero.' }, 400);
      }
      if (!Number.isInteger(slaFirstContactMinutes) || slaFirstContactMinutes < 1) {
        return json({ error: 'O SLA de primeiro contato deve ser maior que zero.' }, 400);
      }
      if (!Number.isInteger(slaAlertMinutes) || slaAlertMinutes < 0) {
        return json({ error: 'O alerta de SLA deve ser zero ou maior.' }, 400);
      }

      await sql.begin(async (transaction) => {
        await transaction.unsafe(`
          insert into ${CRM_SCHEMA}.configuracoes_distribuicao
            (unidade_id, ativa, estrategia, limite_padrao_leads_ativos, sla_primeiro_contato_minutos, sla_alerta_minutos)
          values ($1, $2, $3, $4, $5, $6)
          on conflict (unidade_id) do update set
            ativa = excluded.ativa,
            estrategia = excluded.estrategia,
            limite_padrao_leads_ativos = excluded.limite_padrao_leads_ativos,
            sla_primeiro_contato_minutos = excluded.sla_primeiro_contato_minutos,
            sla_alerta_minutos = excluded.sla_alerta_minutos;
        `, [unitId, body.ativa !== false, strategy, defaultLimit, slaFirstContactMinutes, slaAlertMinutes]);

        for (const seller of sellers) {
          const collaboratorId = String(seller?.colaborador_id || '');
          const limit = seller?.limite_leads_ativos === null || seller?.limite_leads_ativos === ''
            ? null
            : Number(seller.limite_leads_ativos);
          if (!collaboratorId) continue;
          if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
            throw Object.assign(new Error('O limite individual deve ser maior que zero.'), { status: 400 });
          }
          await transaction.unsafe(`
            insert into ${CRM_SCHEMA}.vendedores_distribuicao
              (unidade_id, colaborador_id, ativo, limite_leads_ativos)
            select $1, c.id, $3, $4
            from public.colaboradores c
            where c.id = $2 and c.unidade_id = $1
            on conflict (unidade_id, colaborador_id) do update set
              ativo = excluded.ativo,
              limite_leads_ativos = excluded.limite_leads_ativos;
          `, [unitId, collaboratorId, seller.ativo !== false, limit]);
        }
      });

      return json({ success: true });
    }

    if (action === 'clear_crm_test_data') {
      if (String(access?.nivel_acesso || '') !== 'admin') {
        return json({ error: 'Apenas administradores podem limpar os dados do CRM.' }, 403);
      }

      const CLEAR_CONFIRM_PHRASE = 'LIMPAR-DADOS-CRM';
      if (String(body.confirm || '') !== CLEAR_CONFIRM_PHRASE) {
        return json({ error: 'Confirmacao ausente ou invalida para limpar os dados do CRM.' }, 400);
      }

      const counts = await sql.begin(async (transaction) => {
        const [{ count: clientesCount }] = await transaction.unsafe(`select count(*)::int as count from ${CRM_SCHEMA}.clientes;`);
        const [{ count: leadsCount }] = await transaction.unsafe(`select count(*)::int as count from ${CRM_SCHEMA}.leads;`);
        const [{ count: atendimentosCount }] = await transaction.unsafe(`select count(*)::int as count from ${CRM_SCHEMA}.atendimentos;`);
        const [{ count: historicoCount }] = await transaction.unsafe(`select count(*)::int as count from ${CRM_SCHEMA}.historico_atendimentos;`);

        await transaction.unsafe(
          `insert into ${CRM_SCHEMA}.logs_auditoria (entidade, acao, actor_colaborador_id, actor_email, metadados)
           values ($1, $2, $3, $4, $5::jsonb);`,
          [
            'crm',
            'clear_crm_test_data',
            collaborator?.id || null,
            user.email || null,
            JSON.stringify({
              clientes: clientesCount,
              leads: leadsCount,
              atendimentos: atendimentosCount,
              historico_atendimentos: historicoCount,
            }),
          ],
        );

        await transaction.unsafe(`delete from ${CRM_SCHEMA}.historico_atendimentos;`);
        await transaction.unsafe(`delete from ${CRM_SCHEMA}.atendimentos;`);
        await transaction.unsafe(`delete from ${CRM_SCHEMA}.leads;`);
        await transaction.unsafe(`delete from ${CRM_SCHEMA}.clientes;`);
        await transaction.unsafe(`
          update ${CRM_SCHEMA}.vendedores_distribuicao
          set ultimo_lead_atribuido_em = null;
        `);

        return { clientesCount, leadsCount, atendimentosCount, historicoCount };
      });

      console.log('[crm-api] clear_crm_test_data executado', {
        actor: user.email,
        collaboratorId: collaborator?.id,
        counts,
      });

      return json({ success: true });
    }

    const entity = String(body.entity || '') as EntityName;
    const config = ENTITY_CONFIG[entity];

    if (!config) {
      return json({ error: 'Entidade invalida.' }, 400);
    }

    const id = typeof body.id === 'string' ? body.id : '';
    const filters = typeof body.filters === 'object' && body.filters ? body.filters : {};
    const orFilter = typeof body.or === 'string' ? body.or : undefined;
    const search = typeof body.search === 'string' ? body.search : '';
    const orderBy = ORDER_FIELD_MAP[String(body.orderBy || '')] || String(body.orderBy || config.orderBy);
    const orderDirection = body.ascending === true
      ? 'asc'
      : body.ascending === false
        ? 'desc'
        : String(config.orderDirection || 'asc');
    const limit = parseInteger(body.limit, 100, 1, 1000);
    const offset = parseInteger(body.offset, 0, 0, 1000000);
    const page = parseInteger(body.page, Math.floor(offset / limit) + 1, 1, 1000000);
    const effectiveOffset = body.page ? (page - 1) * limit : offset;

    if (action === 'get') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const row = await ensureEntityAccess(entity, id, access, collaborator);
      return json({ row });
    }

    if (action === 'list') {
      const directFilters = { ...filters };
      if (entity === 'atendimentos') {
        delete directFilters.empresa;
        delete directFilters.origem;
        delete directFilters.responsavel_id;
      }
      const filterParts = buildSqlFilters(directFilters, 1, baseAlias(entity) || undefined);
      const advancedParts = buildAdvancedFilters(entity, filters, filterParts.values.length + 1);
      const orPart = parseOrFilter(
        orFilter,
        filterParts.values.length + advancedParts.values.length + 1,
        baseAlias(entity) || undefined,
      );
      const searchPart = buildSearchFilter(
        entity,
        search,
        filterParts.values.length + advancedParts.values.length + orPart.values.length + 1,
      );
      const accessPart = buildAccessScope(
        entity,
        access,
        collaborator,
        filterParts.values.length + advancedParts.values.length + orPart.values.length + searchPart.values.length + 1,
      );
      const clauses = [
        ...filterParts.clauses,
        ...advancedParts.clauses,
        orPart.clause,
        searchPart.clause,
        accessPart.clause,
      ].filter(Boolean);
      const whereClause = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const queryValues = [
        ...filterParts.values,
        ...advancedParts.values,
        ...orPart.values,
        ...searchPart.values,
        ...accessPart.values,
      ];
      const countRows = await sql.unsafe(
        `select count(*)::integer as total from (${buildListSelect(entity)} ${whereClause}) crm_count;`,
        queryValues,
      );
      const rows = await sql.unsafe(
        `${buildListSelect(entity)} ${whereClause} order by ${scopedColumn(entity, orderBy)} ${orderDirection} limit ${limit} offset ${effectiveOffset};`,
        queryValues,
      );
      return json({
        rows,
        count: countRows[0]?.total || 0,
        page,
        pageSize: limit,
        offset: effectiveOffset,
      });
    }

    if (action === 'create') {
      const payload = applyCreateScope(entity, sanitizePayload(entity, body.payload || {}), access, collaborator);
      if (!Object.keys(payload).length) return json({ error: 'Payload vazio.' }, 400);
      if (collaborator?.id) payload.criado_por = collaborator.id;
      if (entity === 'atendimentos' && payload.lead_id) {
        await ensureEntityAccess('leads', String(payload.lead_id), access, collaborator);
      }
      if (entity === 'historico_atendimentos' && payload.lead_id) {
        await ensureEntityAccess('leads', String(payload.lead_id), access, collaborator);
      }
      if (entity === 'veiculos_interesse' && payload.lead_id) {
        await ensureEntityAccess('leads', String(payload.lead_id), access, collaborator);
      }
      const query = buildInsertQuery(CRM_SCHEMA, config.table, payload);
      const rows = await sql.unsafe(query.text, query.values);
      return json({ row: rows[0] || null });
    }

    if (action === 'update') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      await ensureEntityAccess(entity, id, access, collaborator);
      const payload = applyCreateScope(entity, sanitizePayload(entity, body.payload || {}), access, collaborator);
      if (!Object.keys(payload).length) return json({ error: 'Nenhum campo para atualizar.' }, 400);
      if (entity === 'atendimentos' && payload.lead_id) {
        await ensureEntityAccess('leads', String(payload.lead_id), access, collaborator);
      }
      if (entity === 'veiculos_interesse' && payload.lead_id) {
        await ensureEntityAccess('leads', String(payload.lead_id), access, collaborator);
      }
      const query = buildUpdateQuery(CRM_SCHEMA, config.table, id, payload);
      const rows = await sql.unsafe(query.text, query.values);
      return json({ row: rows[0] || null });
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      await ensureEntityAccess(entity, id, access, collaborator);
      await sql.unsafe(`delete from ${CRM_SCHEMA}.${config.table} where id = $1;`, [id]);
      return json({ success: true });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    const status = getErrorStatus(error);
    if (status >= 500) {
      console.error('[crm-api] erro interno:', error);
    }
    return json({ error: mapDatabaseError(error) }, status);
  }
});
