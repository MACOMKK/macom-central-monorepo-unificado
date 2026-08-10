import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
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

function wrapBase64(input: string) {
  return String(input || '').replace(/(.{1,76})/g, '$1\r\n').trim();
}

async function sendGmail(payload: Record<string, unknown>) {
  const gmailClientId = Deno.env.get('GMAIL_CLIENT_ID');
  const gmailClientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
  const gmailRefreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN');
  const gmailSender = Deno.env.get('GMAIL_SENDER');

  if (!gmailClientId || !gmailClientSecret || !gmailRefreshToken || !gmailSender) {
    throw new Error('Variaveis Gmail nao configuradas na Edge Function.');
  }

  const to = typeof payload.to === 'string' ? payload.to : '';
  const subject = typeof payload.subject === 'string' ? payload.subject : '';
  const bodyText = typeof payload.body_text === 'string' ? payload.body_text : '';
  const bodyHtml = typeof payload.body_html === 'string' ? payload.body_html : '';
  const filename = typeof payload.filename === 'string' ? payload.filename : '';
  const rawPdfBase64 = typeof payload.pdf_base64 === 'string' ? payload.pdf_base64 : '';
  const pdfBase64 = rawPdfBase64.includes(',')
    ? rawPdfBase64.split(',').pop() || ''
    : rawPdfBase64;

  if (!to || !subject || !bodyText || !filename || !pdfBase64) {
    throw new Error('Payload incompleto para envio Gmail.');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: gmailClientId,
      client_secret: gmailClientSecret,
      refresh_token: gmailRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) {
    const tokenError = [
      tokenData.error,
      tokenData.error_description,
    ].filter(Boolean).join(' - ');
    throw new Error(`Falha ao obter access token Gmail: ${tokenError || tokenResponse.statusText}`);
  }

  const boundary = 'boundary_macom_termo';
  const altBoundary = 'boundary_macom_alt';
  const rawHtmlBody =
    bodyHtml || `<pre style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;">${bodyText}</pre>`;
  const plainBodyBase64 = toBase64Utf8(bodyText);
  const htmlBodyBase64 = toBase64Utf8(rawHtmlBody);

  const rawMessage = [
    `From: ${gmailSender}`,
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
    wrapBase64(plainBodyBase64),
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(htmlBodyBase64),
    '',
    `--${altBoundary}--`,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    wrapBase64(pdfBase64),
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
  });

  const gmailData = await gmailResponse.json().catch(() => ({}));
  if (!gmailResponse.ok) {
    const gmailError = gmailData?.error || {};
    const details = [
      gmailError.status,
      gmailError.message,
      Array.isArray(gmailError.details) ? JSON.stringify(gmailError.details) : null,
    ].filter(Boolean).join(' - ');
    throw new Error(`Falha ao enviar email pelo Gmail API: ${details || gmailResponse.statusText}`);
  }

  return gmailData.id;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const gmailId = await sendGmail(payload);

    return new Response(JSON.stringify({ success: true, gmail_id: gmailId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('enviar-termo-gmail error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: getErrorMessage(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
