import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERVICOS_SCHEMA = 'gestao_servicos';
const SERVICOS_SYSTEM_SLUG = 'servicos';
// Registro central dos modulos com Camada 2 de permissao. Novo modulo real =
// so adicionar aqui (nenhuma migration nova precisa, a tabela e normalizada).
const SERVICOS_MODULOS = ['financeiro'] as const;
const PAPEIS_MODULO = ['nenhum', 'usuario', 'gestor', 'admin'] as const;
const COMPROVANTES_STORAGE_BUCKET = 'comprovantes-pagamento';
const COMPROVANTE_SIGNED_URL_TTL_SECONDS = 10 * 60;
const MAX_COMPROVANTE_FILE_SIZE = 5 * 1024 * 1024;

const CREATE_FIELDS = [
  'titulo',
  'fornecedor_id',
  'descricao',
  'valor',
  'categoria',
  'comprovante_path',
  'data_vencimento',
  'forma_pagamento',
  'empresa_id',
  'departamento_id',
  'observacao',
  'aprovador_destino_id',
] as const;
const UPDATE_FIELDS = CREATE_FIELDS;
const CATEGORIAS = ['fornecedor', 'servico', 'viagem', 'reembolso', 'outros'];
const FORMAS_PAGAMENTO = ['pix', 'boleto', 'transferencia', 'cartao', 'outros'];
const ANEXO_CATEGORIAS = [
  'comprovante_solicitacao',
  'nf_boleto',
  'pdf_unificado',
  'rh',
  'comprovante_pagamento',
] as const;
const ANEXO_TIPOS_DOCUMENTO = ['orcamento', 'nota_fiscal', 'boleto', 'recibo', 'comprovante_pix', 'outros'] as const;
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
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

// Papel efetivo no modulo Financeiro: admin de Camada 1 (acesso ao sistema) bypassa tudo;
// senao, vem da Camada 2 (gestao_servicos.permissoes_usuario), default 'usuario'.
function isAprovador(moduleRole: string | null) {
  return ['admin', 'gestor'].includes(moduleRole || '');
}

function isFinanceiro(moduleRole: string | null) {
  return moduleRole === 'admin';
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
  if (accessLevel === 'admin') return 'admin';
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
  const categoria = String(payload.categoria || 'outros');

  if (!titulo) throw Object.assign(new Error('Informe o titulo.'), { status: 400 });
  if (!fornecedorId) throw Object.assign(new Error('Informe o fornecedor.'), { status: 400 });
  if (!descricao) throw Object.assign(new Error('Informe a descricao.'), { status: 400 });
  if (!Number.isFinite(valor) || valor <= 0) {
    throw Object.assign(new Error('Informe um valor valido.'), { status: 400 });
  }
  if (!CATEGORIAS.includes(categoria)) {
    throw Object.assign(new Error('Categoria invalida.'), { status: 400 });
  }

  if (payload.forma_pagamento && !FORMAS_PAGAMENTO.includes(String(payload.forma_pagamento))) {
    throw Object.assign(new Error('Forma de pagamento invalida.'), { status: 400 });
  }

  if (payload.data_vencimento && Number.isNaN(Date.parse(String(payload.data_vencimento)))) {
    throw Object.assign(new Error('Data de vencimento invalida.'), { status: 400 });
  }
}

async function ensureRowAccess(id: string, moduleRole: string | null, collaborator: Record<string, unknown> | null) {
  const rows = await sql!.unsafe(
    `
      select sp.*, c.nome as solicitante_nome
      from ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp
      join public.colaboradores c on c.id = sp.solicitante_id
      where sp.id = $1
      limit 1;
    `,
    [id],
  );
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Solicitacao nao encontrada.'), { status: 404 });

  if (isAprovador(moduleRole)) return row;
  if (String(row.solicitante_id) === String(collaborator?.id || '')) return row;

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
      select pp.*, sp.solicitante_id, sp.status as solicitacao_status
      from ${SERVICOS_SCHEMA}.parcelas_pagamento pp
      join ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp on sp.id = pp.solicitacao_id
      where pp.id = $1
      limit 1;
    `,
    [id],
  );
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Parcela nao encontrada.'), { status: 404 });

  if (isAprovador(moduleRole)) return row;
  if (String(row.solicitante_id) === String(collaborator?.id || '')) return row;

  throw Object.assign(new Error('Voce nao tem permissao para acessar esta parcela.'), { status: 403 });
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
    const access = collaborator?.id ? await getServicosAccess(String(collaborator.id)) : null;
    const moduleRole = collaborator?.id ? await getServicosModuleRole(String(collaborator.id), access) : null;

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
        `select id, nome from ${SERVICOS_SCHEMA}.fornecedores order by nome;`,
      );
      return json({ rows });
    }

    if (action === 'criar_fornecedor') {
      const nome = String(body.nome || '').trim();
      if (!nome) throw Object.assign(new Error('Informe o nome do fornecedor.'), { status: 400 });

      const existing = await sql.unsafe(
        `select id, nome from ${SERVICOS_SCHEMA}.fornecedores where lower(nome) = lower($1) limit 1;`,
        [nome],
      );
      if (existing[0]) return json({ row: existing[0] });

      const rows = await sql.unsafe(
        `insert into ${SERVICOS_SCHEMA}.fornecedores (nome, criado_por) values ($1, $2) returning id, nome;`,
        [nome, collaborator!.id],
      );
      return json({ row: rows[0] || null });
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
      if (!SERVICOS_MODULOS.includes(modulo as (typeof SERVICOS_MODULOS)[number])) {
        return json({ error: 'Modulo invalido.' }, 400);
      }
      if (!PAPEIS_MODULO.includes(papel as (typeof PAPEIS_MODULO)[number])) {
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

    if (action === 'list') {
      const filters = typeof body.filters === 'object' && body.filters ? body.filters : {};
      const status = typeof filters.status === 'string' ? filters.status : '';

      const clauses: string[] = [];
      const values: unknown[] = [];

      if (!isAprovador(moduleRole)) {
        values.push(collaborator!.id);
        clauses.push(`sp.solicitante_id = $${values.length}`);
      }

      if (status) {
        values.push(status);
        clauses.push(`sp.status = $${values.length}`);
      }

      const whereClause = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const orderBy = ORDER_BY_COLUMNS[String(filters.order_by || '')] || ORDER_BY_COLUMNS.criado_em;
      const rows = await sql.unsafe(
        `
          select sp.*, c.nome as solicitante_nome
          from ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp
          join public.colaboradores c on c.id = sp.solicitante_id
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

      // fornecedor e snapshot do nome no momento da solicitacao (mesmo padrao de
      // empresa_id/departamento_id abaixo), resolvido a partir de fornecedor_id.
      const fornecedorRows = await sql.unsafe(
        `select nome from ${SERVICOS_SCHEMA}.fornecedores where id = $1 limit 1;`,
        [payload.fornecedor_id],
      );
      if (!fornecedorRows[0]) throw Object.assign(new Error('Fornecedor invalido.'), { status: 400 });
      payload.fornecedor = fornecedorRows[0].nome;

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
      if (row) await insertHistorico(String(row.id), 'criada', collaborator!.id as string);
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

      const fields = Object.keys(payload);
      const assignments = fields.map((field, index) => `${quoteIdentifier(field)} = $${index + 2}`).join(', ');
      const rows = await sql.unsafe(
        `update ${SERVICOS_SCHEMA}.solicitacoes_pagamento set ${assignments} where id = $1 returning *;`,
        [id, ...fields.map((field) => payload[field])],
      );

      return json({ row: rows[0] || null });
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
        if (!isAprovador(moduleRole)) {
          throw Object.assign(new Error('Apenas aprovadores podem aprovar ou reprovar solicitacoes.'), { status: 403 });
        }
        if (existing.status !== 'pendente') {
          throw Object.assign(new Error('Somente solicitacoes pendentes podem ser aprovadas ou reprovadas.'), { status: 400 });
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
        await insertHistorico(id, status === 'aprovado' ? 'aprovada' : 'reprovada', collaborator!.id as string, observacao);
        await enqueueStatusEmail(row, status);
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
        return json({ row });
      }
    }

    if (action === 'list_anexos') {
      const solicitacaoId = String(body.solicitacao_id || '');
      if (!solicitacaoId) return json({ error: 'solicitacao_id obrigatorio.' }, 400);
      await ensureRowAccess(solicitacaoId, moduleRole, collaborator);

      const rows = await sql.unsafe(
        `select * from ${SERVICOS_SCHEMA}.anexos_solicitacao where solicitacao_id = $1 order by criado_em asc;`,
        [solicitacaoId],
      );
      const withUrls = await Promise.all(
        rows.map(async (anexo: Record<string, unknown>) => ({
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

      if (!solicitacaoId) return json({ error: 'solicitacao_id obrigatorio.' }, 400);
      if (!ANEXO_CATEGORIAS.includes(categoria as (typeof ANEXO_CATEGORIAS)[number])) {
        return json({ error: 'Categoria de anexo invalida.' }, 400);
      }
      if (!ANEXO_TIPOS_DOCUMENTO.includes(tipoDocumento as (typeof ANEXO_TIPOS_DOCUMENTO)[number])) {
        return json({ error: 'Tipo de documento invalido.' }, 400);
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
            (solicitacao_id, parcela_id, categoria, tipo_documento, nome_arquivo, tipo_mime, tamanho_bytes, storage_path, criado_por)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          returning *;
        `,
        [solicitacaoId, parcelaId, categoria, tipoDocumento, nomeArquivo, tipoMime, Number(body.tamanho_bytes) || 0, storagePath, collaborator!.id],
      );

      return json({ row: rows[0] || null });
    }

    if (action === 'remover_anexo') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const rows = await sql.unsafe(
        `
          select an.*, sp.status as solicitacao_status
          from ${SERVICOS_SCHEMA}.anexos_solicitacao an
          join ${SERVICOS_SCHEMA}.solicitacoes_pagamento sp on sp.id = an.solicitacao_id
          where an.id = $1
          limit 1;
        `,
        [id],
      );
      const anexo = rows[0];
      if (!anexo) return json({ error: 'Anexo nao encontrado.' }, 404);
      if (String(anexo.criado_por) !== String(collaborator!.id) || anexo.solicitacao_status !== 'pendente') {
        throw Object.assign(new Error('Somente quem enviou pode remover o anexo, enquanto a solicitacao esta pendente.'), { status: 403 });
      }

      await sql.unsafe(`delete from ${SERVICOS_SCHEMA}.anexos_solicitacao where id = $1;`, [id]);

      const storageClient = createStorageAdminClient();
      if (storageClient) {
        await storageClient.storage.from(COMPROVANTES_STORAGE_BUCKET).remove([String(anexo.storage_path)]);
      }

      return json({ ok: true });
    }

    if (action === 'criar_parcelas') {
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode definir o plano de pagamento.'), { status: 403 });
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
      if (!isFinanceiro(moduleRole)) {
        throw Object.assign(new Error('Apenas o financeiro pode registrar pagamento de parcela.'), { status: 403 });
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
          order by h.criado_em asc;
        `,
        [solicitacaoId],
      );

      return json({ rows });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json({ error: getErrorMessage(error) }, getErrorStatus(error));
  }
});
