import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { buildCorsHeaders } from '../_shared/cors.ts';

// Edge Function desacoplada do crm-api: nao exige JWT de usuario do CRM.
// Autentica a requisicao pelo secret proprio do canal (verify token / assinatura HMAC
// da Meta), igual ao padrao ja usado em processa-fila-email/enviar-termo-gmail.

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

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyWhatsappSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expectedHex = signatureHeader.slice('sha256='.length);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedHex = bytesToHex(signature);

  if (computedHex.length !== expectedHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computedHex.length; i += 1) {
    mismatch |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return mismatch === 0;
}

type IncomingMessage = {
  messageId: string;
  fromPhone: string;
  text: string;
};

function extractIncomingMessages(payload: any): IncomingMessage[] {
  const messages: IncomingMessage[] = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const waMessages = Array.isArray(value?.messages) ? value.messages : [];
      for (const message of waMessages) {
        const text = message?.text?.body;
        if (message?.id && message?.from && typeof text === 'string') {
          messages.push({ messageId: message.id, fromPhone: message.from, text });
        }
      }
    }
  }

  return messages;
}

async function callAi(openaiApiKey: string, history: { autor: string; conteudo: string }[]) {
  const messages = [
    {
      role: 'system',
      content:
        'Voce e um assistente de atendimento via WhatsApp de uma concessionaria. Responda de forma breve, cordial e objetiva em portugues.',
    },
    ...history.map((item) => ({
      role: item.autor === 'cliente' ? 'user' : 'assistant',
      content: item.conteudo,
    })),
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.4,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Falha ao consultar a IA.');
  }

  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || !reply.trim()) {
    throw new Error('Resposta vazia da IA.');
  }

  return reply.trim();
}

async function sendWhatsappMessage(phoneNumberId: string, token: string, toPhone: string, text: string) {
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'text',
      text: { body: text },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Falha ao enviar mensagem via WhatsApp.');
  }

  return data;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const WEBHOOK_VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
  const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET');
  const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN');
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Verificacao do webhook exigida pela Meta Cloud API na configuracao inicial.
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token && WEBHOOK_VERIFY_TOKEN && token === WEBHOOK_VERIFY_TOKEN) {
      return new Response(challenge || '', { status: 200, headers: corsHeaders });
    }

    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados.');
    }
    if (!APP_SECRET) {
      throw new Error('WHATSAPP_APP_SECRET nao configurado.');
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-hub-signature-256');
    const validSignature = await verifyWhatsappSignature(rawBody, signatureHeader, APP_SECRET);

    if (!validSignature) {
      return new Response(JSON.stringify({ success: false, error: 'Assinatura invalida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const incomingMessages = extractIncomingMessages(payload);

    if (incomingMessages.length === 0) {
      // Webhooks de status (entregue/lido) tambem chegam aqui; nao ha o que processar.
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results = [];

    for (const incoming of incomingMessages) {
      const telefoneNormalizado = normalizePhone(incoming.fromPhone);

      // Idempotencia: a Meta pode reenviar o mesmo webhook em caso de timeout.
      const { data: existingMessage } = await supabase
        .schema('gestao_crm')
        .from('mensagens_atendimento')
        .select('id')
        .eq('metadados->>whatsapp_message_id', incoming.messageId)
        .maybeSingle();

      if (existingMessage) {
        results.push({ messageId: incoming.messageId, status: 'duplicado' });
        continue;
      }

      let { data: conversa } = await supabase
        .schema('gestao_crm')
        .from('conversas_atendimento')
        .select('id, status')
        .eq('telefone_normalizado', telefoneNormalizado)
        .neq('status', 'encerrada')
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conversa) {
        const { data: cliente } = await supabase
          .schema('gestao_crm')
          .from('clientes')
          .select('id')
          .eq('telefone_normalizado', telefoneNormalizado)
          .maybeSingle();

        const { data: novaConversa, error: novaConversaError } = await supabase
          .schema('gestao_crm')
          .from('conversas_atendimento')
          .insert({
            telefone_normalizado: telefoneNormalizado,
            cliente_id: cliente?.id ?? null,
            status: 'aberta',
          })
          .select('id, status')
          .single();

        if (novaConversaError) throw new Error(`Falha ao criar conversa: ${novaConversaError.message}`);
        conversa = novaConversa;
      }

      const { error: insertEntradaError } = await supabase
        .schema('gestao_crm')
        .from('mensagens_atendimento')
        .insert({
          conversa_id: conversa.id,
          direcao: 'entrada',
          autor: 'cliente',
          conteudo: incoming.text,
          metadados: { whatsapp_message_id: incoming.messageId },
        });

      if (insertEntradaError) throw new Error(`Falha ao gravar mensagem recebida: ${insertEntradaError.message}`);

      await supabase
        .schema('gestao_crm')
        .from('conversas_atendimento')
        .update({ ultima_mensagem_em: new Date().toISOString() })
        .eq('id', conversa.id);

      // Conversa ja escalada para humano: nao responder automaticamente.
      if (conversa.status === 'aguardando_humano') {
        results.push({ messageId: incoming.messageId, status: 'aguardando_humano' });
        continue;
      }

      if (!OPENAI_API_KEY || !WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        results.push({ messageId: incoming.messageId, status: 'recebido_sem_ia' });
        continue;
      }

      const { data: historicoRows } = await supabase
        .schema('gestao_crm')
        .from('mensagens_atendimento')
        .select('autor, conteudo')
        .eq('conversa_id', conversa.id)
        .order('criado_em', { ascending: true })
        .limit(20);

      const respostaIa = await callAi(OPENAI_API_KEY, historicoRows || []);

      const { error: insertSaidaError } = await supabase
        .schema('gestao_crm')
        .from('mensagens_atendimento')
        .insert({
          conversa_id: conversa.id,
          direcao: 'saida',
          autor: 'ia',
          conteudo: respostaIa,
        });

      if (insertSaidaError) throw new Error(`Falha ao gravar resposta da IA: ${insertSaidaError.message}`);

      await sendWhatsappMessage(WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TOKEN, incoming.fromPhone, respostaIa);

      await supabase
        .schema('gestao_crm')
        .from('conversas_atendimento')
        .update({ ultima_mensagem_em: new Date().toISOString() })
        .eq('id', conversa.id);

      results.push({ messageId: incoming.messageId, status: 'respondido' });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('whatsapp-api error:', error);
    return new Response(JSON.stringify({ success: false, error: getErrorMessage(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
