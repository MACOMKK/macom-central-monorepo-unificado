import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { CANAIS_QUERY_KEY } from './useCanais';
import { mensagensQueryKey } from './useMensagens';
import { CONVERSAS_QUERY_KEY } from './useConversas';
import { mensagensDiretasQueryKey } from './useMensagensDiretas';
import { updateMensagemReacoes } from './reacoesUtils';

function upsertMensagem(rows, nextItem) {
  if (!Array.isArray(rows)) return rows;
  const exists = rows.some((item) => item.id === nextItem.id);
  if (exists) {
    return rows.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem } : item));
  }
  return [...rows, nextItem];
}

function attachAnexoToMensagem(rows, anexo, mensagemKey) {
  if (!Array.isArray(rows)) return rows;
  const mensagemId = anexo[mensagemKey];
  if (!mensagemId) return rows;

  let found = false;
  const nextRows = rows.map((item) => {
    if (item.id !== mensagemId) return item;
    found = true;
    const anexosAtuais = Array.isArray(item.anexos) ? item.anexos : [];
    if (anexosAtuais.some((existing) => existing.id === anexo.id)) return item;
    return { ...item, anexos: [...anexosAtuais, anexo] };
  });

  return found ? nextRows : rows;
}

function findAutorInfo(queryClient, autorId) {
  if (!autorId) return null;

  const conversas = queryClient.getQueryData(CONVERSAS_QUERY_KEY) || [];
  for (const conversa of conversas) {
    const match = conversa.outros_participantes?.find((participante) => participante.id === autorId);
    if (match) return { id: match.id, nome: match.nome, email: match.email };
  }

  const messageQueries = [
    ...queryClient.getQueriesData({ queryKey: ['comunicacao-mensagens'] }),
    ...queryClient.getQueriesData({ queryKey: ['comunicacao-mensagens-diretas'] }),
  ];
  for (const [, rows] of messageQueries) {
    if (!Array.isArray(rows)) continue;
    const match = rows.find((item) => item.autor_id === autorId && item.autor);
    if (match) return match.autor;
  }

  return null;
}

function getCanalNome(queryClient, canalId) {
  const canais = queryClient.getQueryData(CANAIS_QUERY_KEY) || [];
  return canais.find((canal) => canal.id === canalId)?.nome || null;
}

function notifyNovaMensagem({ titulo, corpo, tag }) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;

  const notification = new Notification(titulo, {
    body: corpo || 'Nova mensagem',
    icon: '/favicon.svg',
    tag,
    renotify: true,
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

function findMensagemPreview(queryClient, mensagemId) {
  if (!mensagemId) return null;

  const messageQueries = [
    ...queryClient.getQueriesData({ queryKey: ['comunicacao-mensagens'] }),
    ...queryClient.getQueriesData({ queryKey: ['comunicacao-mensagens-diretas'] }),
  ];
  for (const [, rows] of messageQueries) {
    if (!Array.isArray(rows)) continue;
    const match = rows.find((item) => item.id === mensagemId);
    if (match) {
      return {
        id: match.id,
        conteudo: match.conteudo,
        excluida_em: match.excluida_em,
        autor: match.autor || null,
      };
    }
  }
  return null;
}

export function useComunicacaoRealtime(enabled = true) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState(enabled ? 'connecting' : 'disabled');

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      return undefined;
    }

    if (!isSupabaseConfigured || !supabase) {
      setStatus('unavailable');
      return undefined;
    }

    setStatus('connecting');

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase.channel('comunicacao-realtime');

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'gestao_comunicacao', table: 'mensagens' },
      (payload) => {
        const eventType = payload.eventType;
        const nextItem = payload.new || payload.old || null;
        if (!nextItem?.canal_id) return;

        const queryKey = mensagensQueryKey(nextItem.canal_id);
        const autorInfo = nextItem.autor || findAutorInfo(queryClient, nextItem.autor_id);
        const respostaAInfo = nextItem.resposta_a || findMensagemPreview(queryClient, nextItem.resposta_a_id);
        const item = {
          ...nextItem,
          ...(autorInfo ? { autor: autorInfo } : {}),
          ...(respostaAInfo ? { resposta_a: respostaAInfo } : {}),
        };

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          queryClient.setQueriesData({ queryKey }, (current) => upsertMensagem(current, item));
        }
        if (eventType === 'INSERT') {
          queryClient.invalidateQueries({ queryKey: CANAIS_QUERY_KEY });
          if (item.autor_id !== user?.id) {
            const canalNome = getCanalNome(queryClient, item.canal_id);
            notifyNovaMensagem({
              titulo: `${item.autor?.nome || 'Alguém'} em #${canalNome || 'canal'}`,
              corpo: item.conteudo,
              tag: `comunicacao-mensagem-${item.id}`,
            });
          }
        }
      },
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'gestao_comunicacao', table: 'leituras_mensagem' },
      () => {
        queryClient.invalidateQueries({ queryKey: CANAIS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: CONVERSAS_QUERY_KEY });
      },
    );

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'gestao_comunicacao', table: 'anexos_mensagem' },
      (payload) => {
        const anexo = payload.new;
        if (!anexo) return;

        if (anexo.mensagem_id) {
          queryClient.setQueriesData({ queryKey: ['comunicacao-mensagens'] }, (current) =>
            attachAnexoToMensagem(current, anexo, 'mensagem_id'),
          );
        }
        if (anexo.mensagem_direta_id) {
          queryClient.setQueriesData({ queryKey: ['comunicacao-mensagens-diretas'] }, (current) =>
            attachAnexoToMensagem(current, anexo, 'mensagem_direta_id'),
          );
        }
      },
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'gestao_comunicacao', table: 'reacoes_mensagem' },
      (payload) => {
        const eventType = payload.eventType;
        const reacao = payload.new?.id ? payload.new : payload.old;
        if (!reacao) return;

        const action = eventType === 'INSERT' ? 'added' : eventType === 'DELETE' ? 'removed' : null;
        if (!action) return;

        const options = { emoji: reacao.emoji, colaboradorId: reacao.colaborador_id, currentUserId: user?.id, action };

        if (reacao.mensagem_id) {
          queryClient.setQueriesData({ queryKey: ['comunicacao-mensagens'] }, (current) =>
            updateMensagemReacoes(current, reacao.mensagem_id, options),
          );
        }
        if (reacao.mensagem_direta_id) {
          queryClient.setQueriesData({ queryKey: ['comunicacao-mensagens-diretas'] }, (current) =>
            updateMensagemReacoes(current, reacao.mensagem_direta_id, options),
          );
        }
      },
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'gestao_comunicacao', table: 'canais' },
      () => {
        queryClient.invalidateQueries({ queryKey: CANAIS_QUERY_KEY });
      },
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'gestao_comunicacao', table: 'mensagens_diretas' },
      (payload) => {
        const eventType = payload.eventType;
        const nextItem = payload.new || payload.old || null;
        if (!nextItem?.conversa_id) return;

        const queryKey = mensagensDiretasQueryKey(nextItem.conversa_id);
        const autorInfo = nextItem.autor || findAutorInfo(queryClient, nextItem.autor_id);
        const respostaAInfo = nextItem.resposta_a || findMensagemPreview(queryClient, nextItem.resposta_a_id);
        const item = {
          ...nextItem,
          ...(autorInfo ? { autor: autorInfo } : {}),
          ...(respostaAInfo ? { resposta_a: respostaAInfo } : {}),
        };

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          queryClient.setQueriesData({ queryKey }, (current) => upsertMensagem(current, item));
        }
        if (eventType === 'INSERT') {
          queryClient.invalidateQueries({ queryKey: CONVERSAS_QUERY_KEY });
          if (item.autor_id !== user?.id) {
            notifyNovaMensagem({
              titulo: item.autor?.nome || 'Nova mensagem direta',
              corpo: item.conteudo,
              tag: `comunicacao-mensagem-direta-${item.id}`,
            });
          }
        }
      },
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'gestao_comunicacao', table: 'conversas_diretas' },
      () => {
        queryClient.invalidateQueries({ queryKey: CONVERSAS_QUERY_KEY });
      },
    );

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'gestao_comunicacao', table: 'participantes_conversa' },
      () => {
        queryClient.invalidateQueries({ queryKey: CONVERSAS_QUERY_KEY });
      },
    );

    channel.subscribe((nextStatus) => {
      if (nextStatus === 'SUBSCRIBED') {
        setStatus('active');
        return;
      }
      if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
        setStatus('error');
        return;
      }
      if (nextStatus === 'CLOSED') {
        setStatus('disabled');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, user?.id]);

  return { status };
}
