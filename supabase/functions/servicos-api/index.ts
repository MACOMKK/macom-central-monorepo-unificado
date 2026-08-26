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
const FORMAS_PAGAMENTO = [
  'pix',
  'boleto',
  'transferencia',
  'cartao',
  'dinheiro',
  'cheque',
  'arquivo_bancario',
  'deposito_bancario',
  'outros',
];
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
  data_vencimento: 'vencimento_efetivo asc nulls last',
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

const TIPOS_PESSOA = new Set(['fisica', 'juridica']);

function extrairDadosFornecedor(body: Record<string, unknown>) {
  const texto = (valor: unknown, max?: number) => {
    let trimmed = String(valor ?? '').trim();
    if (max) trimmed = trimmed.slice(0, max);
    return trimmed || null;
  };
  const soDigitos = (valor: unknown, max?: number) => {
    const digitos = String(valor ?? '').replace(/\D/g, '');
    return (max ? digitos.slice(0, max) : digitos) || null;
  };
  const tipoPessoa = texto(body.tipo_pessoa);
  const uf = texto(body.uf, 2)?.replace(/[^a-zA-Z]/g, '').toUpperCase() || null;
  const email = texto(body.email, 160)?.toLowerCase() || null;
  return {
    tipo_pessoa: tipoPessoa && TIPOS_PESSOA.has(tipoPessoa) ? tipoPessoa : null,
    documento: soDigitos(body.documento, 14),
    inscricao_estadual: texto(body.inscricao_estadual, 20),
    email,
    telefone: soDigitos(body.telefone, 11),
    endereco: texto(body.endereco, 150),
    cidade: texto(body.cidade, 80),
    uf,
    cep: soDigitos(body.cep, 8),
  };
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

// Flag configuravel (gestao_servicos.configuracoes_modulo) que restringe a visibilidade de
// solicitacoes em dinheiro a solicitante/aprovador-destino/financeiro, excluindo contas_a_pagar
// e a ampliacao por setor. Cacheado com TTL curto (mesma ideia do authContextCache) pra nao
// disparar uma query extra a cada chamada -- o valor muda raramente.
const CONFIG_MODULO_TTL_MS = 30 * 1000;
let restringeVisibilidadeDinheiroCache: { expiresAt: number; value: boolean } | null = null;

async function getRestringeVisibilidadeDinheiro(): Promise<boolean> {
  if (restringeVisibilidadeDinheiroCache && restringeVisibilidadeDinheiroCache.expiresAt > Date.now()) {
    return restringeVisibilidadeDinheiroCache.value;
  }
  if (!sql) return true;
  const rows = await sql.unsafe(
    `select restringir_visibilidade_pagamento_dinheiro from ${SERVICOS_SCHEMA}.configuracoes_modulo where modulo = $1 limit 1;`,
    ['financeiro'],
  );
  // Fail-safe: sem linha de config, assume restritivo (mais seguro) -- espelha
  // public.servicos_restringe_visibilidade_dinheiro() no banco.
  const value = rows[0] ? Boolean(rows[0].restringir_visibilidade_pagamento_dinheiro) : true;
  restringeVisibilidadeDinheiroCache = { expiresAt: Date.now() + CONFIG_MODULO_TTL_MS, value };
  return value;
}

// Usado tanto na criacao da solicitacao (solicitante propondo parcelamento) quanto em
// criar_parcelas (financeiro/contas_a_pagar revisando o plano depois de aprovado) — a soma
// precisa bater com o valor total da solicitacao pra evitar plano de pagamento inconsistente.
function validateParcelasSum(parcelas: Array<Record<string, unknown>>, valorTotal: number) {
  const soma = parcelas.reduce((acc, parcela) => acc + Number(parcela.valor), 0);
  if (Math.abs(soma - valorTotal) >= 0.01) {
    throw Object.assign(
      new Error(`A soma das parcelas (${soma.toFixed(2)}) precisa ser igual ao valor total da solicitacao (${valorTotal.toFixed(2)}).`),
      { status: 400 },
    );
  }
}

async function inserirPlanoParcelas(solicitacaoId: string, parcelas: Array<Record<string, unknown>>) {
  const inserted = [];
  for (let index = 0; index < parcelas.length; index += 1) {
    const parcela = parcelas[index];
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
  return inserted;
}

// Reaproveitado por update/reenviar_solicitacao pra deixar o solicitante ajustar o plano de
// parcelas junto com a edicao, enquanto a solicitacao ainda esta pendente (nao passou por
// criar_parcelas ainda). Array vazio = volta a ser "a vista", so apaga o plano existente.
async function substituirPlanoParcelas(
  solicitacaoId: string,
  parcelasPropostas: Array<Record<string, unknown>>,
  valorReferencia: number,
  collaboradorId: string,
) {
  if (parcelasPropostas.length) {
    validateParcelasSum(parcelasPropostas, valorReferencia);
  }

  const pagas = await sql.unsafe(
    `select count(*)::int as total from ${SERVICOS_SCHEMA}.parcelas_pagamento where solicitacao_id = $1 and status <> 'pendente';`,
    [solicitacaoId],
  );
  if (Number(pagas[0]?.total || 0) > 0) {
    throw Object.assign(new Error('Ja existem parcelas pagas para esta solicitacao; nao e possivel redefinir o plano.'), { status: 400 });
  }

  await sql.unsafe(`delete from ${SERVICOS_SCHEMA}.parcelas_pagamento where solicitacao_id = $1;`, [solicitacaoId]);

  if (parcelasPropostas.length) {
    await inserirPlanoParcelas(solicitacaoId, parcelasPropostas);
    await insertHistorico(solicitacaoId, 'parcela_criada', collaboradorId, `${parcelasPropostas.length} parcela(s) atualizada(s) pelo solicitante.`);
  } else {
    await insertHistorico(solicitacaoId, 'parcela_criada', collaboradorId, 'Parcelamento removido pelo solicitante.');
  }
}

// Acesso a uma solicitacao especifica: financeiro/contas_a_pagar ve/mexe em qualquer uma; o
// proprio solicitante sempre ve a sua; um aprovador so acessa a solicitacao endereçada
// a ele (aprovador_destino_id), nao qualquer solicitacao pendente; e qualquer papel ve as
// solicitacoes de colegas do mesmo setor (departamento_id atual do colaborador logado
// comparado ao snapshot de departamento_id da solicitacao).
async function canAccessSolicitacao(
  moduleRole: string | null,
  collaboradorId: string | null | undefined,
  row: {
    solicitante_id: unknown;
    aprovador_destino_id?: unknown;
    departamento_id?: unknown;
    aprovador_destino_departamento_id?: unknown;
    forma_pagamento?: unknown;
  },
  departamentoId?: string | null,
) {
  // Dinheiro: visibilidade restrita a solicitante/aprovador-destino/financeiro, ignorando
  // isPagador (exclui contas_a_pagar) e a ampliacao por setor -- espelha
  // public.servicos_can_access_solicitacao() no banco. Configuravel via
  // gestao_servicos.configuracoes_modulo (getRestringeVisibilidadeDinheiro).
  if (row.forma_pagamento === 'dinheiro' && (await getRestringeVisibilidadeDinheiro())) {
    if (String(row.solicitante_id) === String(collaboradorId || '')) return true;
    if (isFinanceiro(moduleRole)) return true;
    return moduleRole === 'aprovador' && String(row.aprovador_destino_id || '') === String(collaboradorId || '');
  }

  if (isPagador(moduleRole)) return true;
  if (String(row.solicitante_id) === String(collaboradorId || '')) return true;
  if (moduleRole === 'aprovador' && String(row.aprovador_destino_id || '') === String(collaboradorId || '')) {
    return true;
  }
  if (!departamentoId) return false;
  if (String(row.departamento_id || '') === String(departamentoId)) return true;
  // Aprovadores do mesmo departamento entre si acompanham a fila uns dos outros, mesmo quando o
  // solicitante e de outro setor -- departamento_id da linha e so o snapshot do solicitante, por
  // isso essa checagem separada olha pro departamento do proprio aprovador designado.
  return (
    moduleRole === 'aprovador' &&
    Boolean(row.aprovador_destino_departamento_id) &&
    String(row.aprovador_destino_departamento_id) === String(departamentoId)
  );
}

// Anexo sigiloso e mais restrito que acesso normal a solicitacao: contas_a_pagar tem acesso a
// linha (pode ver/pagar a solicitacao) mas nunca ve anexo marcado sigiloso. Quem ve: financeiro,
// o proprio solicitante, o aprovador designado, e colegas do mesmo setor da solicitacao (mesma
// regra de setor usada em canAccessSolicitacao) -- exceto em dinheiro, onde a ampliacao por setor
// tambem nao se aplica aqui.
async function canViewAnexoSigiloso(
  moduleRole: string | null,
  collaboradorId: string | null | undefined,
  row: { solicitante_id: unknown; aprovador_destino_id?: unknown; departamento_id?: unknown; forma_pagamento?: unknown },
  departamentoId?: string | null,
) {
  if (isFinanceiro(moduleRole)) return true;
  if (String(row.solicitante_id) === String(collaboradorId || '')) return true;
  if (moduleRole === 'aprovador' && String(row.aprovador_destino_id || '') === String(collaboradorId || '')) {
    return true;
  }
  if (row.forma_pagamento === 'dinheiro' && (await getRestringeVisibilidadeDinheiro())) return false;
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
      select sp.*, c.nome as solicitante_nome, ac.nome as aprovador_destino_nome,
        ac.departamento_id as aprovador_destino_departamento_id, pc.nome as pendencia_aberta_por_nome
      from ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp
      join public.colaboradores c on c.id = sp.solicitante_id
      left join public.colaboradores ac on ac.id = sp.aprovador_destino_id
      left join public.colaboradores pc on pc.id = sp.pendencia_aberta_por
      where sp.id = $1
      limit 1;
    `,
    [id],
  );
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Solicitacao nao encontrada.'), { status: 404 });

  const departamentoId = collaborator?.departamento_id as string | null | undefined;
  if (await canAccessSolicitacao(moduleRole, collaborator?.id as string | undefined, row, departamentoId)) return row;

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
      insert into notificacoes.fila_emails (tipo, destinatario, assunto, payload)
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
  papelLabel: string | null = null,
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

  // Deixa visivel, na propria timeline da solicitacao, quem foi avisado e quando -- sem isso o
  // unico registro fica em gestao_servicos.notificacoes, sem vinculo visual com a solicitacao.
  if (referenciaTipo === 'solicitacao_pagamento' && referenciaId) {
    const destinatario = await sql!.unsafe(`select nome from public.colaboradores where id = $1 limit 1;`, [colaboradorId]);
    const nome = destinatario[0]?.nome || 'Colaborador';
    const observacao = papelLabel ? `Notificado: ${nome} (${papelLabel})` : `Notificado: ${nome}`;
    await insertHistorico(referenciaId, 'notificacao_enviada', criadoPor, observacao);
  }
}

// Mesmo padrao de enqueueStatusEmail, mas pro sino in-app -- chamado nos mesmos pontos, pro
// solicitante ver a atualizacao sem precisar checar o e-mail.
async function notifySolicitanteStatusChange(row: Record<string, unknown>, status: string, autorId: string) {
  const tituloPorStatus: Record<string, string> = {
    aprovado: 'Solicitação aprovada',
    reprovado: 'Solicitação reprovada',
    pago: 'Pagamento efetuado',
    cancelado: 'Solicitação cancelada',
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
    'solicitante',
  );
}

// Mesmo padrao de notifySolicitanteStatusChange, mas pra pendencia (que nao muda o status) --
// avisa o solicitante tanto quando a pendencia abre (motivo em `mensagem`) quanto quando libera.
async function notifySolicitantePendencia(row: Record<string, unknown>, ativa: boolean, autorId: string) {
  const valorFormatado = Number(row.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  await insertNotificacao(
    String(row.solicitante_id),
    'pendencia_solicitacao',
    ativa ? 'Pendência em sua solicitação' : 'Pendência liberada',
    ativa
      ? `${row.fornecedor} — ${valorFormatado}: ${row.pendencia_motivo}`
      : `${row.fornecedor} — ${valorFormatado} liberada para pagamento`,
    `/solicitacoes?sol=${row.id}`,
    'solicitacao_pagamento',
    String(row.id),
    autorId,
    'solicitante',
  );

  if (!sql) return;
  const rows = await sql.unsafe(`select nome, email from public.colaboradores where id = $1 limit 1;`, [row.solicitante_id]);
  const solicitante = rows[0];
  if (!solicitante?.email) return;

  const assunto = ativa ? 'Pendência aberta em sua solicitação de pagamento' : 'Pendência liberada em sua solicitação de pagamento';
  const bodyText = ativa
    ? `Ola ${solicitante.nome},\n\nSua solicitacao de pagamento para "${row.fornecedor}" no valor de ${valorFormatado} teve uma pendencia sinalizada pelo contas a pagar:\n\n${row.pendencia_motivo}\n\nO pagamento fica bloqueado ate a pendencia ser resolvida e liberada.\n\nMACOM Servicos - Financeiro`
    : `Ola ${solicitante.nome},\n\nA pendencia da sua solicitacao de pagamento para "${row.fornecedor}" no valor de ${valorFormatado} foi liberada. O pagamento segue normalmente.\n\nMACOM Servicos - Financeiro`;

  await sql.unsafe(
    `insert into notificacoes.fila_emails (tipo, destinatario, assunto, payload) values ($1, $2, $3, $4::jsonb);`,
    [
      ativa ? 'pendencia_aberta' : 'pendencia_liberada',
      solicitante.email,
      assunto,
      JSON.stringify({ to: solicitante.email, subject: assunto, body_text: bodyText }),
    ],
  );
}

// Avisa quem abriu a pendencia que o solicitante corrigiu algo (dados ou anexo) enquanto ela
// estava aberta -- sem isso o contas a pagar so descobre reconferindo manualmente a solicitacao.
// So in-app/push (nao entra na fila de e-mail, evento operacional menos critico que abrir/liberar).
async function notifySolicitantePendenciaAtualizada(row: Record<string, unknown>, autorId: string) {
  if (!row.pendencia_aberta_por) return;
  const valorFormatado = Number(row.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  await insertNotificacao(
    String(row.pendencia_aberta_por),
    'pendencia_solicitacao_atualizada',
    'Solicitante corrigiu pendência',
    `${row.fornecedor} — ${valorFormatado}: solicitante atualizou os dados, revisar pendência`,
    `/pagamentos?sol=${row.id}`,
    'solicitacao_pagamento',
    String(row.id),
    autorId,
    'contas a pagar',
  );
}

// Notifica o aprovador designado que uma solicitacao esta esperando decisao dele (criacao nova
// ou reenvio apos correcao) -- hoje isso so gerava historico, sem avisar o aprovador de nada.
// Link aponta pra /aprovacoes (fila de pendentes, com os botoes Aprovar/Reprovar), nao pra
// /solicitacoes (lista "minhas solicitacoes" do solicitante, sem acao de decisao no footer).
async function notifyAprovadorNovaSolicitacao(row: Record<string, unknown>, titulo: string, autorId: string) {
  if (!row.aprovador_destino_id) return;
  const valorFormatado = Number(row.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  await insertNotificacao(
    String(row.aprovador_destino_id),
    'solicitacao_pendente',
    titulo,
    `${row.fornecedor} — ${valorFormatado}`,
    `/aprovacoes?sol=${row.id}`,
    'solicitacao_pagamento',
    String(row.id),
    autorId,
    'aprovador',
  );
}

// Notifica quem paga (papel financeiro/contas_a_pagar no modulo, ou admin do sistema) que uma
// solicitacao acabou de cair na fila de "Contas a pagar" -- ate aqui so o aprovador e o
// solicitante recebiam aviso, o financeiro precisava checar a fila manualmente pra saber que
// tinha algo novo pra pagar.
async function notifyFinanceirosSolicitacaoAprovada(row: Record<string, unknown>, autorId: string) {
  const financeiros = await sql!.unsafe(
    `
      select distinct aus.colaborador_id
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      left join ${SERVICOS_SCHEMA}.permissoes_modulo pm on pm.colaborador_id = aus.colaborador_id and pm.modulo = 'financeiro'
      where s.slug = $1 and s.ativo = true and aus.ativo = true
        and (aus.nivel_acesso = 'admin' or pm.papel in ('financeiro', 'contas_a_pagar'));
    `,
    [SERVICOS_SYSTEM_SLUG],
  );
  if (!financeiros.length) return;

  const valorFormatado = Number(row.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  await Promise.all(
    financeiros.map((item: { colaborador_id: string }) =>
      insertNotificacao(
        item.colaborador_id,
        'solicitacao_aprovada_financeiro',
        'Solicitação aguardando pagamento',
        `${row.fornecedor} — ${valorFormatado}`,
        `/pagamentos?sol=${row.id}`,
        'solicitacao_pagamento',
        String(row.id),
        autorId,
        'financeiro',
      ),
    ),
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
      select pp.*, sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.status as solicitacao_status,
        sp.pendencia_bloqueio, ac.departamento_id as aprovador_destino_departamento_id
      from ${SERVICOS_SCHEMA}.parcelas_pagamento pp
      join ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp on sp.id = pp.solicitacao_id
      left join public.colaboradores ac on ac.id = sp.aprovador_destino_id
      where pp.id = $1
      limit 1;
    `,
    [id],
  );
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Parcela nao encontrada.'), { status: 404 });

  const departamentoId = collaborator?.departamento_id as string | null | undefined;
  if (await canAccessSolicitacao(moduleRole, collaborator?.id as string | undefined, row, departamentoId)) return row;

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

    if (action === 'get_configuracao_modulo') {
      const rows = await sql.unsafe(
        `select modulo, restringir_visibilidade_pagamento_dinheiro, atualizado_em from ${SERVICOS_SCHEMA}.configuracoes_modulo where modulo = $1 limit 1;`,
        ['financeiro'],
      );
      return json({ row: rows[0] || { modulo: 'financeiro', restringir_visibilidade_pagamento_dinheiro: true } });
    }

    if (action === 'atualizar_configuracao_modulo') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode alterar configuracoes do modulo.'), { status: 403 });
      }

      const restringir = Boolean(body.restringir_visibilidade_pagamento_dinheiro);
      const rows = await sql.unsafe(
        `
          insert into ${SERVICOS_SCHEMA}.configuracoes_modulo (modulo, restringir_visibilidade_pagamento_dinheiro, atualizado_por, atualizado_em)
          values ($1, $2, $3, now())
          on conflict (modulo) do update
            set restringir_visibilidade_pagamento_dinheiro = excluded.restringir_visibilidade_pagamento_dinheiro,
              atualizado_por = excluded.atualizado_por,
              atualizado_em = now()
          returning modulo, restringir_visibilidade_pagamento_dinheiro, atualizado_em;
        `,
        ['financeiro', restringir, collaborator!.id],
      );
      // Invalida o cache em memoria pra a mudanca valer imediatamente nesta instancia da function.
      restringeVisibilidadeDinheiroCache = null;
      return json({ row: rows[0] });
    }

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
            f.tipo_pessoa, f.documento, f.inscricao_estadual, f.email, f.telefone,
            f.endereco, f.cidade, f.uf, f.cep,
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
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode gerenciar fornecedores.'), { status: 403 });
      }

      const nome = String(body.nome || '').trim();
      if (!nome) throw Object.assign(new Error('Informe o nome do fornecedor.'), { status: 400 });
      const dados = extrairDadosFornecedor(body);

      const existing = await sql.unsafe(
        `select id, nome, ativo, criado_em, atualizado_em from ${SERVICOS_SCHEMA}.fornecedores where lower(nome) = lower($1) limit 1;`,
        [nome],
      );
      if (existing[0]) return json({ row: existing[0] });

      const rows = await sql.unsafe(
        `
          insert into ${SERVICOS_SCHEMA}.fornecedores (
            nome, criado_por, tipo_pessoa, documento, inscricao_estadual, email, telefone,
            endereco, cidade, uf, cep
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          returning id, nome, ativo, criado_em, atualizado_em,
            tipo_pessoa, documento, inscricao_estadual, email, telefone,
            endereco, cidade, uf, cep;
        `,
        [
          nome, collaborator!.id, dados.tipo_pessoa, dados.documento, dados.inscricao_estadual,
          dados.email, dados.telefone, dados.endereco, dados.cidade, dados.uf, dados.cep,
        ],
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
      const dados = extrairDadosFornecedor(body);

      const duplicated = await sql.unsafe(
        `select id from ${SERVICOS_SCHEMA}.fornecedores where lower(nome) = lower($1) and id <> $2 limit 1;`,
        [nome, id],
      );
      if (duplicated[0]) throw Object.assign(new Error('Ja existe um fornecedor com esse nome.'), { status: 400 });

      const rows = await sql.unsafe(
        `
          update ${SERVICOS_SCHEMA}.fornecedores
          set nome = $1, ativo = $2, atualizado_em = now(),
            tipo_pessoa = $4, documento = $5, inscricao_estadual = $6, email = $7, telefone = $8,
            endereco = $9, cidade = $10, uf = $11, cep = $12
          where id = $3
          returning id, nome, ativo, criado_em, atualizado_em,
            tipo_pessoa, documento, inscricao_estadual, email, telefone,
            endereco, cidade, uf, cep;
        `,
        [
          nome, ativo, id, dados.tipo_pessoa, dados.documento, dados.inscricao_estadual,
          dados.email, dados.telefone, dados.endereco, dados.cidade, dados.uf, dados.cep,
        ],
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

    if (action === 'list_push_subscriptions') {
      if (getAccessLevel(access) !== 'admin') {
        throw Object.assign(new Error('Apenas administradores podem ver as inscricoes de notificacao.'), { status: 403 });
      }

      const rows = await sql.unsafe(
        `
          select ps.id, ps.colaborador_id, c.nome, c.email, ps.user_agent,
            ps.tipo_dispositivo, ps.sistema_operacional, ps.navegador, ps.criado_em
          from public.push_subscriptions ps
          join public.colaboradores c on c.id = ps.colaborador_id
          where ps.sistema = $1
          order by c.nome, ps.criado_em desc;
        `,
        [SERVICOS_SYSTEM_SLUG],
      );

      return json({ rows });
    }

    if (action === 'revoke_push_subscription') {
      if (getAccessLevel(access) !== 'admin') {
        throw Object.assign(new Error('Apenas administradores podem remover inscricoes de notificacao.'), { status: 403 });
      }

      const id = String(body.id || '');
      if (!id) return json({ error: 'id obrigatorio.' }, 400);

      await sql.unsafe(`delete from public.push_subscriptions where id = $1 and sistema = $2;`, [id, SERVICOS_SYSTEM_SLUG]);
      return json({ ok: true });
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
      // colaborador logado comparado ao snapshot de departamento_id da solicitacao). Solicitacao
      // em dinheiro (com o flag ligado) e mais restrita: nunca amplia por setor, e contas_a_pagar
      // (isPagador mas nao financeiro) fica de fora -- espelha canAccessSolicitacao/RLS.
      const restringeDinheiro = await getRestringeVisibilidadeDinheiro();

      if (isPagador(moduleRole)) {
        if (!isFinanceiro(moduleRole) && restringeDinheiro) {
          clauses.push(`sp.forma_pagamento <> 'dinheiro'`);
        }
      } else {
        values.push(collaborator!.id);
        const collaboradorIdParam = values.length;
        const pessoaisClause =
          moduleRole === 'aprovador'
            ? `(sp.solicitante_id = $${collaboradorIdParam} or sp.aprovador_destino_id = $${collaboradorIdParam})`
            : `sp.solicitante_id = $${collaboradorIdParam}`;

        const departamentoId = collaborator!.departamento_id as string | null | undefined;
        let acessoClause = pessoaisClause;
        if (departamentoId) {
          values.push(departamentoId);
          // Aprovadores do mesmo departamento entre si tambem veem a fila uns dos outros (ac e o
          // join com o colaborador do aprovador_destino_id, ja usado pra aprovador_destino_nome
          // logo abaixo no SELECT) -- sp.departamento_id sozinho e so o snapshot do solicitante.
          const departamentoClause =
            moduleRole === 'aprovador'
              ? `(sp.departamento_id = $${values.length} or ac.departamento_id = $${values.length})`
              : `sp.departamento_id = $${values.length}`;
          acessoClause = `(${pessoaisClause} or ${departamentoClause})`;
        }

        clauses.push(
          restringeDinheiro
            ? `((sp.forma_pagamento <> 'dinheiro' and ${acessoClause}) or (sp.forma_pagamento = 'dinheiro' and ${pessoaisClause}))`
            : acessoClause,
        );
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
            pc.nome as pendencia_aberta_por_nome,
            e.nome as empresa_nome,
            d.nome as departamento_nome,
            coalesce(pp.parcelas_total, 0) as parcelas_total,
            coalesce(pp.parcelas_pagas, 0) as parcelas_pagas,
            coalesce(pp.valor_pago, 0) as valor_pago,
            coalesce(
              case when pp.parcelas_total > 0 then pp.vencimento_parcela end,
              sp.data_vencimento
            ) as vencimento_efetivo
          from ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp
          join public.colaboradores c on c.id = sp.solicitante_id
          left join public.colaboradores ac on ac.id = sp.aprovador_destino_id
          left join public.colaboradores pc on pc.id = sp.pendencia_aberta_por
          left join public.empresas e on e.id = sp.empresa_id
          left join public.departamentos d on d.id = sp.departamento_id
          left join lateral (
            select
              count(*) as parcelas_total,
              count(*) filter (where status = 'pago') as parcelas_pagas,
              coalesce(sum(valor) filter (where status = 'pago'), 0) as valor_pago,
              -- proxima parcela pendente mais proxima; se nao ha nenhuma pendente (tudo pago),
              -- usa a ultima parcela so como referencia (a solicitacao ja virou 'pago' via
              -- trigger trg_servicos_parcelas_rollup, entao isso nao deve contar como atraso)
              coalesce(
                min(data_vencimento) filter (where status = 'pendente'),
                max(data_vencimento)
              ) as vencimento_parcela
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

    if (action === 'relatorio_financeiro') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode ver relatorios.'), { status: 403 });
      }

      const filtros = typeof body.filtros === 'object' && body.filtros ? body.filtros : {};
      const de = typeof filtros.de === 'string' && filtros.de ? filtros.de : '0001-01-01';
      const ate = typeof filtros.ate === 'string' && filtros.ate ? filtros.ate : '9999-12-31';
      const empresaId = typeof filtros.empresa_id === 'string' && filtros.empresa_id ? filtros.empresa_id : null;
      const numeroRaw = filtros.numero;
      const numero =
        numeroRaw !== undefined && numeroRaw !== null && String(numeroRaw).trim() !== ''
          ? Number(String(numeroRaw).trim())
          : null;
      if (numero !== null && !Number.isInteger(numero)) {
        throw Object.assign(new Error('Numero da solicitacao invalido.'), { status: 400 });
      }

      // "Pago" cobre a vista e parcelado: a vista nunca cria linhas em parcelas_pagamento, entao
      // valor_pago (soma das parcelas quitadas) fica 0 mesmo com status = 'pago' -- nesse caso o
      // valor pago de verdade e o valor cheio da solicitacao.
      const baseCte = `
        with base as (
          select
            sp.*,
            coalesce(pp.valor_pago, 0) as valor_pago,
            coalesce(
              case when pp.parcelas_total > 0 then pp.vencimento_parcela end,
              sp.data_vencimento
            ) as vencimento_efetivo
          from ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp
          left join lateral (
            select
              coalesce(sum(valor) filter (where status = 'pago'), 0) as valor_pago,
              count(*) as parcelas_total,
              coalesce(
                min(data_vencimento) filter (where status = 'pendente'),
                max(data_vencimento)
              ) as vencimento_parcela
            from ${SERVICOS_SCHEMA}.parcelas_pagamento
            where solicitacao_id = sp.id
          ) pp on true
          where sp.criado_em >= $1 and sp.criado_em <= $2
            and ($3::uuid is null or sp.empresa_id = $3)
            and ($4::bigint is null or sp.numero = $4)
        )
      `;
      const values = [de, ate, empresaId, numero];

      const resumoRows = await sql.unsafe(
        `
          ${baseCte}
          select
            count(*) as total_quantidade,
            coalesce(sum(valor), 0) as total_valor,
            coalesce(sum(case when status = 'pago' then valor else valor_pago end), 0) as total_pago,
            coalesce(sum(valor - (case when status = 'pago' then valor else valor_pago end))
              filter (where status = 'aprovado'), 0) as total_em_aberto,
            count(*) filter (where status = 'aprovado' and vencimento_efetivo < current_date) as total_atrasadas,
            coalesce(sum(valor) filter (where status = 'aprovado' and vencimento_efetivo < current_date), 0) as valor_atrasadas,
            count(*) filter (where status = 'pendente') as total_pendentes,
            count(*) filter (where status = 'reprovado') as total_reprovadas,
            count(*) filter (where status = 'cancelado') as total_canceladas
          from base;
        `,
        values,
      );

      const porCategoriaRows = await sql.unsafe(
        `
          ${baseCte}
          select categoria, count(*) as quantidade, coalesce(sum(valor), 0) as valor
          from base
          where status not in ('reprovado', 'cancelado')
          group by categoria
          order by valor desc;
        `,
        values,
      );

      const porStatusRows = await sql.unsafe(
        `
          ${baseCte}
          select status, count(*) as quantidade, coalesce(sum(valor), 0) as valor
          from base
          group by status
          order by valor desc;
        `,
        values,
      );

      // Evolucao mensal: agrupa por mes de criacao (mesmo campo usado no filtro de periodo,
      // nao data de pagamento) -- limita aos ultimos 12 meses com dado no periodo filtrado pra
      // nao devolver uma serie enorme quando o filtro de data fica aberto.
      const porMesRows = await sql.unsafe(
        `
          ${baseCte}
          select
            to_char(date_trunc('month', criado_em), 'YYYY-MM') as mes,
            coalesce(sum(valor), 0) as valor_solicitado,
            coalesce(sum(case when status = 'pago' then valor else valor_pago end), 0) as valor_pago
          from base
          group by 1
          order by 1 desc
          limit 12;
        `,
        values,
      );
      porMesRows.reverse();

      return json({
        resumo: resumoRows[0] || null,
        porCategoria: porCategoriaRows,
        porStatus: porStatusRows,
        porMes: porMesRows,
      });
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

      // Parcelamento e opcional: o solicitante pode propor um plano de pagamento ja na
      // criacao (fica sujeito a revisao do financeiro/contas a pagar depois de aprovado,
      // via criar_parcelas). Sem esse campo, a solicitacao nasce a vista, igual antes.
      const parcelasPropostas = Array.isArray(body.payload?.parcelas) ? body.payload.parcelas : [];
      if (parcelasPropostas.length) {
        validateParcelasSum(parcelasPropostas, Number(payload.valor));
      }

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
        if (parcelasPropostas.length) {
          await inserirPlanoParcelas(String(row.id), parcelasPropostas);
          await insertHistorico(String(row.id), 'parcela_criada', collaborator!.id as string, `${parcelasPropostas.length} parcela(s) proposta(s) pelo solicitante.`);
        }
        await notifyAprovadorNovaSolicitacao(row, 'Nova solicitação para aprovar', collaborator!.id as string);
      }
      return json({ row });
    }

    if (action === 'update') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const existing = await ensureRowAccess(id, moduleRole, collaborator);
      const podeEditar = existing.status === 'pendente' || existing.pendencia_bloqueio === true;
      if (String(existing.solicitante_id) !== String(collaborator!.id) || !podeEditar) {
        throw Object.assign(new Error('Somente o solicitante pode editar a solicitacao enquanto pendente ou com pendencia aberta.'), { status: 403 });
      }

      // Chave 'parcelas' presente no payload = usuario mexeu no parcelamento (array vazio =
      // voltar a ser a vista); ausente = nao altera o plano de parcelas existente.
      const parcelasPropostas = Array.isArray(body.payload?.parcelas)
        ? (body.payload.parcelas as Array<Record<string, unknown>>)
        : null;

      const payload = sanitizePayload(UPDATE_FIELDS, body.payload || {});
      if (!Object.keys(payload).length && parcelasPropostas === null) {
        return json({ error: 'Nenhum campo para atualizar.' }, 400);
      }
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
      let row = existing;
      if (fields.length) {
        const assignments = fields.map((field, index) => `${quoteIdentifier(field)} = $${index + 2}`).join(', ');
        const rows = await sql.unsafe(
          `update ${SERVICOS_SCHEMA}.solicitacoes_pagamento set ${assignments} where id = $1 returning *;`,
          [id, ...fields.map((field) => payload[field])],
        );
        row = rows[0] || existing;

        const camposAlterados = fields
          .map((field) => UPDATE_FIELD_LABELS[field as (typeof CREATE_FIELDS)[number]] || field)
          .join(', ');
        await insertHistorico(id, 'editada', collaborator!.id as string, `Campos alterados: ${camposAlterados}`);
      }

      if (parcelasPropostas !== null) {
        const valorReferencia = payload.valor != null ? Number(payload.valor) : Number(existing.valor);
        await substituirPlanoParcelas(id, parcelasPropostas, valorReferencia, collaborator!.id as string);
      }

      // Solicitante corrigindo dados/anexos enquanto a pendencia esta aberta -- sinaliza pro
      // contas a pagar que ha novidade a revisar, sem precisar ficar reconferindo manualmente.
      if (existing.pendencia_bloqueio === true && (fields.length || parcelasPropostas !== null)) {
        const rows = await sql.unsafe(
          `update ${SERVICOS_SCHEMA}.solicitacoes_pagamento set pendencia_atualizada_em = now() where id = $1 returning *;`,
          [id],
        );
        row = rows[0] || row;
        await insertHistorico(id, 'pendencia_atualizada_pelo_solicitante', collaborator!.id as string);
        await notifySolicitantePendenciaAtualizada(row, collaborator!.id as string);
      }

      return json({ row });
    }

    if (action === 'cancelar_solicitacao') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const existing = await ensureRowAccess(id, moduleRole, collaborator);
      const souSolicitante = String(existing.solicitante_id) === String(collaborator!.id);
      const souGerente = isFinanceiro(moduleRole);

      let motivo: string | null = body.motivo ? String(body.motivo).trim() : null;
      if (existing.status === 'pendente') {
        if (!souSolicitante) {
          throw Object.assign(new Error('Apenas o solicitante pode cancelar esta solicitacao.'), { status: 403 });
        }
      } else if (existing.status === 'pago') {
        // Cancelamento excecional de solicitacao ja paga (ex. pagamento em duplicidade) -- so o
        // gerente (financeiro) pode, e o motivo e obrigatorio pra auditoria. Nao mexe nas
        // parcelas: elas continuam com status 'pago', o cancelamento e so uma sinalizacao.
        if (!souGerente) {
          throw Object.assign(new Error('Apenas o financeiro pode cancelar uma solicitacao ja paga.'), { status: 403 });
        }
        if (!motivo) {
          throw Object.assign(new Error('Informe o motivo do cancelamento.'), { status: 400 });
        }
      } else {
        throw Object.assign(new Error('Somente solicitacoes pendentes ou pagas podem ser canceladas.'), { status: 400 });
      }
      const rows = await sql.unsafe(
        `update ${SERVICOS_SCHEMA}.solicitacoes_pagamento set status = 'cancelado' where id = $1 returning *;`,
        [id],
      );
      await insertHistorico(id, 'cancelada', collaborator!.id as string, motivo);
      // So notifica se quem cancelou nao foi o proprio solicitante (ex. financeiro cancelando
      // um pagamento em duplicidade) -- se ele mesmo cancelou, ja sabe.
      if (!souSolicitante) {
        await notifySolicitanteStatusChange(rows[0], 'cancelado', collaborator!.id as string);
      }
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

      const parcelasPropostas = Array.isArray(body.payload?.parcelas)
        ? (body.payload.parcelas as Array<Record<string, unknown>>)
        : null;

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

      if (parcelasPropostas !== null) {
        const valorReferencia = payload.valor != null ? Number(payload.valor) : Number(existing.valor);
        await substituirPlanoParcelas(id, parcelasPropostas, valorReferencia, collaborator!.id as string);
      }

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
        const isAprovadorDestino =
          moduleRole === 'aprovador' && String(existing.aprovador_destino_id || '') === String(collaborator!.id);

        if (reprovandoAprovada) {
          if (!isFinanceiro(moduleRole) && !isAprovadorDestino) {
            throw Object.assign(
              new Error('Apenas o aprovador designado ou o financeiro pode reprovar uma solicitacao ja aprovada.'),
              { status: 403 },
            );
          }
          if (!observacao) {
            throw Object.assign(new Error('Informe o motivo da reprovacao.'), { status: 400 });
          }
          // Se ja saiu algum pagamento (parcela paga), reprovar deixaria a solicitacao num
          // estado inconsistente (dinheiro pago numa solicitacao "nao aprovada"). Nesse caso o
          // caminho correto e o cancelamento de pagamento (financeiro), nao a reprovacao.
          const parcelasPagas = await sql.unsafe(
            `select count(*)::int as total from ${SERVICOS_SCHEMA}.parcelas_pagamento where solicitacao_id = $1 and status <> 'pendente';`,
            [id],
          );
          if (Number(parcelasPagas[0]?.total || 0) > 0) {
            throw Object.assign(
              new Error('Esta solicitacao ja teve parcela(s) paga(s); nao e possivel reprovar. Use o cancelamento de pagamento, se necessario.'),
              { status: 400 },
            );
          }
        } else {
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
        if (status === 'aprovado') {
          await notifyFinanceirosSolicitacaoAprovada(row, collaborator!.id as string);
        }
        return json({ row });
      }

      if (status === 'pago') {
        if (!isFinanceiro(moduleRole)) {
          throw Object.assign(new Error('Apenas o financeiro pode marcar uma solicitacao como paga.'), { status: 403 });
        }
        if (existing.status !== 'aprovado') {
          throw Object.assign(new Error('Somente solicitacoes aprovadas podem ser marcadas como pagas.'), { status: 400 });
        }
        if (existing.pendencia_bloqueio) {
          throw Object.assign(new Error('Solicitacao com pendencia aberta; libere a pendencia antes de pagar.'), { status: 400 });
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

    if (action === 'marcar_pendencia') {
      const id = String(body.id || '');
      const motivo = String(body.motivo || '').trim();
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      if (!motivo) return json({ error: 'Informe o motivo da pendencia.' }, 400);
      if (!isPagador(moduleRole)) {
        throw Object.assign(new Error('Apenas financeiro ou contas a pagar podem sinalizar pendencia.'), { status: 403 });
      }

      const existing = await ensureRowAccess(id, moduleRole, collaborator);
      if (existing.status !== 'aprovado') {
        throw Object.assign(new Error('Somente solicitacoes aprovadas podem receber pendencia.'), { status: 400 });
      }
      if (existing.pendencia_bloqueio) {
        throw Object.assign(new Error('Esta solicitacao ja tem uma pendencia aberta.'), { status: 400 });
      }

      const rows = await sql.unsafe(
        `
          update ${SERVICOS_SCHEMA}.solicitacoes_pagamento
          set pendencia_bloqueio = true, pendencia_motivo = $2, pendencia_aberta_por = $3, pendencia_aberta_em = now(),
            pendencia_atualizada_em = null
          where id = $1
          returning *;
        `,
        [id, motivo, collaborator!.id],
      );
      const row = rows[0];
      await insertHistorico(id, 'pendencia_aberta', collaborator!.id as string, motivo);
      await notifySolicitantePendencia(row, true, collaborator!.id as string);
      return json({ row });
    }

    if (action === 'liberar_pendencia') {
      const id = String(body.id || '');
      const observacao = body.observacao ? String(body.observacao) : null;
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      if (!isPagador(moduleRole)) {
        throw Object.assign(new Error('Apenas financeiro ou contas a pagar podem liberar pendencia.'), { status: 403 });
      }

      const existing = await ensureRowAccess(id, moduleRole, collaborator);
      if (!existing.pendencia_bloqueio) {
        throw Object.assign(new Error('Esta solicitacao nao tem pendencia aberta.'), { status: 400 });
      }

      const rows = await sql.unsafe(
        `
          update ${SERVICOS_SCHEMA}.solicitacoes_pagamento
          set pendencia_bloqueio = false, pendencia_motivo = null, pendencia_aberta_por = null, pendencia_aberta_em = null,
            pendencia_atualizada_em = null
          where id = $1
          returning *;
        `,
        [id],
      );
      const row = rows[0];
      await insertHistorico(id, 'pendencia_liberada', collaborator!.id as string, observacao);
      await notifySolicitantePendencia(row, false, collaborator!.id as string);
      return json({ row });
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
      // solicitacaoRow e a mesma pra todos os anexos da lista -- o resultado nao muda por anexo,
      // entao calcula uma vez em vez de repetir o await dentro do filter.
      const podeVerSigiloso = await canViewAnexoSigiloso(
        moduleRole,
        collaborator?.id as string | undefined,
        solicitacaoRow,
        departamentoIdAnexos,
      );
      const visiveis = rows.filter((anexo: Record<string, unknown>) => !anexo.sigiloso || podeVerSigiloso);
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
          select an.*, sp.solicitante_id, sp.status as solicitacao_status, sp.pendencia_bloqueio
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
        String(anexo.solicitante_id) === String(collaborator!.id) &&
        (anexo.solicitacao_status === 'pendente' || anexo.pendencia_bloqueio === true);
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

      validateParcelasSum(parcelas as Array<Record<string, unknown>>, Number(existing.valor));

      await sql.unsafe(`delete from ${SERVICOS_SCHEMA}.parcelas_pagamento where solicitacao_id = $1;`, [solicitacaoId]);

      const inserted = await inserirPlanoParcelas(solicitacaoId, parcelas as Array<Record<string, unknown>>);

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
      if (parcela.pendencia_bloqueio) {
        throw Object.assign(new Error('Solicitacao com pendencia aberta; libere a pendencia antes de pagar.'), { status: 400 });
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
        // Ultima parcela fechou o ciclo -- o trigger de rollup ja marcou a solicitacao como
        // 'pago' direto no banco, sem passar pela action set_status. Replica aqui o que
        // set_status faz no pagamento a vista (historico + notificacao in-app), senao esses dois
        // ficam mudos quando o pagamento e concluido via parcelamento.
        await insertHistorico(String(solicitacao.id), 'pago', collaborator!.id as string);
        await notifySolicitanteStatusChange(solicitacao, 'pago', collaborator!.id as string);
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