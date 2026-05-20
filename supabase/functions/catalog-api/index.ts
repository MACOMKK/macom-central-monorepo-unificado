import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENTITY_CONFIG = {
  departamentos: {
    schema: 'public',
    table: 'departamentos',
    orderBy: 'nome',
    allowedFields: ['nome', 'descricao'],
  },
  unidades: {
    schema: 'public',
    table: 'unidades',
    orderBy: 'nome',
    allowedFields: ['nome', 'cidade', 'endereco', 'telefone', 'responsavel', 'ativo'],
  },
  colaboradores: {
    schema: 'public',
    table: 'colaboradores',
    orderBy: 'nome',
    allowedFields: [
      'id',
      'nome',
      'email',
      'funcao',
      'cpf',
      'telefone',
      'departamento_id',
      'cargo',
      'data_admissao',
      'status',
      'unidade_id',
    ],
  },
  contatos: {
    schema: 'public',
    table: 'contatos',
    orderBy: 'nome',
    allowedFields: ['tipo', 'nome', 'identificador', 'nome_contato', 'telefone', 'email', 'descricao', 'unidade_id'],
  },
  ativos: {
    schema: 'gestao_ativos',
    table: 'ativos',
    orderBy: 'nome',
    allowedFields: [
      'nome',
      'categoria',
      'marca',
      'modelo',
      'numero_serie',
      'patrimonio',
      'unidade_id',
      'localizacao_interna',
      'observacao',
      'status',
      'estado',
      'usuario_id',
    ],
  },
  infra_estrutura: {
    schema: 'gestao_ativos',
    table: 'infra_estrutura',
    orderBy: 'nome',
    allowedFields: ['tipo', 'nome', 'valor_identificador', 'descricao', 'unidade_id'],
  },
  linhas_corporativas: {
    schema: 'gestao_ativos',
    table: 'linhas_corporativas',
    orderBy: 'nome',
    allowedFields: ['tipo', 'nome', 'numero', 'operadora', 'status', 'unidade_id', 'colaborador_id', 'observacao'],
  },
  termos_posse: {
    schema: 'gestao_ativos',
    table: 'termos_posse',
    orderBy: 'gerado_em',
    orderDirection: 'desc',
    allowedFields: [
      'codigo',
      'ativo_id',
      'colaborador_id',
      'status',
      'conteudo',
      'arquivo_url',
      'observacoes',
      'assinado_em',
      'devolvido_em',
    ],
  },
  fila_emails: {
    schema: 'gestao_ativos',
    table: 'fila_emails',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'tipo',
      'destinatario',
      'assunto',
      'payload',
      'status',
      'tentativas',
      'max_tentativas',
      'agendado_em',
      'erro',
      'enviado_em',
      'processado_em',
    ],
  },
  sistemas: {
    schema: 'public',
    table: 'sistemas',
    orderBy: 'nome',
    allowedFields: ['slug', 'nome', 'descricao', 'ativo'],
  },
  acessos_usuario_sistema: {
    schema: 'public',
    table: 'acessos_usuario_sistema',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: ['colaborador_id', 'sistema_id', 'nivel_acesso', 'ativo'],
  },
  relatorios: {
    schema: 'gestao_relatorio',
    table: 'relatorios',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: ['id', 'titulo', 'descricao', 'embed_code', 'unidade_id', 'todas_unidades', 'categoria', 'icone', 'ativo'],
  },
  relatorios_unidades: {
    schema: 'gestao_relatorio',
    table: 'relatorios_unidades',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: ['id', 'relatorio_id', 'unidade_id'],
  },
  permissoes_relatorios: {
    schema: 'gestao_relatorio',
    table: 'permissoes_relatorios',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: ['id', 'colaborador_id', 'relatorio_id'],
  },
  logs_auditoria_relatorios: {
    schema: 'gestao_relatorio',
    table: 'logs_auditoria',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: ['entidade', 'acao', 'registro_id', 'actor_colaborador_id'],
  },
} as const;

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

function sanitizePayload(entity: keyof typeof ENTITY_CONFIG, payload: Record<string, unknown> = {}) {
  const allowedFields = ENTITY_CONFIG[entity].allowedFields;
  const sanitized: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in payload) {
      sanitized[field] = payload[field];
    }
  }

  return sanitized;
}

function buildSqlFilters(
  filters: Record<string, unknown>,
  startIndex = 1,
  tableAlias?: string,
) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const prefix = tableAlias ? `${tableAlias}.` : '';

  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    clauses.push(`${prefix}"${field}" = $${startIndex + values.length}`);
    values.push(value);
  }

  return { clauses, values };
}

async function userHasActiveSystemAccess(userId: string, systemSlug: string) {
  if (!sql) return false;

  const rows = await sql.unsafe(
    `
      select 1
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      where aus.colaborador_id = $1
        and aus.ativo = true
        and s.slug = $2
        and s.ativo = true
      limit 1;
    `,
    [userId, systemSlug],
  );

  return Boolean(rows[0]);
}

async function userHasActiveSystemAccessAny(userIds: string[], systemSlug: string) {
  if (!sql || !userIds.length) return false;

  const rows = await sql.unsafe(
    `
      select 1
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      where aus.colaborador_id = any($1::uuid[])
        and aus.ativo = true
        and s.slug = $2
        and s.ativo = true
      limit 1;
    `,
    [userIds, systemSlug],
  );

  return Boolean(rows[0]);
}

async function getSystemBySlug(systemSlug: string) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `
      select *
      from public.sistemas
      where slug = $1
      limit 1;
    `,
    [systemSlug],
  );

  return rows[0] || null;
}

async function getSystemAccessAny(
  userIds: string[],
  systemSlug: string,
  { onlyActive = false }: { onlyActive?: boolean } = {},
) {
  if (!sql || !userIds.length) return null;

  const accessClauses = [onlyActive ? 'and aus.ativo = true' : '', onlyActive ? 'and s.ativo = true' : '']
    .filter(Boolean)
    .join('\n        ');

  const rows = await sql.unsafe(
    `
      select
        aus.*,
        row_to_json(s) as sistema
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      where aus.colaborador_id = any($1::uuid[])
        and s.slug = $2
        ${accessClauses}
      order by
        case aus.nivel_acesso
          when 'admin' then 0
          when 'gestor' then 1
          else 2
        end,
        aus.ativo desc,
        aus.atualizado_em desc nulls last,
        aus.criado_em desc
      limit 1;
    `,
    [userIds, systemSlug],
  );

  return rows[0] || null;
}

async function collaboratorHasSystemAccess(collaboratorId: string, systemSlug: string) {
  if (!sql) return false;

  const rows = await sql.unsafe(
    `
      select 1
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      where aus.colaborador_id = $1
        and s.slug = $2
      limit 1;
    `,
    [collaboratorId, systemSlug],
  );

  return Boolean(rows[0]);
}

const REPORTS_AUDIT_ENTITIES = new Set([
  'relatorios',
  'relatorios_unidades',
  'permissoes_relatorios',
]);
const REPORTS_AUDIT_IGNORED_FIELDS = new Set([
  'atualizado_em',
]);

function shouldAuditReportsEntity(entity: keyof typeof ENTITY_CONFIG) {
  return REPORTS_AUDIT_ENTITIES.has(entity);
}

async function fetchRowById(schema: string, table: string, id: string) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `select * from ${schema}.${table} where id = $1 limit 1;`,
    [id],
  );

  return rows[0] || null;
}

function normalizeAuditValue(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim();
  return JSON.stringify(value);
}

function getReportsAuditDiff(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
) {
  const beforeObject = before && typeof before === 'object' ? before : {};
  const afterObject = after && typeof after === 'object' ? after : {};
  const keys = [...new Set([...Object.keys(beforeObject), ...Object.keys(afterObject)])]
    .filter((key) => !REPORTS_AUDIT_IGNORED_FIELDS.has(key))
    .sort();

  const beforeDiff: Record<string, unknown> = {};
  const afterDiff: Record<string, unknown> = {};

  for (const key of keys) {
    const beforeValue = beforeObject[key];
    const afterValue = afterObject[key];

    if (normalizeAuditValue(beforeValue) === normalizeAuditValue(afterValue)) {
      continue;
    }

    beforeDiff[key] = beforeValue ?? null;
    afterDiff[key] = afterValue ?? null;
  }

  return {
    before: Object.keys(beforeDiff).length ? beforeDiff : null,
    after: Object.keys(afterDiff).length ? afterDiff : null,
    changedFields: Object.keys(afterDiff),
  };
}

async function insertReportsAuditLog({
  action,
  entity,
  recordId,
  actorCollaboratorId,
  actorEmail,
  before,
  after,
  metadata = {},
}: {
  action: 'create' | 'update' | 'delete';
  entity: string;
  recordId?: string | null;
  actorCollaboratorId?: string | null;
  actorEmail?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) {
  if (!sql) return;

  await sql.unsafe(
    `
      insert into gestao_relatorio.logs_auditoria (
        entidade,
        acao,
        registro_id,
        actor_colaborador_id,
        actor_email,
        antes,
        depois,
        metadados
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb);
    `,
    [
      entity,
      action,
      recordId ?? null,
      actorCollaboratorId ?? null,
      actorEmail ?? null,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      JSON.stringify(metadata || {}),
    ],
  );
}

async function resolveAuthenticatedCollaborator(authUser: { id: string; email?: string | null }) {
  if (!sql) return null;

  const byIdRows = await sql.unsafe('select * from public.colaboradores where id = $1 limit 1;', [authUser.id]);
  if (byIdRows[0]) {
    return byIdRows[0];
  }

  const normalizedEmail = typeof authUser.email === 'string' ? authUser.email.trim().toLowerCase() : null;
  if (!normalizedEmail) {
    return null;
  }

  const byEmailRows = await sql.unsafe(
    'select * from public.colaboradores where lower(trim(email)) = lower(trim($1)) limit 1;',
    [normalizedEmail],
  );

  return byEmailRows[0] || null;
}

async function resolveAuthenticatedCollaborators(authUser: { id: string; email?: string | null }) {
  if (!sql) return [];

  const rows: Array<Record<string, unknown>> = [];
  const byIdRows = await sql.unsafe('select * from public.colaboradores where id = $1 limit 1;', [authUser.id]);
  rows.push(...byIdRows);

  const normalizedEmail = typeof authUser.email === 'string' ? authUser.email.trim().toLowerCase() : null;
  if (normalizedEmail) {
    const byEmailRows = await sql.unsafe(
      'select * from public.colaboradores where lower(trim(email)) = lower(trim($1));',
      [normalizedEmail],
    );
    rows.push(...byEmailRows);
  }

  const uniqueRows = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const id = typeof row?.id === 'string' ? row.id : null;
    if (id && !uniqueRows.has(id)) {
      uniqueRows.set(id, row);
    }
  }

  return [...uniqueRows.values()];
}

function normalizeCollaboradoresPayload(payload: Record<string, unknown>) {
  const normalized = { ...payload };

  if (typeof normalized.email === 'string') {
    normalized.email = normalized.email.trim().toLowerCase() || null;
  }

  if (typeof normalized.telefone === 'string') {
    normalized.telefone = normalizeDigits(normalized.telefone.trim()) || null;
  }

  if (typeof normalized.cpf === 'string') {
    normalized.cpf = normalizeDigits(normalized.cpf.trim()) || null;
  }

  return normalized;
}

function normalizeContatosPayload(payload: Record<string, unknown>) {
  const normalized = { ...payload };

  if (typeof normalized.tipo === 'string') {
    normalized.tipo = normalized.tipo.trim().toLowerCase();
  }

  if (typeof normalized.nome === 'string') {
    normalized.nome = normalized.nome.trim();
  }

  if (typeof normalized.identificador === 'string') {
    normalized.identificador = normalized.identificador.trim() || null;
  }

  if (typeof normalized.nome_contato === 'string') {
    normalized.nome_contato = normalized.nome_contato.trim() || null;
  }

  if (typeof normalized.telefone === 'string') {
    normalized.telefone = normalizeDigits(normalized.telefone.trim()) || null;
  }

  if (typeof normalized.email === 'string') {
    normalized.email = normalized.email.trim().toLowerCase() || null;
  }

  if (typeof normalized.descricao === 'string') {
    normalized.descricao = normalized.descricao.trim() || null;
  }

  return normalized;
}

function normalizeDigits(value: string | null) {
  return value ? value.replace(/\D/g, '') : null;
}

function normalizeAtivosPayload(payload: Record<string, unknown>) {
  const normalized = { ...payload };
  normalized.status = normalized.usuario_id ? 'em_uso' : 'disponivel';
  return normalized;
}

function normalizeInfraEstruturaPayload(payload: Record<string, unknown>) {
  const normalized = { ...payload };

  if (typeof normalized.tipo === 'string') {
    normalized.tipo = normalized.tipo.trim().toLowerCase();
  }

  if (typeof normalized.nome === 'string') {
    normalized.nome = normalized.nome.trim();
  }

  if (typeof normalized.valor_identificador === 'string') {
    normalized.valor_identificador = normalized.valor_identificador.trim();
  }

  if (typeof normalized.descricao === 'string') {
    normalized.descricao = normalized.descricao.trim() || null;
  }

  return normalized;
}

function normalizeLinhasCorporativasPayload(payload: Record<string, unknown>) {
  const normalized = { ...payload };

  if (typeof normalized.tipo === 'string') {
    normalized.tipo = normalized.tipo.trim().toLowerCase();
  }

  if (typeof normalized.nome === 'string') {
    normalized.nome = normalized.nome.trim();
  }

  if (typeof normalized.numero === 'string') {
    normalized.numero = normalized.numero.trim();
  }

  if (typeof normalized.operadora === 'string') {
    normalized.operadora = normalized.operadora.trim() || null;
  }

  if (typeof normalized.status === 'string') {
    normalized.status = normalized.status.trim().toLowerCase();
  }

  if (typeof normalized.observacao === 'string') {
    normalized.observacao = normalized.observacao.trim() || null;
  }

  return normalized;
}

function formatDateTimePtBr(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Fortaleza',
      }).format(date);
}

function generateTermCode() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `TP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function buildTermoConteudo(data: {
  codigo: string;
  colaboradorNome: string | null;
  colaboradorCpf: string | null;
  colaboradorEmail: string | null;
  departamentoNome: string | null;
  unidadeNome: string | null;
  ativoNome: string | null;
  ativoCategoria: string | null;
  ativoMarca: string | null;
  ativoModelo: string | null;
  ativoNumeroSerie: string | null;
  ativoPatrimonio: string | null;
  observacoes: string | null;
  geradoEm: string;
}) {
  const colaborador = data.colaboradorNome || 'Colaborador nao informado';
  const ativo = data.ativoNome || 'Equipamento nao informado';
  const identificacaoAtivo = [data.ativoMarca, data.ativoModelo, data.ativoNumeroSerie, data.ativoPatrimonio]
    .filter(Boolean)
    .join(' / ');
  const localInfo = [data.departamentoNome, data.unidadeNome].filter(Boolean).join(' - ');

  return [
    `TERMO DE COMPROMISSO DE EQUIPAMENTO`,
    ``,
    `Codigo do termo: ${data.codigo}`,
    `Data de geracao: ${data.geradoEm}`,
    ``,
    `Eu, ${colaborador}, ${data.colaboradorCpf ? `CPF ${data.colaboradorCpf}` : 'CPF nao informado'}${data.colaboradorEmail ? `, email ${data.colaboradorEmail}` : ''}, declaro o recebimento do equipamento ${ativo}${data.ativoCategoria ? ` (${data.ativoCategoria})` : ''}.`,
    ``,
    `Identificacao do equipamento: ${identificacaoAtivo || 'Nao informada'}.`,
    `${localInfo ? `Lotacao relacionada: ${localInfo}.` : ''}`,
    ``,
    `Comprometo-me a utilizar o equipamento exclusivamente para as atividades autorizadas pela MACOM, zelar por sua conservacao e comunicar imediatamente qualquer dano, perda, furto ou mau funcionamento.`,
    `Tambem declaro estar ciente de que a devolucao do equipamento devera ocorrer sempre que solicitado ou ao encerramento do meu vinculo com a empresa.`,
    `${data.observacoes ? `Observacoes: ${data.observacoes}` : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function isMissingRequiredValue(value: unknown) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function validateAtivosPayload(payload: Record<string, unknown>, requireAllFields = false) {
  const requiredFields = [
    ['nome', 'Nome'],
    ['categoria', 'Categoria'],
    ['numero_serie', 'Numero de serie'],
    ['unidade_id', 'Unidade'],
  ] as const;

  for (const [field, label] of requiredFields) {
    if ((requireAllFields || field in payload) && isMissingRequiredValue(payload[field])) {
      throw new Error(`${label} do ativo obrigatorio.`);
    }
  }
}

function isValidIpv4(value: string) {
  const octets = value.split('.');
  if (octets.length !== 4) return false;

  return octets.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const number = Number(part);
    return number >= 0 && number <= 255;
  });
}

function validateInfraEstruturaPayload(payload: Record<string, unknown>, requireAllFields = false) {
  const requiredFields = [
    ['tipo', 'Tipo'],
    ['nome', 'Nome'],
    ['valor_identificador', 'Valor'],
    ['unidade_id', 'Unidade'],
  ] as const;

  for (const [field, label] of requiredFields) {
    if ((requireAllFields || field in payload) && isMissingRequiredValue(payload[field])) {
      throw new Error(`${label} da infraestrutura obrigatorio.`);
    }
  }

  if ('tipo' in payload) {
    const tipo = String(payload.tipo || '').trim().toLowerCase();
    if (!['ip', 'link'].includes(tipo)) {
      throw new Error('Tipo da infraestrutura invalido.');
    }
  }

  if ('valor_identificador' in payload && !isMissingRequiredValue(payload.valor_identificador)) {
    const tipo = String(payload.tipo || '').trim().toLowerCase();
    const value = String(payload.valor_identificador || '').trim();

    if (tipo === 'ip' && !isValidIpv4(value)) {
      throw new Error('Endereco IP invalido.');
    }

    if (tipo === 'link') {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        throw new Error('URL do sistema invalida.');
      }

      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('URL do sistema deve iniciar com http:// ou https://.');
      }
    }
  }
}

function validateLinhasCorporativasPayload(payload: Record<string, unknown>, requireAllFields = false) {
  const requiredFields = [
    ['tipo', 'Tipo'],
    ['numero', 'Numero'],
  ] as const;

  for (const [field, label] of requiredFields) {
    if ((requireAllFields || field in payload) && isMissingRequiredValue(payload[field])) {
      throw new Error(`${label} da linha corporativa obrigatorio.`);
    }
  }

  if ('tipo' in payload) {
    const tipo = String(payload.tipo || '').trim().toLowerCase();
    if (!['chip', 'linha_movel', 'telefone_fixo', 'ramal', 'outro'].includes(tipo)) {
      throw new Error('Tipo da linha corporativa invalido.');
    }
  }

  if ('status' in payload && !isMissingRequiredValue(payload.status)) {
    const status = String(payload.status || '').trim().toLowerCase();
    if (!['disponivel', 'em_uso', 'inativo', 'cancelado'].includes(status)) {
      throw new Error('Status da linha corporativa invalido.');
    }
  }

  if ('numero' in payload && !isMissingRequiredValue(payload.numero)) {
    const digits = String(payload.numero || '').replace(/\D/g, '');
    if (digits.length !== 11) {
      throw new Error('Numero da linha corporativa deve conter exatamente 11 digitos.');
    }
  }
}

async function buildTermosPossePayload(
  payload: Record<string, unknown>,
  currentUserId: string,
) {
  if (!sql) throw new Error('Conexao com banco indisponivel.');

  const ativoId = typeof payload.ativo_id === 'string' ? payload.ativo_id : null;
  const colaboradorId = typeof payload.colaborador_id === 'string' ? payload.colaborador_id : null;

  if (!ativoId) {
    throw new Error('Ativo do termo obrigatorio.');
  }

  if (!colaboradorId) {
    throw new Error('Colaborador do termo obrigatorio.');
  }

  const assetRows = await sql.unsafe(
    `
      select
        a.id,
        a.nome,
        a.categoria,
        a.marca,
        a.modelo,
        a.numero_serie,
        a.patrimonio,
        a.unidade_id,
        a.usuario_id,
        u.nome as unidade_nome
      from gestao_ativos.ativos a
      left join public.unidades u on u.id = a.unidade_id
      where a.id = $1
      limit 1;
    `,
    [ativoId],
  );

  const collaboratorRows = await sql.unsafe(
    `
      select
        c.id,
        c.nome,
        c.email,
        c.cpf,
        c.departamento_id,
        c.unidade_id,
        d.nome as departamento_nome,
        u.nome as unidade_nome
      from public.colaboradores c
      left join public.departamentos d on d.id = c.departamento_id
      left join public.unidades u on u.id = c.unidade_id
      where c.id = $1
      limit 1;
    `,
    [colaboradorId],
  );

  const asset = assetRows[0];
  const collaborator = collaboratorRows[0];

  if (!asset) {
    throw new Error('Ativo nao encontrado.');
  }

  if (!collaborator) {
    throw new Error('Colaborador nao encontrado.');
  }

  if (asset.usuario_id && asset.usuario_id !== collaborator.id) {
    throw new Error('O ativo selecionado esta vinculado a outro colaborador.');
  }

  const codigo = typeof payload.codigo === 'string' && payload.codigo.trim() ? payload.codigo.trim() : generateTermCode();
  const observacoes =
    typeof payload.observacoes === 'string' && payload.observacoes.trim() ? payload.observacoes.trim() : null;
  const geradoEmIso = new Date().toISOString();

  const conteudo =
    typeof payload.conteudo === 'string' && payload.conteudo.trim()
      ? payload.conteudo.trim()
      : buildTermoConteudo({
          codigo,
          colaboradorNome: collaborator.nome,
          colaboradorCpf: collaborator.cpf,
          colaboradorEmail: collaborator.email,
          departamentoNome: collaborator.departamento_nome,
          unidadeNome: collaborator.unidade_nome || asset.unidade_nome,
          ativoNome: asset.nome,
          ativoCategoria: asset.categoria,
          ativoMarca: asset.marca,
          ativoModelo: asset.modelo,
          ativoNumeroSerie: asset.numero_serie,
          ativoPatrimonio: asset.patrimonio,
          observacoes,
          geradoEm: formatDateTimePtBr(geradoEmIso),
        });

  return {
    codigo,
    ativo_id: asset.id,
    colaborador_id: collaborator.id,
    gerado_por: currentUserId,
    status: typeof payload.status === 'string' && payload.status.trim() ? payload.status.trim() : 'gerado',
    conteudo,
    arquivo_url: typeof payload.arquivo_url === 'string' && payload.arquivo_url.trim() ? payload.arquivo_url.trim() : null,
    observacoes,
    ativo_nome: asset.nome || null,
    ativo_categoria: asset.categoria || null,
    ativo_marca: asset.marca || null,
    ativo_modelo: asset.modelo || null,
    ativo_numero_serie: asset.numero_serie || null,
    ativo_patrimonio: asset.patrimonio || null,
    colaborador_nome: collaborator.nome || null,
    colaborador_email: collaborator.email || null,
    colaborador_cpf: collaborator.cpf || null,
    unidade_nome: collaborator.unidade_nome || asset.unidade_nome || null,
    departamento_nome: collaborator.departamento_nome || null,
    gerado_em: geradoEmIso,
  };
}

async function validateColaboradoresUniqueFields(
  payload: Record<string, unknown>,
  excludeId?: string,
) {
  if (!sql) return;

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
  const telefone = typeof payload.telefone === 'string' ? payload.telefone.trim() : null;
  const cpf = normalizeDigits(typeof payload.cpf === 'string' ? payload.cpf.trim() : null);

  if (email) {
    const rows = excludeId
      ? await sql.unsafe(
          'select id from public.colaboradores where lower(trim(email)) = lower(trim($1)) and id <> $2 limit 1;',
          [email, excludeId],
        )
      : await sql.unsafe(
          'select id from public.colaboradores where lower(trim(email)) = lower(trim($1)) limit 1;',
          [email],
        );

    if (rows[0]) {
      throw new Error('Ja existe um colaborador com este email.');
    }
  }

  if (cpf) {
    const rows = excludeId
      ? await sql.unsafe(
          "select id from public.colaboradores where regexp_replace(coalesce(cpf, ''), '\\D', '', 'g') = $1 and id <> $2 limit 1;",
          [cpf, excludeId],
        )
      : await sql.unsafe(
          "select id from public.colaboradores where regexp_replace(coalesce(cpf, ''), '\\D', '', 'g') = $1 limit 1;",
          [cpf],
        );

    if (rows[0]) {
      throw new Error('Ja existe um colaborador com este CPF.');
    }
  }

  if (telefone) {
    const rows = excludeId
      ? await sql.unsafe(
          'select id from public.colaboradores where telefone = $1 and id <> $2 limit 1;',
          [telefone, excludeId],
        )
      : await sql.unsafe(
          'select id from public.colaboradores where telefone = $1 limit 1;',
          [telefone],
        );

    if (rows[0]) {
      throw new Error('Ja existe um colaborador com este telefone.');
    }
  }
}

function validateColaboradoresDocumentFields(payload: Record<string, unknown>) {
  const cpf = typeof payload.cpf === 'string' ? payload.cpf : null;
  const telefone = typeof payload.telefone === 'string' ? payload.telefone : null;

  if (cpf && cpf.length !== 11) {
    throw new Error('CPF deve conter exatamente 11 digitos.');
  }

  if (telefone && telefone.length !== 11) {
    throw new Error('Telefone deve conter exatamente 11 digitos.');
  }
}

function validateContatosPayload(payload: Record<string, unknown>, requireAllFields = false) {
  const requiredFields = [
    ['tipo', 'Tipo'],
    ['nome', 'Nome'],
  ] as const;

  for (const [field, label] of requiredFields) {
    if ((requireAllFields || field in payload) && isMissingRequiredValue(payload[field])) {
      throw new Error(`${label} do contato obrigatorio.`);
    }
  }

  if ('tipo' in payload) {
    const tipo = String(payload.tipo || '').trim().toLowerCase();
    if (!['fornecedor', 'suporte', 'parceiro', 'comercial', 'outro'].includes(tipo)) {
      throw new Error('Tipo do contato invalido.');
    }
  }

  if ('telefone' in payload && !isMissingRequiredValue(payload.telefone)) {
    const telefone = String(payload.telefone || '');
    if (telefone.length !== 10 && telefone.length !== 11) {
      throw new Error('Telefone do contato deve conter 10 ou 11 digitos.');
    }
  }
}

function mapDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (message.includes('colaboradores_cpf_key')) {
    return 'Ja existe um colaborador com este CPF.';
  }

  if (message.includes('colaboradores_email_unique_idx')) {
    return 'Ja existe um colaborador com este email.';
  }

  if (message.includes('colaboradores_telefone_unique_idx')) {
    return 'Ja existe um colaborador com este telefone.';
  }

  return message || 'Erro interno.';
}

function getErrorStatus(error: unknown) {
  const message = mapDatabaseError(error);

  if (
    message === 'Ja existe um colaborador com este CPF.' ||
    message === 'Ja existe um colaborador com este email.' ||
    message === 'Ja existe um colaborador com este telefone.' ||
    message === 'CPF deve conter exatamente 11 digitos.' ||
    message === 'Telefone deve conter exatamente 11 digitos.'
  ) {
    return 400;
  }

  return 500;
}

function buildInsertQuery(schema: string, table: string, payload: Record<string, unknown>) {
  const entries = Object.entries(payload);
  const columns = entries.map(([key]) => `"${key}"`).join(', ');
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(', ');
  const values = entries.map(([, value]) => value);

  return {
    text: `insert into ${schema}.${table} (${columns}) values (${placeholders}) returning *;`,
    values,
  };
}

function buildUpdateQuery(schema: string, table: string, id: string, payload: Record<string, unknown>) {
  const entries = Object.entries(payload);
  const assignments = entries.map(([key], index) => `"${key}" = $${index + 2}`).join(', ');
  const values = [id, ...entries.map(([, value]) => value)];

  return {
    text: `update ${schema}.${table} set ${assignments} where id = $1 returning *;`,
    values,
  };
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
      return json({ error: 'Nao autenticado.' }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const entity = body.entity as keyof typeof ENTITY_CONFIG;
    const id = body.id as string | undefined;
    const payload = body.payload as Record<string, unknown> | undefined;
    const filters = body.filters as Record<string, unknown> | undefined;

    if (!entity || !ENTITY_CONFIG[entity]) {
      return json({ error: 'Entidade invalida.' }, 400);
    }

    const schema = ENTITY_CONFIG[entity].schema;
    const table = ENTITY_CONFIG[entity].table;
    const orderBy = ENTITY_CONFIG[entity].orderBy;
    const orderDirection = 'orderDirection' in ENTITY_CONFIG[entity] ? ENTITY_CONFIG[entity].orderDirection : 'asc';

    const authenticatedCollaborators = await resolveAuthenticatedCollaborators(user);
    const authenticatedCollaborator =
      authenticatedCollaborators.find((row) => row?.id === user.id) ||
      authenticatedCollaborators[0] ||
      null;
    const authenticatedCollaboratorIds = [
      ...new Set(
        [user.id, ...authenticatedCollaborators.map((row) => (typeof row?.id === 'string' ? row.id : null))]
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const authenticatedCollaboratorId = authenticatedCollaborator?.id || user.id;

    if (action === 'me' && entity === 'colaboradores') {
      const systemSlug = typeof body.system_slug === 'string' ? body.system_slug.trim() : '';

      if (!systemSlug) {
        return json({ row: authenticatedCollaborator || null });
      }

      const rows = await sql.unsafe(
        `
          select
            aus.*,
            row_to_json(s) as sistema
          from public.acessos_usuario_sistema aus
          join public.sistemas s on s.id = aus.sistema_id
          where aus.colaborador_id = any($1::uuid[])
            and s.slug = $2
          order by aus.ativo desc, aus.atualizado_em desc nulls last, aus.criado_em desc
          limit 1;
        `,
        [authenticatedCollaboratorIds, systemSlug],
      );

      return json({
        row: authenticatedCollaborator || null,
        access: rows[0] || null,
      });
    }

    if (action === 'access_check' && entity === 'acessos_usuario_sistema') {
      const systemSlug = typeof body.system_slug === 'string' ? body.system_slug.trim() : '';

      if (!systemSlug) {
        return json({ error: 'Slug do sistema obrigatorio.' }, 400);
      }

      const rows = await sql.unsafe(
        `
          select
            aus.*,
            row_to_json(s) as sistema
          from public.acessos_usuario_sistema aus
          join public.sistemas s on s.id = aus.sistema_id
          where aus.colaborador_id = $1
            and s.slug = $2
          limit 1;
        `,
          [authenticatedCollaboratorId, systemSlug],
        );

        return json({ row: rows[0] || null });
      }

      const reportsSystemSlug = 'relatorios';
      const accessProfile = authenticatedCollaborator;
      const isGlobalAdmin = accessProfile?.funcao === 'admin' && accessProfile?.status !== 'inativo';
      const reportsAccess = await getSystemAccessAny(authenticatedCollaboratorIds, reportsSystemSlug, { onlyActive: true });
      const hasReportsAccess = Boolean(reportsAccess);
      const isReportsAdmin = reportsAccess?.nivel_acesso === 'admin';
      const canManageReportsEntityAsAdmin =
        isGlobalAdmin || (isReportsAdmin && (
          entity === 'relatorios' ||
          entity === 'relatorios_unidades' ||
          entity === 'permissoes_relatorios' ||
          entity === 'logs_auditoria_relatorios'
        ));

    if (action === 'list' && entity === 'relatorios') {
      const sanitizedFilters = sanitizePayload(entity, filters || {});
      const { clauses, values } = buildSqlFilters(sanitizedFilters, 1, 'r');
      const whereClauses = [...clauses];

      if (!canManageReportsEntityAsAdmin) {
        if (!hasReportsAccess) {
          return json({ error: 'Seu usuario nao possui acesso liberado ao sistema de relatorios.' }, 403);
        }

        const permissionParam = values.length + 1;
        whereClauses.push('r.ativo = true');
        whereClauses.push(
          `exists (
              select 1
              from gestao_relatorio.permissoes_relatorios pr
              where pr.relatorio_id = r.id
                and pr.colaborador_id = any($${permissionParam}::uuid[])
          )`,
        );
        values.push(authenticatedCollaboratorIds);
      }

      const whereSql = whereClauses.length ? `where ${whereClauses.join(' and ')}` : '';
        const rows = await sql.unsafe(
          `
            select
              r.*,
              u.nome as nome_unidade,
              coalesce(
                array_agg(distinct ru.unidade_id) filter (where ru.unidade_id is not null),
                '{}'::uuid[]
              ) as unidade_ids,
              coalesce(
                array_agg(distinct uu.nome) filter (where uu.nome is not null),
                '{}'::text[]
              ) as nomes_unidades
            from gestao_relatorio.relatorios r
            left join gestao_relatorio.relatorios_unidades ru on ru.relatorio_id = r.id
            left join public.unidades u on u.id = r.unidade_id
            left join public.unidades uu on uu.id = ru.unidade_id
            ${whereSql}
            group by r.id, u.nome
            order by r.${orderBy} ${orderDirection};
          `,
          values,
        );
        return json({ rows });
      }

    if (action === 'list' && entity === 'relatorios_unidades') {
      const sanitizedFilters = sanitizePayload(entity, filters || {});
      const relationFilters = { ...sanitizedFilters };

      if (!canManageReportsEntityAsAdmin) {
        if (!hasReportsAccess) {
          return json({ error: 'Seu usuario nao possui acesso liberado ao sistema de relatorios.' }, 403);
        }
        const { clauses, values } = buildSqlFilters(relationFilters, 1, 'ru');
        clauses.push(
          `exists (
            select 1
            from gestao_relatorio.permissoes_relatorios pr
            where pr.relatorio_id = ru.relatorio_id
              and pr.colaborador_id = any($${values.length + 1}::uuid[])
          )`,
        );
        values.push(authenticatedCollaboratorIds);
        const whereSql = clauses.length ? `where ${clauses.join(' and ')}` : '';
        const rows = await sql.unsafe(
          `select * from gestao_relatorio.relatorios_unidades ru ${whereSql} order by ru.${orderBy} ${orderDirection};`,
          values,
        );
        return json({ rows });
      }

      const { clauses, values } = buildSqlFilters(relationFilters, 1);
      const whereSql = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const rows = await sql.unsafe(
        `select * from gestao_relatorio.relatorios_unidades ${whereSql} order by ${orderBy} ${orderDirection};`,
        values,
      );
      return json({ rows });
    }

    if (action === 'list' && entity === 'logs_auditoria_relatorios') {
      const sanitizedFilters = sanitizePayload(entity, filters || {});
      const { clauses, values } = buildSqlFilters(sanitizedFilters, 1);
      const whereSql = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const rawLimit = typeof body.limit === 'number' ? body.limit : Number(body.limit);
      const rawOffset = typeof body.offset === 'number' ? body.offset : Number(body.offset);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : null;
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

      const totalRows = await sql.unsafe(
        `select count(*)::int as total from gestao_relatorio.logs_auditoria ${whereSql};`,
        values,
      );
      const paginatedSql = limit != null
        ? `select * from gestao_relatorio.logs_auditoria ${whereSql} order by ${orderBy} ${orderDirection} limit ${limit} offset ${offset};`
        : `select * from gestao_relatorio.logs_auditoria ${whereSql} order by ${orderBy} ${orderDirection};`;
      const rows = await sql.unsafe(paginatedSql, values);

      return json({
        rows,
        total: totalRows[0]?.total ?? rows.length,
        limit,
        offset,
      });
    }

    if (action === 'list' && entity === 'permissoes_relatorios') {
      const sanitizedFilters = sanitizePayload(entity, filters || {});
      const permissionFilters = { ...sanitizedFilters };

      if (!canManageReportsEntityAsAdmin) {
        if (!hasReportsAccess) {
          return json({ error: 'Seu usuario nao possui acesso liberado ao sistema de relatorios.' }, 403);
        }
        const { clauses, values } = buildSqlFilters(permissionFilters, 1);
        clauses.push(`colaborador_id = any($${values.length + 1}::uuid[])`);
        values.push(authenticatedCollaboratorIds);
        const whereSql = clauses.length ? `where ${clauses.join(' and ')}` : '';
        const rows = await sql.unsafe(
          `select * from gestao_relatorio.permissoes_relatorios ${whereSql} order by ${orderBy} ${orderDirection};`,
          values,
        );
        return json({ rows });
      }

      const { clauses, values } = buildSqlFilters(permissionFilters, 1);
      const whereSql = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const rows = await sql.unsafe(
        `select * from gestao_relatorio.permissoes_relatorios ${whereSql} order by ${orderBy} ${orderDirection};`,
        values,
      );
      return json({ rows });
    }

    if (!isGlobalAdmin && isReportsAdmin) {
      const reportsSystem = await getSystemBySlug(reportsSystemSlug);
      const reportsSystemId = typeof reportsSystem?.id === 'string' ? reportsSystem.id : null;

      if (!reportsSystemId) {
        return json({ error: 'Sistema de relatorios nao encontrado.' }, 404);
      }

      if (action === 'list' && entity === 'sistemas') {
        return json({ rows: [reportsSystem] });
      }

      if (action === 'list' && entity === 'acessos_usuario_sistema') {
        const rows = await sql.unsafe(
          `
            select *
            from public.acessos_usuario_sistema
            where sistema_id = $1
            order by ${orderBy} ${orderDirection};
          `,
          [reportsSystemId],
        );
        return json({ rows });
      }

      if (action === 'save' && entity === 'acessos_usuario_sistema') {
        const sanitized = sanitizePayload(entity, payload);
        const colaboradorId = typeof sanitized.colaborador_id === 'string' ? sanitized.colaborador_id : null;
        const sistemaId = typeof sanitized.sistema_id === 'string' ? sanitized.sistema_id : null;

        if (!colaboradorId || !sistemaId) {
          return json({ error: 'Colaborador e sistema sao obrigatorios.' }, 400);
        }

        if (sistemaId !== reportsSystemId) {
          return json({ error: 'Acesso restrito ao sistema de relatorios.' }, 403);
        }

        const existingRows = await sql.unsafe(
          `
            select *
            from public.acessos_usuario_sistema
            where colaborador_id = $1
              and sistema_id = $2
            limit 1;
          `,
          [colaboradorId, sistemaId],
        );
        const existingAccess = existingRows[0] || null;

        const rows = await sql.unsafe(
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
            sanitized.nivel_acesso ?? 'usuario',
            sanitized.ativo ?? true,
          ],
        );

        await insertReportsAuditLog({
          action: existingAccess ? 'update' : 'create',
          entity,
          recordId: rows[0]?.id || null,
          actorCollaboratorId: authenticatedCollaboratorId,
          actorEmail: user.email ?? null,
          before: existingAccess,
          after: rows[0] || null,
          metadata: {
            system_slug: reportsSystemSlug,
            access_scope: 'reports_admin',
          },
        });

        return json({ row: rows[0] || null });
      }

      if ((action === 'update' || action === 'delete') && entity === 'acessos_usuario_sistema') {
        if (!id) return json({ error: 'ID obrigatorio.' }, 400);

        const accessRows = await sql.unsafe(
          `
            select *
            from public.acessos_usuario_sistema
            where id = $1
            limit 1;
          `,
          [id],
        );
        const accessRow = accessRows[0] || null;

        if (!accessRow) {
          return json({ error: 'Registro nao encontrado.' }, 404);
        }

        if (accessRow.sistema_id !== reportsSystemId) {
          return json({ error: 'Acesso restrito ao sistema de relatorios.' }, 403);
        }

        if (action === 'delete') {
          await insertReportsAuditLog({
            action: 'delete',
            entity,
            recordId: accessRow.id || id,
            actorCollaboratorId: authenticatedCollaboratorId,
            actorEmail: user.email ?? null,
            before: accessRow,
            after: null,
            metadata: {
              system_slug: reportsSystemSlug,
              access_scope: 'reports_admin',
            },
          });
          await sql.unsafe('delete from public.acessos_usuario_sistema where id = $1;', [id]);
          return json({ success: true });
        }

        const sanitized = sanitizePayload(entity, payload);
        if (!Object.keys(sanitized).length) {
          return json({ error: 'Nenhum campo para atualizar.' }, 400);
        }

        const query = buildUpdateQuery('public', 'acessos_usuario_sistema', id, sanitized);
        const rows = await sql.unsafe(query.text, query.values);
        await insertReportsAuditLog({
          action: 'update',
          entity,
          recordId: rows[0]?.id || id,
          actorCollaboratorId: authenticatedCollaboratorId,
          actorEmail: user.email ?? null,
          before: accessRow,
          after: rows[0] || null,
          metadata: {
            system_slug: reportsSystemSlug,
            access_scope: 'reports_admin',
          },
        });
        return json({ row: rows[0] || null });
      }

      if (action === 'list' && entity === 'colaboradores') {
        const rows = await sql.unsafe(
          `
            select c.*
            from public.colaboradores c
            where exists (
              select 1
              from public.acessos_usuario_sistema aus
              where aus.colaborador_id = c.id
                and aus.sistema_id = $1
            )
            order by c.${orderBy} ${orderDirection};
          `,
          [reportsSystemId],
        );
        return json({ rows });
      }

      if (action === 'update' && entity === 'colaboradores') {
        if (!id) return json({ error: 'ID obrigatorio.' }, 400);

        const hasScopedAccess = await collaboratorHasSystemAccess(id, reportsSystemSlug);
        if (!hasScopedAccess) {
          return json({ error: 'Colaborador sem acesso ao sistema de relatorios.' }, 403);
        }

        const beforeRow = await fetchRowById('public', 'colaboradores', id);

        const rawPayload = payload || {};
        const sanitized = sanitizePayload(entity, rawPayload);
        const restrictedPayload: Record<string, unknown> = {};

        if ('nome' in sanitized) restrictedPayload.nome = sanitized.nome;
        if ('unidade_id' in sanitized) restrictedPayload.unidade_id = sanitized.unidade_id;

        if (!Object.keys(restrictedPayload).length) {
          return json({ error: 'Nenhum campo permitido para atualizar.' }, 400);
        }

        const normalized = normalizeCollaboradoresPayload(restrictedPayload);
        validateColaboradoresDocumentFields(normalized);
        await validateColaboradoresUniqueFields(normalized, id);
        const query = buildUpdateQuery('public', 'colaboradores', id, normalized);
        const rows = await sql.unsafe(query.text, query.values);
        await insertReportsAuditLog({
          action: 'update',
          entity,
          recordId: rows[0]?.id || id,
          actorCollaboratorId: authenticatedCollaboratorId,
          actorEmail: user.email ?? null,
          before: beforeRow,
          after: rows[0] || null,
          metadata: {
            system_slug: reportsSystemSlug,
            access_scope: 'reports_admin',
            fields: Object.keys(normalized),
          },
        });
        return json({ row: rows[0] || null });
      }

      if (action === 'list' && entity === 'unidades') {
        const rows = await sql.unsafe(`select * from public.unidades order by ${orderBy} ${orderDirection};`);
        return json({ rows });
      }
    }

    if (!canManageReportsEntityAsAdmin && !isGlobalAdmin) {
      return json({ error: 'Acesso restrito a administradores.' }, 403);
    }

    if (action === 'list') {
      const rows = await sql.unsafe(`select * from ${schema}.${table} order by ${orderBy} ${orderDirection};`);
      return json({ rows });
    }

    if (action === 'save' && entity === 'acessos_usuario_sistema') {
      const sanitized = sanitizePayload(entity, payload);
      const colaboradorId = typeof sanitized.colaborador_id === 'string' ? sanitized.colaborador_id : null;
      const sistemaId = typeof sanitized.sistema_id === 'string' ? sanitized.sistema_id : null;

      if (!colaboradorId || !sistemaId) {
        return json({ error: 'Colaborador e sistema sao obrigatorios.' }, 400);
      }

      const existingRows = await sql.unsafe(
        `
          select *
          from public.acessos_usuario_sistema
          where colaborador_id = $1
            and sistema_id = $2
          limit 1;
        `,
        [colaboradorId, sistemaId],
      );
      const existingAccess = existingRows[0] || null;

      const rows = await sql.unsafe(
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
          sanitized.nivel_acesso ?? 'usuario',
          sanitized.ativo ?? true,
        ],
      );

      const relatedSystem = await fetchRowById('public', 'sistemas', sistemaId);
      if (relatedSystem?.slug === 'relatorios') {
        await insertReportsAuditLog({
          action: existingAccess ? 'update' : 'create',
          entity,
          recordId: rows[0]?.id || null,
          actorCollaboratorId: authenticatedCollaboratorId,
          actorEmail: user.email ?? null,
          before: existingAccess,
          after: rows[0] || null,
          metadata: {
            system_slug: 'relatorios',
            access_scope: 'global_admin',
          },
        });
      }

      return json({ row: rows[0] || null });
    }

    if (action === 'generate' && entity === 'termos_posse') {
      const generatedPayload = await buildTermosPossePayload(payload || {}, user.id);
      const query = buildInsertQuery(schema, table, generatedPayload);
      const rows = await sql.unsafe(query.text, query.values);
      return json({ row: rows[0] || null });
    }

    if (action === 'create') {
      const sanitized = sanitizePayload(entity, payload);
      const normalized =
        entity === 'ativos'
          ? normalizeAtivosPayload(sanitized)
          : entity === 'infra_estrutura'
            ? normalizeInfraEstruturaPayload(sanitized)
            : entity === 'linhas_corporativas'
              ? normalizeLinhasCorporativasPayload(sanitized)
            : entity === 'contatos'
              ? normalizeContatosPayload(sanitized)
          : entity === 'colaboradores'
            ? normalizeCollaboradoresPayload(sanitized)
            : sanitized;
      if (!Object.keys(normalized).length) {
        return json({ error: 'Payload vazio.' }, 400);
      }
      if (entity === 'ativos') {
        validateAtivosPayload(normalized, true);
      }
      if (entity === 'infra_estrutura') {
        validateInfraEstruturaPayload(normalized, true);
      }
      if (entity === 'linhas_corporativas') {
        validateLinhasCorporativasPayload(normalized, true);
      }
      if (entity === 'contatos') {
        validateContatosPayload(normalized, true);
      }
      if (entity === 'colaboradores') {
        validateColaboradoresDocumentFields(normalized);
        await validateColaboradoresUniqueFields(normalized);
      }
      const query = buildInsertQuery(schema, table, normalized);
      const rows = await sql.unsafe(query.text, query.values);
      if (shouldAuditReportsEntity(entity)) {
        await insertReportsAuditLog({
          action: 'create',
          entity,
          recordId: rows[0]?.id || null,
          actorCollaboratorId: authenticatedCollaboratorId,
          actorEmail: user.email ?? null,
          before: null,
          after: rows[0] || null,
          metadata: {
            system_slug: 'relatorios',
            access_scope: isGlobalAdmin ? 'global_admin' : isReportsAdmin ? 'reports_admin' : 'unknown',
          },
        });
      }
      return json({ row: rows[0] || null });
    }

    if (action === 'update') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const beforeRow =
        shouldAuditReportsEntity(entity) || entity === 'acessos_usuario_sistema' || entity === 'colaboradores'
          ? await fetchRowById(schema, table, id)
          : null;
      const sanitized = sanitizePayload(entity, payload);
      if (entity === 'colaboradores') {
        delete sanitized.id;
      }
      const normalized =
        entity === 'ativos'
          ? normalizeAtivosPayload(sanitized)
          : entity === 'infra_estrutura'
            ? normalizeInfraEstruturaPayload(sanitized)
            : entity === 'linhas_corporativas'
              ? normalizeLinhasCorporativasPayload(sanitized)
            : entity === 'contatos'
              ? normalizeContatosPayload(sanitized)
          : entity === 'colaboradores'
            ? normalizeCollaboradoresPayload(sanitized)
            : sanitized;
      if (!Object.keys(normalized).length) {
        return json({ error: 'Nenhum campo para atualizar.' }, 400);
      }
      if (entity === 'ativos') {
        validateAtivosPayload(normalized);
      }
      if (entity === 'infra_estrutura') {
        validateInfraEstruturaPayload(normalized);
      }
      if (entity === 'linhas_corporativas') {
        validateLinhasCorporativasPayload(normalized);
      }
      if (entity === 'contatos') {
        validateContatosPayload(normalized);
      }
      if (entity === 'colaboradores') {
        validateColaboradoresDocumentFields(normalized);
        await validateColaboradoresUniqueFields(normalized, id);
      }
      const query = buildUpdateQuery(schema, table, id, normalized);
      const rows = await sql.unsafe(query.text, query.values);
      const auditDiff = getReportsAuditDiff(beforeRow, rows[0] || null);
      const isReportsAccessEntity =
        entity === 'acessos_usuario_sistema' &&
        (beforeRow?.sistema_id
          ? (await fetchRowById('public', 'sistemas', String(beforeRow.sistema_id)))?.slug === 'relatorios'
          : false);
      const isReportsCollaboratorEntity =
        entity === 'colaboradores' && await collaboratorHasSystemAccess(id, 'relatorios');

      if (
        (shouldAuditReportsEntity(entity) || isReportsAccessEntity || isReportsCollaboratorEntity) &&
        auditDiff.changedFields.length
      ) {
        await insertReportsAuditLog({
          action: 'update',
          entity,
          recordId: rows[0]?.id || id,
          actorCollaboratorId: authenticatedCollaboratorId,
          actorEmail: user.email ?? null,
          before: auditDiff.before,
          after: auditDiff.after,
          metadata: {
            system_slug: 'relatorios',
            access_scope: isGlobalAdmin ? 'global_admin' : isReportsAdmin ? 'reports_admin' : 'unknown',
            changed_fields: auditDiff.changedFields,
            changed_fields_count: auditDiff.changedFields.length,
          },
        });
      }
      return json({ row: rows[0] || null });
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const beforeRow =
        shouldAuditReportsEntity(entity) || entity === 'acessos_usuario_sistema' || entity === 'colaboradores'
          ? await fetchRowById(schema, table, id)
          : null;
      const isReportsAccessEntity =
        entity === 'acessos_usuario_sistema' &&
        (beforeRow?.sistema_id
          ? (await fetchRowById('public', 'sistemas', String(beforeRow.sistema_id)))?.slug === 'relatorios'
          : false);
      const isReportsCollaboratorEntity =
        entity === 'colaboradores' && await collaboratorHasSystemAccess(id, 'relatorios');
      await sql.unsafe(`delete from ${schema}.${table} where id = $1;`, [id]);
      if (shouldAuditReportsEntity(entity) || isReportsAccessEntity || isReportsCollaboratorEntity) {
        await insertReportsAuditLog({
          action: 'delete',
          entity,
          recordId: id,
          actorCollaboratorId: authenticatedCollaboratorId,
          actorEmail: user.email ?? null,
          before: beforeRow,
          after: null,
          metadata: {
            system_slug: 'relatorios',
            access_scope: isGlobalAdmin ? 'global_admin' : isReportsAdmin ? 'reports_admin' : 'unknown',
          },
        });
      }
      return json({ success: true });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json({ error: mapDatabaseError(error) }, getErrorStatus(error));
  }
});
