import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { sendPushToColaborador } from '../_shared/push.ts';

const SERVICOS_SCHEMA = 'gestao_servicos';
const SERVICOS_SYSTEM_SLUG = 'servicos';
// Registro central dos modulos com Camada 2 de permissao, cada um com seu proprio
// conjunto de papeis validos (nem todo modulo futuro precisa da mesma hierarquia
// de aprovacao do Financeiro). Novo modulo = so adicionar aqui (a tabela e
// normalizada, nao exige migration) — so precisa de migration se o modulo usar um
// papel que ainda nao esta no CHECK de gestao_servicos.permissoes_modulo.papel.
const SERVICOS_MODULOS_CONFIG = {
  financeiro: { papeis: ['nenhum', 'usuario', 'aprovador', 'financeiro', 'contas_a_pagar'] },
} as const;
const SERVICOS_MODULOS = Object.keys(SERVICOS_MODULOS_CONFIG) as (keyof typeof SERVICOS_MODULOS_CONFIG)[];
const COMPROVANTES_STORAGE_BUCKET = 'comprovantes-pagamento';
const COMPROVANTE_SIGNED_URL_TTL_SECONDS = 10 * 60;
const MAX_COMPROVANTE_FILE_SIZE = 5 * 1024 * 1024;

const CREATE_FIELDS = [
  'titulo',
  'fornecedor_id',
  'descricao',
  'valor',
  'categoria_id',
  'comprovante_path',
  'data_vencimento',
  'forma_pagamento',
  'empresa_id',
  'departamento_id',
  'observacao',
  'aprovador_destino_id',
] as const;
const UPDATE_FIELDS = CREATE_FIELDS;
const UPDATE_FIELD_LABELS: Record<(typeof CREATE_FIELDS)[number], string> = {
  titulo: 'Titulo',
  fornecedor_id: 'Fornecedor',
  descricao: 'Descricao',
  valor: 'Valor',
  categoria_id: 'Categoria',
  comprovante_path: 'Comprovante',
  data_vencimento: 'Vencimento',
  forma_pagamento: 'Forma de pagamento',
  empresa_id: 'Empresa',
  departamento_id: 'Departamento',
  observacao: 'Observacao',
  aprovador_destino_id: 'Aprovador responsavel',
};
const FORMAS_PAGAMENTO = ['pix', 'boleto', 'transferencia', 'cartao', 'outros'];
const ANEXO_CATEGORIAS = [
  'comprovante_solicitacao',
  'nf_boleto',
  'pdf_unificado',
  'rh',
  'comprovante_pagamento',
] as const;
const ANEXO_TIPOS_DOCUMENTO = ['orcamento', 'nota_fiscal', 'boleto', 'recibo', 'comprovante_pix', 'outros'] as const;
// Mantem consistencia com apps/servicos/src/lib/financeiroFormat.js (TIPOS_DOCUMENTO_POR_CATEGORIA).
const ANEXO_TIPOS_DOCUMENTO_POR_CATEGORIA: Record<(typeof ANEXO_CATEGORIAS)[number], readonly string[]> = {
  comprovante_solicitacao: ['orcamento', 'recibo', 'comprovante_pix', 'outros'],
  nf_boleto: ['nota_fiscal', 'boleto'],
  pdf_unificado: ['outros'],
  rh: ['recibo', 'outros'],
  comprovante_pagamento: ['comprovante_pix', 'boleto', 'recibo', 'outros'],
};
const ORDER_BY_COLUMNS: Record<string, string> = {
  criado_em: 'sp.criado_em desc',
  data_vencimento: 'sp.data_vencimento asc nulls last',
};

const databaseUrl = Deno.env.get('DATABASE_URL');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const sql = databaseUrl
  ? postgres(databaseUrl, {
      prepare: false,
      max: 3,
      idle_timeout: 5,
      connect_timeout: 15,
    })
  : null;

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

function getErrorStatus(error: unknown) {
  const status = Number((error as { status?: number })?.status);
  if (Number.isFinite(status) && status >= 400) return status;
  return 500;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Falha ao consultar o modulo financeiro.';
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function sanitizePayload(fields: readonly string[], payload: Record<string, unknown> = {}) {
  const sanitized: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in payload) sanitized[field] = payload[field];
  }
  return sanitized;
}

function getAccessLevel(access: Record<string, unknown> | null) {
  return String(access?.nivel_acesso || '');
}

function isFinanceiro(moduleRole: string | null) {
  return moduleRole === 'financeiro';
}

// financeiro ou contas_a_pagar: acesso amplo de leitura/pagamento a qualquer solicitacao, mas
// sem poder aprovar/reprovar nem gerenciar fornecedores/categorias (isso continua isFinanceiro
// estrito) e sem ver anexo sigiloso (ver canViewAnexoSigiloso).
function isPagador(moduleRole: string | null) {
  return moduleRole === 'financeiro' || moduleRole === 'contas_a_pagar';
}

// Acesso a uma solicitacao especifica: financeiro/contas_a_pagar ve/mexe em qualquer uma; o
// proprio solicitante sempre ve a sua; um aprovador so acessa a solicitacao endereçada
// a ele (aprovador_destino_id), nao qualquer solicitacao pendente; e qualquer papel ve as
// solicitacoes de colegas do mesmo setor (departamento_id atual do colaborador logado
// comparado ao snapshot de departamento_id da solicitacao).
function canAccessSolicitacao(
  moduleRole: string | null,
  collaboradorId: string | null | undefined,
  row: { solicitante_id: unknown; aprovador_destino_id?: unknown; departamento_id?: unknown },
  departamentoId?: string | null,
) {
  if (isPagador(moduleRole)) return true;
  if (String(row.solicitante_id) === String(collaboradorId || '')) return true;
  if (moduleRole === 'aprovador' && String(row.aprovador_destino_id || '') === String(collaboradorId || '')) {
    return true;
  }
  return Boolean(departamentoId) && String(row.departamento_id || '') === String(departamentoId);
}

// Anexo sigiloso e mais restrito que acesso normal a solicitacao: contas_a_pagar tem acesso a
// linha (pode ver/pagar a solicitacao) mas nunca ve anexo marcado sigiloso. Quem ve: financeiro,
// o proprio solicitante, o aprovador designado, e colegas do mesmo setor da solicitacao (mesma
// regra de setor usada em canAccessSolicitacao).
function canViewAnexoSigiloso(
  moduleRole: string | null,
  collaboradorId: string | null | undefined,
  row: { solicitante_id: unknown; aprovador_destino_id?: unknown; departamento_id?: unknown },
  departamentoId?: string | null,
) {
  if (isFinanceiro(moduleRole)) return true;
  if (String(row.solicitante_id) === String(collaboradorId || '')) return true;
  if (moduleRole === 'aprovador' && String(row.aprovador_destino_id || '') === String(collaboradorId || '')) {
    return true;
  }
  return Boolean(departamentoId) && String(row.departamento_id || '') === String(departamentoId);
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  return authHeader.replace('Bearer ', '').trim();
}

async function getAuthenticatedUser(token: string) {
  if (!token) {
    throw Object.assign(new Error('Sessao expirada. Faca login novamente.'), { status: 401 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw Object.assign(new Error('Supabase nao configurado.'), { status: 500 });
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

// Auth/autorizacao (usuario + colaborador + acesso + papel) e recalculada do zero
// em toda invocacao da function; como o mesmo usuario costuma disparar varias
// chamadas em sequencia rapida (ex. abrir um drawer que busca varios catalogos),
// cacheamos o resultado por token em memoria do isolate por um TTL curto para
// evitar repetir o round-trip ao Auth + 3 queries SQL a cada chamada.
const AUTH_CONTEXT_TTL_MS = 30 * 1000;
type AuthContext = {
  user: { id: string; email?: string };
  collaborator: Record<string, unknown> | null;
  access: Record<string, unknown> | null;
  moduleRole: string | null;
};
const authContextCache = new Map<string, { expiresAt: number; context: AuthContext }>();

async function getAuthContext(request: Request): Promise<AuthContext> {
  const token = getBearerToken(request);
  if (!token) {
    throw Object.assign(new Error('Sessao expirada. Faca login novamente.'), { status: 401 });
  }

  const cached = authContextCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.context;
  }

  const user = await getAuthenticatedUser(token);
  const collaborator = await getCurrentCollaborator(user);
  const access = collaborator?.id ? await getServicosAccess(String(collaborator.id)) : null;
  const moduleRole = collaborator?.id ? await getServicosModuleRole(String(collaborator.id), access) : null;

  const context: AuthContext = { user, collaborator, access, moduleRole };
  authContextCache.set(token, { expiresAt: Date.now() + AUTH_CONTEXT_TTL_MS, context });
  return context;
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

async function getServicosAccess(collaboradorId: string) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `
      select aus.*
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      where aus.colaborador_id = $1
        and aus.ativo = true
        and s.slug = $2
        and s.ativo = true
      limit 1;
    `,
    [collaboradorId, SERVICOS_SYSTEM_SLUG],
  );

  return rows[0] || null;
}

async function getServicosModuleRole(
  collaboradorId: string,
  access: Record<string, unknown> | null,
  modulo: string = 'financeiro',
) {
  const accessLevel = getAccessLevel(access);
  if (accessLevel === 'admin') return 'financeiro';
  if (!accessLevel) return null;

  const rows = await sql!.unsafe(
    `select papel from ${SERVICOS_SCHEMA}.permissoes_modulo where colaborador_id = $1 and modulo = $2 limit 1;`,
    [collaboradorId, modulo],
  );

  return rows[0]?.papel || 'usuario';
}

function ensureHasAccess(access: Record<string, unknown> | null) {
  if (!access || !['admin', 'gestor', 'usuario'].includes(getAccessLevel(access))) {
    throw Object.assign(new Error('Seu usuario nao possui acesso liberado ao modulo financeiro.'), { status: 403 });
  }
}

function validateCreatePayload(payload: Record<string, unknown>) {
  const titulo = String(payload.titulo || '').trim();
  const fornecedorId = String(payload.fornecedor_id || '').trim();
  const descricao = String(payload.descricao || '').trim();
  const valor = Number(payload.valor);
  const categoriaId = String(payload.categoria_id || '').trim();

  if (!titulo) throw Object.assign(new Error('Informe o titulo.'), { status: 400 });
  if (!fornecedorId) throw Object.assign(new Error('Informe o fornecedor.'), { status: 400 });
  if (!descricao) throw Object.assign(new Error('Informe a descricao.'), { status: 400 });
  if (!Number.isFinite(valor) || valor <= 0) {
    throw Object.assign(new Error('Informe um valor valido.'), { status: 400 });
  }
  if (!categoriaId) throw Object.assign(new Error('Informe a categoria.'), { status: 400 });

  if (!payload.forma_pagamento || !FORMAS_PAGAMENTO.includes(String(payload.forma_pagamento))) {
    throw Object.assign(new Error('Informe a forma de pagamento.'), { status: 400 });
  }

  if (payload.data_vencimento && Number.isNaN(Date.parse(String(payload.data_vencimento)))) {
    throw Object.assign(new Error('Data de vencimento invalida.'), { status: 400 });
  }
}

async function validateAprovadorDestino(aprovadorDestinoId: string) {
  const rows = await sql!.unsafe(
    `
      select 1
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      left join ${SERVICOS_SCHEMA}.permissoes_modulo pm on pm.colaborador_id = aus.colaborador_id and pm.modulo = 'financeiro'
      where aus.colaborador_id = $1 and aus.ativo = true and s.slug = $2 and s.ativo = true
        and (aus.nivel_acesso = 'admin' or pm.papel in ('aprovador', 'financeiro'))
      limit 1;
    `,
    [aprovadorDestinoId, SERVICOS_SYSTEM_SLUG],
  );
  if (!rows[0]) throw Object.assign(new Error('Aprovador invalido.'), { status: 400 });
}

async function ensureRowAccess(id: string, moduleRole: string | null, collaborator: Record<string, unknown> | null) {
  const rows = await sql!.unsafe(
    `
      select sp.*, c.nome as solicitante_nome, ac.nome as aprovador_destino_nome
      from ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp
      join public.colaboradores c on c.id = sp.solicitante_id
      left join public.colaboradores ac on ac.id = sp.aprovador_destino_id
      where sp.id = $1
      limit 1;
    `,
    [id],
  );
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Solicitacao nao encontrada.'), { status: 404 });

  const departamentoId = collaborator?.departamento_id as string | null | undefined;
  if (canAccessSolicitacao(moduleRole, collaborator?.id as string | undefined, row, departamentoId)) return row;

  throw Object.assign(new Error('Voce nao tem permissao para acessar esta solicitacao.'), { status: 403 });
}

function createStorageAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function createComprovanteSignedUrl(path: string | null) {
  if (!path) return null;
  const storageClient = createStorageAdminClient();
  if (!storageClient) return null;

  const { data, error } = await storageClient.storage
    .from(COMPROVANTES_STORAGE_BUCKET)
    .createSignedUrl(path, COMPROVANTE_SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error('Failed to create signed comprovante URL:', { path, message: error.message });
    return null;
  }

  return data?.signedUrl || null;
}

function validateComprovanteSize(fileSize: unknown) {
  if (fileSize === null || fileSize === undefined || fileSize === '') return;
  const numericSize = Number(fileSize);
  if (!Number.isFinite(numericSize) || numericSize < 0) {
    throw Object.assign(new Error('Tamanho de arquivo invalido.'), { status: 400 });
  }
  if (numericSize > MAX_COMPROVANTE_FILE_SIZE) {
    throw Object.assign(new Error('O comprovante deve ter no maximo 5 MB.'), { status: 400 });
  }
}

async function enqueueStatusEmail(row: Record<string, unknown>, status: string) {
  if (!sql) return;

  const rows = await sql.unsafe(
    `select nome, email from public.colaboradores where id = $1 limit 1;`,
    [row.solicitante_id],
  );
  const solicitante = rows[0];
  if (!solicitante?.email) return;

  const valorFormatado = Number(row.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const statusLabel: Record<string, string> = {
    aprovado: 'aprovada',
    reprovado: 'reprovada',
    pago: 'paga',
  };
  const label = statusLabel[status] || status;
  const tipo = status === 'pago' ? 'pagamento_efetuado' : 'aprovacao_pagamento';
  const assunto = `Sua solicitacao de pagamento foi ${label}`;
  const bodyText = `Ola ${solicitante.nome},\n\nSua solicitacao de pagamento para "${row.fornecedor}" no valor de ${valorFormatado} foi ${label}.\n\nMACOM Servicos - Financeiro`;

  await sql.unsafe(
    `
      insert into gestao_ativos.fila_emails (tipo, destinatario, assunto, payload)
      values ($1, $2, $3, $4::jsonb);
    `,
    [
      tipo,
      solicitante.email,
      assunto,
      JSON.stringify({ to: solicitante.email, subject: assunto, body_text: bodyText }),
    ],
  );
}

async function insertHistorico(solicitacaoId: string, evento: string, autorId: string | null, observacao: string | null = null) {
  await sql!.unsafe(
    `insert into ${SERVICOS_SCHEMA}.historico_solicitacao (solicitacao_id, evento, autor_id, observacao) values ($1, $2, $3, $4);`,
    [solicitacaoId, evento, autorId, observacao],
  );
}

async function insertNotificacao(
  colaboradorId: string,
  tipo: string,
  titulo: string,
  mensagem: string | null,
  link: string | null,
  referenciaTipo: string | null,
  referenciaId: string | null,
  criadoPor: string | null,
) {
  await sql!.unsafe(
    `
      insert into ${SERVICOS_SCHEMA}.notificacoes
        (colaborador_id, tipo, titulo, mensagem, link, referencia_tipo, referencia_id, criado_por)
      values ($1, $2, $3, $4, $5, $6, $7, $8);
    `,
    [colaboradorId, tipo, titulo, mensagem, link, referenciaTipo, referenciaId, criadoPor],
  );

  // Empurra Web Push (app fechado/em background) pros dispositivos inscritos desse
  // colaborador -- nao bloqueia o fluxo principal se falhar (fica so no log).
  await sendPushToColaborador(sql, SERVICOS_SYSTEM_SLUG, colaboradorId, {
    title: titulo,
    body: mensagem,
    url: link,
  }).catch((error) => console.error('sendPushToColaborador failed:', error));
}

// Mesmo padrao de enqueueStatusEmail, mas pro sino in-app -- chamado nos mesmos pontos, pro
// solicitante ver a atualizacao sem precisar checar o e-mail.
async function notifySolicitanteStatusChange(row: Record<string, unknown>, status: string, autorId: string) {
  const tituloPorStatus: Record<string, string> = {
    aprovado: 'Solicitação aprovada',
    reprovado: 'Solicitação reprovada',
    pago: 'Pagamento efetuado',
  };
  const valorFormatado = Number(row.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  await insertNotificacao(
    String(row.solicitante_id),
    'status_solicitacao',
    tituloPorStatus[status] || 'Atualização na solicitação',
    `${row.fornecedor} — ${valorFormatado}`,
    `/solicitacoes?sol=${row.id}`,
    'solicitacao_pagamento',
    String(row.id),
    autorId,
  );
}

// Notifica o aprovador designado que uma solicitacao esta esperando decisao dele (criacao nova
// ou reenvio apos correcao) -- hoje isso so gerava historico, sem avisar o aprovador de nada.
async function notifyAprovadorNovaSolicitacao(row: Record<string, unknown>, titulo: string, autorId: string) {
  if (!row.aprovador_destino_id) return;
  const valorFormatado = Number(row.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  await insertNotificacao(
    String(row.aprovador_destino_id),
    'solicitacao_pendente',
    titulo,
    `${row.fornecedor} — ${valorFormatado}`,
    `/solicitacoes?sol=${row.id}`,
    'solicitacao_pagamento',
    String(row.id),
    autorId,
  );
}

async function createSignedUrlForPath(path: string | null) {
  if (!path) return null;
  const storageClient = createStorageAdminClient();
  if (!storageClient) return null;

  const { data, error } = await storageClient.storage
    .from(COMPROVANTES_STORAGE_BUCKET)
    .createSignedUrl(path, COMPROVANTE_SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error('Failed to create signed anexo URL:', { path, message: error.message });
    return null;
  }

  return data?.signedUrl || null;
}

async function ensureParcelaAccess(id: string, moduleRole: string | null, collaborator: Record<string, unknown> | null) {
  const rows = await sql!.unsafe(
    `
      select pp.*, sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.status as solicitacao_status
      from ${SERVICOS_SCHEMA}.parcelas_pagamento pp
      join ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp on sp.id = pp.solicitacao_id
      where pp.id = $1
      limit 1;
    `,
    [id],
  );
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Parcela nao encontrada.'), { status: 404 });

  const departamentoId = collaborator?.departamento_id as string | null | undefined;
  if (canAccessSolicitacao(moduleRole, collaborator?.id as string | undefined, row, departamentoId)) return row;

  throw Object.assign(new Error('Voce nao tem permissao para acessar esta parcela.'), { status: 403 });
}

Deno.serve(async (request) => {
  const corsHeaders = buildCorsHeaders(request);
  const json = (data: unknown, status = 200) => jsonResponse(data, status, corsHeaders);

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!sql) {
      return json({ error: 'DATABASE_URL nao configurada.' }, 500);
    }

    const { collaborator, access, moduleRole } = await getAuthContext(request);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'list');

    if (action === 'me') {
      ensureHasAccess(access);
      return json({ row: collaborator, access, role: moduleRole });
    }

    ensureHasAccess(access);

    if (action === 'list_empresas') {
      const rows = await sql.unsafe(
        `select id, nome from public.empresas order by nome;`,
      );
      return json({ rows });
    }

    if (action === 'list_departamentos') {
      const rows = await sql.unsafe(
        `select id, nome from public.departamentos order by nome;`,
      );
      return json({ rows });
    }

    if (action === 'list_fornecedores') {
      const rows = await sql.unsafe(
        `select id, nome from ${SERVICOS_SCHEMA}.fornecedores where ativo = true order by nome;`,
      );
      return json({ rows });
    }

    if (action === 'list_fornecedores_admin') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode gerenciar fornecedores.'), { status: 403 });
      }

      const rows = await sql.unsafe(
        `
          select f.id, f.nome, f.ativo, f.criado_em, f.atualizado_em,
            count(sp.id) as total_solicitacoes
          from ${SERVICOS_SCHEMA}.fornecedores f
          left join ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp on sp.fornecedor_id = f.id
          group by f.id
          order by f.nome;
        `,
      );
      return json({ rows: rows.map((row) => ({ ...row, total_solicitacoes: Number(row.total_solicitacoes) })) });
    }

    if (action === 'criar_fornecedor') {
      if (!moduleRole || moduleRole === 'nenhum') {
        throw Object.assign(new Error('Voce nao tem acesso a este modulo.'), { status: 403 });
      }

      const nome = String(body.nome || '').trim();
      if (!nome) throw Object.assign(new Error('Informe o nome do fornecedor.'), { status: 400 });

      const existing = await sql.unsafe(
        `select id, nome, ativo, criado_em, atualizado_em from ${SERVICOS_SCHEMA}.fornecedores where lower(nome) = lower($1) limit 1;`,
        [nome],
      );
      if (existing[0]) return json({ row: existing[0] });

      const rows = await sql.unsafe(
        `insert into ${SERVICOS_SCHEMA}.fornecedores (nome, criado_por) values ($1, $2) returning id, nome, ativo, criado_em, atualizado_em;`,
        [nome, collaborator!.id],
      );
      return json({ row: rows[0] || null });
    }

    if (action === 'atualizar_fornecedor') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode gerenciar fornecedores.'), { status: 403 });
      }

      const id = String(body.id || '');
      if (!id) throw Object.assign(new Error('ID obrigatorio.'), { status: 400 });

      const nome = String(body.nome || '').trim();
      if (!nome) throw Object.assign(new Error('Informe o nome do fornecedor.'), { status: 400 });
      const ativo = Boolean(body.ativo);

      const duplicated = await sql.unsafe(
        `select id from ${SERVICOS_SCHEMA}.fornecedores where lower(nome) = lower($1) and id <> $2 limit 1;`,
        [nome, id],
      );
      if (duplicated[0]) throw Object.assign(new Error('Ja existe um fornecedor com esse nome.'), { status: 400 });

      const rows = await sql.unsafe(
        `
          update ${SERVICOS_SCHEMA}.fornecedores
          set nome = $1, ativo = $2, atualizado_em = now()
          where id = $3
          returning id, nome, ativo, criado_em, atualizado_em;
        `,
        [nome, ativo, id],
      );
      if (!rows[0]) throw Object.assign(new Error('Fornecedor nao encontrado.'), { status: 404 });
      return json({ row: rows[0] });
    }

    if (action === 'deletar_fornecedor') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode gerenciar fornecedores.'), { status: 403 });
      }

      const id = String(body.id || '');
      if (!id) throw Object.assign(new Error('ID obrigatorio.'), { status: 400 });

      const emUso = await sql.unsafe(
        `select 1 from ${SERVICOS_SCHEMA}.solicitacoes_pagamento where fornecedor_id = $1 limit 1;`,
        [id],
      );
      if (emUso[0]) {
        throw Object.assign(
          new Error('Este fornecedor ja foi usado em solicitacoes e nao pode ser excluido. Inative-o.'),
          { status: 400 },
        );
      }

      await sql.unsafe(`delete from ${SERVICOS_SCHEMA}.fornecedores where id = $1;`, [id]);
      return json({ ok: true });
    }

    if (action === 'list_categorias') {
      const rows = await sql.unsafe(
        `select id, nome from ${SERVICOS_SCHEMA}.categorias where ativo = true order by nome;`,
      );
      return json({ rows });
    }

    if (action === 'list_categorias_admin') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode gerenciar categorias.'), { status: 403 });
      }

      const rows = await sql.unsafe(
        `
          select c.id, c.nome, c.ativo, c.criado_em, c.atualizado_em,
            count(sp.id) as total_solicitacoes
          from ${SERVICOS_SCHEMA}.categorias c
          left join ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp on sp.categoria_id = c.id
          group by c.id
          order by c.nome;
        `,
      );
      return json({ rows: rows.map((row) => ({ ...row, total_solicitacoes: Number(row.total_solicitacoes) })) });
    }

    if (action === 'criar_categoria') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode cadastrar categorias.'), { status: 403 });
      }

      const nome = String(body.nome || '').trim();
      if (!nome) throw Object.assign(new Error('Informe o nome da categoria.'), { status: 400 });

      const existing = await sql.unsafe(
        `select id, nome, ativo, criado_em, atualizado_em from ${SERVICOS_SCHEMA}.categorias where lower(nome) = lower($1) limit 1;`,
        [nome],
      );
      if (existing[0]) return json({ row: existing[0] });

      const rows = await sql.unsafe(
        `insert into ${SERVICOS_SCHEMA}.categorias (nome, criado_por) values ($1, $2) returning id, nome, ativo, criado_em, atualizado_em;`,
        [nome, collaborator!.id],
      );
      return json({ row: rows[0] || null });
    }

    if (action === 'atualizar_categoria') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode gerenciar categorias.'), { status: 403 });
      }

      const id = String(body.id || '');
      if (!id) throw Object.assign(new Error('ID obrigatorio.'), { status: 400 });

      const nome = String(body.nome || '').trim();
      if (!nome) throw Object.assign(new Error('Informe o nome da categoria.'), { status: 400 });
      const ativo = Boolean(body.ativo);

      const duplicated = await sql.unsafe(
        `select id from ${SERVICOS_SCHEMA}.categorias where lower(nome) = lower($1) and id <> $2 limit 1;`,
        [nome, id],
      );
      if (duplicated[0]) throw Object.assign(new Error('Ja existe uma categoria com esse nome.'), { status: 400 });

      const rows = await sql.unsafe(
        `
          update ${SERVICOS_SCHEMA}.categorias
          set nome = $1, ativo = $2, atualizado_em = now()
          where id = $3
          returning id, nome, ativo, criado_em, atualizado_em;
        `,
        [nome, ativo, id],
      );
      if (!rows[0]) throw Object.assign(new Error('Categoria nao encontrada.'), { status: 404 });
      return json({ row: rows[0] });
    }

    if (action === 'deletar_categoria') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode gerenciar categorias.'), { status: 403 });
      }

      const id = String(body.id || '');
      if (!id) throw Object.assign(new Error('ID obrigatorio.'), { status: 400 });

      const emUso = await sql.unsafe(
        `select 1 from ${SERVICOS_SCHEMA}.solicitacoes_pagamento where categoria_id = $1 limit 1;`,
        [id],
      );
      if (emUso[0]) {
        throw Object.assign(
          new Error('Esta categoria ja foi usada em solicitacoes e nao pode ser excluida. Inative-a.'),
          { status: 400 },
        );
      }

      await sql.unsafe(`delete from ${SERVICOS_SCHEMA}.categorias where id = $1;`, [id]);
      return json({ ok: true });
    }

    if (action === 'list_aprovadores') {
      const rows = await sql.unsafe(
        `
          select distinct c.id, c.nome
          from public.colaboradores c
          join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id
          join public.sistemas s on s.id = aus.sistema_id
          left join ${SERVICOS_SCHEMA}.permissoes_modulo pm on pm.colaborador_id = c.id and pm.modulo = 'financeiro'
          where s.slug = $1 and s.ativo = true and aus.ativo = true
            and (aus.nivel_acesso = 'admin' or pm.papel in ('aprovador', 'financeiro'))
          order by c.nome;
        `,
        [SERVICOS_SYSTEM_SLUG],
      );

      return json({ rows });
    }

    // Combina os catalogos usados pelo formulario de nova solicitacao (empresas,
    // departamentos, fornecedores, categorias, aprovadores) em uma unica invocacao,
    // no lugar de 5 chamadas separadas pagando o overhead de auth cada uma. As queries
    // rodam sequencialmente (nao Promise.all) porque o pool de conexoes tem max: 3 —
    // 5 queries concorrentes esgotavam o pool e travavam a invocacao indefinidamente.
    if (action === 'list_catalogos_solicitacao') {
      const empresas = await sql.unsafe(`select id, nome from public.empresas order by nome;`);
      const departamentos = await sql.unsafe(`select id, nome from public.departamentos order by nome;`);
      const fornecedores = await sql.unsafe(
        `select id, nome from ${SERVICOS_SCHEMA}.fornecedores where ativo = true order by nome;`,
      );
      const categorias = await sql.unsafe(
        `select id, nome from ${SERVICOS_SCHEMA}.categorias where ativo = true order by nome;`,
      );
      const aprovadores = await sql.unsafe(
        `
          select distinct c.id, c.nome
          from public.colaboradores c
          join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id
          join public.sistemas s on s.id = aus.sistema_id
          left join ${SERVICOS_SCHEMA}.permissoes_modulo pm on pm.colaborador_id = c.id and pm.modulo = 'financeiro'
          where s.slug = $1 and s.ativo = true and aus.ativo = true
            and (aus.nivel_acesso = 'admin' or pm.papel in ('aprovador', 'financeiro'))
          order by c.nome;
        `,
        [SERVICOS_SYSTEM_SLUG],
      );

      return json({ empresas, departamentos, fornecedores, categorias, aprovadores });
    }

    if (action === 'list_permissoes') {
      if (getAccessLevel(access) !== 'admin') {
        throw Object.assign(new Error('Apenas administradores podem gerenciar permissoes.'), { status: 403 });
      }

      const colaboradores = await sql.unsafe(
        `
          select c.id as colaborador_id, c.nome, c.email, aus.nivel_acesso as system_access_level
          from public.acessos_usuario_sistema aus
          join public.sistemas s on s.id = aus.sistema_id
          join public.colaboradores c on c.id = aus.colaborador_id
          where s.slug = $1 and aus.ativo = true
          order by c.nome;
        `,
        [SERVICOS_SYSTEM_SLUG],
      );

      const permissoes = await sql.unsafe(
        `
          select pm.colaborador_id, pm.modulo, pm.papel
          from ${SERVICOS_SCHEMA}.permissoes_modulo pm
          join public.acessos_usuario_sistema aus on aus.colaborador_id = pm.colaborador_id
          join public.sistemas s on s.id = aus.sistema_id
          where s.slug = $1 and aus.ativo = true;
        `,
        [SERVICOS_SYSTEM_SLUG],
      );

      return json({ colaboradores, permissoes, modulos: SERVICOS_MODULOS });
    }

    if (action === 'set_permissao') {
      if (getAccessLevel(access) !== 'admin') {
        throw Object.assign(new Error('Apenas administradores podem gerenciar permissoes.'), { status: 403 });
      }

      const colaboradorId = String(body.colaborador_id || '');
      const modulo = String(body.modulo || '');
      const papel = String(body.papel || '');

      if (!colaboradorId) return json({ error: 'colaborador_id obrigatorio.' }, 400);
      const moduloConfig = SERVICOS_MODULOS_CONFIG[modulo as keyof typeof SERVICOS_MODULOS_CONFIG];
      if (!moduloConfig) {
        return json({ error: 'Modulo invalido.' }, 400);
      }
      if (!moduloConfig.papeis.includes(papel as (typeof moduloConfig.papeis)[number])) {
        return json({ error: 'Papel invalido.' }, 400);
      }

      const rows = await sql.unsafe(
        `
          insert into ${SERVICOS_SCHEMA}.permissoes_modulo (colaborador_id, modulo, papel, criado_por)
          values ($1, $2, $3, $4)
          on conflict (colaborador_id, modulo) do update set papel = excluded.papel
          returning *;
        `,
        [colaboradorId, modulo, papel, collaborator!.id],
      );

      return json({ row: rows[0] || null });
    }

    if (action === 'limpar_dados_teste_financeiro') {
      if (getAccessLevel(access) !== 'admin') {
        throw Object.assign(new Error('Apenas administradores podem limpar os dados de teste.'), { status: 403 });
      }

      const anexos = await sql.unsafe(
        `select storage_path from ${SERVICOS_SCHEMA}.anexos_solicitacao where storage_path is not null;`,
      );

      const [{ count: solicitacoesRemovidas }] = await sql.begin(async (tx) => {
        const solicitacoes = await tx.unsafe(`delete from ${SERVICOS_SCHEMA}.solicitacoes_pagamento returning id;`);
        return [{ count: solicitacoes.length }];
      });

      const storageClient = createStorageAdminClient();
      let anexosRemovidosStorage = 0;
      if (storageClient && anexos.length > 0) {
        const paths = anexos.map((a) => String(a.storage_path));
        for (let i = 0; i < paths.length; i += 100) {
          const chunk = paths.slice(i, i + 100);
          const { error } = await storageClient.storage.from(COMPROVANTES_STORAGE_BUCKET).remove(chunk);
          if (!error) anexosRemovidosStorage += chunk.length;
          else console.error('Falha ao remover anexos do storage:', { chunk, message: error.message });
        }
      }

      return json({ solicitacoes_removidas: solicitacoesRemovidas, anexos_removidos_storage: anexosRemovidosStorage });
    }

    if (action === 'list') {
      const filters = typeof body.filters === 'object' && body.filters ? body.filters : {};
      const status = typeof filters.status === 'string' ? filters.status : '';
      const categoriaId = typeof filters.categoria_id === 'string' ? filters.categoria_id : '';

      const clauses: string[] = [];
      const values: unknown[] = [];

      // financeiro/contas_a_pagar veem tudo; aprovador ve as proprias + as endereçadas a ele +
      // as do mesmo setor; usuario ve as proprias + as do mesmo setor (departamento_id atual do
      // colaborador logado comparado ao snapshot de departamento_id da solicitacao).
      if (!isPagador(moduleRole)) {
        values.push(collaborator!.id);
        const collaboradorIdParam = values.length;
        const pessoaisClause =
          moduleRole === 'aprovador'
            ? `(sp.solicitante_id = $${collaboradorIdParam} or sp.aprovador_destino_id = $${collaboradorIdParam})`
            : `sp.solicitante_id = $${collaboradorIdParam}`;

        const departamentoId = collaborator!.departamento_id as string | null | undefined;
        if (departamentoId) {
          values.push(departamentoId);
          clauses.push(`(${pessoaisClause} or sp.departamento_id = $${values.length})`);
        } else {
          clauses.push(pessoaisClause);
        }
      }

      if (status) {
        values.push(status);
        clauses.push(`sp.status = $${values.length}`);
      }

      if (categoriaId) {
        values.push(categoriaId);
        clauses.push(`sp.categoria_id = $${values.length}`);
      }

      const whereClause = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const orderBy = ORDER_BY_COLUMNS[String(filters.order_by || '')] || ORDER_BY_COLUMNS.criado_em;
      const rows = await sql.unsafe(
        `
          select
            sp.*,
            c.nome as solicitante_nome,
            ac.nome as aprovador_destino_nome,
            coalesce(pp.parcelas_total, 0) as parcelas_total,
            coalesce(pp.parcelas_pagas, 0) as parcelas_pagas
          from ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp
          join public.colaboradores c on c.id = sp.solicitante_id
          left join public.colaboradores ac on ac.id = sp.aprovador_destino_id
          left join lateral (
            select
              count(*) as parcelas_total,
              count(*) filter (where status = 'pago') as parcelas_pagas
            from ${SERVICOS_SCHEMA}.parcelas_pagamento
            where solicitacao_id = sp.id
          ) pp on true
          ${whereClause}
          order by ${orderBy}
          limit 200;
        `,
        values,
      );

      return json({ rows });
    }

    if (action === 'get') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const row = await ensureRowAccess(id, moduleRole, collaborator);
      const comprovante_url = await createComprovanteSignedUrl(row.comprovante_path);
      return json({ row: { ...row, comprovante_url } });
    }

    if (action === 'signed_url') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const row = await ensureRowAccess(id, moduleRole, collaborator);
      const comprovante_url = await createComprovanteSignedUrl(row.comprovante_path);
      return json({ url: comprovante_url });
    }

    if (action === 'create') {
      const payload = sanitizePayload(CREATE_FIELDS, body.payload || {});
      validateCreatePayload(payload);
      validateComprovanteSize(body.payload?.comprovante_file_size);

      // Todo solicitacao precisa de um aprovador especifico: so ele (ou o financeiro,
      // que sobrepoe qualquer aprovador) pode decidir sobre ela — ver canAccessSolicitacao.
      const aprovadorDestinoId = String(payload.aprovador_destino_id || '').trim();
      if (!aprovadorDestinoId) {
        throw Object.assign(new Error('Selecione o aprovador responsavel pela solicitacao.'), { status: 400 });
      }

      // fornecedor/categoria sao snapshot do nome no momento da solicitacao (mesmo padrao
      // de empresa_id/departamento_id abaixo); essas 3 validacoes sao independentes entre si,
      // entao rodam em paralelo em vez de sequencial pra reduzir a latencia do create.
      const [fornecedorRows, categoriaRows] = await Promise.all([
        sql.unsafe(`select nome from ${SERVICOS_SCHEMA}.fornecedores where id = $1 limit 1;`, [payload.fornecedor_id]),
        sql.unsafe(`select nome from ${SERVICOS_SCHEMA}.categorias where id = $1 limit 1;`, [payload.categoria_id]),
        validateAprovadorDestino(aprovadorDestinoId),
      ]);
      if (!fornecedorRows[0]) throw Object.assign(new Error('Fornecedor invalido.'), { status: 400 });
      payload.fornecedor = fornecedorRows[0].nome;
      if (!categoriaRows[0]) throw Object.assign(new Error('Categoria invalida.'), { status: 400 });
      payload.categoria = categoriaRows[0].nome;
      payload.aprovador_destino_id = aprovadorDestinoId;

      // empresa_id/departamento_id sao snapshot do colaborador no momento da criacao
      // (nao join ao vivo) - preserva o setor/empresa corretos historicamente mesmo
      // que o colaborador mude de area depois. O solicitante pode ajustar empresa_id
      // se atuar em mais de uma empresa do grupo.
      if (!payload.empresa_id) payload.empresa_id = collaborator!.empresa_id ?? null;
      if (!payload.departamento_id) payload.departamento_id = collaborator!.departamento_id ?? null;
      payload.solicitante_id = collaborator!.id;
      payload.criado_por = collaborator!.id;

      const fields = Object.keys(payload);
      const columns = fields.map(quoteIdentifier).join(', ');
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
      const rows = await sql.unsafe(
        `insert into ${SERVICOS_SCHEMA}.solicitacoes_pagamento (${columns}) values (${placeholders}) returning *;`,
        fields.map((field) => payload[field]),
      );

      const row = rows[0] || null;
      if (row) {
        await insertHistorico(String(row.id), 'criada', collaborator!.id as string);
        await notifyAprovadorNovaSolicitacao(row, 'Nova solicitação para aprovar', collaborator!.id as string);
      }
      return json({ row });
    }

    if (action === 'update') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const existing = await ensureRowAccess(id, moduleRole, collaborator);
      if (String(existing.solicitante_id) !== String(collaborator!.id) || existing.status !== 'pendente') {
        throw Object.assign(new Error('Somente o solicitante pode editar a solicitacao enquanto pendente.'), { status: 403 });
      }

      const payload = sanitizePayload(UPDATE_FIELDS, body.payload || {});
      if (!Object.keys(payload).length) return json({ error: 'Nenhum campo para atualizar.' }, 400);
      if ('comprovante_path' in body.payload) {
        validateComprovanteSize(body.payload?.comprovante_file_size);
      }

      if (payload.fornecedor_id) {
        const fornecedorRows = await sql.unsafe(
          `select nome from ${SERVICOS_SCHEMA}.fornecedores where id = $1 limit 1;`,
          [payload.fornecedor_id],
        );
        if (!fornecedorRows[0]) throw Object.assign(new Error('Fornecedor invalido.'), { status: 400 });
        payload.fornecedor = fornecedorRows[0].nome;
      }

      if (payload.categoria_id) {
        const categoriaRows = await sql.unsafe(
          `select nome from ${SERVICOS_SCHEMA}.categorias where id = $1 limit 1;`,
          [payload.categoria_id],
        );
        if (!categoriaRows[0]) throw Object.assign(new Error('Categoria invalida.'), { status: 400 });
        payload.categoria = categoriaRows[0].nome;
      }

      if ('aprovador_destino_id' in payload) {
        const aprovadorDestinoId = String(payload.aprovador_destino_id || '').trim();
        if (!aprovadorDestinoId) {
          throw Object.assign(new Error('Selecione o aprovador responsavel pela solicitacao.'), { status: 400 });
        }
        await validateAprovadorDestino(aprovadorDestinoId);
        payload.aprovador_destino_id = aprovadorDestinoId;
      }

      const fields = Object.keys(payload);
      const assignments = fields.map((field, index) => `${quoteIdentifier(field)} = $${index + 2}`).join(', ');
      const rows = await sql.unsafe(
        `update ${SERVICOS_SCHEMA}.solicitacoes_pagamento set ${assignments} where id = $1 returning *;`,
        [id, ...fields.map((field) => payload[field])],
      );

      const camposAlterados = fields
        .map((field) => UPDATE_FIELD_LABELS[field as (typeof CREATE_FIELDS)[number]] || field)
        .join(', ');
      await insertHistorico(id, 'editada', collaborator!.id as string, `Campos alterados: ${camposAlterados}`);

      return json({ row: rows[0] || null });
    }

    if (action === 'cancelar_solicitacao') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const existing = await ensureRowAccess(id, moduleRole, collaborator);
      if (String(existing.solicitante_id) !== String(collaborator!.id)) {
        throw Object.assign(new Error('Apenas o solicitante pode cancelar esta solicitacao.'), { status: 403 });
      }
      if (existing.status !== 'pendente') {
        throw Object.assign(new Error('Somente solicitacoes pendentes podem ser canceladas.'), { status: 400 });
      }

      const motivo = body.motivo ? String(body.motivo) : null;
      const rows = await sql.unsafe(
        `update ${SERVICOS_SCHEMA}.solicitacoes_pagamento set status = 'cancelado' where id = $1 returning *;`,
        [id],
      );
      await insertHistorico(id, 'cancelada', collaborator!.id as string, motivo);
      return json({ row: rows[0] || null });
    }

    if (action === 'reenviar_solicitacao') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const existing = await ensureRowAccess(id, moduleRole, collaborator);
      if (String(existing.solicitante_id) !== String(collaborator!.id)) {
        throw Object.assign(new Error('Apenas o solicitante pode reenviar esta solicitacao.'), { status: 403 });
      }
      if (existing.status !== 'reprovado') {
        throw Object.assign(new Error('Somente solicitacoes reprovadas podem ser reenviadas.'), { status: 400 });
      }

      const payload = sanitizePayload(UPDATE_FIELDS, body.payload || {});
      if ('comprovante_path' in body.payload) {
        validateComprovanteSize(body.payload?.comprovante_file_size);
      }

      if (payload.fornecedor_id) {
        const fornecedorRows = await sql.unsafe(
          `select nome from ${SERVICOS_SCHEMA}.fornecedores where id = $1 limit 1;`,
          [payload.fornecedor_id],
        );
        if (!fornecedorRows[0]) throw Object.assign(new Error('Fornecedor invalido.'), { status: 400 });
        payload.fornecedor = fornecedorRows[0].nome;
      }

      if (payload.categoria_id) {
        const categoriaRows = await sql.unsafe(
          `select nome from ${SERVICOS_SCHEMA}.categorias where id = $1 limit 1;`,
          [payload.categoria_id],
        );
        if (!categoriaRows[0]) throw Object.assign(new Error('Categoria invalida.'), { status: 400 });
        payload.categoria = categoriaRows[0].nome;
      }

      if ('aprovador_destino_id' in payload) {
        const aprovadorDestinoId = String(payload.aprovador_destino_id || '').trim();
        if (!aprovadorDestinoId) {
          throw Object.assign(new Error('Selecione o aprovador responsavel pela solicitacao.'), { status: 400 });
        }
        await validateAprovadorDestino(aprovadorDestinoId);
        payload.aprovador_destino_id = aprovadorDestinoId;
      }

      payload.status = 'pendente';
      payload.observacao_analise = null;
      payload.analisado_por = null;
      payload.analisado_em = null;

      const fields = Object.keys(payload);
      const assignments = fields.map((field, index) => `${quoteIdentifier(field)} = $${index + 2}`).join(', ');
      const rows = await sql.unsafe(
        `update ${SERVICOS_SCHEMA}.solicitacoes_pagamento set ${assignments} where id = $1 returning *;`,
        [id, ...fields.map((field) => payload[field])],
      );

      const row = rows[0] || null;
      await insertHistorico(id, 'reenviada', collaborator!.id as string);
      if (row) await notifyAprovadorNovaSolicitacao(row, 'Solicitação corrigida e reenviada', collaborator!.id as string);
      return json({ row });
    }

    if (action === 'set_status') {
      const id = String(body.id || '');
      const status = String(body.status || '');
      const observacao = body.observacao_analise ? String(body.observacao_analise) : null;

      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      if (!['aprovado', 'reprovado', 'pago'].includes(status)) {
        return json({ error: 'Status invalido.' }, 400);
      }

      const existing = await ensureRowAccess(id, moduleRole, collaborator);

      if (status === 'aprovado' || status === 'reprovado') {
        const reprovandoAprovada = status === 'reprovado' && existing.status === 'aprovado';

        if (reprovandoAprovada) {
          if (!isFinanceiro(moduleRole)) {
            throw Object.assign(
              new Error('Apenas o financeiro pode reprovar uma solicitacao ja aprovada.'),
              { status: 403 },
            );
          }
          if (!observacao) {
            throw Object.assign(new Error('Informe o motivo da reprovacao.'), { status: 400 });
          }
        } else {
          const isAprovadorDestino =
            moduleRole === 'aprovador' && String(existing.aprovador_destino_id || '') === String(collaborator!.id);
          if (!isFinanceiro(moduleRole) && !isAprovadorDestino) {
            throw Object.assign(
              new Error('Apenas o aprovador designado ou o financeiro podem aprovar ou reprovar esta solicitacao.'),
              { status: 403 },
            );
          }
          if (existing.status !== 'pendente') {
            throw Object.assign(new Error('Somente solicitacoes pendentes podem ser aprovadas ou reprovadas.'), { status: 400 });
          }
        }

        const rows = await sql.unsafe(
          `
            update ${SERVICOS_SCHEMA}.solicitacoes_pagamento
            set status = $2, observacao_analise = $3, analisado_por = $4, analisado_em = now()
            where id = $1
            returning *;
          `,
          [id, status, observacao, collaborator!.id],
        );
        const row = rows[0];
        const evento = status === 'aprovado' ? 'aprovada' : reprovandoAprovada ? 'reprovada_pos_aprovacao' : 'reprovada';
        await insertHistorico(id, evento, collaborator!.id as string, observacao);
        await enqueueStatusEmail(row, status);
        await notifySolicitanteStatusChange(row, status, collaborator!.id as string);
        return json({ row });
      }

      if (status === 'pago') {
        if (!isFinanceiro(moduleRole)) {
          throw Object.assign(new Error('Apenas o financeiro pode marcar uma solicitacao como paga.'), { status: 403 });
        }
        if (existing.status !== 'aprovado') {
          throw Object.assign(new Error('Somente solicitacoes aprovadas podem ser marcadas como pagas.'), { status: 400 });
        }

        const rows = await sql.unsafe(
          `
            update ${SERVICOS_SCHEMA}.solicitacoes_pagamento
            set status = 'pago', pago_por = $2, pago_em = now()
            where id = $1
            returning *;
          `,
          [id, collaborator!.id],
        );
        const row = rows[0];
        await insertHistorico(id, 'pago', collaborator!.id as string);
        await enqueueStatusEmail(row, status);
        await notifySolicitanteStatusChange(row, status, collaborator!.id as string);
        return json({ row });
      }
    }

    if (action === 'list_anexos') {
      const solicitacaoId = String(body.solicitacao_id || '');
      if (!solicitacaoId) return json({ error: 'solicitacao_id obrigatorio.' }, 400);
      const solicitacaoRow = await ensureRowAccess(solicitacaoId, moduleRole, collaborator);

      const rows = await sql.unsafe(
        `select * from ${SERVICOS_SCHEMA}.anexos_solicitacao where solicitacao_id = $1 order by criado_em asc;`,
        [solicitacaoId],
      );
      // Anexo sigiloso e mais restrito que o acesso normal a solicitacao (canAccessSolicitacao):
      // contas_a_pagar tem acesso a linha (ve/paga a solicitacao) mas nunca ve anexo sigiloso --
      // por isso usa canViewAnexoSigiloso aqui, nao canAccessSolicitacao.
      const departamentoIdAnexos = collaborator?.departamento_id as string | null | undefined;
      const visiveis = rows.filter(
        (anexo: Record<string, unknown>) =>
          !anexo.sigiloso ||
          canViewAnexoSigiloso(moduleRole, collaborator?.id as string | undefined, solicitacaoRow, departamentoIdAnexos),
      );
      const withUrls = await Promise.all(
        visiveis.map(async (anexo: Record<string, unknown>) => ({
          ...anexo,
          url: await createSignedUrlForPath(String(anexo.storage_path)),
        })),
      );

      return json({ rows: withUrls });
    }

    if (action === 'registrar_anexo') {
      const solicitacaoId = String(body.solicitacao_id || '');
      const categoria = String(body.categoria || '');
      const tipoDocumento = String(body.tipo_documento || '');
      const nomeArquivo = String(body.nome_arquivo || '');
      const tipoMime = String(body.tipo_mime || '');
      const storagePath = String(body.storage_path || '');
      const parcelaId = body.parcela_id ? String(body.parcela_id) : null;
      const sigiloso = body.sigiloso === true;

      if (!solicitacaoId) return json({ error: 'solicitacao_id obrigatorio.' }, 400);
      if (!ANEXO_CATEGORIAS.includes(categoria as (typeof ANEXO_CATEGORIAS)[number])) {
        return json({ error: 'Categoria de anexo invalida.' }, 400);
      }
      if (!ANEXO_TIPOS_DOCUMENTO.includes(tipoDocumento as (typeof ANEXO_TIPOS_DOCUMENTO)[number])) {
        return json({ error: 'Tipo de documento invalido.' }, 400);
      }
      if (!ANEXO_TIPOS_DOCUMENTO_POR_CATEGORIA[categoria as (typeof ANEXO_CATEGORIAS)[number]].includes(tipoDocumento)) {
        return json({ error: 'Tipo de documento nao permitido para esta categoria.' }, 400);
      }
      if (!nomeArquivo || !tipoMime || !storagePath) {
        return json({ error: 'Dados do anexo incompletos.' }, 400);
      }
      validateComprovanteSize(body.tamanho_bytes);

      await ensureRowAccess(solicitacaoId, moduleRole, collaborator);
      if (parcelaId) await ensureParcelaAccess(parcelaId, moduleRole, collaborator);

      const rows = await sql.unsafe(
        `
          insert into ${SERVICOS_SCHEMA}.anexos_solicitacao
            (solicitacao_id, parcela_id, categoria, tipo_documento, nome_arquivo, tipo_mime, tamanho_bytes, storage_path, criado_por, sigiloso)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          returning *;
        `,
        [solicitacaoId, parcelaId, categoria, tipoDocumento, nomeArquivo, tipoMime, Number(body.tamanho_bytes) || 0, storagePath, collaborator!.id, sigiloso],
      );

      await insertHistorico(solicitacaoId, 'anexo_adicionado', collaborator!.id as string, nomeArquivo);

      return json({ row: rows[0] || null });
    }

    if (action === 'remover_anexo') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const rows = await sql.unsafe(
        `
          select an.*, sp.solicitante_id, sp.status as solicitacao_status
          from ${SERVICOS_SCHEMA}.anexos_solicitacao an
          join ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp on sp.id = an.solicitacao_id
          where an.id = $1
          limit 1;
        `,
        [id],
      );
      const anexo = rows[0];
      if (!anexo) return json({ error: 'Anexo nao encontrado.' }, 404);
      const podeComoFinanceiro = isFinanceiro(moduleRole);
      const podeComoDono =
        String(anexo.solicitante_id) === String(collaborator!.id) && anexo.solicitacao_status === 'pendente';
      if (!podeComoFinanceiro && !podeComoDono) {
        throw Object.assign(
          new Error('Somente o solicitante (enquanto pendente) ou o financeiro podem remover anexos.'),
          { status: 403 },
        );
      }

      await sql.unsafe(`delete from ${SERVICOS_SCHEMA}.anexos_solicitacao where id = $1;`, [id]);

      const storageClient = createStorageAdminClient();
      if (storageClient) {
        await storageClient.storage.from(COMPROVANTES_STORAGE_BUCKET).remove([String(anexo.storage_path)]);
      }

      await insertHistorico(
        String(anexo.solicitacao_id),
        'anexo_removido',
        collaborator!.id as string,
        String(anexo.nome_arquivo),
      );

      return json({ ok: true });
    }

    if (action === 'criar_parcelas') {
      if (!isPagador(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro ou contas a pagar pode definir o plano de pagamento.'), { status: 403 });
      }

      const solicitacaoId = String(body.solicitacao_id || '');
      const parcelas = Array.isArray(body.parcelas) ? body.parcelas : [];
      if (!solicitacaoId) return json({ error: 'solicitacao_id obrigatorio.' }, 400);
      if (!parcelas.length) return json({ error: 'Informe ao menos uma parcela.' }, 400);

      const existing = await ensureRowAccess(solicitacaoId, moduleRole, collaborator);
      if (existing.status !== 'aprovado') {
        throw Object.assign(new Error('Somente solicitacoes aprovadas podem ter parcelas definidas.'), { status: 400 });
      }

      const pendentes = await sql.unsafe(
        `select count(*)::int as total from ${SERVICOS_SCHEMA}.parcelas_pagamento where solicitacao_id = $1 and status <> 'pendente';`,
        [solicitacaoId],
      );
      if (Number(pendentes[0]?.total || 0) > 0) {
        throw Object.assign(new Error('Ja existem parcelas pagas para esta solicitacao; nao e possivel redefinir o plano.'), { status: 400 });
      }

      await sql.unsafe(`delete from ${SERVICOS_SCHEMA}.parcelas_pagamento where solicitacao_id = $1;`, [solicitacaoId]);

      const inserted = [];
      for (let index = 0; index < parcelas.length; index += 1) {
        const parcela = parcelas[index] as Record<string, unknown>;
        const valor = Number(parcela.valor);
        if (!Number.isFinite(valor) || valor <= 0) {
          throw Object.assign(new Error(`Valor invalido na parcela ${index + 1}.`), { status: 400 });
        }
        const rows = await sql.unsafe(
          `
            insert into ${SERVICOS_SCHEMA}.parcelas_pagamento (solicitacao_id, numero, valor, data_vencimento)
            values ($1, $2, $3, $4)
            returning *;
          `,
          [solicitacaoId, index + 1, valor, parcela.data_vencimento || null],
        );
        inserted.push(rows[0]);
      }

      await insertHistorico(solicitacaoId, 'parcela_criada', collaborator!.id as string, `${parcelas.length} parcela(s) definida(s).`);

      return json({ rows: inserted });
    }

    if (action === 'registrar_pagamento_parcela') {
      if (!isPagador(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro ou contas a pagar pode registrar pagamento de parcela.'), { status: 403 });
      }

      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const parcela = await ensureParcelaAccess(id, moduleRole, collaborator);
      if (parcela.status !== 'pendente') {
        throw Object.assign(new Error('Esta parcela ja foi paga.'), { status: 400 });
      }

      const rows = await sql.unsafe(
        `
          update ${SERVICOS_SCHEMA}.parcelas_pagamento
          set status = 'pago', data_pagamento = now(), pago_por = $2
          where id = $1
          returning *;
        `,
        [id, collaborator!.id],
      );
      const parcelaAtualizada = rows[0];

      await insertHistorico(
        String(parcela.solicitacao_id),
        'parcela_paga',
        collaborator!.id as string,
        `Parcela ${parcela.numero} paga.`,
      );

      const solicitacaoRows = await sql.unsafe(
        `select * from ${SERVICOS_SCHEMA}.solicitacoes_pagamento where id = $1 limit 1;`,
        [parcela.solicitacao_id],
      );
      const solicitacao = solicitacaoRows[0];
      if (solicitacao?.status === 'pago') {
        await enqueueStatusEmail(solicitacao, 'pago');
      }

      return json({ row: parcelaAtualizada, solicitacao });
    }

    if (action === 'list_parcelas') {
      const solicitacaoId = String(body.solicitacao_id || '');
      if (!solicitacaoId) return json({ error: 'solicitacao_id obrigatorio.' }, 400);
      await ensureRowAccess(solicitacaoId, moduleRole, collaborator);

      const rows = await sql.unsafe(
        `select * from ${SERVICOS_SCHEMA}.parcelas_pagamento where solicitacao_id = $1 order by numero asc;`,
        [solicitacaoId],
      );

      return json({ rows });
    }

    if (action === 'historico') {
      const solicitacaoId = String(body.solicitacao_id || '');
      if (!solicitacaoId) return json({ error: 'solicitacao_id obrigatorio.' }, 400);
      await ensureRowAccess(solicitacaoId, moduleRole, collaborator);

      const rows = await sql.unsafe(
        `
          select h.*, c.nome as autor_nome
          from ${SERVICOS_SCHEMA}.historico_solicitacao h
          left join public.colaboradores c on c.id = h.autor_id
          where h.solicitacao_id = $1
          order by h.criado_em desc;
        `,
        [solicitacaoId],
      );

      return json({ rows });
    }

    if (action === 'list_notificacoes') {
      const rows = await sql.unsafe(
        `
          select id, tipo, titulo, mensagem, link, referencia_tipo, referencia_id, lida_em, criado_em
          from ${SERVICOS_SCHEMA}.notificacoes
          where colaborador_id = $1
          order by criado_em desc
          limit 50;
        `,
        [collaborator!.id],
      );
      return json({ rows });
    }

    if (action === 'marcar_notificacao_lida') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const rows = await sql.unsafe(
        `
          update ${SERVICOS_SCHEMA}.notificacoes
          set lida_em = now()
          where id = $1 and colaborador_id = $2 and lida_em is null
          returning id;
        `,
        [id, collaborator!.id],
      );
      return json({ ok: true, atualizada: Boolean(rows[0]) });
    }

    if (action === 'marcar_todas_notificacoes_lidas') {
      await sql.unsafe(
        `
          update ${SERVICOS_SCHEMA}.notificacoes
          set lida_em = now()
          where colaborador_id = $1 and lida_em is null;
        `,
        [collaborator!.id],
      );
      return json({ ok: true });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json({ error: getErrorMessage(error) }, getErrorStatus(error));
  }
});
