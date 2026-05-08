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
    ['nome', 'Nome'],
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

    if (!entity || !ENTITY_CONFIG[entity]) {
      return json({ error: 'Entidade invalida.' }, 400);
    }

    const schema = ENTITY_CONFIG[entity].schema;
    const table = ENTITY_CONFIG[entity].table;
    const orderBy = ENTITY_CONFIG[entity].orderBy;
    const orderDirection = 'orderDirection' in ENTITY_CONFIG[entity] ? ENTITY_CONFIG[entity].orderDirection : 'asc';

    if (action === 'me' && entity === 'colaboradores') {
      const rows = await sql.unsafe('select * from public.colaboradores where id = $1 limit 1;', [user.id]);
      return json({ row: rows[0] || null });
    }

    const accessRows = await sql.unsafe('select funcao, status from public.colaboradores where id = $1 limit 1;', [user.id]);
    const accessProfile = accessRows[0];

    if (!accessProfile || accessProfile.funcao !== 'admin' || accessProfile.status === 'inativo') {
      return json({ error: 'Acesso restrito a administradores.' }, 403);
    }

    if (action === 'list') {
      const rows = await sql.unsafe(`select * from ${schema}.${table} order by ${orderBy} ${orderDirection};`);
      return json({ rows });
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
      return json({ row: rows[0] || null });
    }

    if (action === 'update') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
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
      return json({ row: rows[0] || null });
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      await sql.unsafe(`delete from ${schema}.${table} where id = $1;`, [id]);
      return json({ success: true });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json({ error: mapDatabaseError(error) }, getErrorStatus(error));
  }
});
