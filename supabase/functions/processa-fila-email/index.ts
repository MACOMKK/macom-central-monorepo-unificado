import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { buildCorsHeaders } from '../_shared/cors.ts';

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

function encodeBase64Url(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function toBase64Utf8(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function encodeMimeHeaderUtf8(input: string) {
  return `=?UTF-8?B?${toBase64Utf8(input)}?=`;
}

async function sendGmail(payload: Record<string, unknown>) {
  const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID');
  const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET');
  const GMAIL_REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN');
  const GMAIL_SENDER = Deno.env.get('GMAIL_SENDER');

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_SENDER) {
    throw new Error('Variaveis Gmail nao configuradas na Edge Function.');
  }

  const to = typeof payload.to === 'string' ? payload.to : '';
  const subject = typeof payload.subject === 'string' ? payload.subject : '';
  const body_text = typeof payload.body_text === 'string' ? payload.body_text : '';
  const body_html = typeof payload.body_html === 'string' ? payload.body_html : '';
  const filename = typeof payload.filename === 'string' ? payload.filename : '';
  const pdf_base64 = typeof payload.pdf_base64 === 'string' ? payload.pdf_base64 : '';

  if (!to || !subject || !body_text || !filename || !pdf_base64) {
    throw new Error('Payload incompleto para envio Gmail.');
  }

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenResp.json();
  if (!tokenResp.ok || !tokenData.access_token) {
    throw new Error(
      `Falha ao obter access token Gmail (${tokenResp.status}): ${JSON.stringify(tokenData).slice(0, 500)}`,
    );
  }

  const boundary = 'boundary_macom_termo';
  const altBoundary = 'boundary_macom_alt';
  const rawHtmlBody =
    body_html || `<pre style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;">${body_text}</pre>`;
  const plainBodyBase64 = toBase64Utf8(body_text);
  const htmlBodyBase64 = toBase64Utf8(rawHtmlBody);

  const rawMessage = [
    `From: ${GMAIL_SENDER}`,
    `To: ${to}`,
    `Subject: ${encodeMimeHeaderUtf8(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    plainBodyBase64,
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    htmlBodyBase64,
    '',
    `--${altBoundary}--`,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    pdf_base64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const gmailResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
  });

  const gmailData = await gmailResp.json();
  if (!gmailResp.ok) {
    throw new Error(`Gmail send failed (${gmailResp.status}): ${JSON.stringify(gmailData).slice(0, 500)}`);
  }

  return gmailData.id;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
        const gmailId = await sendGmail(job.payload || {});

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
