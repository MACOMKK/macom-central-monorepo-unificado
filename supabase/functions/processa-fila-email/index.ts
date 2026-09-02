import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { sendGmail } from '../_shared/email.ts';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Erro inesperado';
  }
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const INTERNAL_INVOKE_SECRET = Deno.env.get('INTERNAL_INVOKE_SECRET');
    if (!INTERNAL_INVOKE_SECRET || req.headers.get('x-invoke-secret') !== INTERNAL_INVOKE_SECRET) {
      return new Response(JSON.stringify({ success: false, error: 'Nao autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados.');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Number(body?.batch_size || 10), 50);
    const nowIso = new Date().toISOString();

    const { data: jobs, error: selectError } = await supabase
      .schema('notificacoes')
      .from('fila_emails')
      .select('*')
      .eq('status', 'pendente')
      .lte('agendado_em', nowIso)
      .order('agendado_em', { ascending: true })
      .order('criado_em', { ascending: true })
      .limit(batchSize);

    if (selectError) throw new Error(`Falha ao buscar fila_emails: ${selectError.message}`);

    const results = [];

    for (const job of jobs || []) {
      const attempt = (job.tentativas || 0) + 1;

      const { data: lockedJob, error: lockError } = await supabase
        .schema('notificacoes')
        .from('fila_emails')
        .update({
          status: 'processando',
          tentativas: attempt,
          erro: null,
          processado_em: nowIso,
        })
        .eq('id', job.id)
        .eq('status', 'pendente')
        .select('id')
        .maybeSingle();

      if (lockError || !lockedJob) {
        results.push({ id: job.id, status: 'ignorado', reason: lockError?.message || 'Registro nao bloqueado.' });
        continue;
      }

      try {
        const gmailId = await sendGmail(job.payload || {}, {
          supabaseUrl: SUPABASE_URL,
          serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
        });

        const { error: sentError } = await supabase
          .schema('notificacoes')
          .from('fila_emails')
          .update({
            status: 'enviado',
            enviado_em: new Date().toISOString(),
            processado_em: new Date().toISOString(),
            erro: null,
          })
          .eq('id', job.id);

        if (sentError) throw new Error(`Falha ao marcar email como enviado: ${sentError.message}`);

        results.push({ id: job.id, status: 'enviado', gmail_id: gmailId });
      } catch (err) {
        const maxTentativas = job.max_tentativas || 5;
        const shouldFail = attempt >= maxTentativas;
        const retryMinutes = Math.min(60, Math.max(1, attempt * 2));
        const nextSchedule = new Date(Date.now() + retryMinutes * 60 * 1000).toISOString();

        const { error: failError } = await supabase
          .schema('notificacoes')
          .from('fila_emails')
          .update({
            status: shouldFail ? 'erro' : 'pendente',
            erro: err instanceof Error ? err.message : 'Erro inesperado no envio',
            agendado_em: shouldFail ? job.agendado_em : nextSchedule,
            processado_em: new Date().toISOString(),
          })
          .eq('id', job.id);

        if (failError) {
          results.push({ id: job.id, status: 'erro', reason: failError.message });
          continue;
        }

        results.push({
          id: job.id,
          status: shouldFail ? 'erro' : 'reagendado',
          error: err instanceof Error ? err.message : 'Erro inesperado no envio',
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('processa-fila-email error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: getErrorMessage(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
