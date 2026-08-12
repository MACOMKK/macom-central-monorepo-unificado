import { assertSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';

// Camada de dados do módulo "Atendimento" (chat WhatsApp + IA).
// Ao contrário de crmDataClient.js (que fala com a Edge Function crm-api), aqui a leitura é
// direta via Supabase client + RLS: quem grava as conversas/mensagens é a Edge Function
// whatsapp-api (desacoplada, sem JWT de usuário — ver supabase/functions/whatsapp-api/README.md),
// então o frontend só precisa ler o que já está no banco, igual ao padrão usado em
// apps/comunicacao para os hooks de chat.

const SCHEMA = 'gestao_crm';

function toError(error, fallbackMessage) {
  if (!error) return new Error(fallbackMessage);
  const err = new Error(String(error.message || fallbackMessage));
  err.status = error.status || 500;
  err.details = error;
  return err;
}

function mapConversaRow(row = {}) {
  return {
    id: row.id,
    cliente_id: row.cliente_id || '',
    lead_id: row.lead_id || '',
    telefone_normalizado: row.telefone_normalizado || '',
    canal: row.canal || 'whatsapp',
    status: row.status || 'aberta',
    ultima_mensagem_em: row.ultima_mensagem_em || null,
    cliente_nome: row.cliente?.nome || '',
    created_date: row.criado_em || null,
    updated_date: row.atualizado_em || null,
  };
}

function mapMensagemRow(row = {}) {
  return {
    id: row.id,
    conversa_id: row.conversa_id,
    direcao: row.direcao,
    autor: row.autor,
    colaborador_id: row.colaborador_id || '',
    conteudo: row.conteudo || '',
    metadados: row.metadados || {},
    created_date: row.criado_em || null,
  };
}

async function listConversas({ status } = {}) {
  assertSupabaseConfigured();

  let query = supabase
    .schema(SCHEMA)
    .from('conversas_atendimento')
    .select('*, cliente:clientes(nome)')
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw toError(error, 'Nao foi possivel carregar as conversas.');

  return (data || []).map(mapConversaRow);
}

async function listMensagens(conversaId) {
  assertSupabaseConfigured();

  if (!conversaId) return [];

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from('mensagens_atendimento')
    .select('*')
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: true });

  if (error) throw toError(error, 'Nao foi possivel carregar as mensagens da conversa.');

  return (data || []).map(mapMensagemRow);
}

async function assumirConversa(conversaId) {
  assertSupabaseConfigured();

  const { error } = await supabase
    .schema(SCHEMA)
    .from('conversas_atendimento')
    .update({ status: 'aguardando_humano' })
    .eq('id', conversaId);

  if (error) throw toError(error, 'Nao foi possivel assumir a conversa.');
}

async function encerrarConversa(conversaId) {
  assertSupabaseConfigured();

  const { error } = await supabase
    .schema(SCHEMA)
    .from('conversas_atendimento')
    .update({ status: 'encerrada' })
    .eq('id', conversaId);

  if (error) throw toError(error, 'Nao foi possivel encerrar a conversa.');
}

// ATENCAO: grava a mensagem no banco (visivel na tela em tempo real), mas NAO envia de fato
// pelo WhatsApp ainda. Enviar exige o WHATSAPP_TOKEN, que só existe no backend — precisa de uma
// rota autenticada nova (ex. action em crm-api ou endpoint dedicado em whatsapp-api) que repasse
// para a Graph API da Meta. Ver pendencia registrada para o Trello. Sem essa rota, o cliente no
// WhatsApp NAO recebe a resposta do atendente, mesmo que ela apareca na tela do CRM.
async function enviarMensagemManual({ conversaId, colaboradorId, texto }) {
  assertSupabaseConfigured();

  if (!conversaId || !texto?.trim()) {
    throw new Error('Conversa e texto da mensagem sao obrigatorios.');
  }

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from('mensagens_atendimento')
    .insert({
      conversa_id: conversaId,
      direcao: 'saida',
      autor: 'humano',
      colaborador_id: colaboradorId || null,
      conteudo: texto.trim(),
    })
    .select('*')
    .single();

  if (error) throw toError(error, 'Nao foi possivel registrar a mensagem.');

  await supabase
    .schema(SCHEMA)
    .from('conversas_atendimento')
    .update({ ultima_mensagem_em: new Date().toISOString() })
    .eq('id', conversaId);

  return mapMensagemRow(data);
}

export const atendimentoApi = {
  listConversas,
  listMensagens,
  assumirConversa,
  encerrarConversa,
  enviarMensagemManual,
};
