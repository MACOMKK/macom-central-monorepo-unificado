import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAGAMENTOS_SCHEMA = 'gestao_pagamentos';
const PAGAMENTOS_SYSTEM_SLUG = 'pagamentos';
const COMPROVANTES_STORAGE_BUCKET = 'comprovantes-pagamento';
const COMPROVANTE_SIGNED_URL_TTL_SECONDS = 10 * 60;
const MAX_COMPROVANTE_FILE_SIZE = 5 * 1024 * 1024;

const CREATE_FIELDS = ['fornecedor', 'descricao', 'valor', 'categoria', 'comprovante_path'] as const;
const UPDATE_FIELDS = CREATE_FIELDS;
const CATEGORIAS = ['fornecedor', 'servico', 'viagem', 'reembolso', 'outros'];

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
  return error instanceof Error ? error.message : 'Falha ao consultar o sistema de pagamentos.';
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

function isAprovador(access: Record<string, unknown> | null) {
  return ['admin', 'gestor'].includes(getAccessLevel(access));
}

function isFinanceiro(access: Record<string, unknown> | null) {
  return getAccessLevel(access) === 'admin';
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

async function getPagamentosAccess(collaboradorId: string) {
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
    [collaboradorId, PAGAMENTOS_SYSTEM_SLUG],
  );

  return rows[0] || null;
}

function ensureHasAccess(access: Record<string, unknown> | null) {
  if (!access || !['admin', 'gestor', 'usuario'].includes(getAccessLevel(access))) {
    throw Object.assign(new Error('Seu usuario nao possui acesso liberado ao sistema de pagamentos.'), { status: 403 });
  }
}

function validateCreatePayload(payload: Record<string, unknown>) {
  const fornecedor = String(payload.fornecedor || '').trim();
  const descricao = String(payload.descricao || '').trim();
  const valor = Number(payload.valor);
  const categoria = String(payload.categoria || 'outros');

  if (!fornecedor) throw Object.assign(new Error('Informe o fornecedor.'), { status: 400 });
  if (!descricao) throw Object.assign(new Error('Informe a descricao.'), { status: 400 });
  if (!Number.isFinite(valor) || valor <= 0) {
    throw Object.assign(new Error('Informe um valor valido.'), { status: 400 });
  }
  if (!CATEGORIAS.includes(categoria)) {
    throw Object.assign(new Error('Categoria invalida.'), { status: 400 });
  }
}

async function ensureRowAccess(id: string, access: Record<string, unknown> | null, collaborator: Record<string, unknown> | null) {
  const rows = await sql!.unsafe(
    `select * from ${PAGAMENTOS_SCHEMA}.solicitacoes_pagamento where id = $1 limit 1;`,
    [id],
  );
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Solicitacao nao encontrada.'), { status: 404 });

  if (isAprovador(access)) return row;
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
  const bodyText = `Ola ${solicitante.nome},\n\nSua solicitacao de pagamento para "${row.fornecedor}" no valor de ${valorFormatado} foi ${label}.\n\nMACOM Pagamentos`;

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
    const access = collaborator?.id ? await getPagamentosAccess(String(collaborator.id)) : null;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'list');

    if (action === 'me') {
      ensureHasAccess(access);
      return json({ row: collaborator, access });
    }

    ensureHasAccess(access);

    if (action === 'list') {
      const filters = typeof body.filters === 'object' && body.filters ? body.filters : {};
      const status = typeof filters.status === 'string' ? filters.status : '';

      const clauses: string[] = [];
      const values: unknown[] = [];

      if (!isAprovador(access)) {
        values.push(collaborator!.id);
        clauses.push(`solicitante_id = $${values.length}`);
      }

      if (status) {
        values.push(status);
        clauses.push(`status = $${values.length}`);
      }

      const whereClause = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const rows = await sql.unsafe(
        `select * from ${PAGAMENTOS_SCHEMA}.solicitacoes_pagamento ${whereClause} order by criado_em desc limit 200;`,
        values,
      );

      return json({ rows });
    }

    if (action === 'get') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const row = await ensureRowAccess(id, access, collaborator);
      const comprovante_url = await createComprovanteSignedUrl(row.comprovante_path);
      return json({ row: { ...row, comprovante_url } });
    }

    if (action === 'signed_url') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const row = await ensureRowAccess(id, access, collaborator);
      const comprovante_url = await createComprovanteSignedUrl(row.comprovante_path);
      return json({ url: comprovante_url });
    }

    if (action === 'create') {
      const payload = sanitizePayload(CREATE_FIELDS, body.payload || {});
      validateCreatePayload(payload);
      validateComprovanteSize(body.payload?.comprovante_file_size);

      payload.solicitante_id = collaborator!.id;
      payload.criado_por = collaborator!.id;

      const fields = Object.keys(payload);
      const columns = fields.map(quoteIdentifier).join(', ');
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
      const rows = await sql.unsafe(
        `insert into ${PAGAMENTOS_SCHEMA}.solicitacoes_pagamento (${columns}) values (${placeholders}) returning *;`,
        fields.map((field) => payload[field]),
      );

      return json({ row: rows[0] || null });
    }

    if (action === 'update') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);

      const existing = await ensureRowAccess(id, access, collaborator);
      if (String(existing.solicitante_id) !== String(collaborator!.id) || existing.status !== 'pendente') {
        throw Object.assign(new Error('Somente o solicitante pode editar a solicitacao enquanto pendente.'), { status: 403 });
      }

      const payload = sanitizePayload(UPDATE_FIELDS, body.payload || {});
      if (!Object.keys(payload).length) return json({ error: 'Nenhum campo para atualizar.' }, 400);
      if ('comprovante_path' in body.payload || 'fornecedor' in payload) {
        validateComprovanteSize(body.payload?.comprovante_file_size);
      }

      const fields = Object.keys(payload);
      const assignments = fields.map((field, index) => `${quoteIdentifier(field)} = $${index + 2}`).join(', ');
      const rows = await sql.unsafe(
        `update ${PAGAMENTOS_SCHEMA}.solicitacoes_pagamento set ${assignments} where id = $1 returning *;`,
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

      const existing = await ensureRowAccess(id, access, collaborator);

      if (status === 'aprovado' || status === 'reprovado') {
        if (!isAprovador(access)) {
          throw Object.assign(new Error('Apenas aprovadores podem aprovar ou reprovar solicitacoes.'), { status: 403 });
        }
        if (existing.status !== 'pendente') {
          throw Object.assign(new Error('Somente solicitacoes pendentes podem ser aprovadas ou reprovadas.'), { status: 400 });
        }

        const rows = await sql.unsafe(
          `
            update ${PAGAMENTOS_SCHEMA}.solicitacoes_pagamento
            set status = $2, observacao_analise = $3, analisado_por = $4, analisado_em = now()
            where id = $1
            returning *;
          `,
          [id, status, observacao, collaborator!.id],
        );
        const row = rows[0];
        await enqueueStatusEmail(row, status);
        return json({ row });
      }

      if (status === 'pago') {
        if (!isFinanceiro(access)) {
          throw Object.assign(new Error('Apenas o financeiro pode marcar uma solicitacao como paga.'), { status: 403 });
        }
        if (existing.status !== 'aprovado') {
          throw Object.assign(new Error('Somente solicitacoes aprovadas podem ser marcadas como pagas.'), { status: 400 });
        }

        const rows = await sql.unsafe(
          `
            update ${PAGAMENTOS_SCHEMA}.solicitacoes_pagamento
            set status = 'pago', pago_por = $2, pago_em = now()
            where id = $1
            returning *;
          `,
          [id, collaborator!.id],
        );
        const row = rows[0];
        await enqueueStatusEmail(row, status);
        return json({ row });
      }
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json({ error: getErrorMessage(error) }, getErrorStatus(error));
  }
});
